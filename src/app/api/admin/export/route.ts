import { NextRequest, NextResponse } from "next/server";
import { getDb, EntryDoc } from "../../db/client";

export async function GET(req: NextRequest) {
  // Basic auth handled by middleware
  try {
    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");
    const docs = await col.find({}, { projection: { _id: 0 } }).toArray();
    const header = ["STT","Ngữ liệu","Cách đọc","Nghĩa","Câu ví dụ","Dịch","Link (JP)","Link (VN)"].join(",");
    const rows = docs.map((e, i) => [
      String(i + 1),
      csvEscape(e.kanji || ""),
      csvEscape(e.reading || ""),
      csvEscape(e.meaning || ""),
      csvEscape(e.example || ""),
      csvEscape(e.translation || ""),
      csvEscape(e.linkJP || ""),
      csvEscape(e.linkVN || ""),
    ].join(","));
    const text = [header, ...rows].join("\n");
    return new NextResponse(text, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

function csvEscape(v: string) {
  if (v.includes(",") || v.includes("\n") || v.includes('"')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}


