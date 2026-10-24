// Who runs each layer of a web shop under five hosting models, and who acts when five
// ordinary things happen. Ownership follows the shared responsibility model the big clouds
// publish; the monthly operations hours are illustrative.

export type Model = "onprem" | "iaas" | "paas" | "faas" | "saas";
export type Owner = "you" | "shared" | "provider";
export type LayerId = "hardware" | "network" | "os" | "runtime" | "scaling" | "app" | "data" | "access";
export type EventId = "cve" | "spike" | "disk" | "delete" | "leaver";

export const MODELS: { id: Model; label: string; example: string; opsHours: number; gives: string }[] = [
  { id: "onprem", label: "Your own servers", example: "a rack in a colo", opsHours: 70, gives: "full control of everything, including the kernel and the hardware" },
  { id: "iaas", label: "IaaS (VMs)", example: "EC2, Compute Engine", opsHours: 35, gives: "any OS, any software, kernel settings, long-running processes" },
  { id: "paas", label: "PaaS / containers", example: "Cloud Run, App Runner, Heroku", opsHours: 12, gives: "your own container image and runtime version" },
  { id: "faas", label: "Serverless functions", example: "Lambda, Cloud Functions", opsHours: 6, gives: "only your function code, within time and memory limits" },
  { id: "saas", label: "SaaS", example: "Shopify, Salesforce", opsHours: 2, gives: "configuration and data; the software is theirs" },
];

export const LAYERS: { id: LayerId; label: string; owners: Record<Model, Owner> }[] = [
  { id: "hardware", label: "Data centre and hardware", owners: { onprem: "you", iaas: "provider", paas: "provider", faas: "provider", saas: "provider" } },
  { id: "network", label: "Network and virtualisation", owners: { onprem: "you", iaas: "shared", paas: "provider", faas: "provider", saas: "provider" } },
  { id: "os", label: "Operating system and patches", owners: { onprem: "you", iaas: "you", paas: "provider", faas: "provider", saas: "provider" } },
  { id: "runtime", label: "Runtime and libraries", owners: { onprem: "you", iaas: "you", paas: "you", faas: "shared", saas: "provider" } },
  { id: "scaling", label: "Capacity and scaling", owners: { onprem: "you", iaas: "shared", paas: "shared", faas: "provider", saas: "provider" } },
  { id: "app", label: "Application code", owners: { onprem: "you", iaas: "you", paas: "you", faas: "you", saas: "provider" } },
  { id: "data", label: "Your data and backups", owners: { onprem: "you", iaas: "you", paas: "you", faas: "you", saas: "shared" } },
  { id: "access", label: "Who can access what", owners: { onprem: "you", iaas: "you", paas: "you", faas: "you", saas: "you" } },
];

export const EVENTS: { id: EventId; title: string; layer: LayerId; step: number }[] = [
  { id: "disk", title: "A disk fails", layer: "hardware", step: 0 },
  { id: "cve", title: "A critical OpenSSL vulnerability", layer: "os", step: 1 },
  { id: "spike", title: "Traffic triples for a launch", layer: "scaling", step: 2 },
  { id: "delete", title: "A bug deletes customer records", layer: "data", step: 4 },
  { id: "leaver", title: "A contractor leaves", layer: "access", step: 4 },
];

const RESPONSES: Record<EventId, Record<Owner, string>> = {
  disk: { you: "you swap the disk and rebuild the array, if there's a spare", shared: "the provider replaces it; you restart what was on it", provider: "the provider moves your workload to healthy hardware; you never hear about it" },
  cve: { you: "you patch and reboot every server yourself, this week", shared: "the provider patches the host; you rebuild your image", provider: "the provider patches the hosts underneath you" },
  spike: { you: "you order and rack hardware weeks ahead, or you don't scale", shared: "you raise the instance limits and autoscaling rules in time", provider: "it scales per request; you only check the concurrency limits" },
  delete: { you: "only your own backups bring them back; no provider restores your data for you", shared: "the vendor keeps the system running, but restoring your records needs your exports or a backup add-on", provider: "" },
  leaver: { you: "removing the access is on you, in every model", shared: "", provider: "" },
};

export function owner(layer: LayerId, m: Model) {
  return LAYERS.find((l) => l.id === layer)!.owners[m];
}

export function respond(e: EventId, m: Model) {
  const ev = EVENTS.find((x) => x.id === e)!;
  const o = owner(ev.layer, m);
  return { owner: o, text: RESPONSES[e][o] };
}

export function yours(m: Model) {
  return LAYERS.filter((l) => l.owners[m] === "you").length + LAYERS.filter((l) => l.owners[m] === "shared").length / 2;
}

// The five steps group the eight layers.
export const STEP_LAYERS: LayerId[][] = [["hardware", "network"], ["os"], ["runtime", "scaling"], ["app"], ["data", "access"]];
