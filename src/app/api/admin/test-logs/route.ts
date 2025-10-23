import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "../utils";

export async function POST(req: NextRequest) {
  try {
    // Create some test logs
    await logAdminAction(req, 'import', 'admin', {
      mode: 'append',
      adjType: 'auto',
      count: 5,
      fileName: 'test.csv'
    });
    
    await logAdminAction(req, 'export', 'admin', {
      count: 100,
      fileName: 'export.csv'
    });
    
    await logAdminAction(req, 'create', 'admin', {
      kanji: 'テスト'
    });
    
    return NextResponse.json({ ok: true, message: 'Test logs created' });
  } catch (error) {
    console.error('Failed to create test logs:', error);
    return NextResponse.json({ error: "Failed to create test logs" }, { status: 500 });
  }
}
