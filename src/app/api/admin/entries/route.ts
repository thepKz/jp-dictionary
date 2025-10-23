import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../db/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "kanji";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const db = await getDb();
    const entries = db.collection("entries");

    // Build filter query
    const query: Record<string, unknown> = {};
    if (filter === "na") {
      query.adjType = "na";
    } else if (filter === "i") {
      query.adjType = "i";
    } else if (filter === "missing-jp-link") {
      query.$or = [
        { linkJP: { $exists: false } },
        { linkJP: null },
        { linkJP: "" }
      ];
    } else if (filter === "missing-vn-link") {
      query.$or = [
        { linkVN: { $exists: false } },
        { linkVN: null },
        { linkVN: "" }
      ];
    } else if (filter === "missing-highlight") {
      query.$or = [
        { highlightTerm: { $exists: false } },
        { highlightTerm: null },
        { highlightTerm: "" }
      ];
    } else if (filter === "missing-example") {
      query.$or = [
        { example: { $exists: false } },
        { example: null },
        { example: "" }
      ];
    } else if (filter === "missing-translation") {
      query.$or = [
        { translation: { $exists: false } },
        { translation: null },
        { translation: "" }
      ];
    } else if (filter === "untyped") {
      query.$or = [
        { adjType: { $exists: false } },
        { adjType: null },
        { adjType: "" }
      ];
    } else if (filter === "complete") {
      Object.assign(query, {
        linkJP: { $exists: true, $ne: null, $nin: [""] },
        linkVN: { $exists: true, $ne: null, $nin: [""] },
        highlightTerm: { $exists: true, $ne: null, $nin: [""] },
        example: { $exists: true, $ne: null, $nin: [""] },
        translation: { $exists: true, $ne: null, $nin: [""] },
        adjType: { $exists: true, $ne: null, $nin: [""] },
      });
    }

    // Add search filter (Vietnamese-insensitive: strip diacritics & spaces)
    if (search) {
      const searchQuery = {
        $or: [
          { kanji: { $regex: search, $options: "i" } },
          { reading: { $regex: search, $options: "i" } },
          { meaning: { $regex: search, $options: "i" } },
          { example: { $regex: search, $options: "i" } },
          { translation: { $regex: search, $options: "i" } },
        ]
      };
      
      // If we already have a filter query, combine with $and
      if (Object.keys(query).length > 0) {
        query.$and = [query, searchQuery];
        // Remove the original query properties since they're now in $and
        Object.keys(query).forEach(key => {
          if (key !== '$and' && key !== '$or') {
            delete query[key];
          }
        });
      } else {
        Object.assign(query, searchQuery);
      }
    }

    // Build sort object
    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (page - 1) * limit;
    
    const [docs, total] = await Promise.all([
      entries
        .find(query, { projection: { _id: 0 } })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .toArray(),
      entries.countDocuments(query)
    ]);

    return NextResponse.json({
      data: docs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      sort: {
        by: sortBy,
        order: sortOrder
      }
    });
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}
