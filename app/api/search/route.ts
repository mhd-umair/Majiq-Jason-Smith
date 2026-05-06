import { NextResponse } from "next/server";
import { searchAll } from "@/lib/queries/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const hits = searchAll(q, 8);
  return NextResponse.json({ hits });
}
