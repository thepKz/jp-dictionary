import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, message } = await req.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = process.env.GMAIL_USERNAME;
    const pass = process.env.GMAIL_PASSWORD;

    if (!user || !pass) {
      return NextResponse.json({ error: "Email configuration not found" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: user,
      to: to,
      subject: subject,
      text: message,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
