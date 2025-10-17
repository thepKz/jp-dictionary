import { NextRequest, NextResponse } from "next/server";
import { getDb, EntryDoc } from "../db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kanji = (searchParams.get("kanji") || "").trim();
  if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
  try {
    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");
    const doc = await col.findOne({ kanji }, { projection: { antonyms: 1, _id: 0 } });
    return NextResponse.json({ kanji, antonyms: doc?.antonyms || [] });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


