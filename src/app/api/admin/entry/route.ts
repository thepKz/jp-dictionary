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

// POST /api/admin/entry  body: { kanji, reading?, meaning?, example?, translation?, linkJP?, linkVN?, highlightTerm?, adjType? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kanji: string = (body.kanji || "").trim();
    if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
    
    // Business rules validation
    const reading: string = (body.reading || "").trim();
    const meaning: string = (body.meaning || "").trim();
    const adjType: string = body.adjType;
    
    // Validate required fields
    if (!reading) return NextResponse.json({ error: "reading is required" }, { status: 400 });
    if (!meaning) return NextResponse.json({ error: "meaning is required" }, { status: 400 });
    
    // Validate adjective type
    if (adjType && !['na', 'i'].includes(adjType)) {
      return NextResponse.json({ error: "adjType must be 'na' or 'i'" }, { status: 400 });
    }
    
    // Auto-detect adjective type if not provided
    let detectedAdjType = adjType;
    if (!detectedAdjType) {
      if (reading.endsWith('い') || kanji.endsWith('い')) {
        detectedAdjType = 'i';
      } else if (reading.endsWith('な') || kanji.endsWith('な') || kanji.endsWith('的')) {
        detectedAdjType = 'na';
      }
    }
    
    const update: Partial<EntryDoc> = {
      reading,
      meaning,
      example: (body.example || "").trim(),
      translation: (body.translation || "").trim(),
      linkJP: (body.linkJP || "").trim(),
      linkVN: (body.linkVN || "").trim(),
      highlightTerm: (body.highlightTerm || "").trim(),
      adjType: detectedAdjType as 'na' | 'i'
    };
    
    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");
    await col.updateOne({ kanji }, { $set: update }, { upsert: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin entry update error:', error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// DELETE /api/admin/entry  body: { kanji } or { kanjis: string[] } for bulk delete
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Support both single and bulk delete
    if (body.kanjis && Array.isArray(body.kanjis)) {
      // Bulk delete
      const kanjis: string[] = body.kanjis.filter((k: string) => k && k.trim());
      if (kanjis.length === 0) {
        return NextResponse.json({ error: "No valid kanjis provided" }, { status: 400 });
      }
      
      const db = await getDb();
      const col = db.collection<EntryDoc>("entries");
      const result = await col.deleteMany({ kanji: { $in: kanjis } });
      
      return NextResponse.json({ 
        ok: true, 
        deletedCount: result.deletedCount,
        message: `Deleted ${result.deletedCount} entries`
      });
    } else {
      // Single delete
      const kanji: string = (body.kanji || "").trim();
      if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
      
      const db = await getDb();
      const col = db.collection<EntryDoc>("entries");
      const result = await col.deleteOne({ kanji });
      
      if (result.deletedCount === 0) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }
      
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error('Admin entry delete error:', error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


