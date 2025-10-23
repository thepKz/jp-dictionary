import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../db/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") || "";

    const db = await getDb();
    const feedback = db.collection("feedback");

    // Build filter query
    const query: Record<string, unknown> = {};
    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;
    
    const [docs, total] = await Promise.all([
      feedback
        .find(query, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      feedback.countDocuments(query)
    ]);

    return NextResponse.json({
      data: docs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}
