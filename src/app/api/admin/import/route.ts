import { NextRequest, NextResponse } from "next/server";
import { getDb, EntryDoc } from "../../db/client";
import { logAdminAction } from "../utils";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignTypeParam = (searchParams.get('assignType') || '').trim();
    const modeParam = (searchParams.get('mode') || 'append').trim();
    const assignType = assignTypeParam === 'na' || assignTypeParam === 'i' ? (assignTypeParam as 'na' | 'i') : undefined;
    const mode = modeParam === 'replace' ? 'replace' : 'append';

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const entries: EntryDoc[] = parseCsv(text);

    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");

    // Set adjType per request or auto-detect based on reading/kanji
    entries.forEach((e) => {
      if (assignType) {
        e.adjType = assignType;
        return;
      }
      const reading = e.reading || "";
      const kanji = e.kanji || "";
      if (reading.endsWith('い') || kanji.endsWith('い')) {
        e.adjType = 'i';
      } else if (reading.endsWith('な') || kanji.endsWith('な') || kanji.endsWith('的')) {
        e.adjType = 'na';
      }
    });

    let result;
    
    if (mode === 'replace') {
      // Replace mode: clear all existing data and insert new data
      await col.deleteMany({});
      if (entries.length > 0) {
        result = await col.insertMany(entries);
      } else {
        result = { insertedCount: 0 };
      }
    } else {
      // Append mode: upsert bulk
      const ops = entries.map((e) => ({
        updateOne: {
          filter: { kanji: e.kanji },
          update: { $set: e },
          upsert: true,
        },
      }));
      
      const wres: { upsertedCount?: number; modifiedCount?: number } = ops.length ? await col.bulkWrite(ops, { ordered: false }) : { upsertedCount: 0, modifiedCount: 0 } as { upsertedCount: number; modifiedCount: number };
      result = { upsertedCount: (wres.upsertedCount || 0) + (wres.modifiedCount || 0) };
    }

    const upserted = mode === 'replace' ? (result.insertedCount || 0) : ((result as { upsertedCount?: number }).upsertedCount || 0);

    // Log admin action
    await logAdminAction(req, 'import', 'admin', {
      mode,
      adjType: assignType || 'auto',
      count: entries.length,
      fileName: file.name
    });

    return NextResponse.json({ 
      ok: true, 
      count: entries.length, 
      upserted,
      mode 
    });
  } catch (e) {
    console.error('Import error:', e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}


function parseCsv(text: string): EntryDoc[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  // Strict Vietnamese header
  const header = lines[0].trim();
  const expected = "STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch (việt),Link (JP),Link (VN),Nổi bật từ vựng ví dụ";
  if (!header.startsWith("STT")) {
    // tolerate BOM
    const hdr = header.replace(/^\uFEFF/, "");
    if (hdr !== expected) {
      // try relaxed compare by removing spaces diff
      const norm = (s: string) => s.replace(/\s+/g, " ").trim();
      if (norm(hdr) !== norm(expected)) {
        throw new Error("CSV header không đúng định dạng yêu cầu");
      }
    }
  } else if (header !== expected) {
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    if (norm(header) !== norm(expected)) {
      throw new Error("CSV header không đúng định dạng yêu cầu");
    }
  }
  const out: EntryDoc[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 4) continue;
    // New sample.csv format: STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch (việt),Link (JP),Link (VN),Nổi bật từ vựng ví dụ
    const kanji = (cols[1] || "").trim();
    const reading = (cols[2] || "").trim();
    const meaning = (cols[3] || "").trim();
    const example = (cols[4] || "").trim();
    const translation = (cols[5] || "").trim();
    const linkJP = (cols[6] || "").trim();
    const linkVN = (cols[7] || "").trim();
    const highlightTerm = (cols[8] || "").trim();
    if (!kanji) continue;
    out.push({ kanji, reading, meaning, example, translation, linkJP, linkVN, highlightTerm });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}


