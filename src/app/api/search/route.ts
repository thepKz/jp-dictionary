import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDb, EntryDoc } from "../db/client";
import { toRomaji } from "wanakana";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  // Empty query shows all entries
  if (!q) {
    try {
      const db = await getDb();
      const col = db.collection<EntryDoc>("entries");
      const docs = await col
        .find({}, { projection: { _id: 0 } })
        .limit(500)
        .toArray();
      const data = docs.map(normalizeDocToResult);
      if (data.length > 0) {
        return NextResponse.json({ data, q: "", source: "db", count: data.length });
      }
    } catch {}

    // Fallback to local CSV
    try {
      const allData = searchLocalCsv("");
      return NextResponse.json({ data: allData, q: "", source: "local", count: allData.length });
    } catch {
      return NextResponse.json({ data: [], q: "", source: "local", count: 0 });
    }
  }

  // Basic in-memory caching and rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const cacheKey = q; // local-only cache key
  const cached = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  if (!rateLimitAllow(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");
    const regex = buildLooseRegex(q);
    const docs = await col
      .find(
        {
          $or: [
            { kanji: { $regex: regex } },
            { reading: { $regex: regex } },
            { meaning: { $regex: regex } },
          ],
        },
        { projection: { _id: 0 } }
      )
      .limit(100)
      .toArray();
    // Extra Vietnamese diacritics/space-insensitive match
    const qNorm = normalizeVi(q);
    const viMatched = docs.filter(d => normalizeVi(d.meaning || "").includes(qNorm));
    let data = (viMatched.length > 0 ? viMatched : docs).map(normalizeDocToResult);
    if (data.length > 0) {
      const payload = { q, source: "db", count: data.length, data };
      putInCache(cacheKey, payload);
      return NextResponse.json(payload);
    }
    // Romaji fallback: scan all entries and match toRomaji(reading)
    const allDocs = await col.find({}, { projection: { _id: 0 } }).limit(2000).toArray();
    const romajiQLower = q.toLowerCase();
    const romajiMatches = allDocs.filter((e) => {
      const r = (e.reading || "").toString();
      return toRomaji(r).toLowerCase().includes(romajiQLower);
    });
    data = romajiMatches.map(normalizeDocToResult);
    if (data.length > 0) {
      const payload = { q, source: "db-romaji", count: data.length, data };
      putInCache(cacheKey, payload);
      return NextResponse.json(payload);
    }
  } catch {}

  try {
    const filtered = searchLocalCsv(q);
    const payload = { q, source: "local", count: filtered.length, data: filtered };
    putInCache(cacheKey, payload);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Local CSV load failed" }, { status: 500 });
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

// --- Local CSV loader and searcher ---
type LocalEntry = {
  kanji: string;
  reading: string;
  meaning: string;
  example?: string;
  translation?: string;
  linkJP?: string;
  linkVN?: string;
};

let LOCAL_DATA: LocalEntry[] | null = null;

function ensureLocalDataLoaded() {
  if (LOCAL_DATA) return;
  const root = path.resolve(process.cwd());
  const sampleFile = path.join(root, "data", "sample.csv");
  const raw = safeReadFile(sampleFile);
  LOCAL_DATA = parseCsv(raw);
}

function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function parseCsv(text: string): LocalEntry[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const out: LocalEntry[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 4) continue;
    // New sample.csv format: STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch (việt),Link (JP),Link (VN),Nổi bật từ vựng ví dụ
    const kanji = (cols[1] || "").trim();
    const reading = (cols[2] || "").trim();
    const meaning = (cols[3] || "").trim();
    const example = (cols[4] || "").trim();
    const translation = (cols[5] || "").trim();
    const linkJP = (cols[6] || "").trim();
    const linkVN = (cols[7] || "").trim();
    if (!kanji) continue;
    out.push({ kanji, reading, meaning, example, translation, linkJP, linkVN });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function searchLocalCsv(q: string) {
  ensureLocalDataLoaded();
  const query = q.toLowerCase();
  
  // Empty query returns all entries
  if (!query) {
    return (LOCAL_DATA || []).map((e) => ({
      kanji: e.kanji,
      reading: e.reading,
      isCommon: false,
      senses: [
        {
          pos: [],
          defs: [e.meaning].filter(Boolean),
          tags: [],
        },
      ],
      example: e.example,
      translation: e.translation,
      linkJP: e.linkJP,
      linkVN: e.linkVN,
    }));
  }
  
  const matched = (LOCAL_DATA || []).filter((e) => {
    const queryLower = query.toLowerCase();
    
    // Exact matches first
    if (e.kanji.toLowerCase() === queryLower) return true;
    if (e.reading.toLowerCase() === queryLower) return true;
    
    // Partial matches
    if (e.kanji.toLowerCase().includes(queryLower)) return true;
    if (e.reading.toLowerCase().includes(queryLower)) return true;
    if (e.meaning.toLowerCase().includes(queryLower)) return true;
    
    // Romaji search support: convert reading to romaji and match
    try {
      if (toRomaji(e.reading || "").toLowerCase().includes(queryLower)) return true;
    } catch {}
    
    return false;
  });
  return matched.slice(0, 100).map((e) => ({
    kanji: e.kanji,
    reading: e.reading,
    isCommon: false,
    senses: [
      {
        pos: [],
        defs: [e.meaning].filter(Boolean),
        tags: [],
      },
    ],
    example: e.example,
    translation: e.translation,
    linkJP: e.linkJP,
    linkVN: e.linkVN,
  }));
}

function normalizeDocToResult(e: EntryDoc) {
  return {
    kanji: e.kanji,
    reading: e.reading,
    isCommon: false,
    senses: [
      {
        pos: Array.isArray(e.pos) ? e.pos : [],
        defs: [e.meaning].filter(Boolean),
        tags: [],
      },
    ],
    example: e.example,
    translation: e.translation,
    linkJP: e.linkJP,
    linkVN: e.linkVN,
    highlightTerm: e.highlightTerm,
  };
}

function buildLooseRegex(q: string) {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Convert Vietnamese diacritics to loose classes (basic): áàảãạ -> a, ê -> e, ô/ơ -> o, ư -> u, đ -> d
  const map: Record<string, string> = {
    a: "[aàáảãạăắằẳẵặâấầẩẫậ]",
    e: "[eèéẻẽẹêếềểễệ]",
    i: "[iìíỉĩị]",
    o: "[oòóỏõọôốồổỗộơớờởỡợ]",
    u: "[uùúủũụưứừửữự]",
    y: "[yỳýỷỹỵ]",
    d: "[dđ]",
  };
  let pattern = "";
  for (const ch of escaped) {
    const lower = ch.toLowerCase();
    if (map[lower]) pattern += map[lower];
    else pattern += ch;
  }
  return new RegExp(pattern, "i");
}

function normalizeVi(text: string) {
  if (!text) return "";
  // NFC to reduce edge cases, then strip diacritics and spaces
  const nfc = text.normalize('NFC').toLowerCase();
  const noMarks = nfc.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const noSpace = noMarks.replace(/\s+/g, '');
  return noSpace;
}


