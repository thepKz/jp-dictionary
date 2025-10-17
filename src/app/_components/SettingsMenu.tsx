"use client";

import { useEffect, useRef, useState } from "react";

const FONT_SIZES = ["14px", "16px", "18px", "20px", "22px"];
const FONTS = [
  { label: "Noto Sans JP", value: "'Noto Sans JP', 'Meiryo', 'Hiragino Kaku Gothic Pro', 'Yu Gothic', 'MS PGothic', Osaka, sans-serif" },
  { label: "Noto Serif JP", value: "'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', 'MS PMincho', serif" },
  { label: "Inter (Latin)", value: "Inter, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif" },
  { label: "Yu Gothic", value: "'Yu Gothic', 'Meiryo', 'MS PGothic', Osaka, sans-serif" },
  { label: "Hiragino Kaku Gothic", value: "'Hiragino Kaku Gothic Pro', 'Meiryo', 'Yu Gothic', sans-serif" },
  { label: "Hiragino Mincho", value: "'Hiragino Mincho ProN', 'Yu Mincho', serif" },
];

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [fontIdx, setFontIdx] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("fontSizeIdx");
      if (s) setSizeIdx(parseInt(s, 10));
      const f = localStorage.getItem("fontIdx");
      if (f) setFontIdx(parseInt(f, 10));
    } catch {}
  }, []);

  useEffect(() => {
    const val = FONT_SIZES[sizeIdx] || FONT_SIZES[1];
    document.documentElement.style.setProperty("--font-size-base", val);
    try { localStorage.setItem("fontSizeIdx", String(sizeIdx)); } catch {}
  }, [sizeIdx]);

  useEffect(() => {
    const v = FONTS[fontIdx]?.value || FONTS[0].value;
    document.documentElement.style.setProperty("--font-sans", v);
    try { localStorage.setItem("fontIdx", String(fontIdx)); } catch {}
  }, [fontIdx]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggleTheme = () => {
    const el = document.documentElement;
    const next = el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    el.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-card hover-glow"
        onClick={() => setOpen(!open)}
        aria-label="Cài đặt"
      >
        <img src="/settings.png" alt="Cài đặt" width={18} height={18} className="opacity-80 icon-invert-dark" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 z-20 card p-4 animate-pop">
          <div className="text-sm font-medium mb-3">Cài đặt hiển thị</div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Giao diện</div>
              <button className="w-full btn-secondary px-3 py-2" onClick={toggleTheme}>Đổi Dark/Light</button>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Cỡ chữ</div>
              <div className="flex items-center justify-center gap-2 w-full">
                <button
                  className="inline-flex w-9 h-9 items-center justify-center rounded-md border border-border text-lg"
                  onClick={() => setSizeIdx(Math.max(0, sizeIdx - 1))}
                  aria-label="Giảm cỡ chữ"
                >-</button>
                <div
                  className="tabular-nums font-semibold"
                  style={{
                    fontSize: `${Math.max(parseInt(FONT_SIZES[sizeIdx] || FONT_SIZES[1], 10) + 3, 18)}px`,
                    minWidth: "34px",
                    textAlign: "center"
                  }}
                >
                  {FONT_SIZES[sizeIdx] || FONT_SIZES[1]}
                </div>
                <button
                  className="inline-flex w-9 h-9 items-center justify-center rounded-md border border-border text-lg"
                  onClick={() => setSizeIdx(Math.min(FONT_SIZES.length - 1, sizeIdx + 1))}
                  aria-label="Tăng cỡ chữ"
                >+</button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Font</div>
              <select className="input" value={fontIdx} onChange={(e) => setFontIdx(parseInt(e.target.value, 10))}>
                {FONTS.map((f, i) => (<option key={f.label} value={i}>{f.label}</option>))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


