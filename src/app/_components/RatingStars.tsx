"use client";

import { useCallback, useEffect, useState } from "react";

type Props = { kanji: string };

export default function RatingStars({ kanji }: Props) {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/ratings?kanji=${encodeURIComponent(kanji)}`);
      const json = await res.json();
      setAvg(json.avg || 0);
      setCount(json.count || 0);
    } catch {}
  }, [kanji]);

  useEffect(() => { load(); }, [load]);

  const rate = async (score: number) => {
    setMyScore(score);
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kanji, score }),
      });
      await load();
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1,2,3,4,5].map((i) => (
          <Star key={i} filled={(hover ?? myScore ?? Math.round(avg)) >= i} onEnter={() => setHover(i)} onLeave={() => setHover(null)} onClick={() => rate(i)} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{avg.toFixed(1)} ({count})</span>
    </div>
  );
}

function Star({ filled, onEnter, onLeave, onClick }: { filled: boolean; onEnter: () => void; onLeave: () => void; onClick: () => void; }) {
  return (
    <svg onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick} width="18" height="18" viewBox="0 0 24 24" className={`cursor-pointer ${filled ? "text-yellow-400" : "text-muted-foreground"}`} fill="currentColor">
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.902 4.664 23.165l1.402-8.168L.132 9.21l8.2-1.192z"/>
    </svg>
  );
}


