import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb, FeedbackDoc } from "../db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email: string | undefined = body.email?.toString().trim() || undefined;
    const type = Array.isArray(body.type) ? body.type : [String(body.type || 'suggestion')];
    const message: string = (body.message || "").trim();
    const meta = body.meta && typeof body.meta === "object" ? body.meta : undefined;
    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

    const db = await getDb();
    const col = db.collection<FeedbackDoc>("feedback");
    const doc: FeedbackDoc = { email, type, message, meta, createdAt: new Date() } as FeedbackDoc;
    await col.insertOne(doc);

    // Send email notification
    const user = process.env.GMAIL_USERNAME;
    const pass = process.env.GMAIL_PASSWORD;
    if (user && pass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: user,
        to: user,
        subject: `[JP Econ Dict] ${type.toUpperCase()} feedback`,
        text: `From: ${email || "(no email)"}\nType: ${type}\n\n${message}`,
      });
      if (email) {
        await transporter.sendMail({
          from: user,
          to: email,
          subject: "Cảm ơn bạn đã góp ý",
          text: "Cảm ơn bạn đã gửi góp ý cho Từ điển tính từ kinh tế Nhật. Chúng tôi sẽ xem xét và phản hồi nếu cần thiết.",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


