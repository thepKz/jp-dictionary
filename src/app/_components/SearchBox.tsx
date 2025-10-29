"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toRomaji } from "wanakana";
import Fuse from "fuse.js";
import { toKana } from "wanakana";

let isSpeaking = false;
const waitForVoices = (timeoutMs = 1200) => new Promise<void>((resolve) => {
  const voices = speechSynthesis.getVoices();
  if (voices && voices.length > 0) return resolve();
  let done = false;
  const on = () => { if (!done) { done = true; speechSynthesis.removeEventListener('voiceschanged', on); resolve(); } };
  speechSynthesis.addEventListener('voiceschanged', on);
  setTimeout(() => on(), timeoutMs);
});

const speakJapanese = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Stop any current speech
    if (speechSynthesis.speaking || isSpeaking) {
    speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;
    
    // Try multiple Japanese voices in order of preference
    const pickVoice = async () => {
      let voices = speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        await waitForVoices();
        voices = speechSynthesis.getVoices();
      }
    const japaneseVoices = voices.filter(voice => 
      voice.lang.startsWith('ja') || 
      voice.name.toLowerCase().includes('japanese') ||
      voice.name.toLowerCase().includes('japan')
    );
    japaneseVoices.sort((a, b) => {
      const aScore = a.name.toLowerCase().includes('japanese') ? 2 : 
                    a.name.toLowerCase().includes('japan') ? 1 : 0;
      const bScore = b.name.toLowerCase().includes('japanese') ? 2 : 
                    b.name.toLowerCase().includes('japan') ? 1 : 0;
      return bScore - aScore;
    });
    if (japaneseVoices.length > 0) {
      utterance.voice = japaneseVoices[0];
      console.log('Using voice:', japaneseVoices[0].name);
    } else {
      console.log('No Japanese voice found, using default');
    }
    };
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      speechSynthesis.cancel();
      reject(new Error('Speech synthesis timeout'));
    }, 10000); // 10 second timeout
    
    // Handle speech events
    utterance.onend = () => {
      clearTimeout(timeout);
      isSpeaking = false;
      console.log('Speech synthesis completed');
      resolve();
    };
    
    utterance.onerror = (error) => {
      clearTimeout(timeout);
      console.error('Speech synthesis error:', error);
      
      // Handle specific error types
      if (error.error === 'interrupted') {
        console.log('Speech was interrupted, this is normal');
        isSpeaking = false;
        resolve(); // Don't reject for interruption
      } else if (error.error === 'not-allowed') {
        console.log('Speech not allowed, user may have denied permission');
        isSpeaking = false;
        reject(new Error('Speech synthesis not allowed'));
      } else if (error.error === 'audio-busy') {
        console.log('Audio busy, retrying...');
        setTimeout(() => {
          try { speechSynthesis.speak(utterance); } catch {}
        }, 120);
      } else {
        isSpeaking = false;
        reject(error);
      }
    };
    
    utterance.onstart = () => {
      console.log('Speech synthesis started');
      isSpeaking = true;
    };
    
    utterance.onpause = () => {
      console.log('Speech synthesis paused');
    };
    
    utterance.onresume = () => {
      console.log('Speech synthesis resumed');
    };
    
    pickVoice().finally(() => {
      try { speechSynthesis.speak(utterance); } catch (e) { isSpeaking = false; reject(e as Error); }
    });
  });
};

// Detect adjective type and create variations for highlighting
const getAdjectiveVariations = (word: string, reading?: string) => {
  const variations: string[] = [];
  const base = word || "";

  // na-adjective heuristics
  const looksNa = base.endsWith('な') || base.endsWith('的') || (reading ? /な$/.test(reading) : false);
  if (looksNa) {
    const noNa = base.replace(/な$/, '');
    if (noNa && noNa !== base) variations.push(noNa);
    variations.push(base);
    if (noNa.endsWith('的')) {
      variations.push(noNa + '的な');
      variations.push(noNa + '的に');
    } else if (base.endsWith('的')) {
      variations.push(base + 'な');
      variations.push(base + 'に');
    }
    return Array.from(new Set(variations));
  }

  // i-adjective heuristics
  const looksI = base.endsWith('い') || (reading ? reading.endsWith('い') : false);
  if (looksI) {
    variations.push(base);
    // replace trailing い → く / くて / さ
    variations.push(base.replace(/い$/, 'く'));
    variations.push(base.replace(/い$/, 'くて'));
    variations.push(base.replace(/い$/, 'さ'));
    return Array.from(new Set(variations));
  }

  // fallback: include base and common i-adj transforms (for texts missing last い)
  variations.push(base);
  variations.push(base + 'い');
  variations.push(base + 'く');
  variations.push(base + 'くて');
  return Array.from(new Set(variations));
};

