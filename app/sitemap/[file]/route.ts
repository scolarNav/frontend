import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { entriesForId, urlsetXml, XML_HEADERS } from "@/lib/sitemap-data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { file: string } }) {
  const match = /^(\d+)\.xml$/.exec(params.file);
  if (!match) return new NextResponse("Not found", { status: 404 });
  const entries = await entriesForId(Number(match[1]), absoluteUrl);
  if (!entries) return new NextResponse("Not found", { status: 404 });
  return new Response(urlsetXml(entries), { headers: XML_HEADERS });
}
