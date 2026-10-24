// Five storage needs, each placed on block, file or object storage. Cost is size × the
// tier's price per GB-month (illustrative, in the range of the big clouds' list prices);
// whether it fits follows how each kind is attached and accessed.

export type Kind = "block" | "file" | "object";
export type UseId = "db" | "shared" | "photos" | "training" | "backups";
export type Design = Record<UseId, Kind> & { lifecycle: boolean };

export const FIRST: Design = { db: "block", shared: "block", photos: "block", training: "file", backups: "block", lifecycle: false };
export const FIXED: Design = { db: "block", shared: "file", photos: "object", training: "object", backups: "object", lifecycle: true };

export const PRICE_GB: Record<Kind | "archive", number> = { block: 0.08, file: 0.3, object: 0.023, archive: 0.001 };
export const LATENCY: Record<Kind, string> = { block: "~1 ms", file: "a few ms", object: "tens of ms to first byte" };
export const KINDS: { id: Kind; label: string; example: string; how: string }[] = [
  { id: "block", label: "Block", example: "EBS, Persistent Disk", how: "a disk attached to one server" },
  { id: "file", label: "File", example: "EFS, Filestore (NFS)", how: "a shared folder many servers mount" },
  { id: "object", label: "Object", example: "S3, GCS, Blob", how: "files over HTTP by key, any size" },
];

export const USES: { id: UseId; title: string; gb: number; who: "dbserver" | "web" | "jobs"; what: string }[] = [
  { id: "db", title: "Postgres data directory", gb: 200, who: "dbserver", what: "200 GB of small random reads and writes, with fsync, from one server" },
  { id: "shared", title: "Upload folder shared by 4 web servers", gb: 100, who: "web", what: "100 GB the app reads and writes as normal files from every server" },
  { id: "photos", title: "User photos served to browsers", gb: 2000, who: "web", what: "2 TB and growing, each photo read many times through a CDN" },
  { id: "training", title: "Training data read by 50 jobs at once", gb: 10000, who: "jobs", what: "10 TB, read in parallel, start to finish, every run" },
  { id: "backups", title: "Nightly backups kept a year", gb: 30000, who: "jobs", what: "30 TB written once and almost never read" },
];

export function fit(u: UseId, k: Kind): { ok: boolean; text: string } {
  const t: Record<UseId, Record<Kind, { ok: boolean; text: string }>> = {
    db: {
      block: { ok: true, text: "low-latency disk on the one server that needs it; what databases are built for" },
      file: { ok: false, text: "network file systems add latency to every fsync, and locking over NFS is a known way to corrupt a database" },
      object: { ok: false, text: "Postgres needs a filesystem; object storage is reached by HTTP, not mounted" },
    },
    shared: {
      block: { ok: false, text: "a regular block volume attaches to one server at a time; the other three can't see the files" },
      file: { ok: true, text: "all four mount the same folder; the app needs no change" },
      object: { ok: true, text: "works if the app writes through the object API instead of the filesystem: a code change, cheaper over time" },
    },
    photos: {
      block: { ok: false, text: "one server's disk becomes the bottleneck, and you resize it by hand as it fills" },
      file: { ok: false, text: "works, at more than ten times object storage's price per GB" },
      object: { ok: true, text: "cheap per GB, no size to plan, served straight to the CDN" },
    },
    training: {
      block: { ok: false, text: "50 jobs can't read one block volume; you'd copy 10 TB to 50 disks" },
      file: { ok: false, text: "works, but 10 TB on a file system costs a fortune and its throughput is shared by all 50" },
      object: { ok: true, text: "parallel reads scale with the number of readers; the cheapest per GB" },
    },
    backups: {
      block: { ok: false, text: "30 TB of provisioned disk on one server, paid for every month, in the same place as what it backs up" },
      file: { ok: false, text: "the most expensive per GB, for data nobody reads" },
      object: { ok: true, text: "cheap, durable across zones, and can move to an archive tier as it ages" },
    },
  };
  return t[u][k];
}

export function monthly(u: (typeof USES)[number], k: Kind, lifecycle: boolean) {
  if (u.id === "backups" && k === "object" && lifecycle) {
    // Last 30 days stay in the standard tier; older backups move to archive.
    const recent = u.gb / 12;
    return recent * PRICE_GB.object + (u.gb - recent) * PRICE_GB.archive;
  }
  return u.gb * PRICE_GB[k];
}

export function evaluate(d: Design) {
  const rows = USES.map((u) => ({ u, kind: d[u.id], cost: monthly(u, d[u.id], d.lifecycle), ...fit(u.id, d[u.id]) }));
  return { rows, total: rows.reduce((a, r) => a + r.cost, 0), ok: rows.filter((r) => r.ok).length };
}
