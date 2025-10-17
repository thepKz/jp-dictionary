"use client";

import { useEffect, useState } from "react";

const SIZES = ["14px", "16px", "18px", "20px", "22px"];

export default function FontSizeToggle() {
  const [idx, setIdx] = useState(1);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fontSizeIdx");
      if (saved) setIdx(parseInt(saved, 10));
    } catch {}
  }, []);

  useEffect(() => {
    const val = SIZES[idx] || SIZES[1];
    try { localStorage.setItem("fontSizeIdx", String(idx)); } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--font-size-base", val);
    }
  }, [idx]);

  return (
    <div className="flex items-center gap-2">
      <button className="btn-secondary px-2 py-1" onClick={() => setIdx(Math.max(0, idx - 1))}>A-</button>
      <div className="text-sm">{SIZES[idx] || SIZES[1]}</div>
      <button className="btn-secondary px-2 py-1" onClick={() => setIdx(Math.min(SIZES.length - 1, idx + 1))}>A+</button>
    </div>
  );
}


