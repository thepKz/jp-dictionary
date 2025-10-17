"use client";

import { useState } from "react";

type Stat = {
  entries: number;
  ratings: number;
  feedback: number;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stat | null>(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<'all'|'na'|'i'>('all');
  const [editKanji, setEditKanji] = useState("");
  type AdminEntry = { reading?: string; meaning?: string; example?: string; translation?: string; antonyms?: string[]; synonyms?: string[] } | null;
  const [entry, setEntry] = useState<AdminEntry>(null);

  const importCsv = async () => {
    setImporting(true); setMsg("");
    try {
      const res = await fetch(`/api/admin/import`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setMsg(`Đã nhập ${json.upserted}/${json.count}`);
    } catch (e: unknown) {
      setMsg((e as Error).message || "Lỗi import");
    }
    setImporting(false);
  };

  const exportCsv = async () => {
    setMsg("");
    const res = await fetch(`/api/admin/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'entries_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-light mb-6 text-center">Admin Dashboard</h1>
      {/* Basic Auth đã bảo vệ /admin và /api/admin, không cần ADMIN_TOKEN nữa */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={exportCsv}>Xuất CSV</button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
      <div className="card p-4 mb-4">
        <div className="text-sm text-muted-foreground mb-2">Bộ lọc hiển thị</div>
        <div className="flex gap-2">
          <button className={`btn-secondary px-3 py-1 ${filter==='all'?'border border-primary':''}`} onClick={()=>setFilter('all')}>Tất cả</button>
          <button className={`btn-secondary px-3 py-1 ${filter==='na'?'border border-primary':''}`} onClick={()=>setFilter('na')}>Na-adj (list1)</button>
          <button className={`btn-secondary px-3 py-1 ${filter==='i'?'border border-primary':''}`} onClick={()=>setFilter('i')}>I-adj (list2)</button>
        </div>
      </div>
      <div className="card p-4 mb-4">
        <div className="text-sm text-muted-foreground mb-2">Sửa nhanh từ vựng</div>
        <div className="flex gap-2 mb-3">
          <input className="input" placeholder="Nhập kanji để tìm" value={editKanji} onChange={(e)=>setEditKanji(e.target.value)} />
          <button className="btn-secondary" onClick={async()=>{
            const res = await fetch(`/api/admin/entry?kanji=${encodeURIComponent(editKanji)}`);
            const json = await res.json();
            setEntry(json.data || null);
          }}>Tìm</button>
        </div>
        {entry && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className="input" value={entry.reading||''} onChange={(e)=>setEntry({...entry, reading:e.target.value})} placeholder="Cách đọc" />
              <input className="input" value={entry.meaning||''} onChange={(e)=>setEntry({...entry, meaning:e.target.value})} placeholder="Nghĩa" />
              <input className="input" value={entry.example||''} onChange={(e)=>setEntry({...entry, example:e.target.value})} placeholder="Ví dụ" />
              <input className="input" value={entry.translation||''} onChange={(e)=>setEntry({...entry, translation:e.target.value})} placeholder="Dịch" />
              <input className="input" value={(entry.antonyms||[]).join(', ')} onChange={(e)=>setEntry({...entry, antonyms:e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)})} placeholder="Từ trái nghĩa (phân cách bằng ,)" />
              <input className="input" value={(entry.synonyms||[]).join(', ')} onChange={(e)=>setEntry({...entry, synonyms:e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)})} placeholder="Từ đồng nghĩa (phân cách bằng ,)" />
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={async()=>{
                setMsg("");
                const res = await fetch('/api/admin/entry', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kanji: editKanji, ...entry }) });
                const json = await res.json();
                if(!res.ok) { setMsg(json.error||'Lỗi'); return; }
                setMsg('Đã lưu');
              }}>Lưu</button>
            </div>
          </div>
        )}
      </div>
      <div className="card p-4 mb-4">
        <div className="text-sm text-muted-foreground mb-2">Thao tác nhanh Replace</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={async()=>{
            setMsg(""); setImporting(true);
            try {
              const res = await fetch('/api/admin/import?mode=replace&scope=na&deleteRatings=true', { method: 'POST' });
              const json = await res.json();
              if(!res.ok) throw new Error(json.error || 'failed');
              setMsg(`Replace Na: del ${json.deletedEntries}/${json.deletedRatings} ratings, upserted ${json.upserted}`);
            } catch(e: unknown){ setMsg((e as Error).message || 'Lỗi'); }
            setImporting(false);
          }}>Replace Na-adj (list1)</button>
          <button className="btn-secondary" onClick={async()=>{
            setMsg(""); setImporting(true);
            try {
              const res = await fetch('/api/admin/import?mode=replace&scope=i&deleteRatings=true', { method: 'POST' });
              const json = await res.json();
              if(!res.ok) throw new Error(json.error || 'failed');
              setMsg(`Replace I: del ${json.deletedEntries}/${json.deletedRatings} ratings, upserted ${json.upserted}`);
            } catch(e: unknown){ setMsg((e as Error).message || 'Lỗi'); }
            setImporting(false);
          }}>Replace I-adj (list2)</button>
        </div>
      </div>
      {/* Placeholders for future stats */}
      <div className="card p-4">
        <div className="text-sm text-muted-foreground">Thống kê sẽ hiển thị ở đây (entries, ratings, feedback).</div>
      </div>
    </div>
  );
}


