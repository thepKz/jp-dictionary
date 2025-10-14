"use client";

import { useEffect, useState } from "react";
import { toRomaji } from "wanakana";
import DetailPanel from "./DetailPanel";

type SearchResult = {
  kanji: string;
  reading: string;
  isCommon: boolean;
  senses: Array<{ pos: string[]; defs: string[]; tags: string[] }>;
  audio?: string[];
};

type ExampleItem = { id: number; jp: { text: string; lang: string }; translations: Array<{ id: number; text: string; lang: string }> };

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [compact, setCompact] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [examples, setExamples] = useState<Record<string, ExampleItem[]>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("favorites") || "{}"); } catch { return {}; }
  });
  const [detailEntry, setDetailEntry] = useState<SearchResult | null>(null);
  const PRESETS = [
    { label: "経済的", value: "経済的" },
    { label: "金融的", value: "金融的" },
    { label: "商業的", value: "商業的" },
    { label: "国際的", value: "国際的" },
    { label: "消費的", value: "消費的" },
    { label: "効率的", value: "効率的" },
    { label: "合理的", value: "合理的" },
  ];

  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        const json = await res.json();
        if (!cancelled) setResults(json.data || []);
      } catch (e) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div className="card p-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-light mb-2">Tìm kiếm từ vựng</h2>
        <p className="text-muted-foreground">Nhập kanji, kana, romaji hoặc nghĩa tiếng Việt</p>
      </div>
      
      {/* Search Input */}
      <div className="relative mb-6">
        <input
          className="input pl-4 pr-4 py-4 text-lg"
          placeholder="Ví dụ: 経済的, keizaiteki, economic..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="mb-6">
        <h3 className="text-sm font-light text-muted-foreground mb-3">Tìm nhanh:</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className="btn-secondary hover-lift px-3 py-1 text-sm font-light"
              onClick={() => setQuery(p.value)}
              aria-label={`Tìm nhanh: ${p.label}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Kết quả:</span>
          {results.length > 0 && (
            <span className="badge badge-secondary">{results.length} từ</span>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition-opacity">
          <input 
            type="checkbox" 
            checked={compact} 
            onChange={(e) => setCompact(e.target.checked)} 
            className="rounded border-border"
          />
          <span className="text-sm font-light">Chế độ giản lược</span>
        </label>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, idx) => (
            <div key={`${r.kanji}-${idx}`} className="card p-6 hover-lift animate-fadeIn">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-light mb-2">{r.kanji}</h3>
                  {r.reading && (
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg text-muted-foreground font-light">{r.reading}</span>
                      <span className="text-sm text-muted-foreground">{toRomaji(r.reading)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.isCommon && (
                    <span className="badge badge-secondary">Phổ biến</span>
                  )}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-secondary hover-lift px-2 py-1 text-xs font-light"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(r.reading ? `${r.kanji}（${r.reading}）` : r.kanji);
                        } catch {}
                      }}
                      aria-label="Sao chép từ"
                    >
                      Sao chép
                    </button>
                    <button
                      type="button"
                      className="btn-secondary hover-lift px-2 py-1 text-xs font-light"
                      onClick={() => {
                        const next = { ...favorites, [r.kanji]: !favorites[r.kanji] };
                        setFavorites(next);
                        try { localStorage.setItem("favorites", JSON.stringify(next)); } catch {}
                      }}
                      aria-label="Yêu thích"
                    >
                      {favorites[r.kanji] ? "Yêu thích" : "Thêm yêu thích"}
                    </button>
                    <button
                      type="button"
                      className="btn-primary hover-lift px-2 py-1 text-xs font-light"
                      onClick={() => setDetailEntry(r)}
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              </div>

              {/* Meanings */}
              {r.senses?.[0]?.defs?.length && (
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    {r.senses[0].pos.join(", ")}
                  </div>
                  <div className="text-base font-light">
                    {compact ? r.senses[0].defs[0] : r.senses[0].defs.join(", ")}
                  </div>
                </div>
              )}

              {/* Audio */}
              {r.audio && r.audio.length > 0 && (
                <div className="mb-4">
                  <audio controls src={r.audio[0]} className="w-full" />
                </div>
              )}

              {/* Examples Toggle */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="btn-secondary hover-lift px-3 py-1 text-sm font-light"
                  onClick={async () => {
                    const key = r.kanji;
                    const next = openIdx === idx ? null : idx;
                    setOpenIdx(next);
                    if (next !== null && !examples[key]) {
                      try {
                        const res = await fetch(`/api/examples?q=${encodeURIComponent(key)}&to=vie&limit=5`);
                        const json = await res.json();
                        setExamples((prev) => ({ ...prev, [key]: json.data || [] }));
                      } catch {}
                    }
                  }}
                >
                  {openIdx === idx ? "Ẩn ví dụ" : "Xem ví dụ"}
                </button>
              </div>

              {/* Examples */}
              {openIdx === idx && (
                <div className="mt-4 pt-4 border-t border-border animate-fadeIn">
                  <h4 className="text-sm font-light text-muted-foreground mb-3">Ví dụ sử dụng:</h4>
                  <div className="space-y-3">
                    {(examples[r.kanji] || []).map((ex) => (
                      <div key={ex.id} className="card p-4 hover-lift">
                        <div className="text-base mb-2 font-light">{ex.jp.text}</div>
                        {ex.translations?.[0] && (
                          <div className="text-sm text-muted-foreground">{ex.translations[0].text}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {query && !loading && results.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-light mb-2">Không tìm thấy kết quả</h3>
          <p className="text-muted-foreground mb-4">
            Thử tìm kiếm với từ khóa khác hoặc sử dụng các preset bên trên
          </p>
          <div className="flex justify-center gap-2">
            {PRESETS.slice(0, 3).map((p) => (
              <button
                key={p.value}
                type="button"
                className="btn-secondary hover-lift px-3 py-1 text-sm font-light"
                onClick={() => setQuery(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {detailEntry && (
        <DetailPanel
          entry={detailEntry}
          examples={examples[detailEntry.kanji] || []}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}

function useDebounce<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}


