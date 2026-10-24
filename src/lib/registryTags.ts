// A month in a container registry: 60 images pushed from main, two releases, a hotfix,
// a scale-up and a rollback. Images are made of layers stored once per digest; tags are
// movable names, digests are content hashes (real SHA-256 over each manifest here); a
// nightly retention policy deletes what it doesn't keep. Sizes and dates are illustrative.

import { sha256Hex } from "./hashing";

export type Tagging = "latest" | "sha" | "release";
export type Ref = "tag" | "digest";
export type Retention = "none" | "lastN" | "smart";
export type Design = { tagging: Tagging; ref: Ref; immutable: boolean; retention: Retention };

export const FIRST: Design = { tagging: "release", ref: "tag", immutable: false, retention: "lastN" };
export const FIXED: Design = { tagging: "release", ref: "digest", immutable: true, retention: "smart" };

export const KEEP_N = 10;
export const PUSHES = 60;
export const LAYER_MB = { base: 80, deps: 120, app: 15 };
export const DAYS = { release1: 2, release2: 9, hotfix: 12, scale: 20, rollback: 28 };

export type Image = { i: number; day: number; sha: string; layers: string[]; digest: string; tags: string[] };

const dayOf = (i: number) => Math.floor(i / 2) + 1;
const depsVersion = (day: number) => (day >= 24 ? 4 : day >= 16 ? 3 : day >= 8 ? 2 : 1);

export function images(d: Design): Image[] {
  const list: Image[] = [];
  for (let i = 0; i < PUSHES; i++) {
    const day = dayOf(i);
    const sha = sha256Hex(`commit ${i}`).slice(0, 7);
    const layers = [`base-${day >= 15 ? 2 : 1}`, `deps-${depsVersion(day)}`, `app-${i}`];
    const manifest = JSON.stringify({ schemaVersion: 2, layers });
    list.push({ i, day, sha, layers, digest: "sha256:" + sha256Hex(manifest), tags: [] });
  }
  // Every push moves :latest; sha tagging adds the commit; release tagging adds versions too.
  for (const img of list) {
    if (d.tagging === "sha" || d.tagging === "release") img.tags.push(img.sha);
  }
  if (d.tagging === "release") {
    first(list, DAYS.release1).tags.push("v1.41.0");
    first(list, DAYS.release2).tags.push("v1.42.0");
  }
  list[list.length - 1].tags.push("latest");
  return list;
}
const first = (list: Image[], day: number) => list.find((x) => x.day === day)!;

export function storage(list: Image[]) {
  const unique = new Set(list.flatMap((x) => x.layers));
  const mb = (l: string) => LAYER_MB[l.split("-")[0] as keyof typeof LAYER_MB];
  return { naive: list.length * (LAYER_MB.base + LAYER_MB.deps + LAYER_MB.app), deduped: [...unique].reduce((a, l) => a + mb(l), 0), layers: unique.size };
}

// Which images survive a nightly retention run on a given day.
export function kept(list: Image[], d: Design, day: number, deployed: Image[]) {
  const pushed = list.filter((x) => x.day <= day);
  if (d.retention === "none") return pushed;
  const recent = new Set(pushed.slice(-KEEP_N).map((x) => x.i));
  return pushed.filter((x) => recent.has(x.i) || (d.retention === "smart" && (x.tags.some((t) => t.startsWith("v")) || deployed.some((y) => y.i === x.i))));
}

export type Step = { day: number; title: string; ok: boolean; text: string };

export function month(d: Design) {
  const list = images(d);
  const steps: Step[] = [];
  const rel1 = first(list, DAYS.release1);
  const rel2 = first(list, DAYS.release2);
  const refFor = (img: Image) => (d.ref === "digest" ? `shop@${img.digest.slice(0, 19)}…` : d.tagging === "latest" ? "shop:latest" : d.tagging === "sha" ? `shop:${img.sha}` : `shop:${img.tags.find((t) => t.startsWith("v"))}`);

  steps.push({ day: DAYS.release2, title: "Release v1.42 to 3 nodes", ok: true, text: `deploy ${refFor(rel2)}` });

  // The hotfix: a new build with a one-line fix.
  const hot = first(list, DAYS.hotfix);
  let prod = rel2;
  let mixed = false;
  if (d.tagging === "release" && d.ref === "tag") {
    if (d.immutable) {
      hot.tags.push("v1.42.1");
      prod = hot;
      steps.push({ day: DAYS.hotfix, title: "Hotfix", ok: true, text: "re-pushing v1.42.0 is rejected (tags are immutable), so it ships as v1.42.1 and every node is redeployed" });
    } else {
      rel2.tags = rel2.tags.filter((t) => t !== "v1.42.0");
      hot.tags.push("v1.42.0");
      mixed = true;
      steps.push({ day: DAYS.hotfix, title: "Hotfix", ok: false, text: "the fix is pushed as v1.42.0 again; the 3 running nodes keep the old image under the same name" });
    }
  } else {
    if (d.tagging === "release") hot.tags.push("v1.42.1");
    prod = hot;
    steps.push({ day: DAYS.hotfix, title: "Hotfix", ok: true, text: `ships as a new image and is deployed by ${d.ref === "digest" ? "digest" : d.tagging === "latest" ? "re-pulling :latest" : "its commit tag"}` });
  }

  // Scale-up: two new nodes pull whatever the deployment's reference points at today.
  const alive = kept(list, d, DAYS.scale, [prod, rel1, rel2]);
  const has = (img: Image) => alive.some((x) => x.i === img.i);
  const latestNow = list.filter((x) => x.day <= DAYS.scale).at(-1)!;
  let pulled: Image | null;
  if (d.ref === "digest") pulled = has(prod) ? prod : null;
  else if (d.tagging === "latest") pulled = latestNow;
  else pulled = has(prod) ? prod : null;
  if (!pulled) steps.push({ day: DAYS.scale, title: "Autoscaler adds 2 nodes", ok: false, text: `retention deleted the running image; the new nodes fail with ImagePullBackOff` });
  else if (pulled !== prod) steps.push({ day: DAYS.scale, title: "Autoscaler adds 2 nodes", ok: false, text: `:latest now means build #${pulled.i} from day ${pulled.day}: unreleased code on 2 of 5 nodes` });
  else if (mixed) steps.push({ day: DAYS.scale, title: "Autoscaler adds 2 nodes", ok: false, text: "they pull v1.42.0 and get the hotfix; 3 old nodes don't: two different images under one tag" });
  else steps.push({ day: DAYS.scale, title: "Autoscaler adds 2 nodes", ok: true, text: "they pull exactly what the other nodes run" });

  // Rollback to the previous release.
  const aliveLater = kept(list, d, DAYS.rollback, [prod, rel1, rel2]);
  const canName = d.tagging !== "latest" || d.ref === "digest";
  const exists = aliveLater.some((x) => x.i === rel1.i);
  steps.push({
    day: DAYS.rollback,
    title: "Roll back to v1.41",
    ok: canName && exists,
    text: !canName ? "nothing names the old build: :latest has moved on 50 times" : exists ? `${refFor(rel1)} is still in the registry` : "retention deleted it weeks ago; the rollback has to rebuild old code",
  });

  return { list, steps, storage: storage(aliveLater), all: storage(list), keptCount: aliveLater.length, ok: steps.filter((s) => s.ok).length };
}