// Highlight JP by adjective variations (kanji-based) or explicit highlightTerm if provided
const highlightJP = (text: string, kanji: string, highlightTerm?: string, reading?: string) => {
  const base = kanji;
  const variations = getAdjectiveVariations(base, reading);
  let out = text;
  variations.forEach(v => {
    if (!v) return;
    const regex = new RegExp(`(${v})`, 'g');
    out = out.replace(regex, '<span class="text-red-500 font-bold">$1</span>');
  });
  return out;
};

// Vietnamese-insensitive highlight: strip diacritics + spaces for matching
const stripVi = (s: string) => s
  .normalize('NFC')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g,'');

const highlightVNInsensitive = (text: string, termRaw: string) => {
  if (!termRaw) return text;
  const term = stripVi(termRaw);
  if (!term) return text;
  // Build mapping original text → stripped to find indices
  const original = text;
  const stripped = stripVi(text);
  const idx = stripped.indexOf(term);
  if (idx === -1) return text;
  // Map indices back by walking original and building positions
  const mapPos: number[] = [];
  for (let i = 0; i < original.length; i += 1) {
    const ch = original[i];
    const base = stripVi(ch);
    if (base) {
      for (let k = 0; k < base.length; k += 1) mapPos.push(i);
    }
  }
  const startOrig = mapPos[idx] ?? 0;
  const endOrig = mapPos[idx + term.length - 1] ?? (startOrig + term.length - 1);
  const before = original.slice(0, startOrig);
  const mid = original.slice(startOrig, endOrig + 1);
  const after = original.slice(endOrig + 1);
  return `${before}<span class="text-red-500 font-bold">${mid}</span>${after}`;
};

