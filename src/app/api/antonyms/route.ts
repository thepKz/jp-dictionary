import { NextRequest, NextResponse } from "next/server";
import { getDb, EntryDoc } from "../db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kanji = (searchParams.get("kanji") || "").trim();
  if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
  try {
    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");
    await col.findOne({ kanji }, { projection: { _id: 0 } });
    return NextResponse.json({ kanji, antonyms: [] }); // antonyms removed
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


