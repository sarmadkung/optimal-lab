import { recordSiteVisit } from "@/lib/siteAnalytics";

export async function POST(request: Request) {
  let body: { visitorId?: string };
  try {
    body = (await request.json()) as { visitorId?: string };
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const visitorId = body.visitorId?.trim();
  if (!visitorId) return Response.json({ ok: false }, { status: 400 });

  const stats = await recordSiteVisit(visitorId);
  if (!stats) return Response.json({ ok: false, reason: "unconfigured_or_invalid" });

  return Response.json({ ok: true, stats });
}
