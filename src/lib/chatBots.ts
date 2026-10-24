// Slack and Teams bots. A team bot answers questions, posts deploy progress and takes
// approvals. Six things arrive at its endpoint: a slow slash command, a slow mention
// that the platform retries, the bot's own message, a burst of deploy updates, a forged
// button click and a replayed one. The platform's 3-second rule and retries, the rate
// limit, the loop, and the HMAC-SHA256 signature check (Slack's v0 scheme) all run here.

import { sha256Bytes, toHex, utf8 } from "./hashing";

export function hmacSha256Hex(key: string, message: string): string {
  let k = utf8(key);
  if (k.length > 64) k = sha256Bytes(k);
  k = [...k, ...new Array(64 - k.length).fill(0)];
  const inner = sha256Bytes([...k.map((b) => b ^ 0x36), ...utf8(message)]);
  return toHex(sha256Bytes([...k.map((b) => b ^ 0x5c), ...inner]));
}

export const SIGNING_SECRET = "8f742231b10e8888abcd99yyyzzz85a5";
export const NOW = 1767254400; // the bot's clock, in Unix seconds
export const ACK_LIMIT = 3; // seconds the platform waits for a 200
export const RETRIES = 3; // the platform redelivers an unacknowledged event this many times
export const MAX_AGE = 300; // reject signed requests older than five minutes
export const POSTS_PER_SEC = 1; // per channel

export const sign = (ts: number, body: string, secret = SIGNING_SECRET) => `v0=${hmacSha256Hex(secret, `v0:${ts}:${body}`)}`;

export type Kind = "slash" | "mention" | "own" | "burst" | "forged" | "replay";
export type Incoming = { id: number; kind: Kind; what: string; work?: number; updates?: number; ts?: number; body?: string; signature?: string };

const approveBody = "payload=%7B%22type%22%3A%22block_actions%22%2C%22actions%22%3A%5B%7B%22action_id%22%3A%22approve_refund_2207%22%7D%5D%7D";

export const INCOMING: Incoming[] = [
  { id: 1, kind: "slash", what: "/ask summarise #incident-42", work: 8 },
  { id: 2, kind: "mention", what: "@helper what's our refund policy?", work: 6 },
  { id: 3, kind: "own", what: "the bot's own “Deploy started” in #deploys" },
  { id: 4, kind: "burst", what: "deploy progress: 40 updates in 4 bursts", updates: 40 },
  { id: 5, kind: "forged", what: "Approve refund #2207, from someone who found the URL", ts: NOW - 2, body: approveBody, signature: sign(NOW - 2, approveBody, "guessed-secret") },
  { id: 6, kind: "replay", what: "a real Approve click, captured and sent again 2 hours later", ts: NOW - 7200, body: approveBody, signature: sign(NOW - 7200, approveBody) },
];

export type Design = { ackFirst: boolean; dedupe: boolean; ignoreSelf: boolean; updateInPlace: boolean; verify: boolean };
export const FIRST: Design = { ackFirst: false, dedupe: false, ignoreSelf: false, updateInPlace: false, verify: false };
export const FIXED: Design = { ackFirst: true, dedupe: true, ignoreSelf: true, updateInPlace: true, verify: true };

export function verify(i: Incoming): { ok: boolean; why: string } {
  if (!i.ts || !i.body || !i.signature) return { ok: false, why: "missing signature headers" };
  if (Math.abs(NOW - i.ts) > MAX_AGE) return { ok: false, why: `timestamp is ${Math.round((NOW - i.ts) / 60)} minutes old` };
  const expected = sign(i.ts, i.body);
  return expected === i.signature ? { ok: true, why: "signature matches" } : { ok: false, why: "signature doesn't match the signing secret" };
}

export type Result = { i: Incoming; userError: boolean; answers: number; posts: number; rejected429: number; acceptedBad: boolean; lines: string[] };

export function handle(i: Incoming, d: Design): Result {
  const r: Result = { i, userError: false, answers: 0, posts: 0, rejected429: 0, acceptedBad: false, lines: [] };
  const log = (s: string) => r.lines.push(s);

  if (i.kind === "slash") {
    if (d.ackFirst) {
      log("0.1 s: 200 “Working on it…”");
      log(`${i.work} s: answer posted through response_url`);
      r.answers = 1;
      r.posts = 1;
    } else {
      log(`${ACK_LIMIT} s: no response yet; the user sees “operation_timeout”`);
      log(`${i.work} s: the answer is returned to a request nobody is waiting for`);
      r.userError = true;
    }
  }
  if (i.kind === "mention") {
    // without a fast 200 the platform redelivers; each delivery runs the model again
    const deliveries = d.ackFirst ? 1 : 1 + RETRIES;
    const seen = new Set<string>();
    for (let n = 0; n < deliveries; n++) {
      const header = n ? ` (X-Slack-Retry-Num: ${n})` : "";
      if (d.dedupe && seen.has("Ev0742")) {
        log(`delivery ${n + 1}${header}: event_id Ev0742 already handled, ignored`);
        continue;
      }
      seen.add("Ev0742");
      r.answers++;
      r.posts++;
      log(`delivery ${n + 1}${header}: ${d.ackFirst ? "200 at once, then" : "no 200 within 3 s;"} answers in ${i.work} s`);
    }
  }
  if (i.kind === "own") {
    if (d.ignoreSelf) {
      log("event from the bot's own user id: ignored");
    } else {
      // it replies to every message in the channel, including its own replies
      r.posts = 60;
      log("the bot replies to its own message, then to that reply…");
      log(`one minute later: ${r.posts} messages, limited only by ${POSTS_PER_SEC} post a second`);
    }
  }
  if (i.kind === "burst") {
    const bursts = 4;
    const per = (i.updates ?? 0) / bursts;
    if (d.updateInPlace) {
      r.posts = 1;
      log(`one message, edited with chat.update after each burst: ${bursts} edits, latest state shown`);
    } else {
      r.posts = bursts * POSTS_PER_SEC;
      r.rejected429 = (i.updates ?? 0) - r.posts;
      log(`${bursts} bursts of ${per} posts in a second: ${POSTS_PER_SEC} accepted each time, ${r.rejected429} rejected with 429`);
      log(`the channel shows ${r.posts} stale updates; the final “Deploy done” is among the rejected`);
    }
  }
  if (i.kind === "forged" || i.kind === "replay") {
    const v = verify(i);
    if (d.verify && !v.ok) log(`401: ${v.why}`);
    else {
      r.acceptedBad = true;
      log(`accepted: refund #2207 approved${d.verify ? "" : " (signature never checked)"}`);
    }
  }
  return r;
}

export function runAll(d: Design) {
  const results = INCOMING.map((i) => handle(i, d));
  return {
    results,
    userErrors: results.filter((r) => r.userError).length,
    extraAnswers: results.reduce((a, r) => a + Math.max(0, r.answers - 1), 0),
    posts: results.reduce((a, r) => a + r.posts, 0),
    rejected429: results.reduce((a, r) => a + r.rejected429, 0),
    acceptedBad: results.filter((r) => r.acceptedBad).length,
  };
}
