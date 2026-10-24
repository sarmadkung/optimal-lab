// Building three servers over 60 days with apt. The repository index changes under you:
// the vendor's nginx repo keeps every version, while Ubuntu's -updates/-security pockets
// list only the newest build. Versions compare with dpkg's rules and pins match like apt
// preferences globs. The release dates and the 1.28 config break are illustrative.

export type StrategyId = "unpinned" | "exact" | "series" | "image";
export type Pkg = "nginx" | "openssl";
export type Design = { strategy: StrategyId; unattended: boolean };

export const FIRST: Design = { strategy: "unpinned", unattended: false };
export const FIXED: Design = { strategy: "image", unattended: true };

export const STRATEGIES: { id: StrategyId; label: string; line: string; one: string }[] = [
  { id: "unpinned", label: "Latest", line: "apt-get install -y nginx openssl", one: "Whatever the index lists as newest on the day the server is built." },
  { id: "exact", label: "Exact versions", line: "apt-get install -y nginx=1.26.1-1~noble openssl=3.0.13-0ubuntu3.1", one: "The versions that were current when the script was written, on day 0." },
  { id: "series", label: "Pin a series", line: "Pin: version 1.26.*  (apt preferences for nginx)", one: "Patch releases of nginx 1.26 only; openssl follows Ubuntu's security pocket." },
  { id: "image", label: "Bake an image", line: "weekly: build image (series pin) → nginx -t → roll the fleet", one: "Install once a week into an image, test it, and replace every server with it." },
];

type Release = { pkg: Pkg; version: string; day: number; note: string };
export const RELEASES: Release[] = [
  { pkg: "nginx", version: "1.26.1-1~noble", day: 0, note: "current stable" },
  { pkg: "nginx", version: "1.26.2-1~noble", day: 12, note: "bug fixes" },
  { pkg: "nginx", version: "1.28.0-1~noble", day: 30, note: "new stable series; drops a directive your site config uses" },
  { pkg: "openssl", version: "3.0.13-0ubuntu3", day: -1, note: "release pocket" },
  { pkg: "openssl", version: "3.0.13-0ubuntu3.1", day: 0, note: "security update" },
  { pkg: "openssl", version: "3.0.13-0ubuntu3.2", day: 12, note: "security fix" },
  { pkg: "openssl", version: "3.0.13-0ubuntu3.4", day: 38, note: "security fix" },
];
export const PATCHED = "3.0.13-0ubuntu3.4";
export const REPORT_DAY = 60;
export const SERVERS = [
  { id: "A", built: 0 },
  { id: "B", built: 20 },
  { id: "C", built: 45 },
];

// dpkg's version comparison: epoch, then upstream, then revision, each compared as
// alternating non-digit and digit runs; "~" sorts before everything, even the end.
function order(c: string | undefined) {
  if (!c) return 0;
  if (/\d/.test(c)) return 0;
  if (/[A-Za-z]/.test(c)) return c.charCodeAt(0);
  if (c === "~") return -1;
  return c.charCodeAt(0) + 256;
}
function verrevcmp(a: string, b: string) {
  let i = 0;
  let j = 0;
  const digit = (s: string, k: number) => k < s.length && /\d/.test(s[k]);
  while (i < a.length || j < b.length) {
    let first = 0;
    while ((i < a.length && !digit(a, i)) || (j < b.length && !digit(b, j))) {
      const ac = order(a[i]);
      const bc = order(b[j]);
      if (ac !== bc) return ac - bc;
      i++;
      j++;
    }
    while (a[i] === "0") i++;
    while (b[j] === "0") j++;
    while (digit(a, i) && digit(b, j)) {
      if (!first) first = a.charCodeAt(i) - b.charCodeAt(j);
      i++;
      j++;
    }
    if (digit(a, i)) return 1;
    if (digit(b, j)) return -1;
    if (first) return first;
  }
  return 0;
}
function split(v: string) {
  const c = v.indexOf(":");
  const epoch = c >= 0 ? Number(v.slice(0, c)) : 0;
  const rest = c >= 0 ? v.slice(c + 1) : v;
  const h = rest.lastIndexOf("-");
  return { epoch, upstream: h >= 0 ? rest.slice(0, h) : rest, revision: h >= 0 ? rest.slice(h + 1) : "" };
}
export function compareVersions(a: string, b: string) {
  const x = split(a);
  const y = split(b);
  return x.epoch - y.epoch || verrevcmp(x.upstream, y.upstream) || verrevcmp(x.revision, y.revision);
}
const newest = (vs: string[]) => [...vs].sort(compareVersions).at(-1);

