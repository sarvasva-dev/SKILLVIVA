import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";
import clientPromise from "@/lib/mongodb";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("skillviva");
    const usersColl = db.collection("users");



    const user = await usersColl.findOne({ email });

    if (!user || !user.loginOtp) {
      return NextResponse.json({ error: "Invalid request. Request a new OTP." }, { status: 400 });
    }

    if (user.loginOtp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    // Clear OTP after successful use
    await usersColl.updateOne(
      { email },
      { $unset: { loginOtp: "", otpExpiry: "" } }
    );

    // Create JWT Token
    const token = signToken({ 
      userId: user._id.toString(), 
      email: user.email, 
      isOnboarded: user.isOnboarded 
    });

    // Set cookie
    const serialized = serialize("skillviva_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    const response = NextResponse.json({ 
      message: "Login successful", 
      isOnboarded: user.isOnboarded,
      isNewUser: !user.isOnboarded
    });
    
    response.headers.set("Set-Cookie", serialized);
    return response;

  } catch (error) {
    console.error("OTP Verify error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}