// Eight requests against an AWS-style IAM evaluator: an explicit Deny anywhere wins, then
// any Allow, otherwise the default is deny. Actions and resource ARNs match with * and ?
// wildcards; statements can require MFA or a region. Organization guardrails (SCPs) are
// Deny statements that apply to every principal in the account.

export type Policies = "admin" | "least";
export type Design = { policies: Policies; ciOidc: boolean; mfa: boolean; scp: boolean };
type Cond = { mfa?: boolean; regions?: string[]; notRegions?: string[] };
export type Statement = { effect: "Allow" | "Deny"; actions: string[]; resources: string[]; cond?: Cond };
export type Principal = "app" | "ci" | "dev" | "leaked";
export type Request = { id: string; who: Principal; title: string; action: string; resource: string; region: string; mfa: boolean; want: "Allow" | "Deny" };

export const FIRST: Design = { policies: "admin", ciOidc: false, mfa: false, scp: false };
export const FIXED: Design = { policies: "least", ciOidc: true, mfa: true, scp: true };
const ACCT = "123456789012";

export const PRINCIPALS: Record<Principal, string> = {
  app: "shop-api task role",
  ci: "CI deploy role",
  dev: "Developer (SSO)",
  leaked: "Attacker with the CI key",
};

export const REQUESTS: Request[] = [
  { id: "read", who: "app", title: "The app reads a photo", action: "s3:GetObject", resource: "arn:aws:s3:::uploads/photos/42.jpg", region: "eu-west-1", mfa: false, want: "Allow" },
  { id: "write", who: "app", title: "The app stores an upload", action: "s3:PutObject", resource: "arn:aws:s3:::uploads/photos/43.jpg", region: "eu-west-1", mfa: false, want: "Allow" },
  { id: "dropBucket", who: "app", title: "A bug in the app deletes the bucket", action: "s3:DeleteBucket", resource: "arn:aws:s3:::uploads", region: "eu-west-1", mfa: false, want: "Deny" },
  { id: "deploy", who: "ci", title: "CI deploys the function", action: "lambda:UpdateFunctionCode", resource: `arn:aws:lambda:eu-west-1:${ACCT}:function:shop-api`, region: "eu-west-1", mfa: false, want: "Allow" },
  { id: "ciSecret", who: "ci", title: "A CI step reads the prod DB password", action: "secretsmanager:GetSecretValue", resource: `arn:aws:secretsmanager:eu-west-1:${ACCT}:secret:prod/db`, region: "eu-west-1", mfa: false, want: "Deny" },
  { id: "dropDb", who: "dev", title: "A developer deletes the prod database (no MFA)", action: "rds:DeleteDBInstance", resource: `arn:aws:rds:eu-west-1:${ACCT}:db:prod`, region: "eu-west-1", mfa: false, want: "Deny" },
  { id: "trail", who: "dev", title: "Someone turns off audit logging", action: "cloudtrail:StopLogging", resource: `arn:aws:cloudtrail:eu-west-1:${ACCT}:trail/main`, region: "eu-west-1", mfa: true, want: "Deny" },
  { id: "mine", who: "leaked", title: "A leaked CI key starts 50 GPU instances", action: "ec2:RunInstances", resource: `arn:aws:ec2:ap-southeast-1:${ACCT}:instance/*`, region: "ap-southeast-1", mfa: false, want: "Deny" },
];

export function glob(pattern: string, s: string) {
  return new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$").test(s);
}

export function policiesFor(who: Principal, d: Design): Statement[] {
  const principal = who === "leaked" ? "ci" : who;
  if (d.policies === "admin") return [{ effect: "Allow", actions: ["*"], resources: ["*"] }];
  if (principal === "app") return [{ effect: "Allow", actions: ["s3:GetObject", "s3:PutObject"], resources: ["arn:aws:s3:::uploads/*"] }];
  if (principal === "ci")
    return [
      { effect: "Allow", actions: ["lambda:UpdateFunctionCode", "lambda:GetFunction"], resources: [`arn:aws:lambda:*:${ACCT}:function:shop-*`] },
      { effect: "Allow", actions: ["s3:PutObject"], resources: ["arn:aws:s3:::deploy-artifacts/*"] },
    ];
  return [
    { effect: "Allow", actions: ["rds:Describe*", "logs:*", "s3:Get*", "cloudtrail:LookupEvents"], resources: ["*"] },
    { effect: "Allow", actions: ["rds:*"], resources: [`arn:aws:rds:*:${ACCT}:db:*`], ...(d.mfa ? { cond: { mfa: true } } : {}) },
  ];
}

export const SCP: Statement[] = [
  { effect: "Deny", actions: ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail"], resources: ["*"] },
  { effect: "Deny", actions: ["*"], resources: ["*"], cond: { notRegions: ["eu-west-1", "us-east-1"] } },
];

const condOk = (c: Cond | undefined, r: Request) => !c || ((c.mfa === undefined || c.mfa === r.mfa) && (!c.regions || c.regions.includes(r.region)) && (!c.notRegions || !c.notRegions.includes(r.region)));
const applies = (s: Statement, r: Request) => s.actions.some((a) => glob(a, r.action)) && s.resources.some((x) => glob(x, r.resource)) && condOk(s.cond, r);

export type Decision = { decision: "Allow" | "Explicit deny" | "Implicit deny" | "No key to use"; by: string; ok: boolean };

export function evaluate(r: Request, d: Design): Decision {
  if (r.who === "leaked" && d.ciOidc) return { decision: "No key to use", by: "CI gets 1-hour credentials through OIDC; there is no stored key to leak", ok: true };
  const all = [...(d.scp ? SCP.map((s) => ({ s, from: "organization SCP" })) : []), ...policiesFor(r.who, d).map((s) => ({ s, from: `${PRINCIPALS[r.who === "leaked" ? "ci" : r.who]} policy` }))];
  const deny = all.find((x) => x.s.effect === "Deny" && applies(x.s, r));
  if (deny) return { decision: "Explicit deny", by: `${deny.from}: Deny ${deny.s.actions.join(", ")}${deny.s.cond?.notRegions ? ` outside ${deny.s.cond.notRegions.join(", ")}` : ""}`, ok: r.want === "Deny" };
  const allow = all.find((x) => x.s.effect === "Allow" && applies(x.s, r));
  if (allow) return { decision: "Allow", by: `${allow.from}: Allow ${allow.s.actions.join(", ")} on ${allow.s.resources.join(", ")}`, ok: r.want === "Allow" };
  const needsMfa = all.find((x) => x.s.effect === "Allow" && x.s.cond?.mfa && x.s.actions.some((a) => glob(a, r.action)));
  return { decision: "Implicit deny", by: needsMfa ? "the only matching Allow requires MFA, and this session has none" : "no statement allows it", ok: r.want === "Deny" };
}

export function scorecard(d: Design) {
  return REQUESTS.map((r) => ({ req: r, ...evaluate(r, d) }));
}

export const json = (ss: Statement[]) =>
  ss.map((s) => `{ "Effect": "${s.effect}", "Action": ${JSON.stringify(s.actions.length === 1 ? s.actions[0] : s.actions)}, "Resource": ${JSON.stringify(s.resources.length === 1 ? s.resources[0] : s.resources)}${s.cond?.mfa ? `, "Condition": { "Bool": { "aws:MultiFactorAuthPresent": "true" } }` : ""}${s.cond?.notRegions ? `, "Condition": { "StringNotEquals": { "aws:RequestedRegion": ${JSON.stringify(s.cond.notRegions)} } }` : ""} }`);
