// Seven infrastructure changes checked by policy rules. Each rule is a real predicate over
// the planned resource's attributes, like an OPA/Conftest or Checkov rule over the JSON of
// terraform plan. Where the check runs and how strictly decides what reaches the cloud.

export type Enforce = "advisory" | "mandatory";
export type Where = "apply" | "pr";
export type Design = { enforce: Enforce; where: Where; exceptions: boolean; guardrail: boolean };

export const FIRST: Design = { enforce: "advisory", where: "apply", exceptions: false, guardrail: false };
export const FIXED: Design = { enforce: "mandatory", where: "pr", exceptions: true, guardrail: true };

type Resource = { type: string; name: string; attrs: Record<string, unknown> };
export type Change = { id: string; title: string; via: "pr" | "console"; risky: boolean; resource: Resource };

export const CHANGES: Change[] = [
  { id: "bucket", title: "A new uploads bucket, public-read", via: "pr", risky: true, resource: { type: "aws_s3_bucket", name: "uploads", attrs: { acl: "public-read", tags: { cost_center: "shop" } } } },
  { id: "ssh", title: "Open port 22 to fix a deploy", via: "pr", risky: true, resource: { type: "aws_security_group_rule", name: "ssh", attrs: { from_port: 22, to_port: 22, cidr_blocks: ["0.0.0.0/0"] } } },
  { id: "db", title: "A reporting database", via: "pr", risky: true, resource: { type: "aws_db_instance", name: "reporting", attrs: { storage_encrypted: false, tags: { cost_center: "data" } } } },
  { id: "tags", title: "A queue with no cost center", via: "pr", risky: true, resource: { type: "aws_sqs_queue", name: "jobs", attrs: { tags: {} } } },
  { id: "site", title: "The public marketing-site bucket", via: "pr", risky: false, resource: { type: "aws_s3_bucket", name: "marketing-site", attrs: { acl: "public-read", tags: { cost_center: "marketing" } } } },
  { id: "big", title: "A 96-vCPU instance in dev", via: "pr", risky: false, resource: { type: "aws_instance", name: "dev-runner", attrs: { instance_type: "m7i.24xlarge", tags: { cost_center: "eng" } } } },
  { id: "console", title: "Someone makes a bucket public in the console", via: "console", risky: true, resource: { type: "aws_s3_bucket", name: "exports", attrs: { acl: "public-read", tags: { cost_center: "shop" } } } },
];

export const RULES: { id: string; severity: "deny" | "warn"; text: string; test: (r: Resource) => boolean }[] = [
  { id: "s3-no-public", severity: "deny", text: "S3 buckets must not be public", test: (r) => r.type === "aws_s3_bucket" && String(r.attrs.acl ?? "").startsWith("public") },
  { id: "no-world-ssh", severity: "deny", text: "Port 22 must not be open to 0.0.0.0/0", test: (r) => r.type === "aws_security_group_rule" && Number(r.attrs.from_port) <= 22 && Number(r.attrs.to_port) >= 22 && (r.attrs.cidr_blocks as string[]).includes("0.0.0.0/0") },
  { id: "db-encrypted", severity: "deny", text: "Databases must encrypt storage", test: (r) => r.type === "aws_db_instance" && r.attrs.storage_encrypted !== true },
  { id: "cost-center-tag", severity: "deny", text: "Every resource needs a cost_center tag", test: (r) => "tags" in r.attrs && !(r.attrs.tags as Record<string, string>).cost_center },
  { id: "big-instance", severity: "warn", text: "Instances over 16 vCPU need a reason", test: (r) => r.type === "aws_instance" && /\.(8|12|16|24|32|48)xlarge$/.test(String(r.attrs.instance_type)) },
];

// A documented, time-limited exception: owner, reason, expiry.
export const EXCEPTIONS = [{ rule: "s3-no-public", resource: "aws_s3_bucket.marketing-site", owner: "web team", reason: "static website", expires: "2027-04-30" }];

export function violations(c: Change, d: Design) {
  const addr = `${c.resource.type}.${c.resource.name}`;
  return RULES.filter((r) => r.test(c.resource)).map((r) => ({ rule: r, excepted: d.exceptions && EXCEPTIONS.some((e) => e.rule === r.id && e.resource === addr) }));
}

export type Outcome = { result: "blocked in PR" | "blocked at apply" | "warned" | "allowed" | "reverted by the cloud" | "applied"; ok: boolean; text: string };

export function check(c: Change, d: Design): Outcome {
  const v = violations(c, d);
  const denies = v.filter((x) => x.rule.severity === "deny" && !x.excepted);
  const warns = v.filter((x) => x.rule.severity === "warn");
  if (c.via === "console") {
    return d.guardrail
      ? { result: "reverted by the cloud", ok: true, text: "a cloud-side rule checks every bucket against the same exceptions, however it was changed, and makes it private again within minutes" }
      : { result: "applied", ok: false, text: "the console never runs the pipeline's policies; the bucket is public until someone notices" };
  }
  if (!denies.length) {
    const excepted = v.some((x) => x.excepted);
    if (warns.length) return { result: "warned", ok: true, text: `a warning asks for a reason (${warns[0].rule.text.toLowerCase()}); it goes ahead` };
    if (excepted) return { result: "allowed", ok: true, text: `allowed by a recorded exception (owner: ${EXCEPTIONS[0].owner}, expires ${EXCEPTIONS[0].expires})` };
    return { result: "allowed", ok: true, text: "no rule applies" };
  }
  if (d.enforce === "advisory") return { result: "warned", ok: !c.risky, text: `${denies.length} violation${denies.length === 1 ? "" : "s"} printed in the log, and it's applied anyway` };
  if (!c.risky) return { result: d.where === "pr" ? "blocked in PR" : "blocked at apply", ok: false, text: `${denies[0].rule.text}: a legitimate change is blocked, and the team starts asking to turn the rule off` };
  return d.where === "pr"
    ? { result: "blocked in PR", ok: true, text: `the check fails on the pull request (${denies.map((x) => x.rule.id).join(", ")}); fixed before merge` }
    : { result: "blocked at apply", ok: true, text: `caught, but only after merge: main now holds code that can't be applied until someone fixes it` };
}

export function scorecard(d: Design) {
  return CHANGES.map((c) => ({ change: c, ...check(c, d) }));
}

export const REGO = `package terraform.s3

deny contains msg if {
  r := input.resource_changes[_]
  r.type == "aws_s3_bucket"
  startswith(r.change.after.acl, "public")
  not exception[r.address]
  msg := sprintf("%s: S3 buckets must not be public", [r.address])
}`;
