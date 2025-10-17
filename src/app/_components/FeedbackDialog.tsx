"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function FeedbackDialog({ open, onClose }: Props) {
  const [types, setTypes] = useState<{ bug: boolean; suggestion: boolean }>({ bug: false, suggestion: true });
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>("");

  if (!open) return null;

  const submit = async () => {
    setError("");
    if (!message.trim()) { setError("Vui lòng nhập nội dung góp ý."); return; }
    if (!types.bug && !types.suggestion) { setError("Vui lòng chọn loại góp ý."); return; }
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: [types.bug && "bug", types.suggestion && "suggestion"].filter(Boolean), email, message }),
      });
      setDone(true);
      setMessage("");
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="card max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-light">Góp ý / Báo lỗi</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-accent flex items-center justify-center">×</button>
        </div>
        {done ? (
          <div className="text-sm">Cảm ơn bạn! Phản hồi đã được ghi nhận.</div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Loại phản hồi (có thể chọn nhiều)</div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={types.suggestion} onChange={(e)=>setTypes(t=>({...t, suggestion: e.target.checked}))} />
                  Góp ý
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={types.bug} onChange={(e)=>setTypes(t=>({...t, bug: e.target.checked}))} />
                  Báo lỗi
                </label>
              </div>
            </div>
            <input className="input" placeholder="Email (không bắt buộc)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <textarea className="input" placeholder="Nội dung" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
            {error && <div className="text-red-500 text-xs">{error}</div>}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose}>Đóng</button>
              <button className="btn-primary" onClick={submit} disabled={submitting || !message.trim()}>{submitting ? "Đang gửi..." : "Gửi"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


