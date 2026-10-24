// A scan of one service's image and dependencies finds 96 known vulnerabilities; the team
// can fix 15 this sprint. Findings are generated (seeded) with the fields real triage uses:
// CVSS, whether a fix exists, whether the package ships or is dev-only, whether the code
// path is reachable, whether it's in CISA's Known Exploited list and its EPSS score. One
// finding is actually exploited this quarter. IDs are placeholders, not real CVEs.

export type Design = { shippedOnly: boolean; exploitData: boolean; reachability: boolean };
export type Finding = { id: string; pkg: string; severity: "critical" | "high" | "medium" | "low"; cvss: number; fix: boolean; shipped: boolean; reachable: boolean; kev: boolean; epss: number; exploited: boolean };

export const FIRST: Design = { shippedOnly: false, exploitData: false, reachability: false };
export const FIXED: Design = { shippedOnly: true, exploitData: true, reachability: true };
export const BUDGET = 15;

const PKGS = ["openssl", "libxml2", "zlib", "curl", "glibc", "libpng", "yaml-parser", "http-client", "image-resizer", "log-formatter", "test-runner", "lint-plugin", "jwt-lib", "xml-signer", "markdown-renderer", "protobuf"];
const DEV_ONLY = new Set(["test-runner", "lint-plugin"]);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function findings(): Finding[] {
  const r = rng(2026);
  const out: Finding[] = [];
  const bands: [Finding["severity"], number, number, number][] = [
    ["critical", 10, 9.0, 10],
    ["high", 30, 7.0, 8.9],
    ["medium", 40, 4.0, 6.9],
    ["low", 16, 0.5, 3.9],
  ];
  let n = 1;
  for (const [severity, count, lo, hi] of bands) {
    for (let i = 0; i < count; i++) {
      const pkg = PKGS[Math.floor(r() * PKGS.length)];
      const shipped = !DEV_ONLY.has(pkg);
      out.push({ id: `VULN-${String(n++).padStart(3, "0")}`, pkg, severity, cvss: Math.round((lo + r() * (hi - lo)) * 10) / 10, fix: r() < 0.8, shipped, reachable: shipped && r() < 0.25, kev: false, epss: Math.round(r() ** 30 * 1000) / 1000, exploited: false });
    }
  }
  // The one that gets used: a high, not a critical, in CISA's KEV list, reachable, fixable.
  Object.assign(out[22], { pkg: "xml-signer", severity: "high", cvss: 7.5, fix: true, shipped: true, reachable: true, kev: true, epss: 0.94, exploited: true });
  // Two more in KEV that can't hurt this service: one dev-only, one never called.
  Object.assign(out[3], { pkg: "image-resizer", cvss: 9.8, fix: true, shipped: true, reachable: false, kev: true, epss: 0.81 });
  Object.assign(out[40], { pkg: "test-runner", severity: "medium", cvss: 6.1, fix: true, shipped: false, reachable: false, kev: true, epss: 0.32 });
  return out;
}

// Order the queue by the signals the team uses (CVSS always breaks ties), then fix the first
// BUDGET findings that have a fix.
export function triage(d: Design) {
  const all = findings();
  let pool = all.filter((f) => !d.shippedOnly || f.shipped);
  const score = (f: Finding) =>
    (d.exploitData ? (f.kev ? 1000 : 0) + (f.epss > 0.1 ? 500 : 0) : 0) + (d.reachability ? (f.reachable ? 300 : -300) : 0) + f.cvss * 10;
  pool = [...pool].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const fixed = pool.filter((f) => f.fix).slice(0, BUDGET);
  const exploited = all.find((f) => f.exploited)!;
  const caught = fixed.includes(exploited);
  const rank = pool.indexOf(exploited) + 1;
  const wasted = fixed.filter((f) => !f.shipped || (f.shipped && !f.reachable)).length;
  return { all, pool, fixed, exploited, caught, rank, wasted, criticalsFixed: fixed.filter((f) => f.severity === "critical").length };
}

export function counts(fs: Finding[]) {
  return (["critical", "high", "medium", "low"] as const).map((s) => ({ s, n: fs.filter((f) => f.severity === s).length }));
}
