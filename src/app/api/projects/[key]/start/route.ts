import { incrementProjectStart } from "@/lib/projectsStats";

type Params = { params: Promise<{ key: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { key: raw } = await params;
  const key = decodeURIComponent(raw);
  const count = await incrementProjectStart(key);

  if (count === null) {
    return Response.json({ ok: false, reason: "invalid_or_unconfigured" });
  }

  return Response.json({ ok: true, count });
}
