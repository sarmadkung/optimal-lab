// An Ansible playbook configuring nginx on 12 web servers, run three times: first setup,
// a re-run after someone hand-edited one server, and a config change. Each host's files
// are tracked, so idempotent modules, shell commands that append, handlers, serial batches
// and check mode behave the way Ansible does.

export type Design = { modules: boolean; handlers: boolean; serial: boolean; check: boolean };
export type RunId = 1 | 2 | 3;

export const FIRST: Design = { modules: false, handlers: false, serial: false, check: false };
export const FIXED: Design = { modules: true, handlers: true, serial: true, check: true };
export const HOSTS = Array.from({ length: 12 }, (_, i) => `web-${String(i + 1).padStart(2, "0")}`);
export const BATCH = 4;
export const DRIFTED = "web-07";

export const RUNS: { id: RunId; title: string; wc: number }[] = [
  { id: 1, title: "First run on fresh servers", wc: 2048 },
  { id: 2, title: `Run again (someone edited ${DRIFTED} by hand)`, wc: 2048 },
  { id: 3, title: "Change worker_connections to 4096", wc: 4096 },
];

type Host = { installed: boolean; conf: string[]; up: boolean };
export type Recap = { host: string; ok: number; changed: number; failed: number; skipped: number; restarted: boolean; up: boolean; note?: string };

export function playbook(d: Design, wc = 2048) {
  const t = d.modules
    ? ["- apt: { name: nginx, state: present }", `- template: { src: nginx.conf.j2, dest: /etc/nginx/nginx.conf }  # worker_connections ${wc}`]
    : ["- shell: apt-get install -y nginx", `- shell: echo "worker_connections ${wc};" >> /etc/nginx/nginx.conf`];
  if (d.handlers) t[1] += "\n  notify: restart nginx";
  return [
    "- hosts: web",
    ...(d.serial ? [`  serial: ${BATCH}`, "  max_fail_percentage: 0"] : []),
    "  tasks:",
    ...t.map((x) => "  " + x.replace(/\n/g, "\n  ")),
    ...(d.handlers ? ["  handlers:", "  - name: restart nginx", "    service: { name: nginx, state: restarted }"] : ["  - service: { name: nginx, state: restarted }"]),
  ];
}

const valid = (conf: string[]) => new Set(conf).size === conf.length && conf.filter((l) => l.startsWith("worker_connections")).length <= 1;

// Run the play for runs 1..upTo, carrying each host's state forward; report the last run.
export function simulate(d: Design, upTo: RunId) {
  const hosts = new Map<string, Host>(HOSTS.map((h) => [h, { installed: false, conf: [], up: false }]));
  let recaps: Recap[] = [];
  let preview: string[] = [];
  let stoppedAfter: number | null = null;
  for (const r of RUNS.filter((x) => x.id <= upTo)) {
    if (r.id === 2) {
      const h = hosts.get(DRIFTED)!;
      h.conf = h.conf.map((l) => (l.startsWith("worker_connections") ? "worker_connections 1024;" : l));
    }
    const line = `worker_connections ${r.wc};`;
    // Check mode: modules report what they would change; shell tasks are skipped.
    preview = d.modules
      ? HOSTS.filter((h) => hosts.get(h)!.conf.join() !== line).map((h) => `${h}: ${hosts.get(h)!.conf[0] ?? "(no file)"} → ${line}`)
      : ["shell tasks are skipped in check mode: nothing to show"];
    recaps = [];
    stoppedAfter = null;
    const batches = d.serial ? Array.from({ length: Math.ceil(HOSTS.length / BATCH) }, (_, i) => HOSTS.slice(i * BATCH, i * BATCH + BATCH)) : [HOSTS];
    for (const [bi, batch] of batches.entries()) {
      let failedInBatch = 0;
      for (const name of batch) {
        const h = hosts.get(name)!;
        let ok = 0;
        let changed = 0;
        let failed = 0;
        // Install
        // A shell task always reports changed.
        if (d.modules && h.installed) ok++;
        else changed++;
        h.installed = true;
        // Config
        let confChanged: boolean;
        if (d.modules) {
          confChanged = h.conf.join() !== line;
          h.conf = [line];
        } else {
          h.conf = [...h.conf, line];
          confChanged = true;
        }
        if (confChanged) changed++;
        else ok++;
        // Restart: a handler only when notified, a plain task every time.
        const restart = d.handlers ? confChanged : true;
        let note: string | undefined;
        if (restart) {
          if (valid(h.conf)) {
            changed++;
            h.up = true;
          } else {
            failed++;
            h.up = false;
            note = '[emerg] "worker_connections" directive is duplicate';
          }
        } else ok++;
        if (failed) failedInBatch++;
        recaps.push({ host: name, ok, changed, failed, skipped: 0, restarted: restart && !failed, up: h.up, note });
      }
      if (d.serial && failedInBatch > 0 && bi < batches.length - 1) {
        stoppedAfter = bi + 1;
        for (const name of batches.slice(bi + 1).flat()) recaps.push({ host: name, ok: 0, changed: 0, failed: 0, skipped: 3, restarted: false, up: hosts.get(name)!.up, note: "not reached: max_fail_percentage stopped the play" });
        break;
      }
    }
  }
  const down = recaps.filter((r) => !r.up).length;
  const restarted = recaps.filter((r) => r.restarted).length;
  const together = d.serial ? Math.min(BATCH, restarted) : restarted;
  return { recaps, down, restarted, together, preview, stoppedAfter };
}

export function judge(run: RunId, d: Design) {
  const s = simulate(d, run);
  if (s.down) return { ok: false, text: `${s.down} of ${HOSTS.length} servers down: nginx refuses its config (duplicate directive)${s.stoppedAfter ? `; the play stopped after batch ${s.stoppedAfter}, so ${HOSTS.length - s.down} kept serving` : ""}`, s };
  if (run === 2 && s.restarted > 1) return { ok: false, text: `nothing needed changing but ${DRIFTED}, yet all ${s.restarted} servers restarted nginx${d.serial ? "" : " at the same moment"}`, s };
  if (s.together === HOSTS.length && run !== 1) return { ok: false, text: `all ${HOSTS.length} servers restart nginx at the same moment: a burst of refused connections`, s };
  if (run === 1) return { ok: true, text: `nginx installed and configured on all ${HOSTS.length}`, s };
  if (run === 2) return { ok: true, text: `only ${DRIFTED} changed: its hand edit is put back and only it restarts`, s };
  return { ok: true, text: `every server gets 4096, restarting ${BATCH} at a time while the rest serve`, s };
}

export function scorecard(d: Design) {
  return RUNS.map((r) => ({ run: r, ...judge(r.id, d) }));
}

// Collapse identical recap lines: "web-01..web-06 ok=2 changed=1".
export function grouped(recaps: Recap[]) {
  const out: { hosts: string; r: Recap }[] = [];
  for (const r of recaps) {
    const last = out[out.length - 1];
    const same = last && last.r.ok === r.ok && last.r.changed === r.changed && last.r.failed === r.failed && last.r.skipped === r.skipped && last.r.note === r.note;
    if (same) last.hosts = `${last.hosts.split("..")[0]}..${r.host}`;
    else out.push({ hosts: r.host, r });
  }
  return out;
}
