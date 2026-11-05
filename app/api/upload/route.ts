import { getCaller, unauthorized } from "@/lib/auth";
import { blobEnabled, uploadFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "File is larger than 15 MB" }, { status: 413 });
  if (!/^(image|video)\//.test(file.type)) return Response.json({ error: "Only images and videos" }, { status: 415 });
  if (blobEnabled()) return Response.json({ url: await uploadFile(file, caller.userId) });
  // No blob storage: inline small images as data URIs.
  if (file.size > 4 * 1024 * 1024) return Response.json({ error: "Uploads over 4 MB need Blob storage; paste a URL instead" }, { status: 413 });
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return Response.json({ url: `data:${file.type};base64,${b64}` });
}
