// Email in and out. A support inbox auto-acknowledges each new email with a ticket
// number. Ten messages arrive with their real headers: an out-of-office reply, a mailing
// list, a no-reply notice, a bounce, a spoofed sender, a follow-up in a thread, and one
// the workflow sees twice after a crash. The header checks, the loop, threading, the
// dedupe and where each reply lands all run here.

export type Mail = {
  id: number;
  from: string;
  subject: string;
  headers: Record<string, string>;
  kind: "customer" | "ooo" | "list" | "noreply" | "bounce" | "spoofed" | "followup";
  gmail?: boolean; // recipient's provider files unauthenticated mail as spam
  redelivered?: boolean; // the workflow crashed after replying and saw it again
  note: string;
};

export const MAILS: Mail[] = [
  { id: 1, from: "ana@brightpath.com", subject: "Can't export my invoices", headers: { "Message-ID": "<a1@brightpath.com>" }, kind: "customer", gmail: false, note: "a customer question" },
  { id: 2, from: "tom@kranich.de", subject: "Re: [#1042] We got your message", headers: { "Message-ID": "<o2@kranich.de>", "Auto-Submitted": "auto-replied", "In-Reply-To": "<t1042@support.shop.example>" }, kind: "ooo", note: "an out-of-office reply to our acknowledgement" },
  { id: 3, from: "news@saas-weekly.example", subject: "This week in SaaS", headers: { "Message-ID": "<n3@saas-weekly.example>", "List-Id": "<weekly.saas-weekly.example>", Precedence: "list" }, kind: "list", note: "a newsletter sent to 4,000 people" },
  { id: 4, from: "noreply@billing.cloudhost.example", subject: "Your invoice is ready", headers: { "Message-ID": "<b4@cloudhost.example>", "Auto-Submitted": "auto-generated" }, kind: "noreply", note: "a no-reply notification" },
  { id: 5, from: "lee@gmail.com", subject: "Order arrived broken", headers: { "Message-ID": "<c5@mail.gmail.com>" }, kind: "customer", gmail: true, note: "a customer on Gmail" },
  { id: 6, from: "MAILER-DAEMON@mx.oldmail.example", subject: "Undelivered Mail Returned to Sender", headers: { "Message-ID": "<d6@mx.oldmail.example>", "Return-Path": "<>", "Content-Type": "multipart/report; report-type=delivery-status" }, kind: "bounce", note: "a bounce for an earlier reply" },
  { id: 7, from: "ceo@shop.example", subject: "Urgent: wire transfer today", headers: { "Message-ID": "<s7@evil.example>", "Authentication-Results": "dmarc=fail (p=reject) header.from=shop.example" }, kind: "spoofed", note: "spoofed: fails DMARC" },
  { id: 8, from: "ana@brightpath.com", subject: "Re: [#1041] We got your message", headers: { "Message-ID": "<a8@brightpath.com>", "In-Reply-To": "<t1041@support.shop.example>", References: "<a1@brightpath.com> <t1041@support.shop.example>" }, kind: "followup", note: "a follow-up in the same thread" },
  { id: 9, from: "kim@gmail.com", subject: "Change my delivery address", headers: { "Message-ID": "<k9@mail.gmail.com>" }, kind: "customer", gmail: true, redelivered: true, note: "seen twice after a crash" },
  { id: 10, from: "raj@harbor.co", subject: "Do you ship to Canada?", headers: { "Message-ID": "<r10@harbor.co>" }, kind: "customer", gmail: false, note: "a customer question" },
];

export type Design = { skipAuto: boolean; perSender: boolean; threads: boolean; dedupe: boolean; dmarc: boolean; dkim: boolean };
export const FIRST: Design = { skipAuto: false, perSender: false, threads: false, dedupe: false, dmarc: false, dkim: false };
export const FIXED: Design = { skipAuto: true, perSender: true, threads: true, dedupe: true, dmarc: true, dkim: true };

export const LIST_SIZE = 4000;
export const LOOP_MINUTES = 60;

