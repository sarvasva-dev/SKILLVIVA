import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendLoginOTP } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("skillviva");
    const usersColl = db.collection("users");

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await usersColl.findOne({ email });

    if (!user) {
      // First time user, create a stub record
      await usersColl.insertOne({
        email,
        isOnboarded: false,
        name: "", // To be filled during onboarding
        loginOtp: otp,
        otpExpiry: otpExpiry,
        createdAt: new Date()
      });
    } else {
      // Existing user, just update OTP
      await usersColl.updateOne(
        { email },
        { $set: { loginOtp: otp, otpExpiry: otpExpiry } }
      );
    }

    // Send email asynchronously
    sendLoginOTP(email, otp).catch(console.error);

    return NextResponse.json({ message: "OTP sent to your email" });

  } catch (error) {
    console.error("OTP Request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}