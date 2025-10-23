import { NextRequest, NextResponse } from "next/server";
// import { createHash } from "node:crypto";
// import { getDb } from "../db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kanji = (searchParams.get("kanji") || "").trim();
  if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
  try {
    // Ratings removed - return empty data
    return NextResponse.json({ kanji, avg: 0, count: 0 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kanji: string = (body.kanji || "").trim();
    const score: number = Number(body.score);
    if (!kanji || !(score >= 1 && score <= 5)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    
    // Ratings removed - just return success
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


