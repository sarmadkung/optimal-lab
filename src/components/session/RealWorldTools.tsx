import Link from "next/link";
import type { RealWorldSessionGroup, RealWorldTool } from "@/lib/realWorldTools";
import {
  getRealWorldTools,
  listRealWorldToolsForTrack,
  realWorldLinkLabel,
  uniqueToolCount,
} from "@/lib/realWorldTools";
import type { Track } from "@/lib/tracks";

const KIND_LABEL: Record<RealWorldTool["kind"], string> = {
  service: "Service",
  software: "Software",
  protocol: "Protocol",
  platform: "Platform",
  standard: "Standard",
};

type SessionProps = { trackId: string; sessionId: string; track?: never };
type TrackProps = { track: Track; trackId?: never; sessionId?: never };

/** Language-agnostic products and standards that implement the concept from this session. */
export function RealWorldTools(props: SessionProps | TrackProps) {
  if ("track" in props && props.track) {
    return <TrackRealWorldTools track={props.track} />;
  }
  return <SessionRealWorldTools trackId={props.trackId} sessionId={props.sessionId} />;
}

function SessionRealWorldTools({ trackId, sessionId }: SessionProps) {
  const entry = getRealWorldTools(trackId, sessionId);
  if (!entry?.tools.length) return null;

  return (
    <section
      aria-labelledby="real-world-tools-heading"
      className="mx-auto w-full max-w-6xl px-4 pb-10 pt-2"
    >
      <ToolsPanel
        headingId="real-world-tools-heading"
        lead={entry.lead}
        tools={entry.tools}
      />
    </section>
  );
}

function TrackRealWorldTools({ track }: { track: Track }) {
  const live = track.sessions.filter((s) => s.status === "live");
  const groups = listRealWorldToolsForTrack(track.id, live);
  if (!groups.length) return null;

  const total = uniqueToolCount(groups);

  return (
    <section id="tools" aria-labelledby="track-tools-heading" className="mt-14 scroll-mt-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">In production</p>
      <h2 id="track-tools-heading" className="mt-2 text-xl font-semibold">
        Tools you can use
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        {total} technologies across {groups.length} live {groups.length === 1 ? "session" : "sessions"}. Same
        names in any language — pick a session to see how the idea maps to the real world.
      </p>
      <p className="mt-1 text-xs text-[var(--faint)]">Services, platforms, protocols and standards — not one stack.</p>

      <div className="mt-6 space-y-8">
        {groups.map((group) => (
          <TrackToolGroup key={group.sessionId} trackId={track.id} group={group} />
        ))}
      </div>
    </section>
  );
}

function TrackToolGroup({ trackId, group }: { trackId: string; group: RealWorldSessionGroup }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold sm:text-lg">
          <Link
            href={`/tracks/${trackId}/${group.sessionId}`}
            className="text-[var(--text)] hover:text-[var(--accent)]"
          >
            {group.sessionTitle}
          </Link>
        </h3>
        <Link
          href={`/tracks/${trackId}/${group.sessionId}`}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          Open session →
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{group.lead}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {group.tools.map((tool) => (
          <li key={tool.name}>
            <ToolCard tool={tool} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToolsPanel({
  headingId,
  lead,
  tools,
}: {
  headingId: string;
  lead: string;
  tools: RealWorldTool[];
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">In production</p>
      <h2 id={headingId} className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
        Tools and technologies
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{lead}</p>
      <p className="mt-1 text-xs text-[var(--faint)]">
        Not tied to one language — use these names when you search docs or design a system.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.name}>
            <ToolCard tool={tool} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToolCard({ tool, compact = false }: { tool: RealWorldTool; compact?: boolean }) {
  const linkLabel = realWorldLinkLabel(tool.href);

  return (
    <a
      href={tool.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full rounded-lg border border-[var(--line)] bg-[var(--inset)] p-3 transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg)]"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`font-medium text-[var(--text)] ${compact ? "text-sm" : ""}`}>{tool.name}</span>
        <span className="rounded border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
          {KIND_LABEL[tool.kind]}
        </span>
      </div>
      <p className={`mt-1.5 text-[var(--muted)] ${compact ? "text-xs" : "text-sm"}`}>{tool.note}</p>
      <span className="mt-2 inline-block text-xs font-medium text-[var(--accent)]">{linkLabel}</span>
    </a>
  );
}
