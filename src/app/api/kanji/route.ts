import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const c = (searchParams.get("c") || "").trim();
    if (!c) return NextResponse.json({ error: "c required" }, { status: 400 });
    // Support multiple kanji (string) by returning an array of kanji info
    const chars = Array.from(c).filter(ch => /[\u4E00-\u9FFF]/.test(ch));
    type KanjiInfo = { kanji: string; on_readings?: string[]; kun_readings?: string[]; meanings?: string[]; stroke_count?: number };
    const results: KanjiInfo[] = [];
    for (const ch of chars) {
      const url = `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        results.push(json);
      }
    }
    if (results.length === 0) return NextResponse.json({ error: "upstream" }, { status: 502 });
    return NextResponse.json({ ok: true, data: results });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


