"use client";

import { useEffect, useMemo, useState } from "react";
import { toRomaji } from "wanakana";

type SearchResult = {
  kanji: string;
  reading: string;
  isCommon: boolean;
  senses: Array<{ pos: string[]; defs: string[]; tags: string[] }>;
};

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [compact, setCompact] = useState(false);
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
    <div className="rounded-xl border border-zinc-200 p-4 shadow-sm dark:border-zinc-800">
      <label className="block text-sm opacity-70 mb-2">Tìm kiếm</label>
      <input
        className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700"
        placeholder="Nhập kanji / kana / romaji / nghĩa..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            onClick={() => setQuery(p.value)}
            aria-label={`Tìm nhanh: ${p.label}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="opacity-70">{loading ? "Đang tải..." : null}</span>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
          Chế độ giản lược
        </label>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {results.map((r, idx) => (
          <li key={`${r.kanji}-${idx}`} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-lg font-semibold">{r.kanji}</div>
                {r.reading ? (
                  <div className="text-sm opacity-70">
                    {r.reading}
                    <span className="ml-2 opacity-60">{toRomaji(r.reading)}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {r.isCommon ? (
                  <span className="text-xs rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">Phổ biến</span>
                ) : null}
                <button
                  type="button"
                  className="text-xs rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(r.reading ? `${r.kanji}（${r.reading}）` : r.kanji);
                    } catch {}
                  }}
                  aria-label="Sao chép từ"
                >
                  Sao chép
                </button>
              </div>
            </div>
            {r.senses?.[0]?.defs?.length ? (
              <div className="mt-2 text-sm opacity-90">
                {compact ? r.senses[0].defs[0] : r.senses[0].defs.join(", ")}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
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


