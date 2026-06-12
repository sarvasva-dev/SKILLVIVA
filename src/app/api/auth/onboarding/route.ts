import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";
import { verifyToken, signToken } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("skillviva_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { name, targetRole } = await req.json();

    const client = await clientPromise;
    const db = client.db("skillviva");
    const usersColl = db.collection("users");

    await usersColl.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $set: { isOnboarded: true, name: name, targetRole: targetRole || "unknown" },
        $unset: { resumeAnalysis: "" }
      }
    );

    // Issue new token with isOnboarded = true
    const newToken = signToken({ 
      userId: decoded.userId, 
      email: decoded.email, 
      isOnboarded: true 
    });

    const serialized = serialize("skillviva_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    const response = NextResponse.json({ message: "Onboarding complete" });
    response.headers.set("Set-Cookie", serialized);
    return response;

  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}