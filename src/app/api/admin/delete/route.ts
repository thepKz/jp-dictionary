import { NextRequest, NextResponse } from "next/server";
import { getDb, EntryDoc, RatingDoc } from "../../db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kanji = (body.kanji || "").trim();
    if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
    const db = await getDb();
    const entries = db.collection<EntryDoc>("entries");
    const ratings = db.collection<RatingDoc>("ratings");
    const delEntry = await entries.deleteOne({ kanji });
    const delRatings = await ratings.deleteMany({ kanji });
    return NextResponse.json({ ok: true, deletedEntry: delEntry.deletedCount, deletedRatings: delRatings.deletedCount });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


