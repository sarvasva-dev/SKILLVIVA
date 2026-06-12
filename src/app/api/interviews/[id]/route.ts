import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const token = req.cookies.get("skillviva_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { historyItem, reportData, status } = body;

    const client = await clientPromise;
    const db = client.db("skillviva");
    
    const updateDoc: any = {
      $set: { updatedAt: new Date() }
    };

    if (historyItem) {
      updateDoc.$push = { history: historyItem };
    }
    
    if (reportData) {
      updateDoc.$set.reportData = reportData;
    }

    if (status) {
      updateDoc.$set.status = status;
    }

    await db.collection("interviews").updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(decoded.userId) },
      updateDoc
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update interview:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}