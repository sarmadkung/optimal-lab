// SSH from a laptop through a bastion to a private database host, against five real
// threats. Fingerprints are computed the way ssh-keygen -l does: SHA-256 over the decoded
// public key blob, base64 without padding. Who gets in follows OpenSSH's behaviour.

import { sha256Bytes } from "./hashing";

export type Login = "password" | "plain" | "passphrase" | "hardware";
export type HostCheck = "off" | "tofu" | "pinned";
export type Hop = "agent" | "jump";
export type Access = "static" | "certs";
export type Design = { login: Login; noPasswords: boolean; hostCheck: HostCheck; hop: Hop; access: Access };
export type ThreatId = "bots" | "mitm" | "bastion" | "laptop" | "leaver";

export const FIRST: Design = { login: "plain", noPasswords: false, hostCheck: "tofu", hop: "agent", access: "static" };
export const FIXED: Design = { login: "passphrase", noPasswords: true, hostCheck: "pinned", hop: "jump", access: "certs" };

export const LOGINS: { id: Login; label: string }[] = [
  { id: "password", label: "Password" },
  { id: "plain", label: "Key, no passphrase" },
  { id: "passphrase", label: "Key + passphrase" },
  { id: "hardware", label: "Hardware key (FIDO2)" },
];
export const HOST_CHECKS: { id: HostCheck; label: string; line: string }[] = [
  { id: "off", label: "Don't check", line: "StrictHostKeyChecking no" },
  { id: "tofu", label: "Ask on first connect", line: "StrictHostKeyChecking ask" },
  { id: "pinned", label: "Known in advance", line: "known_hosts from the inventory (or host certificates)" },
];
export const SERVERS = 7; // the bastion plus six private hosts
export const CERT_HOURS = 8;

export const THREATS: { id: ThreatId; title: string; step: number }[] = [
  { id: "bots", title: "Bots guess passwords on port 22", step: 1 },
  { id: "mitm", title: "A fake db-1 on hotel Wi-Fi", step: 2 },
  { id: "bastion", title: "Someone has root on the bastion", step: 3 },
  { id: "laptop", title: "The laptop is stolen", step: 0 },
  { id: "leaver", title: "An engineer leaves the company", step: 4 },
];

// Public halves of three ed25519 keys made with ssh-keygen for this page.
export const KEYS = {
  you: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBdFHkHNYZmdqcGTeWAIpQpL2cLbYAb04qXdxD3KbbfE you@laptop",
  host: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFpnga7E3waEyILtRlrKciXD7sioxwtoL0cFBTTV0q/C db-1",
  evil: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILtC5T9CO2aVZQQP2OZjepbTBAgj/Wl5hh6NY/rL71pD attacker",
};

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function fromBase64(s: string) {
  const out: number[] = [];
  let buf = 0;
  let n = 0;
  for (const c of s.replace(/=+$/, "")) {
    buf = (buf << 6) | B64.indexOf(c);
    n += 6;
    if (n >= 8) {
      n -= 8;
      out.push((buf >> n) & 255);
    }
  }
  return out;
}
export function toBase64(bytes: number[]) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = bytes.slice(i, i + 3);
    const v = (a << 16) | (b << 8) | c;
    s += B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + (i + 1 < bytes.length ? B64[(v >> 6) & 63] : "") + (i + 2 < bytes.length ? B64[v & 63] : "");
  }
  return s;
}
// ssh-keygen -l: SHA256 of the key blob (the base64 field), printed as base64 without "=".
export function fingerprint(pub: string) {
  return "SHA256:" + toBase64(sha256Bytes(fromBase64(pub.split(" ")[1])));
}

export type Verdict = { safe: boolean; text: string };

export function judge(t: ThreatId, d: Design): Verdict {
  const usesKey = d.login !== "password";
  const passwordsOn = !usesKey || !d.noPasswords;
  switch (t) {
    case "bots":
      return passwordsOn
        ? { safe: false, text: "sshd still accepts passwords, so every account with a weak one is a way in" }
        : { safe: true, text: "Permission denied (publickey): there is no password to guess" };
    case "mitm":
      if (d.hostCheck === "off") return { safe: false, text: `ssh connects to the attacker without a word${usesKey ? "; they see everything you type" : " and records your password"}` };
      if (d.hostCheck === "tofu") return { safe: false, text: "ssh shows a fingerprint you have never seen; almost everyone types yes" };
      return { safe: true, text: "Host key verification failed: the key doesn't match the one you already had" };
    case "bastion":
      if (!usesKey) return d.hop === "jump" ? { safe: true, text: "with -J the bastion only relays encrypted bytes; the password goes straight to db-1" } : { safe: false, text: "you typed the db-1 password into a session on the bastion; root there can log it" };
      if (d.hop === "jump") return { safe: true, text: "with -J your key never leaves the laptop; the bastion only relays encrypted bytes" };
      if (d.login === "hardware") return { safe: true, text: "root can reach your forwarded agent, but each signature needs a physical touch, and you have no reason to touch the key for a login you didn't start" };
      return { safe: false, text: "with -A, root can use your forwarded agent to log in to db-1 as you while you're connected" };
    case "laptop":
      if (d.login === "password") return { safe: true, text: "nothing on the disk logs in, but the password is only as strong as you made it" };
      if (d.login === "plain") return { safe: false, text: "~/.ssh/id_ed25519 is unencrypted; the thief logs in right away" };
      if (d.login === "passphrase") return { safe: true, text: "the key file is encrypted; they have to guess the passphrase offline, slowly" };
      return { safe: true, text: "the private key never left the hardware key, which isn't in the bag" };
    case "leaver":
      if (usesKey && d.access === "certs") return { safe: true, text: `their certificate expires within ${CERT_HOURS} hours; there is nothing to remove` };
      return { safe: false, text: `their ${usesKey ? "key" : "account"} works until someone removes it on all ${SERVERS} servers` };
  }
}

export function scorecard(d: Design) {
  return THREATS.map((t) => ({ threat: t, ...judge(t.id, d) }));
}

export function sshConfig(d: Design) {
  const lines = ["Host db-1", "  HostName 10.0.2.15", "  User deploy"];
  if (d.login !== "password") lines.push(`  IdentityFile ~/.ssh/id_ed25519${d.login === "hardware" ? "_sk" : ""}`);
  if (d.hop === "jump") lines.push("  ProxyJump bastion.example.com");
  else lines.push("  # ssh -A bastion, then ssh db-1 from there");
  lines.push(`  StrictHostKeyChecking ${d.hostCheck === "off" ? "no" : "yes"}`);
  return lines;
}
