import { REAL_WORLD_TOOLS } from "@/lib/realWorldTools";
import { TRACKS, sessionHref, trackHref, type Session, type Track } from "@/lib/tracks";

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "session" | "track" | "page" | "tool";
  live?: boolean;
  accent?: string;
};

export type SearchDoc = SearchResult & {
  /** Lowercase tokens for matching */
  haystack: string;
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildHaystack(parts: string[]) {
  return parts.join(" ").toLowerCase();
}

export function buildSearchIndex(): SearchDoc[] {
  const docs: SearchDoc[] = [
    {
      id: "page-home",
      title: "Home",
      subtitle: "Tracks, live sessions, roadmaps, projects, practice",
      href: "/",
      kind: "page",
      haystack: buildHaystack(["home", "start", "tracks", "live sessions", "roadmaps", "projects", "practice"]),
    },
    {
      id: "page-tracks",
      title: "All tracks",
      subtitle: "Browse every subject and session",
      href: "/tracks",
      kind: "page",
      haystack: buildHaystack(["tracks", "browse", "subjects", "sessions"]),
    },
  ];

  for (const track of TRACKS) {
    docs.push({
      id: `track-${track.id}`,
      title: track.title,
      subtitle: track.tagline,
      href: trackHref(track),
      kind: "track",
      accent: track.accent,
      haystack: buildHaystack([track.id, track.title, track.short, track.tagline, ...(track.learningPathBlurb ? [track.learningPathBlurb] : [])]),
    });

    for (const session of track.sessions) {
      docs.push(sessionDoc(track, session));
    }

    const toolsAnchor = `${trackHref(track)}#tools`;
    docs.push({
      id: `track-tools-${track.id}`,
      title: `${track.short} · In production`,
      subtitle: "Tools and technologies for this track",
      href: toolsAnchor,
      kind: "page",
      accent: track.accent,
      haystack: buildHaystack([track.short, track.title, "tools", "production", "redis", "technologies"]),
    });
  }

  for (const [key, entry] of Object.entries(REAL_WORLD_TOOLS)) {
    const [trackId, sessionId] = key.split("/");
    const track = TRACKS.find((t) => t.id === trackId);
    const session = track?.sessions.find((s) => s.id === sessionId);
    for (const tool of entry.tools) {
      docs.push({
        id: `tool-${key}-${tool.name}`,
        title: tool.name,
        subtitle: session ? `${session.title} · ${tool.note}` : tool.note,
        href: tool.href,
        kind: "tool",
        live: session?.status === "live",
        accent: track?.accent,
        haystack: buildHaystack([tool.name, tool.kind, tool.note, entry.lead, track?.title ?? "", session?.title ?? "", sessionId.replace(/-/g, " ")]),
      });
    }
  }

  return docs;
}

function sessionDoc(track: Track, session: Session): SearchDoc {
  const slug = session.id.replace(/-/g, " ");
  return {
    id: `session-${track.id}-${session.id}`,
    title: session.title,
    subtitle: `${track.short} · ${session.blurb}`,
    href: sessionHref(track, session),
    kind: "session",
    live: session.status === "live",
    accent: track.accent,
    haystack: buildHaystack([
      track.id,
      track.title,
      track.short,
      session.id,
      slug,
      session.title,
      session.blurb,
      session.tag ?? "",
    ]),
  };
}

function scoreDoc(doc: SearchDoc, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const title = doc.title.toLowerCase();
  const hay = doc.haystack;

  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 65;

  const terms = tokenize(q);
  if (!terms.length) return 0;

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 24;
    else if (hay.includes(term)) score += 12;
    else if (term.length >= 4 && hay.split(" ").some((w) => w.startsWith(term))) score += 8;
  }

  if (doc.kind === "session" && doc.live) score += 4;
  if (doc.kind === "tool") score += 1;
  return score;
}

export function searchDocs(docs: SearchDoc[], query: string, limit = 12): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  return docs
    .map((doc) => ({ doc, score: scoreDoc(doc, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))
    .slice(0, limit)
    .map(({ doc }) => {
      const { haystack: _h, ...result } = doc;
      return result;
    });
}
