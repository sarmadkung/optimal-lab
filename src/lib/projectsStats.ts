import { isCatalogProjectKey } from "@/lib/projects";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function fetchProjectStartCounts(): Promise<Record<string, number>> {
  const db = supabaseAdmin();
  if (!db) return {};

  const { data, error } = await db.from("project_start_counts").select("project_key, started_count");
  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (typeof row.project_key === "string" && typeof row.started_count === "number") {
      counts[row.project_key] = row.started_count;
    }
  }
  return counts;
}

export async function incrementProjectStart(projectKey: string): Promise<number | null> {
  if (!isCatalogProjectKey(projectKey)) return null;

  const db = supabaseAdmin();
  if (!db) return null;

  const { data, error } = await db.rpc("increment_project_start", { p_key: projectKey });
  if (error || typeof data !== "number") return null;
  return data;
}
