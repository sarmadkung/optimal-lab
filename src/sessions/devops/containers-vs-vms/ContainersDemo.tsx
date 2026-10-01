"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";

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

export default function ContainersDemo() {
  const [mode, setMode] = useState<"container" | "vm">("container");
  const steps = mode === "container" ? CONTAINER : VM;
  const { stage, busy, run, setStage } = useWalk(steps.length, 480);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">DevOps · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Containers vs virtual machines</h1>
      <p className="mt-3 text-[var(--muted)]">
        Both run your app on someone else&apos;s hardware. A container shares the host kernel. A virtual
        machine boots a second operating system.
      </p>

      <div className="mt-6">
        <Choices
          accent={ACCENT}
          value={mode}
          onChange={(id) => {
            setMode(id);
            setStage(null);
          }}
          options={[
            { id: "container", label: "Start a container" },
            { id: "vm", label: "Boot a virtual machine" },
          ]}
        />
      </div>

      <div className="mt-6">
        {steps.map((step, index) => (
          <div key={step.title}>
            <FlowStep n={index + 1} title={step.title} what={step.what} accent={ACCENT} active={stage === index}>
              <p className="text-sm text-[var(--muted)]">{step.body}</p>
              {index === steps.length - 1 && (
                <div className="mt-4">
                  <RunButton busy={busy} onClick={run} accent={ACCENT}>
                    {mode === "container" ? "Start the container" : "Boot the machine"}
                  </RunButton>
                </div>
              )}
            </FlowStep>
            {index < steps.length - 1 && (
              <FlowArrow
                label={mode === "container" ? "still one kernel" : "a whole guest OS"}
                accent={ACCENT}
                active={stage === index + 1}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