// apt preferences "Pin: version 1.26.*" is a glob over the whole version string.
export function globMatch(glob: string, v: string) {
  return new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$").test(v);
}

// What `apt-get update` sees on a given day.
export function index(day: number): Record<Pkg, string[]> {
  const nginx = RELEASES.filter((r) => r.pkg === "nginx" && r.day <= day).map((r) => r.version);
  const ubuntu = RELEASES.filter((r) => r.pkg === "openssl" && r.day <= day);
  const release = ubuntu.filter((r) => r.day < 0).map((r) => r.version);
  const pocket = newest(ubuntu.filter((r) => r.day >= 0).map((r) => r.version));
  return { nginx, openssl: [...release, ...(pocket ? [pocket] : [])] };
}

export type Install = { day: number; ok: boolean; versions: Record<Pkg, string | null>; error?: string; configOk: boolean; candidates: Record<Pkg, string[]> };

// Resolve and install on one day with one strategy (an image build uses the series pin).
export function install(day: number, s: StrategyId): Install {
  const idx = index(day);
  const pick = (p: Pkg): { v: string | null; error?: string } => {
    if (s === "exact") {
      const want = p === "nginx" ? "1.26.1-1~noble" : "3.0.13-0ubuntu3.1";
      return idx[p].includes(want) ? { v: want } : { v: null, error: `E: Version '${want}' for '${p}' was not found` };
    }
    if (p === "nginx" && (s === "series" || s === "image")) return { v: newest(idx.nginx.filter((v) => globMatch("1.26.*", v))) ?? null };
    return { v: newest(idx[p]) ?? null };
  };
  const n = pick("nginx");
  const o = pick("openssl");
  const error = n.error ?? o.error;
  const versions = error ? { nginx: null, openssl: null } : { nginx: n.v, openssl: o.v };
  const configOk = !versions.nginx || compareVersions(versions.nginx, "1.28.0") < 0;
  return { day, ok: !error, versions, error, configOk, candidates: idx };
}

const imageDay = (day: number) => Math.floor(day / 7) * 7;

export type ServerState = { id: string; built: number; image?: number; install: Install; nginx: string | null; openssl: string | null; status: "failed" | "broken" | "unpatched" | "ok"; upgrades: string[] };

// A server's state on the report day.
export function server(id: string, d: Design, day = REPORT_DAY): ServerState {
  const built = SERVERS.find((x) => x.id === id)!.built;
  // With images the fleet is replaced by each tested weekly image, so every server runs the newest one.
  const from = d.strategy === "image" ? imageDay(day) : built;
  const inst = install(from, d.strategy);
  let openssl = inst.versions.openssl;
  const upgrades: string[] = [];
  // unattended-upgrades applies Ubuntu's security pocket the day after a release;
  // `pkg=version` on the install line does not hold the package, so it upgrades too.
  if (d.unattended && inst.ok && openssl) {
    for (const r of RELEASES.filter((r) => r.pkg === "openssl" && r.day > from && r.day + 1 <= day)) {
      if (compareVersions(r.version, openssl) > 0) {
        openssl = r.version;
        upgrades.push(`day ${r.day + 1}: openssl → ${r.version}`);
      }
    }
  }
  const status = !inst.ok ? "failed" : !inst.configOk ? "broken" : compareVersions(openssl!, PATCHED) < 0 ? "unpatched" : "ok";
  return { id, built, image: d.strategy === "image" ? from : undefined, install: inst, nginx: inst.versions.nginx, openssl, status, upgrades };
}

export function fleet(d: Design) {
  const servers = SERVERS.map((s) => server(s.id, d));
  const running = servers.filter((s) => s.status !== "failed" && s.status !== "broken");
  const combos = new Set(running.map((s) => `${s.nginx} ${s.openssl}`));
  return {
    servers,
    serving: running.length,
    patched: servers.filter((s) => s.status === "ok").length,
    identical: running.length === servers.length && combos.size === 1,
    variants: combos.size,
  };
}

export const STATUS_TEXT: Record<ServerState["status"], string> = {
  failed: "build failed",
  broken: "nginx -t fails: never healthy",
  unpatched: "serving, missing the day-38 openssl fix",
  ok: "serving, patched",
};