// RFC 3834: don't auto-reply to automatic mail, lists, bounces or no-reply senders
export function automatic(m: Mail): string | null {
  const h = m.headers;
  if (h["Auto-Submitted"] && h["Auto-Submitted"] !== "no") return `Auto-Submitted: ${h["Auto-Submitted"]}`;
  if (h["List-Id"]) return "List-Id header (a mailing list)";
  if (/^(bulk|list|junk)$/i.test(h.Precedence ?? "")) return `Precedence: ${h.Precedence}`;
  if (h["Return-Path"] === "<>" || /mailer-daemon|postmaster/i.test(m.from)) return "a bounce (empty Return-Path)";
  if (/^(no-?reply|do-?not-?reply)@/i.test(m.from)) return "a no-reply sender";
  return null;
}

export function failsDmarc(m: Mail) {
  return /dmarc=fail/i.test(m.headers["Authentication-Results"] ?? "");
}

export type Result = {
  m: Mail;
  replied: boolean;
  shouldReply: boolean;
  skipReason: string | null;
  sent: number; // messages our system sent because of this email
  where: "inbox" | "spam" | "list" | "nowhere" | "thread" | "new-ticket";
  harm: string | null;
};

export function handle(m: Mail, d: Design): Result {
  const shouldReply = m.kind === "customer" || m.kind === "followup";
  const auto = automatic(m);
  if (d.skipAuto && auto) return { m, replied: false, shouldReply, skipReason: auto, sent: 0, where: "nowhere", harm: null };
  if (d.dmarc && failsDmarc(m)) return { m, replied: false, shouldReply, skipReason: "DMARC failed: the sender is forged", sent: 0, where: "nowhere", harm: null };

  if (m.kind === "ooo") {
    // their responder answers every message; ours answers every message: a loop
    const sent = d.perSender ? 1 : LOOP_MINUTES; // one exchange a minute for an hour, or one per sender per day
    return { m, replied: true, shouldReply, skipReason: null, sent, where: "inbox", harm: d.perSender ? "one needless reply, then the per-sender limit stops it" : `a mail loop: ${sent} replies in an hour` };
  }
  if (m.kind === "list") return { m, replied: true, shouldReply, skipReason: null, sent: 1, where: "list", harm: `“We got your message” posted to ${LIST_SIZE.toLocaleString("en-US")} subscribers` };
  if (m.kind === "noreply") return { m, replied: true, shouldReply, skipReason: null, sent: 1, where: "nowhere", harm: "sent to an address nobody reads; it bounces" };
  if (m.kind === "bounce") return { m, replied: true, shouldReply, skipReason: null, sent: 1, where: "nowhere", harm: "a reply to a mailer daemon, which bounces again" };
  if (m.kind === "spoofed") return { m, replied: true, shouldReply, skipReason: null, sent: 1, where: "inbox", harm: "a ticket reply sent to the forged address: backscatter, and a reply to a phishing attempt" };

  const copies = m.redelivered && !d.dedupe ? 2 : 1;
  const landing = m.gmail && !d.dkim ? "spam" : "inbox";
  if (m.kind === "followup") {
    if (d.threads) return { m, replied: true, shouldReply, skipReason: null, sent: copies, where: "thread", harm: null };
    return { m, replied: true, shouldReply, skipReason: null, sent: copies, where: "new-ticket", harm: "a second ticket (#1049) and a reply outside the thread" };
  }
  const harms = [copies > 1 && "acknowledged twice with two ticket numbers", landing === "spam" && "landed in spam: the domain doesn't sign with DKIM"].filter(Boolean) as string[];
  return { m, replied: true, shouldReply, skipReason: null, sent: copies, where: landing, harm: harms.length ? harms.join("; ") : null };
}

export function runAll(d: Design) {
  const results = MAILS.map((m) => handle(m, d));
  const good = results.filter((r) => r.shouldReply && r.replied && !r.harm).length;
  return {
    results,
    good,
    shouldReply: results.filter((r) => r.shouldReply).length,
    wrongReplies: results.filter((r) => !r.shouldReply && r.replied).length,
    loop: results.find((r) => r.m.kind === "ooo")!.sent,
    sent: results.reduce((a, r) => a + r.sent, 0),
    spam: results.filter((r) => r.where === "spam").length,
    duplicates: results.filter((r) => r.sent > 1 && r.m.kind !== "ooo").length,
    broken: results.filter((r) => r.where === "new-ticket").length,
  };
}
