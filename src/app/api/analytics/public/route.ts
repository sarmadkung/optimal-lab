import { fetchPublicSiteStats } from "@/lib/siteAnalytics";
import { supabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  const stats = await fetchPublicSiteStats();
  return Response.json({ ...stats, configured: supabaseConfigured() && stats.configured });
}
