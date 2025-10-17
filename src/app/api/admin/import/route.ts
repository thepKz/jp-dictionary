import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDb, EntryDoc } from "../../db/client";

export async function POST(req: NextRequest) {
  // Basic auth handled by middleware. Keep optional token support.

  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "append").toLowerCase(); // append | replace
    const scope = (searchParams.get("scope") || "all").toLowerCase(); // all | na | i (source selection)
    const deleteRatings = (searchParams.get("deleteRatings") || "false").toLowerCase() === "true";

    const root = process.cwd();
    const filesAll = [
      { f: path.join(root, "data", "list1.csv"), type: "na" as const },
      { f: path.join(root, "data", "list2.csv"), type: "i" as const },
    ];
    const files =
      scope === "na" ? filesAll.filter((x) => x.type === "na") :
      scope === "i" ? filesAll.filter((x) => x.type === "i") : filesAll;
    const entries: EntryDoc[] = [];

    for (const { f, type } of files) {
      const text = safeReadFile(f);
      if (!text) continue;
      const parsed = parseCsv(text);
      // Nếu admin chọn phạm vi cụ thể (na/i) thì gắn adjType tương ứng cho tất cả bản ghi nhập vào.
      if (scope === "na" || scope === "i") {
        parsed.forEach((e) => (e.adjType = scope as any));
      }
      entries.push(...parsed);
    }

    const db = await getDb();
    const col = db.collection<EntryDoc>("entries");
    const ratings = db.collection("ratings");

    let deletedEntries = 0;
    let deletedRatings = 0;
    if (mode === "replace") {
      let filter: Record<string, unknown> = {};
      if (scope === "na") filter = { adjType: "na" };
      else if (scope === "i") filter = { adjType: "i" };

      if (deleteRatings) {
        const toDelete = await col.find(filter, { projection: { kanji: 1, _id: 0 } }).toArray();
        const kanjis = toDelete.map((d) => d.kanji);
        if (kanjis.length > 0) {
          const rres = await ratings.deleteMany({ kanji: { $in: kanjis } });
          deletedRatings = rres.deletedCount || 0;
        }
      }
      const dres = await col.deleteMany(filter);
      deletedEntries = dres.deletedCount || 0;
    }

    // Append/upsert bulk
    const ops = entries.map((e) => ({
      updateOne: {
        filter: { kanji: e.kanji },
        update: { $set: e },
        upsert: true,
      },
    }));
    const wres: { upsertedCount?: number; modifiedCount?: number } = ops.length ? await col.bulkWrite(ops, { ordered: false }) : { upsertedCount: 0, modifiedCount: 0 } as { upsertedCount: number; modifiedCount: number };
    const upserted = (wres.upsertedCount || 0) + (wres.modifiedCount || 0);

    return NextResponse.json({ ok: true, count: entries.length, upserted, deletedEntries, deletedRatings, mode, scope });
  } catch (e) {
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function parseCsv(text: string): EntryDoc[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const out: EntryDoc[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 4) continue;
    // Both list1 and list2 share header order similar to: STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch,Link (JP),Link (VN)
    const kanji = (cols[1] || "").trim();
    const reading = (cols[2] || "").trim();
    const meaning = (cols[3] || "").trim();
    const example = (cols[4] || "").trim();
    const translation = (cols[5] || "").trim();
    const linkJP = (cols[6] || "").trim();
    const linkVN = (cols[7] || "").trim();
    if (!kanji) continue;
    out.push({ kanji, reading, meaning, example, translation, linkJP, linkVN });
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


