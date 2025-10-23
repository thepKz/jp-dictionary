import { NextRequest, NextResponse } from "next/server";
import { getDb, AdminLogDoc } from "../../db/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const action = searchParams.get('action') || '';
    const user = searchParams.get('user') || '';
    
    console.log('Admin logs API called with:', { page, limit, action, user });
    
    const db = await getDb();
    const col = db.collection<AdminLogDoc>("admin_logs");
    
    // Build filter
    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (user) filter.user = { $regex: user, $options: 'i' };
    
    console.log('Filter:', filter);
    
    // Get total count
    const total = await col.countDocuments(filter);
    console.log('Total logs:', total);
    
    // Get paginated results
    const skip = (page - 1) * limit;
    const logs = await col
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    console.log('Found logs:', logs.length);
    
    const totalPages = Math.ceil(total / limit);
    
    const response = {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
    
    console.log('Returning response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch admin logs:', error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, user, details, ip, userAgent } = body;
    
    const db = await getDb();
    const col = db.collection<AdminLogDoc>("admin_logs");
    
    const logEntry: AdminLogDoc = {
      action,
      user,
      details,
      ip,
      userAgent,
      timestamp: new Date()
    };
    
    await col.insertOne(logEntry);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to create admin log:', error);
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 });
  }
}
