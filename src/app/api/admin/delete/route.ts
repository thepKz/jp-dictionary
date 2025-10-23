import { NextRequest, NextResponse } from "next/server";
import { getDb, EntryDoc } from "../../db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kanji = (body.kanji || "").trim();
    if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
    const db = await getDb();
    const entries = db.collection<EntryDoc>("entries");
    const delEntry = await entries.deleteOne({ kanji });
    return NextResponse.json({ ok: true, deletedEntry: delEntry.deletedCount });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


