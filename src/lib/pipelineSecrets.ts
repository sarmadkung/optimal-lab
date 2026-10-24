// Five ways a deploy token leaks from a CI pipeline, and the controls that stop each. The
// checks are real: a secret scanner matches token patterns in a diff, log masking replaces
// only the exact secret string (so an encoded copy slips through), and a short-lived
// token's expiry is compared with when the leak is found.

export type Design = { pushProtection: boolean; noPrint: boolean; buildSecret: boolean; forkSafe: boolean; shortLived: boolean };
export type LeakId = "commit" | "log" | "image" | "fork" | "late";

export const FIRST: Design = { pushProtection: false, noPrint: false, buildSecret: false, forkSafe: false, shortLived: false };
export const FIXED: Design = { pushProtection: true, noPrint: true, buildSecret: true, forkSafe: true, shortLived: true };

// Example values with the real shapes; not real credentials. Joined at runtime so the
// literals never sit in source for secret scanners to flag.
// A personal access token lives until revoked; a GitHub App installation token expires in an hour.
export const TOKEN = ["ghp", "7Rq2Xb9LmK4vT1sW8zY3nC6pD0fH5jA2eG7u"].join("_");
export const SHORT_TOKEN = ["ghs", "K3v8Qp1Zr6Tn0Wx4Jm9Lb2Yc5Hd7Fs1Ga8eP"].join("_");
export const tokenFor = (d: Design) => (d.shortLived ? SHORT_TOKEN : TOKEN);
export const AWS_KEY = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
export const SHORT_LIVED_MIN = 60;
export const FOUND_AFTER_DAYS = 90;

export const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "GitHub token", re: /gh[ps]_[A-Za-z0-9]{36}/ },
  { name: "AWS access key ID", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

export const LEAKS: { id: LeakId; title: string; step: number }[] = [
  { id: "commit", title: "A token is committed in a config file", step: 0 },
  { id: "log", title: "A debug step prints the token, base64-encoded", step: 1 },
  { id: "image", title: "The token is passed to docker build as an ARG", step: 2 },
  { id: "fork", title: "A fork's pull request edits the workflow", step: 3 },
  { id: "late", title: `A leaked token is found ${FOUND_AFTER_DAYS} days later`, step: 4 },
];

export function scan(diff: string) {
  return PATTERNS.filter((p) => p.re.test(diff)).map((p) => p.name);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function base64(s: string) {
  const b = [...s].map((c) => c.charCodeAt(0));
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < b.length ? B64[n & 63] : "=");
  }
  return out;
}

// CI log masking: every occurrence of the registered secret becomes ***.
export const mask = (line: string, secret: string) => line.split(secret).join("***");

export function logLines(d: Design) {
  const t = tokenFor(d);
  const lines = ["+ ./deploy.sh --env prod", `+ curl -H "Authorization: Bearer ${t}" https://api.example.com/deploy`, `debug: auth=${base64(t)}`];
  if (d.noPrint) return ["./deploy.sh --env prod", "deploy: authenticated as ci-deploy", "deploy: release 412 rolled out"];
  return lines.map((l) => mask(l, t));
}

export function judge(id: LeakId, d: Design): { safe: boolean; text: string } {
  switch (id) {
    case "commit": {
      const found = scan(`+ registry_token = "${TOKEN}"\n+ aws_access_key_id = ${AWS_KEY}`);
      return d.pushProtection ? { safe: true, text: `the push is rejected: ${found.join(" and ")} found in the diff` } : { safe: false, text: "it's in the repository's history now; deleting the line later doesn't remove it from old commits" };
    }
    case "log": {
      const out = logLines(d).join("\n");
      const leaked = out.includes(base64(tokenFor(d)));
      if (!leaked) return { safe: true, text: "the scripts never print credentials or run with set -x, so there's nothing to mask" };
      return { safe: d.shortLived, text: d.shortLived ? `masking missed the encoded copy, but the token expired ${SHORT_LIVED_MIN} minutes after the job` : "masking replaced the plain token with ***, but not its base64 form; anyone who can read the log can decode it" };
    }
    case "image":
      return d.buildSecret ? { safe: true, text: "the token is mounted for one RUN step and is in no layer or build history" } : { safe: false, text: "build arguments are recorded in the image's history; everyone who can pull the image can read it" };
    case "fork":
      return d.forkSafe ? { safe: true, text: "forks run on pull_request, which gets no secrets; maintainers trigger anything that needs them" } : { safe: false, text: "the workflow runs on pull_request_target with secrets, and the fork's change sends them to the attacker's server" };
    case "late":
      return d.shortLived ? { safe: true, text: `it was an app installation token valid for ${SHORT_LIVED_MIN} minutes; it expired ${FOUND_AFTER_DAYS} days ago` } : { safe: false, text: `a long-lived token works until someone rotates it; it has been valid for all ${FOUND_AFTER_DAYS} days` };
  }
}

export function scorecard(d: Design) {
  return LEAKS.map((l) => ({ leak: l, ...judge(l.id, d) }));
}
