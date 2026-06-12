import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, cleanJsonString } from "@/lib/ai";
import { verifyToken } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, targetRole } = body;

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const roleContext = targetRole ? `You are evaluating this candidate STRICTLY for the role of: "${targetRole}".` : `Guess the candidate's target role based on their resume.`;

    const prompt = `
You are an expert, brutally honest technical recruiter and ATS software evaluator.
${roleContext}

Perform a deep analysis of their resume against this target role. Do not hold back; be brutally realistic, sharp, and highly critical.

Output your response strictly in the following JSON format:
{
  "feedback": "<brutal 2-3 sentence overall review of their profile>",
  "atsFriendly": <boolean>,
  "atsReason": "<1 sentence why it is or isn't ATS friendly (formatting, keywords, etc.)>",
  "pageCount": "<Candidate's page count guess based on text length>",
  "pageAnalysis": "<Feedback on their page length, e.g. 'Too long for your experience' or 'Perfect 1-pager'>",
  "missingSkills": ["<skill 1>", "<skill 2>"],
  "extraSkills": ["<irrelevant skill 1>", "<irrelevant skill 2>"],
  "mismatches": ["<major mismatch 1>", "<major mismatch 2>"],
  "improvements": ["<actionable step 1>", "<actionable step 2>"],
  "suggestedDifficulty": <integer 1 (Beginner), 2 (Standard), or 3 (Brutal)>
}

Return ONLY the JSON. No markdown backticks, no wrap.

Resume Text:
${text.substring(0, 5000)}
    `;

    const rawResponse = await generateContentWithFallback(prompt);
    const responseText = cleanJsonString(rawResponse);

    const data = JSON.parse(responseText);

    // Save to user DB if authenticated
    const token = req.cookies.get("skillviva_token")?.value;
    if (token) {
      const decoded = verifyToken(token) as any;
      if (decoded && decoded.userId) {
        const client = await clientPromise;
        const db = client.db("skillviva");
        await db.collection("users").updateOne(
          { _id: new ObjectId(decoded.userId) },
          { 
            $set: { 
              resumeText: text.substring(0, 8000), 
              resumeAnalysis: data 
            } 
          }
        );
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze resume" }, { status: 500 });
  }
}