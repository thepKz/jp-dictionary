import { NextRequest, NextResponse } from "next/server";

type JishoSense = {
  english_definitions?: string[];
  parts_of_speech?: string[];
  tags?: string[];
  info?: string[];
};

type JishoDatum = {
  slug?: string;
  is_common?: boolean;
  japanese?: Array<{ word?: string; reading?: string }>;
  senses?: JishoSense[];
};

type JishoResponse = {
  data?: JishoDatum[];
};

const ECON_KEYWORDS = [
  "経済", // kinh tế
  "金融", // tài chính
  "商業", // thương mại
  "国際", // quốc tế
  "消費", // tiêu thụ
  "効率", // hiệu suất
  "合理", // hợp lý
];

function isEconomicAdjective(entry: JishoDatum): boolean {
  if (!entry?.senses || entry.senses.length === 0) return false;
  const isAdj = entry.senses.some((s) =>
    (s.parts_of_speech || []).some((p) =>
      p.includes("adjectival") || p.includes("adjective") || p.includes("な形容詞") || p.includes("い形容詞")
    )
  );
  if (!isAdj) return false;

  const textBlob = [
    (entry.japanese || []).map((j) => `${j.word ?? ""} ${j.reading ?? ""}`).join(" "),
    (entry.senses || [])
      .flatMap((s) => [...(s.english_definitions || []), ...(s.tags || []), ...(s.info || [])])
      .join(" "),
  ].join(" ");

  return ECON_KEYWORDS.some((kw) => textBlob.includes(kw));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const source = (searchParams.get("source") || "jisho").toLowerCase();
  if (!q) {
    return NextResponse.json({ data: [], q }, { status: 200 });
  }

  // Basic in-memory caching and rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const cacheKey = `${source}:${q}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  if (!rateLimitAllow(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Public Jisho endpoint (no key) – default source
  const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
    const json: JishoResponse = await res.json();
    const raw = json.data || [];

    const filtered = raw.filter(isEconomicAdjective).map((e) => {
      const primary = (e.japanese || [])[0] || {};
      return {
        kanji: primary.word || primary.reading || e.slug || "",
        reading: primary.reading || "",
        isCommon: !!e.is_common,
        senses: (e.senses || []).map((s) => ({
          pos: s.parts_of_speech || [],
          defs: s.english_definitions || [],
          tags: s.tags || [],
        })),
      };
    });

    const payload = { q, source, count: filtered.length, data: filtered };
    putInCache(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

// --- Simple in-memory cache with TTL ---
type CacheEntry = { value: unknown; expiresAt: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60s

function getFromCache<T = unknown>(key: string): T | null {
  const now = Date.now();
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt < now) {
    CACHE.delete(key);
    return null;
  }
  return entry.value as T;
}

function putInCache(key: string, value: unknown, ttlMs: number = CACHE_TTL_MS) {
  CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// --- Very simple per-IP rate limiter ---
type Bucket = { tokens: number; lastRefill: number };
const BUCKETS = new Map<string, Bucket>();
const RATE_LIMIT = { capacity: 20, refillPerSec: 10 };

function rateLimitAllow(ip: string): boolean {
  const now = Date.now();
  let b = BUCKETS.get(ip);
  if (!b) {
    b = { tokens: RATE_LIMIT.capacity, lastRefill: now };
    BUCKETS.set(ip, b);
  }
  const deltaSec = (now - b.lastRefill) / 1000;
  const refill = Math.floor(deltaSec * RATE_LIMIT.refillPerSec);
  if (refill > 0) {
    b.tokens = Math.min(RATE_LIMIT.capacity, b.tokens + refill);
    b.lastRefill = now;
  }
  if (b.tokens <= 0) return false;
  b.tokens -= 1;
  return true;
}


