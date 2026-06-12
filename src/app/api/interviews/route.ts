import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
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

    const body = await req.json();
    const { role, difficulty } = body;

    const client = await clientPromise;
    const db = client.db("skillviva");
    
    const interviewSession = {
      userId: new ObjectId(decoded.userId),
      role,
      initialDifficulty: difficulty,
      history: [],
      status: "IN_PROGRESS", // IN_PROGRESS, CONCLUDED
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("interviews").insertOne(interviewSession);
    
    return NextResponse.json({ interviewId: result.insertedId });
  } catch (error) {
    console.error("Failed to start interview:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}