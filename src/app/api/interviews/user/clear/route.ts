import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("skillviva_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("skillviva");

    await db.collection("interviews").deleteMany({ userId: new ObjectId(decoded.userId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear interview history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}