"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, useWalk } from "@/components/session/ui";
import { SessionControlBar } from "@/components/session/SessionControlBar";
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

export default function ContainersDemo() {
  const [mode, setMode] = useState<"container" | "vm">("container");
  const steps = mode === "container" ? CONTAINER : VM;
  const { stage, busy, run, setStage } = useWalk(steps.length, 480);

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Containers vs virtual machines"
        blurb="Both run your app on someone else's hardware. A container shares the host kernel. A virtual machine boots a second operating system."
      />

      <SessionControlBar
        label={stage !== null ? `Step ${stage + 1} of ${steps.length}` : "Pick a path, then walk the steps"}
        busy={busy}
        onRun={run}
        runLabel={mode === "container" ? "Start the container" : "Boot the machine"}
        accent={ACCENT}
      >
        <Choices
          accent={ACCENT}
          value={mode}
          onChange={(id) => {
            setMode(id);
            setStage(null);
          }}
          options={[
            { id: "container", label: "Container" },
            { id: "vm", label: "Virtual machine" },
          ]}
        />
      </SessionControlBar>

      <div className="mt-6">
        {steps.map((step, index) => (
          <div key={step.title}>
            <FlowStep n={index + 1} title={step.title} what={step.what} accent={ACCENT} active={stage === index}>
              <p className="text-sm text-[var(--muted)]">{step.body}</p>
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
    </SessionPage>
  );
}
