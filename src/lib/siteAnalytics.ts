import { supabaseAdmin } from "@/lib/supabase/server";

export type PublicSiteStats = {
  pageViews: number;
  uniqueVisitors: number;
  projectStarts: number;
  configured: boolean;
};

const emptyStats = (): PublicSiteStats => ({
  pageViews: 0,
  uniqueVisitors: 0,
  projectStarts: 0,
  configured: false,
});

export async function fetchPublicSiteStats(): Promise<PublicSiteStats> {
  const db = supabaseAdmin();
  if (!db) return emptyStats();

  const { data, error } = await db.rpc("get_public_site_stats");
  if (error || !data || typeof data !== "object") {
    return emptyStats();
  }

  const row = data as Record<string, unknown>;
  return {
    pageViews: typeof row.page_views === "number" ? row.page_views : 0,
    uniqueVisitors: typeof row.unique_visitors === "number" ? row.unique_visitors : 0,
    projectStarts: typeof row.project_starts === "number" ? row.project_starts : 0,
    configured: true,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVisitorId(value: string) {
  return UUID_RE.test(value);
}

export async function recordSiteVisit(visitorId: string): Promise<PublicSiteStats | null> {
  if (!isVisitorId(visitorId)) return null;

  const db = supabaseAdmin();
  if (!db) return null;

  const { data, error } = await db.rpc("record_site_visit", { p_visitor_id: visitorId });
  if (error || !data || typeof data !== "object") return null;

  const stats = await fetchPublicSiteStats();
  return stats.configured ? stats : null;
}
