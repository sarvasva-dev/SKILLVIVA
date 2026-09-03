import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"SkillViva" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your SkillViva Access Code",
      text: `Your SkillViva access code is: ${otp}. Please enter this on the login page to continue.`,
      html: `
        <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px; text-align: center;">
          <h1 style="color: #e63329; margin-bottom: 20px;">SKILLVIVA</h1>
          <p style="font-size: 16px; color: #ccc;">Your access code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; padding: 15px; background: #111; border: 1px solid #333; display: inline-block;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">Enter this code on the login page to continue. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    // Return the OTP so the client can verify it statelessly
    return NextResponse.json({ success: true, otp });

  } catch (error: any) {
    console.error("OTP Send Error:", error);
    return NextResponse.json(
      { error: "Failed to send email. Please try again later." },
      { status: 500 }
    );
  }
}
