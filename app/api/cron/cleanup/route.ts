import { storageEnabled } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily Vercel Cron (vercel.json): delete user uploads older than 48 hours from Supabase Storage.
// Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("forbidden", { status: 403 });
  if (!storageEnabled()) return Response.json({ skipped: "storage not configured" });

  const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/store-media?action=cleanup&prefix=uploads&hours=48`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      apikey: process.env.SUPABASE_ANON_KEY!,
      "x-swelt-secret": process.env.SWELT_DB_SECRET!,
    },
    signal: AbortSignal.timeout(280_000),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  console.log("cleanup uploads", JSON.stringify(data));
  return Response.json(data, { status: res.ok ? 200 : 500 });
}
