import { NextRequest } from "next/server";
import { AdminLogDoc, getDb } from "../db/client";

export async function logAdminAction(
  req: NextRequest,
  action: AdminLogDoc['action'],
  user: string,
  details: AdminLogDoc['details']
) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
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
    console.log('Admin action logged:', action, user);
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

export function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         'unknown';
}
