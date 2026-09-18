import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/revalidate
 * Body: { secret: string, tag: string }
 *
 * Called by the ScolarNav backend after any opportunity update so the
 * Next.js Data Cache drops the stale page immediately.
 *
 * Set REVALIDATION_SECRET to the same value in both Next.js and the backend.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Revalidation not configured." }, { status: 503 });
  }

  let body: { secret?: string; tag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.secret !== secret) {
    return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
  }

  if (!body.tag || typeof body.tag !== "string") {
    return NextResponse.json({ error: "tag is required." }, { status: 400 });
  }

  revalidateTag(body.tag);
  return NextResponse.json({ revalidated: true, tag: body.tag });
}
