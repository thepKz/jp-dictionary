import { NextRequest, NextResponse } from "next/server";

type TatoebaSentence = {
  id: number;
  text: string;
  lang: string;
};

type TatoebaResult = {
  results?: Array<{
    id: number;
    text: string;
    lang: string;
    translations?: TatoebaSentence[];
  }>;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const to = (searchParams.get("to") || "vie").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 10);
  if (!q) return NextResponse.json({ q, data: [] }, { status: 200 });

  // Tatoeba API (public): search Japanese with translations
  // Docs: https://tatoeba.org/en/api v0
  const url = `https://tatoeba.org/en/api_v0/search?from=jpn&to=${encodeURIComponent(
    to
  )}&query=${encodeURIComponent(q)}&orphans=no&unapproved=no&native=&page=1&per_page=${limit}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    const json: TatoebaResult = await res.json();
    const items = (json.results || []).map((r) => ({
      id: r.id,
      jp: { text: r.text, lang: r.lang },
      translations: (r.translations || []).map((t) => ({ id: t.id, text: t.text, lang: t.lang })),
    }));
    return NextResponse.json({ q, to, count: items.length, data: items });
  } catch (e) {
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}


