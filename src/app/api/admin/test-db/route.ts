import { NextResponse } from "next/server";
import { getDb, AdminLogDoc } from "../../db/client";

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    const db = await getDb();
    const col = db.collection<AdminLogDoc>("admin_logs");
    
    // Test database connection
    const count = await col.countDocuments({});
    console.log('Database connected. Total logs:', count);
    
    // Get all logs (for debugging)
    const allLogs = await col.find({}).sort({ timestamp: -1 }).limit(10).toArray();
    console.log('Sample logs:', allLogs);
    
    return NextResponse.json({ 
      ok: true, 
      totalLogs: count,
      sampleLogs: allLogs,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({ 
      error: "Database test failed", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
