import { fetchProjectStartCounts } from "@/lib/projectsStats";
import { supabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  const counts = await fetchProjectStartCounts();
  return Response.json({ configured: supabaseConfigured(), counts });
}
