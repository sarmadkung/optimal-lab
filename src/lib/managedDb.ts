// Postgres run on your own VM or as a managed service, against five events. Recovery time
// and data lost are computed from the setup; prices, failover times and operations hours
// are illustrative but in the range the big providers document.

export type Mode = "self" | "managed";
export type Window = "auto" | "chosen";
export type Design = { mode: Mode; standby: boolean; pitr: boolean; window: Window; replica: boolean };
export type EventId = "host" | "drop" | "patch" | "extension" | "reports";

export const FIRST: Design = { mode: "self", standby: false, pitr: false, window: "auto", replica: false };
export const FIXED: Design = { mode: "managed", standby: true, pitr: true, window: "chosen", replica: true };

export const PRICE = { vm: 150, managed: 225 }; // one instance a month, same size
export const OPS = { self: 20, managed: 3 }; // hours a month
export const DROP_AT = "14:30";
export const SNAPSHOT_AT = "00:00";
export const LOG_UPLOAD_MIN = 5; // PITR can restore to within about 5 minutes

export const EVENTS: { id: EventId; title: string; step: number }[] = [
  { id: "host", title: "The primary's host dies at 3 a.m.", step: 1 },
  { id: "drop", title: `A migration drops the orders table at ${DROP_AT}`, step: 2 },
  { id: "patch", title: "A Postgres security release", step: 3 },
  { id: "reports", title: "Reporting queries slow down checkout", step: 4 },
  { id: "extension", title: "You need an extension the provider doesn't offer", step: 0 },
];

const minutes = (hhmm: string) => Number(hhmm.split(":")[0]) * 60 + Number(hhmm.split(":")[1]);

export function judge(e: EventId, d: Design): { ok: boolean; text: string; down?: number; lost?: number } {
  const managed = d.mode === "managed";
  switch (e) {
    case "host":
      if (d.standby) return managed ? { ok: true, text: "the provider fails over to the standby in the other zone; about 2 minutes of errors, nobody woken", down: 2 } : { ok: true, text: "your Patroni cluster promotes the standby in under a minute, as long as you've kept it healthy", down: 1 };
      return managed ? { ok: false, text: "the provider replaces the instance and replays logs: about 30 minutes down", down: 30 } : { ok: false, text: "you're paged, build a new VM and restore last night's backup: about 4 hours down", down: 240 };
    case "drop": {
      if (d.pitr) return { ok: true, text: `restore a copy to ${DROP_AT.replace(":30", ":29")} and copy the table back; at most ${LOG_UPLOAD_MIN} minutes of orders to re-enter`, lost: LOG_UPLOAD_MIN };
      const lost = minutes(DROP_AT) - minutes(SNAPSHOT_AT);
      return { ok: false, text: `only the ${SNAPSHOT_AT} snapshot exists: ${Math.floor(lost / 60)} h ${lost % 60} min of orders are gone`, lost };
    }
    case "patch":
      if (!managed) return { ok: false, text: `you test it, schedule downtime, patch the primary${d.standby ? " and the standby" : ""}${d.replica ? " and the replica" : ""}, and do it again next month` };
      return d.window === "chosen" ? { ok: true, text: "applied in your Sunday 04:00 window, a short restart while traffic is lowest" } : { ok: false, text: "applied in a window the provider picked, which turns out to be Tuesday at 11:00" };
    case "reports":
      return d.replica ? { ok: true, text: managed ? "reports read from a replica created with one setting; checkout keeps the primary to itself" : "reports read from a replica you built, monitor and upgrade yourself" } : { ok: false, text: "a 40-second report holds CPU and I/O on the same primary checkout writes to" };
    case "extension":
      return managed ? { ok: false, text: "managed Postgres offers an allowlist of extensions and no superuser; this one isn't on it" } : { ok: true, text: "your server, your superuser: install whatever you need" };
  }
}

export function scorecard(d: Design) {
  return EVENTS.map((x) => ({ event: x, ...judge(x.id, d) }));
}

export function bill(d: Design) {
  const one = d.mode === "managed" ? PRICE.managed : PRICE.vm;
  const instances = 1 + (d.standby ? 1 : 0) + (d.replica ? 1 : 0);
  return { dollars: one * instances + (d.pitr ? 25 : 0), instances, ops: OPS[d.mode] + (d.mode === "self" ? (d.standby ? 6 : 0) + (d.replica ? 4 : 0) + (d.pitr ? 3 : 0) : 0) };
}
