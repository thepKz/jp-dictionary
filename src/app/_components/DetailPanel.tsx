"use client";

import { useState } from "react";
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
              <h2 className="text-4xl font-light mb-2">{entry.kanji}</h2>
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
                <h3 className="text-lg font-light mb-4">Cách đọc</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Hiragana</div>
                    <div className="text-2xl text-muted-foreground font-light">{entry.reading}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Romaji</div>
                    <div className="text-2xl font-mono font-light">{toRomaji(entry.reading)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Meanings */}
            <div className="card p-6">
              <h3 className="text-lg font-light mb-4">Nghĩa và cách sử dụng</h3>
              <div className="space-y-4">
                {entry.senses.map((sense, idx) => (
                  <div key={idx} className="border-l border-border pl-6 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-secondary">{sense.pos.join(", ")}</span>
                      {entry.isCommon && (
                        <span className="badge badge-secondary">Phổ biến</span>
                      )}
                    </div>
                    <div className="text-base leading-relaxed font-light">
                      {sense.defs.join(", ")}
                    </div>
                    {sense.tags.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-light">Tags:</span> {sense.tags.join(", ")}
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
                <h3 className="text-lg font-light mb-4">Ví dụ sử dụng</h3>
                <div className="space-y-4">
                  {examples.map((ex) => (
                    <div key={ex.id} className="card p-4 hover-lift">
                      <div className="text-base mb-3 font-light leading-relaxed">{ex.jp.text}</div>
                      {ex.translations[0] && (
                        <div className="text-muted-foreground border-l border-border pl-4">
                          {ex.translations[0].text}
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
    </div>
  );
}