type SearchResult = {
  kanji: string;
  reading: string;
  isCommon: boolean;
  senses: Array<{ pos: string[]; defs: string[]; tags: string[] }>;
  audio?: string[];
  example?: string;
  translation?: string;
  linkJP?: string;
  linkVN?: string;
  highlightTerm?: string;
};
const capitalizeFirst = (s?: string) => {
  if (!s) return s || "";
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const first = trimmed[0];
  if (first >= 'a' && first <= 'z') {
    return first.toUpperCase() + trimmed.slice(1);
  }
  return trimmed;
};

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [autoDetail, setAutoDetail] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearched, setLastSearched] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [overSuggestions, setOverSuggestions] = useState(false);
  const [suppressAuto, setSuppressAuto] = useState(false);
  useEffect(() => {
    setMounted(true);
    try { setHistory(JSON.parse(localStorage.getItem("searchHistory") || "[]")); } catch { setHistory([]); }
  }, []);
  
  const PRESETS = [
    { label: "経済的", value: "経済的" },
    { label: "金融的", value: "金融的" },
    { label: "商業的", value: "商業的" },
    { label: "国際的", value: "国際的" },
    { label: "消費的", value: "消費的" },
    { label: "効率的", value: "効率的" },
    { label: "合理的", value: "合理的" },
  ];

  // Load suggestions for dropdown
  useEffect(() => {
    async function loadSuggestions() {
      try {
        const res = await fetch(`/api/search?q=`);
        const json = await res.json();
        setSuggestions(json.data || []);
      } catch {
        setSuggestions([]);
      }
    }
    loadSuggestions();
  }, []);

  // Fuzzy filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    if (!query) return [] as SearchResult[];
    const enriched = suggestions.map(s => ({
      ...s,
      _romaji: toRomaji(s.reading || ""),
      _kana: toKana(toRomaji(s.reading || "")),
      _meaningNorm: stripVi((s.senses?.[0]?.defs?.[0] as string) || ""),
    }));
    const fuse = new Fuse(enriched, {
      keys: [
        { name: "kanji", weight: 0.5 },
        { name: "reading", weight: 0.4 },
        { name: "senses.0.defs.0", weight: 0.1 },
        { name: "_meaningNorm", weight: 0.35 },
        { name: "_romaji", weight: 0.25 },
        { name: "_kana", weight: 0.2 },
      ],
      threshold: 0.45,
      ignoreLocation: true,
    });
    const q = query.trim();
    const qNorm = stripVi(q);
    const res1 = fuse.search(q).map(r => r.item as SearchResult);
    const res2 = qNorm && qNorm !== q ? fuse.search(qNorm).map(r => r.item as SearchResult) : [];
    const seen = new Set<string>();
    const merged: SearchResult[] = [];
    for (const it of [...res1, ...res2]) {
      const key = `${it.kanji}|${it.reading}`;
      if (!seen.has(key)) { seen.add(key); merged.push(it); }
      if (merged.length >= 8) break;
    }
    return merged;
  }, [query, suggestions]);

  const handleSearch = async (term?: string) => {
    const qNow = (term ?? query).trim();
    if (!qNow) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    
    setLoading(true);
    setShowSuggestions(false);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(qNow)}`);
      const json = await res.json();
      const arr = (json.data || []) as SearchResult[];
      setResults(arr);
      setAutoDetail(arr.length === 1 ? arr[0] : null);
      setLastSearched(qNow);
      const next = [qNow, ...history.filter(h => h !== qNow)].slice(0, 20);
      setHistory(next);
      try { localStorage.setItem("searchHistory", JSON.stringify(next)); } catch {}
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSuppressAuto(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchResult) => {
    setQuery(suggestion.kanji);
    setShowSuggestions(false);
    setResults([suggestion]);
    setHasSearched(true);
    setLastSearched(suggestion.kanji);
  };

  type KanjiInfo = { kanji: string; on_readings?: string[]; kun_readings?: string[]; meanings?: string[]; stroke_count?: number };
  const [kanjiInfo, setKanjiInfo] = useState<KanjiInfo[] | null>(null);
  const [kanjiTipPos, setKanjiTipPos] = useState<{x:number;y:number}|null>(null);
  const [kanjiTipVisible, setKanjiTipVisible] = useState(false);
  const kanjiHoverTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const kanjiHideTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const openKanjiTooltip = async (ev: React.MouseEvent<HTMLButtonElement>, kanji: string) => {
    try {
      const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      setKanjiTipPos({ x: rect.left, y: Math.max(0, rect.top - 10) });
      setKanjiInfo(null);
      setKanjiTipVisible(true);
      const res = await fetch(`/api/kanji?c=${encodeURIComponent(kanji)}`);
      const json = await res.json();
      setKanjiInfo(json.data || null);
    } catch {}
  };

  // Auto-search after 2s idle
  useEffect(() => {
    if (!query.trim()) return;
    if (overSuggestions) return; // don't auto search while hovering dropdown
    if (suppressAuto) return; // prevent double search when clicking history
    const id = setTimeout(() => {
      if (query.trim() !== lastSearched) {
        handleSearch();
      }
    }, 2000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, overSuggestions, suppressAuto]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="card p-4 sm:p-8 animate-fadeIn">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-light mb-2">Tìm kiếm từ vựng</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Nhập kanji, kana, romaji hoặc nghĩa tiếng Việt</p>
      </div>

      {/* Search Input with Dropdown */}
      <div className="relative mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <div className="relative flex-1">
            <input
              className="input pl-4 pr-4 py-4 sm:py-4 text-base sm:text-lg w-full"
              placeholder="Ví dụ: 経済的, keizaiteki, economic..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(query.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            
            {/* Dropdown Suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto" onMouseEnter={()=>setOverSuggestions(true)} onMouseLeave={()=>setOverSuggestions(false)}>
                {filteredSuggestions.map((suggestion, idx) => (
                  <div
                    key={`${suggestion.kanji}-${idx}`}
                    className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{suggestion.kanji}</div>
                        <div className="text-sm text-muted-foreground">
                          {suggestion.reading} • {suggestion.senses?.[0]?.defs?.[0]}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(suggestion.reading);
                        }}
                        title="Phát âm"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-300">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Search Button */}
          <button
            type="button"
            className="btn-primary hover-lift px-6 sm:px-6 py-4 sm:py-4 text-base sm:text-lg font-light flex items-center justify-center gap-2 w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
            onClick={()=>handleSearch()}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <span className="hidden sm:inline">Tìm kiếm</span>
                <span className="sm:hidden">Tìm</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Buttons - Hidden */}
      {/* <div className="mb-6">
        <h3 className="text-sm font-light text-muted-foreground mb-3">Tìm nhanh:</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className="btn-secondary hover-lift px-3 py-1 text-sm font-light"
              onClick={() => {
                setQuery(p.value);
                setShowSuggestions(false);
                // Don't auto-search, user must click search button
              }}
              aria-label={`Tìm nhanh: ${p.label}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div> */}

      {/* Result count */}
      {results.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Kết quả:</span>
          <span className="badge badge-secondary">{results.length} từ</span>
        </div>
      )}

      {/* History */}
      {mounted && history.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {history.slice(0, 8).map((h) => (
            <button key={h} className="btn-secondary px-3 py-1 text-sm" onClick={() => { setSuppressAuto(true); setLastSearched(h.trim()); setQuery(h); setShowSuggestions(false); handleSearch(h); }}>{h}</button>
          ))}
          <button className="text-xs text-muted-foreground" onClick={() => { setHistory([]); try { localStorage.removeItem("searchHistory"); } catch {} }}>Xóa lịch sử</button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, idx) => (
            <div key={`${r.kanji}-${idx}`} className="card p-4 sm:p-5 hover-lift animate-fadeIn gradient-border shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/80 flex flex-col">
              {/* Header */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <button className="relative text-left" title="Xem thông tin Kanji"
                    onMouseEnter={(e)=>{ clearTimeout(kanjiHoverTimer.current); clearTimeout(kanjiHideTimer.current); kanjiHoverTimer.current=setTimeout(()=>openKanjiTooltip(e, r.kanji), 0); }}
                    onMouseLeave={()=>{ clearTimeout(kanjiHoverTimer.current); clearTimeout(kanjiHideTimer.current); kanjiHideTimer.current=setTimeout(()=>setKanjiTipVisible(false), 120); }}
                  >
                    <h3 className="text-xl sm:text-2xl font-light underline decoration-dotted underline-offset-4">{r.kanji}</h3>
                  </button>
                  <AdjectiveBadge kanji={r.kanji} reading={r.reading} />
                  {r.reading && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                      onClick={() => speakJapanese(r.reading).catch(console.error)}
                      title="Phát âm tiếng Nhật"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-300">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {r.reading && (
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm text-muted-foreground font-light">{r.reading}</span>
                    <span className="text-xs text-muted-foreground">{toRomaji(r.reading)}</span>
                  </div>
                )}
              </div>

              {/* Meaning - Larger text */}
              {r.senses?.[0]?.defs?.length && (
                <div className="text-base font-medium mb-3 text-foreground">{capitalizeFirst(r.senses[0].defs[0] as string)}</div>
              )}

              {/* Content area - list view không hiển thị ví dụ/dịch, chuyển sang panel chi tiết */}
              <div className="flex-1" />

              {/* Source links - Always at bottom */}
              {(r.linkJP || r.linkVN) && (
                <div className="text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
                  <div className="font-medium mb-1">Nguồn:</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {r.linkJP && (
                      <div className="text-blue-600 text-xs">
                        🇯🇵 {r.linkJP.startsWith('http') ? (
                          <a 
                            href={r.linkJP} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline break-all"
                          >
                            Nguồn Nhật
                          </a>
                        ) : (
                          <span className="break-all">{capitalizeFirst(r.linkJP)}</span>
                        )}
                      </div>
                    )}
                    {r.linkVN && (
                      <div className="text-green-600 text-xs">
                        🇻🇳 {r.linkVN.startsWith('http') ? (
                          <a 
                            href={r.linkVN} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline break-all"
                          >
                            Nguồn Việt
                          </a>
                        ) : (
                          <span className="break-all">{capitalizeFirst(r.linkVN)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button className="btn-secondary px-3 py-1 text-sm" onClick={()=>setAutoDetail(r)}>Chi tiết</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel auto when only one result OR when user selects */}
      {autoDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-pop" onClick={()=>setAutoDetail(null)}>
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl font-light">{autoDetail.kanji}</div>
              <button className="w-8 h-8 rounded-full bg-muted" onClick={()=>setAutoDetail(null)}>×</button>
            </div>
            {autoDetail.reading && (
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <span>{autoDetail.reading} · {toRomaji(autoDetail.reading)}</span>
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => speakJapanese(autoDetail.reading as string).catch(console.error)}
                  title="Phát âm tiếng Nhật"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-300">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                </button>
              </div>
            )}
            {autoDetail.senses?.[0]?.defs?.length && (
              <div className="text-base font-medium mb-3">{capitalizeFirst(autoDetail.senses[0].defs[0] as string)}</div>
            )}
            {autoDetail.example && (
              <div className="mb-3">
                <div className="text-sm font-medium mb-1 text-amber-700 dark:text-amber-300">Ví dụ</div>
                <div className="flex items-start gap-2">
                  <div className="italic text-amber-800 dark:text-amber-200 flex-1" dangerouslySetInnerHTML={{ __html: highlightJP(autoDetail.example, autoDetail.kanji, autoDetail.highlightTerm, autoDetail.reading) }} />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                    onClick={() => speakJapanese(autoDetail.example as string).catch(console.error)}
                    title="Phát âm ví dụ"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-300">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  </button>
                </div>
                {autoDetail.translation && (
                  <div className="mt-2 p-3 rounded-md border border-blue-400 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 shadow-sm">
                    <div className="font-medium mb-1">Dịch</div>
                    <div dangerouslySetInnerHTML={{ __html: highlightVNInsensitive(autoDetail.translation, autoDetail.highlightTerm || (autoDetail.senses?.[0]?.defs?.[0] as string) || autoDetail.kanji) }} />
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-4 pt-2 border-t border-border">
              <div className="font-medium mb-1">Nguồn</div>
              <div className="flex flex-col sm:flex-row gap-2">
                {autoDetail.linkJP && (
                  <div className="text-blue-600 text-xs">🇯🇵 {autoDetail.linkJP.startsWith('http') ? (<a href={autoDetail.linkJP} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">Nguồn Nhật</a>) : (<span className="break-all">{capitalizeFirst(autoDetail.linkJP)}</span>)}</div>
                )}
                {autoDetail.linkVN && (
                  <div className="text-green-600 text-xs">🇻🇳 {autoDetail.linkVN.startsWith('http') ? (<a href={autoDetail.linkVN} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">Nguồn Việt</a>) : (<span className="break-all">{capitalizeFirst(autoDetail.linkVN)}</span>)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Results - Only show when user has searched */}
      {hasSearched && !loading && results.length === 0 && (
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
                onClick={() => {
                  setQuery(p.value);
                  setShowSuggestions(false);
                  // Don't auto-search, user must click search button
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {kanjiTipVisible && kanjiTipPos && (
        <div
          className="fixed z-50"
          style={{ left: kanjiTipPos.x, top: kanjiTipPos.y }}
          onMouseEnter={()=>{ clearTimeout(kanjiHideTimer.current); setKanjiTipVisible(true); }}
          onMouseLeave={()=>{ clearTimeout(kanjiHideTimer.current); kanjiHideTimer.current=setTimeout(()=>setKanjiTipVisible(false), 120); }}
        >
          <div className="card p-3 shadow-xl bg-popover/95 backdrop-blur border border-border min-w-[220px]">
            <div className="text-xs text-muted-foreground mb-2">Thông tin Kanji</div>
            {!kanjiInfo && (<div className="text-xs text-muted-foreground">Đang tải…</div>)}
            {kanjiInfo && (
              <div className="space-y-2 max-h=[40vh] overflow-y-auto">
                {kanjiInfo.map((k: KanjiInfo) => (
                  <div key={k.kanji} className="border-b border-border/60 pb-1 last:border-b-0">
                    <div className="text-lg font-light mb-0.5">{k.kanji}</div>
                    <div className="text-xs text-muted-foreground">On: {k.on_readings?.join(', ') || '-'}</div>
                    <div className="text-xs text-muted-foreground">Kun: {k.kun_readings?.join(', ') || '-'}</div>
                    <div className="text-xs">Nghĩa: {(k.meanings||[]).join(', ')}</div>
                    <div className="text-xs">Số nét: {k.stroke_count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdjectiveBadge({ kanji, reading }: { kanji: string; reading: string }) {
  const isI = !!(reading?.endsWith('い') || kanji?.endsWith('い'));
  const isNa = /な$|的$/.test(kanji) || /な$/.test(reading || "");
  const label = isI ? 'I-adj' : isNa ? 'Na-adj' : null;
  if (!label) return null;
  return <span className="badge badge-secondary">{label}</span>;
}