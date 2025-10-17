import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getDb, RatingDoc } from "../db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kanji = (searchParams.get("kanji") || "").trim();
  if (!kanji) return NextResponse.json({ error: "kanji required" }, { status: 400 });
  try {
    const db = await getDb();
    const col = db.collection<RatingDoc>("ratings");
    const cursor = col.aggregate([
      { $match: { kanji } },
      { $group: { _id: "$kanji", avg: { $avg: "$score" }, count: { $sum: 1 } } },
    ]);
    const agg = await cursor.next();
    return NextResponse.json({ kanji, avg: agg?.avg || 0, count: agg?.count || 0 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kanji: string = (body.kanji || "").trim();
    const score: number = Number(body.score);
    if (!kanji || !(score >= 1 && score <= 5)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const ua = req.headers.get("user-agent") || "";
    const salt = process.env.RATING_SALT || "salt";
    const ipHash = createHash("sha256").update(ip + ua + salt).digest("hex");

    const db = await getDb();
    const col = db.collection<RatingDoc>("ratings");
    await col.updateOne(
      { kanji, ipHash },
      { $set: { kanji, ipHash, score, createdAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


