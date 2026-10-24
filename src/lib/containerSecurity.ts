// One app image, built and run five ways, against five attacks. The image is replayed
// layer by layer, so a file deleted in a later layer is still found in the layer that
// added it. Base image sizes, package counts and CVE counts are illustrative.

export type BaseId = "full" | "slim" | "distroless";
export type Design = { base: BaseId; scanGate: boolean; secretMount: boolean; nonRoot: boolean; hardened: boolean; noSocket: boolean };
export type AttackId = "cve" | "secret" | "rce" | "network" | "escape";

export const FIRST: Design = { base: "full", scanGate: false, secretMount: false, nonRoot: false, hardened: false, noSocket: false };
export const FIXED: Design = { base: "distroless", scanGate: true, secretMount: true, nonRoot: true, hardened: true, noSocket: true };

export const BASES: { id: BaseId; label: string; image: string; mb: number; packages: number; shell: boolean; pkgManager: boolean; fixableCritical: number }[] = [
  { id: "full", label: "Full OS", image: "ubuntu:24.04", mb: 78, packages: 92, shell: true, pkgManager: true, fixableCritical: 3 },
  { id: "slim", label: "Slim", image: "debian:12-slim", mb: 75, packages: 88, shell: true, pkgManager: true, fixableCritical: 1 },
  { id: "distroless", label: "Distroless", image: "gcr.io/distroless/base-debian12", mb: 21, packages: 6, shell: false, pkgManager: false, fixableCritical: 0 },
];

export const ATTACKS: { id: AttackId; title: string; step: number }[] = [
  { id: "cve", title: "A known critical CVE in a base package", step: 1 },
  { id: "secret", title: "Someone pulls the image and digs through it", step: 2 },
  { id: "rce", title: "A bug gives an attacker code execution in the app", step: 3 },
  { id: "network", title: "From there, spoof other containers' traffic", step: 3 },
  { id: "escape", title: "From there, take over the host", step: 4 },
];

type Layer = { line: string; add: string[]; remove: string[] };

export function layers(d: Design): Layer[] {
  const base = BASES.find((b) => b.id === d.base)!;
  const out: Layer[] = [{ line: `FROM ${base.image}`, add: base.shell ? ["/bin/sh", "/usr/bin/apt"] : ["/etc/passwd"], remove: [] }];
  if (d.secretMount) {
    out.push({ line: "RUN --mount=type=secret,id=token fetch-deps --token-file /run/secrets/token", add: ["/app/deps"], remove: [] });
  } else {
    out.push({ line: "COPY registry-token /tmp/token", add: ["/tmp/token"], remove: [] });
    out.push({ line: "RUN fetch-deps --token-file /tmp/token", add: ["/app/deps"], remove: [] });
    out.push({ line: "RUN rm /tmp/token", add: [], remove: ["/tmp/token"] });
  }
  out.push({ line: "COPY build/ /app/", add: ["/app/server"], remove: [] });
  if (d.nonRoot) out.push({ line: "USER 10001", add: [], remove: [] });
  return out;
}

// What `ls` shows in a running container, and what any layer tarball still contains.
export function filesystem(ls: Layer[]) {
  const visible = new Set<string>();
  const everAdded: { file: string; layer: number }[] = [];
  ls.forEach((l, i) => {
    for (const f of l.add) {
      visible.add(f);
      everAdded.push({ file: f, layer: i });
    }
    for (const f of l.remove) visible.delete(f);
  });
  return { visible: [...visible], everAdded };
}

export function runFlags(d: Design) {
  const f = ["docker run"];
  if (d.hardened) f.push("--read-only", "--cap-drop ALL", "--security-opt no-new-privileges");
  if (!d.noSocket) f.push("-v /var/run/docker.sock:/var/run/docker.sock");
  f.push("shop-api");
  return f.join(" ");
}

export function judge(a: AttackId, d: Design): { safe: boolean; text: string } {
  const base = BASES.find((b) => b.id === d.base)!;
  switch (a) {
    case "cve":
      if (base.fixableCritical === 0) return { safe: true, text: `${base.image} ships ${base.packages} packages; none has a known critical CVE today` };
      return d.scanGate
        ? { safe: true, text: `the scan finds ${base.fixableCritical} critical CVE${base.fixableCritical === 1 ? "" : "s"} with fixes available and fails the build until the base is updated` }
        : { safe: false, text: `${base.fixableCritical} critical CVE${base.fixableCritical === 1 ? "" : "s"} with available fixes ship to production unnoticed` };
    case "secret": {
      const fs = filesystem(layers(d));
      const hit = fs.everAdded.find((x) => x.file === "/tmp/token");
      return hit
        ? { safe: false, text: `rm hid /tmp/token from the final filesystem, but layer ${hit.layer + 1} still contains it; anyone who can pull can read the registry token` }
        : { safe: true, text: "the token was mounted only during the build step and never written to a layer" };
    }
    case "rce": {
      const can: string[] = [];
      if (base.shell) can.push("gets a shell");
      if (!d.nonRoot && base.pkgManager) can.push("installs tools as root");
      // COPY leaves files owned by root, so a non-root user can't change the app itself.
      if (!d.hardened) can.push(d.nonRoot ? "drops files in writable directories like /tmp" : "rewrites the app's files");
      return can.length ? { safe: false, text: `the attacker ${can.join(", ")}` } : { safe: true, text: "no shell, no root, a read-only filesystem: the attacker can only run what's already there" };
    }
    case "network":
      return d.hardened
        ? { safe: true, text: "--cap-drop ALL removed NET_RAW, so no raw sockets" }
        : { safe: false, text: "Docker keeps NET_RAW by default: raw sockets can spoof neighbours on the bridge network" };
    case "escape":
      return d.noSocket
        ? { safe: true, text: "nothing from the host is mounted; escaping needs a kernel bug" }
        : { safe: false, text: "the mounted Docker socket lets it start a privileged container with the host's disk mounted: full control of the host" };
  }
}

export function scorecard(d: Design) {
  return ATTACKS.map((a) => ({ attack: a, ...judge(a.id, d) }));
}
