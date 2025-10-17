"use client";

import { useState, useRef } from "react";
import { toRomaji } from "wanakana";

type SearchResult = {
  kanji: string;
  reading: string;
  isCommon: boolean;
  senses: Array<{ pos: string[]; defs: string[]; tags: string[] }>;
  audio?: string[];
};

type ExampleItem = { id: number; jp: { text: string; lang: string }; translations: Array<{ id: number; text: string; lang: string }> };

interface DetailPanelProps {
  entry: SearchResult;
  examples: ExampleItem[];
  onClose: () => void;
}

export default function DetailPanel({ entry, examples, onClose }: DetailPanelProps) {
  const [playingAudio, setPlayingAudio] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("favorites") || "{}"); } catch { return {}; }
  });

  // Kanji hover functionality
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

  const playAudio = async () => {
    if (!entry.audio?.[0]) return;
    setPlayingAudio(true);
    try {
      const audio = new Audio(entry.audio[0]);
      await audio.play();
      audio.onended = () => setPlayingAudio(false);
    } catch {
      setPlayingAudio(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <button 
                className="relative text-left" 
                title="Xem thông tin Kanji"
                onMouseEnter={(e)=>{ clearTimeout(kanjiHoverTimer.current); clearTimeout(kanjiHideTimer.current); kanjiHoverTimer.current=setTimeout(()=>openKanjiTooltip(e, entry.kanji), 0); }}
                onMouseLeave={()=>{ clearTimeout(kanjiHoverTimer.current); clearTimeout(kanjiHideTimer.current); kanjiHideTimer.current=setTimeout(()=>setKanjiTipVisible(false), 120); }}
              >
                <h2 className="text-4xl font-light mb-2 underline decoration-dotted underline-offset-4 hover:text-primary transition-colors">{entry.kanji}</h2>
              </button>
              {entry.reading && (
                <div className="text-xl text-muted-foreground font-light">{entry.reading}</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted hover:bg-accent flex items-center justify-center text-lg hover-lift"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>

          <div className="space-y-8">
            {/* Reading and Romaji */}
            {entry.reading && (
              <div className="card p-6">
                <h3 className="text-lg font-light mb-4 text-foreground">Cách đọc</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2 font-medium">Hiragana</div>
                    <div className="text-2xl text-foreground font-medium">{entry.reading}</div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2 font-medium">Romaji</div>
                    <div className="text-2xl font-mono text-foreground font-medium">{toRomaji(entry.reading)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Meanings */}
            <div className="card p-6">
              <h3 className="text-lg font-light mb-4 text-foreground">Nghĩa và cách sử dụng</h3>
              <div className="space-y-4">
                {entry.senses.map((sense, idx) => (
                  <div key={idx} className="border-l-2 border-primary/30 pl-6 py-4 bg-muted/30 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-secondary">{sense.pos.join(", ")}</span>
                      {entry.isCommon && (
                        <span className="badge badge-secondary">Phổ biến</span>
                      )}
                    </div>
                    <div className="text-base leading-relaxed font-medium text-foreground">
                      {sense.defs.join(", ")}
                    </div>
                    {sense.tags.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium">Tags:</span> {sense.tags.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Audio */}
            {entry.audio && entry.audio.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-light mb-4">Phát âm</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={playAudio}
                    disabled={playingAudio}
                    className="btn-primary hover-lift px-4 py-2 font-light"
                  >
                    {playingAudio ? "Đang phát..." : "Phát âm"}
                  </button>
                  <audio controls src={entry.audio[0]} className="flex-1" />
                </div>
              </div>
            )}

            {/* Examples */}
            {examples.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-light mb-4 text-foreground">Ví dụ sử dụng</h3>
                <div className="space-y-4">
                  {examples.map((ex) => (
                    <div key={ex.id} className="space-y-3">
                      <div className="example-text">
                        <div className="text-sm font-medium mb-2 text-amber-700 dark:text-amber-300">Ví dụ</div>
                        <div className="text-base leading-relaxed">{ex.jp.text}</div>
                      </div>
                      {ex.translations[0] && (
                        <div className="translation-text">
                          <div className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">Dịch</div>
                          <div className="text-base leading-relaxed capitalize">
                            {ex.translations[0].text}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-light mb-4">Hành động</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${entry.kanji}（${entry.reading}）`);
                    } catch {}
                  }}
                  className="btn-secondary hover-lift px-4 py-2 font-light"
                >
                  Sao chép từ
                </button>
                <button
                  onClick={() => {
                    const url = `${location.origin}/?q=${encodeURIComponent(entry.kanji)}`;
                    const share = `Từ vựng kinh tế Nhật: ${entry.kanji}（${entry.reading}）— ${url}`;
                    try { navigator.clipboard.writeText(share); } catch {}
                  }}
                  className="btn-secondary hover-lift px-4 py-2 font-light"
                >
                  Chia sẻ
                </button>
                <button
                  onClick={() => {
                    const next = { ...favorites, [entry.kanji]: !favorites[entry.kanji] };
                    setFavorites(next);
                    try { localStorage.setItem("favorites", JSON.stringify(next)); } catch {}
                  }}
                  className="btn-secondary hover-lift px-4 py-2 font-light"
                >
                  {favorites[entry.kanji] ? "Bỏ yêu thích" : "Yêu thích"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanji Tooltip */}
      {kanjiTipVisible && kanjiTipPos && (
        <div
          className="fixed z-50"
          style={{ left: kanjiTipPos.x, top: kanjiTipPos.y }}
          onMouseEnter={()=>{ clearTimeout(kanjiHideTimer.current); setKanjiTipVisible(true); }}
          onMouseLeave={()=>{ clearTimeout(kanjiHideTimer.current); kanjiHideTimer.current=setTimeout(()=>setKanjiTipVisible(false), 120); }}
        >
          <div className="card p-3 shadow-xl bg-card/95 backdrop-blur border border-border min-w-[220px]">
            <div className="text-xs text-muted-foreground mb-2">Thông tin Kanji</div>
            {!kanjiInfo && (<div className="text-xs text-muted-foreground">Đang tải…</div>)}
            {kanjiInfo && (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
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
