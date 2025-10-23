import { NextResponse } from "next/server";
import { getDb } from "../../db/client";

export async function GET() {
  try {
    const db = await getDb();
    
    // Get entry counts by type
    const entries = db.collection("entries");
    const totalEntries = await entries.countDocuments();
    const naEntries = await entries.countDocuments({ adjType: "na" });
    const iEntries = await entries.countDocuments({ adjType: "i" });
    const untypedEntries = await entries.countDocuments({ adjType: { $exists: false } });
    
    // Get feedback count
    const feedback = db.collection("feedback");
    const totalFeedback = await feedback.countDocuments();
    const recentFeedback = await feedback.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });
    
    // Get recent entries with full details
    const recentEntries = await entries
      .find({}, { projection: { _id: 0 } })
      .sort({ _id: -1 })
      .limit(10)
      .toArray();
    
    // Get recent feedback with full details
    const recentFeedbackList = await feedback
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      entries: {
        total: totalEntries,
        na: naEntries,
        i: iEntries,
        untyped: untypedEntries
      },
      feedback: {
        total: totalFeedback,
        recent: recentFeedback
      },
      recentEntries,
      recentFeedback: recentFeedbackList
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
