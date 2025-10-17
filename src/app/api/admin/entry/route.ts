import { NextRequest, NextResponse } from "next/server";
import { getDb, EntryDoc } from "../../db/client";

// GET /api/admin/entry?kanji=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kanji = (searchParams.get("kanji") || "").trim();
    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");
    const doc = kanji ? await col.findOne({ kanji }, { projection: { _id: 0 } }) : null;
    return NextResponse.json({ ok: true, data: doc });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// POST /api/admin/entry  body: { kanji, reading?, meaning?, example?, translation?, antonyms?:[], synonyms?:[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kanji: string = (body.kanji || "").trim();
    if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
    const update: Partial<EntryDoc> = {};
    ["reading","meaning","example","translation","linkJP","linkVN","adjType"].forEach((k)=>{
      if (body[k] !== undefined) (update as any)[k] = body[k];
    });
    if (Array.isArray(body.antonyms)) update.antonyms = body.antonyms.filter((s:string)=>!!s);
    if (Array.isArray(body.synonyms)) update.synonyms = body.synonyms.filter((s:string)=>!!s);
    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");
    await col.updateOne({ kanji }, { $set: update }, { upsert: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


