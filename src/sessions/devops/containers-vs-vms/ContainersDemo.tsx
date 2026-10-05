"use client";

import { Fragment, useState } from "react";
import { FlowArrow, FlowSequence, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";

const ACCENT = "var(--ops)";

const CONTAINER = [
  { title: "Read the image", what: "An image is a stack of file layers, plus a command to run.", body: "Layers here: base files, libraries, your app. No second operating system." },
  { title: "Stack the layers", what: "The runtime unions those layers into one file view for this container.", body: "Your app sees one filesystem. Unchanged layers are shared with other containers." },
  { title: "Give it a private view", what: "Namespaces hide other processes, the network, and the host's files.", body: "The process thinks it is alone. It is still a process on the host kernel." },
  { title: "Cap CPU and memory", what: "Cgroups stop this container from using the whole machine.", body: "Limits are numbers on a process, not a virtual computer." },
  { title: "Start the process", what: "The app starts in seconds, because the kernel was already running.", body: "Many containers share that one kernel. That is the whole trade." },
];

const VM = [
  { title: "Allocate a virtual machine", what: "The hypervisor reserves CPU, memory, and a virtual disk.", body: "This is a computer made of software, sitting on the real one." },
  { title: "Boot a guest operating system", what: "That machine boots its own kernel, the same way a laptop does.", body: "Boot time is the cost of a full OS, not of your app." },
  { title: "Start guest drivers", what: "The guest kernel brings up its own device drivers and network.", body: "None of this is shared with the next virtual machine." },
  { title: "Load libraries", what: "The guest installs or mounts everything the app needs.", body: "Two VMs with the same library still each keep a copy in memory." },
  { title: "Start the app", what: "Only now does your process run, inside the guest.", body: "Stronger isolation. Much more to boot, and more to patch." },
];

type Lane = "container" | "vm";

const LANES: { id: Lane; title: string; sub: string; steps: typeof CONTAINER; ms: number; real: string }[] = [
  { id: "container", title: "Container", sub: "shares the host kernel", steps: CONTAINER, ms: 380, real: "about a second" },
  { id: "vm", title: "Virtual machine", sub: "boots its own operating system", steps: VM, ms: 1100, real: "tens of seconds to minutes" },
];

export default function ContainersDemo() {
  const container = useWalk(CONTAINER.length, LANES[0].ms);
  const vm = useWalk(VM.length, LANES[1].ms);
  const walks = { container, vm };
  const [ready, setReady] = useState<Record<Lane, boolean>>({ container: false, vm: false });
  const busy = container.busy || vm.busy;

  function run() {
    if (busy) return;
    setReady({ container: false, vm: false });
    for (const lane of LANES) {
      void walks[lane.id].run().then(() => setReady((r) => ({ ...r, [lane.id]: true })));
    }
  }

  const caption = busy
    ? ready.container
      ? "The container is already serving. The virtual machine is still booting its guest."
      : "Both start at once. Watch which one reaches its app first."
    : ready.container && ready.vm
      ? "Same app, same hardware. The container skipped a whole operating system boot."
      : "Press Start both to launch the same app each way, side by side.";

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Containers vs virtual machines"
        blurb="Both run your app on someone else's hardware. A container shares the host kernel. A virtual machine boots a second operating system."
      />

      <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p aria-live="polite" className="min-w-0 flex-1 text-sm text-[var(--text)]">
            {caption}
          </p>
          <RunButton busy={busy} onClick={run} accent={ACCENT} running="Starting…">
            Start both
          </RunButton>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-2">
        {LANES.map((lane) => {
          const walk = walks[lane.id];
          const done = ready[lane.id] ? lane.steps.length : (walk.stage ?? 0);
          return (
            <section key={lane.id} aria-label={lane.title} className="min-w-0">
              <header className="mb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold">{lane.title}</h2>
                  <span
                    className="font-mono text-xs"
                    style={{ color: ready[lane.id] ? "var(--good)" : walk.busy ? ACCENT : "var(--faint)" }}
                  >
                    {ready[lane.id] ? "app running" : walk.busy ? `step ${done + 1} of ${lane.steps.length}` : "stopped"}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)]">{lane.sub}</p>
                <div className="mt-2 h-1 overflow-hidden rounded bg-[var(--track)]" aria-hidden>
                  <div
                    className="h-full rounded transition-[width] duration-300"
                    style={{ width: `${(done / lane.steps.length) * 100}%`, background: ready[lane.id] ? "var(--good)" : ACCENT }}
                  />
                </div>
              </header>
              <FlowSequence mode="stage" accent={ACCENT}>
                {lane.steps.map((step, index) => (
                  <Fragment key={step.title}>
                    <FlowStep n={index + 1} title={step.title} what={step.what} accent={ACCENT} active={walk.stage === index}>
                      <p className="text-sm text-[var(--muted)]">{step.body}</p>
                    </FlowStep>
                    {index < lane.steps.length - 1 && (
                      <FlowArrow label={lane.id === "container" ? "still one kernel" : "a whole guest OS"} accent={ACCENT} active={walk.stage === index + 1} />
                    )}
                  </Fragment>
                ))}
              </FlowSequence>
              <p className="mt-3 text-xs text-[var(--faint)]">In production this takes {lane.real}.</p>
            </section>
          );
        })}
      </div>
    </SessionPage>
  );
}
