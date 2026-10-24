// Three workloads placed on VMs, managed containers or functions. Monthly cost is computed
// from each workload's traffic and each option's billing model; limits such as a function's
// 15-minute maximum run are hard failures. Prices are illustrative.

export type Option = "vm" | "container" | "function";
export type WorkloadId = "api" | "webhook" | "video";
export type Design = Record<WorkloadId, Option> & { warm: boolean };

export const FIRST: Design = { api: "function", webhook: "function", video: "function", warm: false };
export const ALL_VMS: Design = { api: "vm", webhook: "vm", video: "vm", warm: false };
export const FIXED: Design = { api: "container", webhook: "function", video: "container", warm: true };

export const PRICE = {
  vcpuHourVm: 0.035, // always-on VM, per vCPU-hour
  vcpuHourContainer: 0.05, // managed containers, billed while running
  perMillionReq: 0.2,
  gbSecond: 0.0000167,
  warmPerMonth: 11, // one provisioned function instance or one minimum container, per month
};
// Hours a month someone spends patching, resizing and babysitting each workload.
export const OPS_HOURS: Record<Option, number> = { vm: 4, container: 1, function: 0.5 };
export const FUNCTION_MAX_MIN = 15;
export const COLD_START_MS = 600;
const HOURS = 730;

export const WORKLOADS: { id: WorkloadId; title: string; what: string; reqPerMonth: number; msPerReq: number; memGb: number; vcpu: number; busyHours: number; longestMin: number; latencyMatters: boolean }[] = [
  { id: "api", title: "Shop API", what: "150 requests a second, all day, every day", reqPerMonth: 150 * 3600 * HOURS, msPerReq: 120, memGb: 0.5, vcpu: 4, busyHours: HOURS, longestMin: 0.1, latencyMatters: true },
  { id: "webhook", title: "Payment webhooks", what: "60,000 a day, in bursts after each batch run", reqPerMonth: 60000 * 30, msPerReq: 300, memGb: 0.25, vcpu: 2, busyHours: 30 * 2, longestMin: 0.05, latencyMatters: false },
  { id: "video", title: "Nightly video job", what: "3 hours on 8 vCPU, once a night", reqPerMonth: 30, msPerReq: 3 * 3600 * 1000, memGb: 16, vcpu: 8, busyHours: 30 * 3, longestMin: 180, latencyMatters: false },
];

export function cost(w: (typeof WORKLOADS)[number], o: Option, warm: boolean) {
  if (o === "vm") {
    // Sized for the peak and left running; a scheduled VM for the nightly job.
    const hours = w.id === "video" ? w.busyHours + 30 * 0.25 : HOURS;
    return w.vcpu * hours * PRICE.vcpuHourVm;
  }
  if (o === "container") {
    const hours = w.busyHours;
    return w.vcpu * hours * PRICE.vcpuHourContainer + (warm && w.latencyMatters ? PRICE.warmPerMonth : 0);
  }
  const gbs = (w.reqPerMonth * w.msPerReq * w.memGb) / 1000;
  return (w.reqPerMonth / 1e6) * PRICE.perMillionReq + gbs * PRICE.gbSecond + (warm && w.latencyMatters ? PRICE.warmPerMonth * 4 : 0);
}

export function fit(w: (typeof WORKLOADS)[number], o: Option, warm: boolean): { ok: boolean; text: string } {
  if (o === "function" && w.longestMin > FUNCTION_MAX_MIN) return { ok: false, text: `a function stops at ${FUNCTION_MAX_MIN} minutes; the job needs ${w.longestMin}` };
  if (o === "function" && w.latencyMatters && !warm) return { ok: false, text: `new instances add ~${COLD_START_MS} ms cold starts to the slowest requests` };
  if (o === "vm" && w.id === "webhook") return { ok: true, text: "works, but the VM idles 22 hours a day" };
  if (o === "vm" && w.id === "api") return { ok: true, text: "cheapest for steady traffic; you patch and scale the VMs yourself" };
  if (o === "container" && w.id === "api") return { ok: true, text: "steady traffic, no OS to patch, scales with load" };
  if (o === "function" && w.id === "api") return { ok: true, text: "fast enough with warm instances, but per-request billing at this volume adds up" };
  if (o === "function") return { ok: true, text: "pay per call; scales to the burst and back to zero" };
  if (o === "container" && w.id === "video") return { ok: true, text: "a container job runs as long as it needs and stops when done" };
  if (o === "vm" && w.id === "video") return { ok: true, text: "a scheduled VM works; you start, stop and patch it" };
  return { ok: true, text: "runs fine, billed while it runs" };
}

export function evaluate(d: Design) {
  const rows = WORKLOADS.map((w) => ({ w, option: d[w.id], cost: cost(w, d[w.id], d.warm), ...fit(w, d[w.id], d.warm) }));
  return { rows, total: rows.reduce((a, r) => a + r.cost, 0), ops: rows.reduce((a, r) => a + OPS_HOURS[r.option], 0), ok: rows.filter((r) => r.ok).length };
}

// Every option for every workload, for the comparison table.
export function grid(warm: boolean) {
  return WORKLOADS.map((w) => ({ w, cells: (["vm", "container", "function"] as Option[]).map((o) => ({ o, cost: cost(w, o, warm), ...fit(w, o, warm) })) }));
}
