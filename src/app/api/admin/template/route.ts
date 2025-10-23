import { NextResponse } from "next/server";

export async function GET() {
  const header = ["STT","Ngữ liệu","Cách đọc","Nghĩa","Câu ví dụ","Dịch (việt)","Link (JP)","Link (VN)","Nổi bật từ vựng ví dụ"].join(",");
  const sampleRows = [
    ["1","経済的","けいざいてき","tính kinh tế","非経済的","có tính kinh tế","","","非経済的"].map(csvEscape).join(","),
    ["2","安全な","あんぜんな","an toàn","危険な","an toàn","","","危険な"].map(csvEscape).join(","),
  ];
  const text = [header, ...sampleRows].join("\n");
  return new NextResponse(text, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=sample.csv" } });
}

function csvEscape(v: string) {
  if (v.includes(",") || v.includes("\n") || v.includes('"')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}


