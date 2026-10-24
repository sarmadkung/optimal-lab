// Eight app servers over six months, patched in place or replaced from a freshly built
// image each month. Which server misses which patch run is a fixed pattern; drift is
// counted from each server's actual patch level and hand changes.

export type Mode = "mutable" | "immutable";
export type Design = { mode: Mode; stateOff: boolean; noSsh: boolean; gradual: boolean };
export type EventId = "patches" | "hotfix" | "rebuild" | "badPatch" | "localData";

export const FIRST: Design = { mode: "mutable", stateOff: false, noSsh: false, gradual: false };
export const FIXED: Design = { mode: "immutable", stateOff: true, noSsh: true, gradual: true };
export const SERVERS = 8;
export const MONTHS = 6;
export const BATCH = 2;
export const HOTFIXED = [2, 5]; // servers someone changed by hand during an incident

export const EVENTS: { id: EventId; title: string; step: number }[] = [
  { id: "patches", title: "Six monthly OS patch runs", step: 0 },
  { id: "localData", title: "Uploads and logs on the server's disk", step: 1 },
  { id: "hotfix", title: "A hand fix during an incident", step: 2 },
  { id: "badPatch", title: "Month 4's patch breaks the app", step: 3 },
  { id: "rebuild", title: "A server dies and is rebuilt", step: 4 },
];

// A patch run over SSH misses a server now and then (rebooting, a full disk, a timeout).
const missed = (server: number, month: number) => (server * 3 + month) % 7 === 0;

export function fleet(d: Design) {
  return Array.from({ length: SERVERS }, (_, s) => {
    if (d.mode === "immutable") return { server: s, patch: MONTHS, hand: false, image: `app-v${MONTHS}` };
    const patch = Array.from({ length: MONTHS }, (_, m) => m + 1).filter((m) => !missed(s, m)).at(-1) ?? 0;
    const holes = Array.from({ length: MONTHS }, (_, m) => m + 1).filter((m) => missed(s, m));
    return { server: s, patch, holes, hand: !d.noSsh && HOTFIXED.includes(s), image: null as string | null };
  });
}

export function drift(d: Design) {
  const f = fleet(d);
  const kinds = new Set(f.map((x) => `${x.patch}|${"holes" in x ? (x.holes as number[]).join(",") : ""}|${x.hand}`));
  return { variants: kinds.size, unpatched: f.filter((x) => "holes" in x && (x.holes as number[]).length > 0).length };
}

export function judge(e: EventId, d: Design): { ok: boolean; text: string } {
  const imm = d.mode === "immutable";
  const dr = drift(d);
  switch (e) {
    case "patches":
      return imm
        ? { ok: true, text: `each month's image is built once, tested and rolled out; all ${SERVERS} servers run app-v${MONTHS}` }
        : { ok: false, text: `${dr.unpatched} of ${SERVERS} servers missed at least one patch run; the fleet is now ${dr.variants} different configurations` };
    case "localData":
      if (d.stateOff) return { ok: true, text: "uploads go to object storage and logs to a central store; any server can be thrown away" };
      return imm ? { ok: false, text: "every replacement deletes the old server's disk: a month of uploads and logs gone with it" } : { ok: true, text: "the files survive because servers are never replaced, until a disk fails, with no copy elsewhere" };
    case "hotfix":
      if (d.noSsh) return { ok: true, text: "nobody can log in by hand, so the fix goes into the image (or the playbook), gets reviewed, and reaches every server" };
      return imm
        ? { ok: false, text: "someone SSHes in and tunes a kernel setting on 2 servers; the next replacement wipes it and the incident comes back" }
        : { ok: false, text: "someone SSHes in and tunes a kernel setting on 2 servers; those two now differ from the rest forever" };
    case "badPatch":
      if (d.gradual && imm) return { ok: true, text: `the first ${BATCH} new instances fail their health check, the rollout stops, and the old image keeps serving` };
      if (d.gradual) return { ok: false, text: `the patch run stops after ${BATCH} broken servers, but rolling them back means downgrading packages in place, for hours` };
      return imm ? { ok: false, text: "all 8 are replaced at once with the broken image; rolling back means relaunching the old one" } : { ok: false, text: "all 8 are patched at once and all 8 break; downgrading packages in place takes the afternoon" };
    case "rebuild":
      return imm
        ? { ok: true, text: "the autoscaler launches app-v6 again: identical to the other seven, in minutes" }
        : { ok: false, text: "rebuilt from the base image plus today's playbook: it has none of the missed-patch gaps or hand changes, so it behaves differently from the rest" };
  }
}

export function scorecard(d: Design) {
  return EVENTS.map((x) => ({ event: x, ...judge(x.id, d) }));
}

export function patchGrid(d: Design) {
  // Per server, per month: did that month's patch land?
  return Array.from({ length: SERVERS }, (_, s) => Array.from({ length: MONTHS }, (_, m) => (d.mode === "immutable" ? true : !missed(s, m + 1))));
}
