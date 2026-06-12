import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateContentWithFallback, cleanJsonString } from "@/lib/ai";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, resumeContext, difficulty } = body;

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("skillviva");

    let userIdStr = "";
    let resumeAnalysisText = "";

    const token = req.cookies.get("skillviva_token")?.value;
    if (token) {
      try {
        const decoded = verifyToken(token) as any;
        if (decoded && decoded.userId) {
          userIdStr = decoded.userId;
          const user = await db.collection("users").findOne({ _id: new ObjectId(userIdStr) });
          if (user && user.resumeAnalysis) {
            const analysis = user.resumeAnalysis;
            resumeAnalysisText = `
Candidate's AI Resume Analysis:
- Missing Skills for Role: ${analysis.missingSkills?.join(', ') || 'None'}
- Key Mismatches: ${analysis.mismatches?.join(', ') || 'None'}
- Areas for Improvement: ${analysis.improvements?.join(', ') || 'None'}
            `;
          }
        }
      } catch (e) {
        console.error("Token verification failed in generate-batch route:", e);
      }
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "User must be logged in" }, { status: 401 });
    }

    // Always generate exactly 30 questions (10 for each level) as requested
    const prompt = `
You are an expert technical and behavioral interviewer conducting a mock interview for the role of ${role}.
Generate EXACTLY 30 highly personalized interview questions based strictly on the candidate's resume provided below.

DISTRIBUTION:
- 10 Questions at Level 1 (Foundational / Basic / Introduction)
- 10 Questions at Level 2 (Intermediate / Scenario-based / Problem-solving)
- 10 Questions at Level 3 (Advanced / Complex / Stress-test / Deep dive)

CRITICAL REQUIREMENTS:
1. Make the questions conversational, direct, and brutally honest.
2. Each question MUST be short and crisp (maximum 25 words).
3. Do NOT mention any specific company names (like Google, Amazon, etc.).
4. Do NOT hallucinate. Pick a project, skill, or experience EXPLICITLY MENTIONED in the candidate's resume.
5. Output ONLY a raw JSON array of objects. Do not wrap in markdown block.

Expected JSON Array format:
[
  { "text": "Question text here...", "difficulty": "Level 1" },
  { "text": "Question text here...", "difficulty": "Level 2" }
]

Resume:
${resumeContext?.substring(0, 4000) || "Candidate has not provided a detailed resume."}

${resumeAnalysisText}
    `;

    // 80 seconds timeout for generating 30 questions
    const rawResponse = await generateContentWithFallback(prompt, 4000, 0.7, 80000);
    const responseText = cleanJsonString(rawResponse);

    let questionsData = [];
    try {
      questionsData = JSON.parse(responseText);
      if (!Array.isArray(questionsData)) {
        throw new Error("Parsed JSON is not an array");
      }
    } catch (parseErr) {
      console.error("Failed to parse batch JSON", parseErr);
      return NextResponse.json({ error: "Failed to parse generated questions" }, { status: 500 });
    }

    // Format for DB insertion
    const docsToInsert = questionsData.map((q: any) => ({
      user_id: new ObjectId(userIdStr),
      role_id: role,
      difficulty: q.difficulty || "Level 1",
      text: q.text,
      createdAt: new Date(),
      used: false
    }));

    if (docsToInsert.length > 0) {
      // Optional: Delete previous custom questions for this role/user to prevent infinite buildup
      await db.collection("custom_questions").deleteMany({
        user_id: new ObjectId(userIdStr),
        role_id: role
      });

      await db.collection("custom_questions").insertMany(docsToInsert);
    }

    return NextResponse.json({ success: true, count: docsToInsert.length });

  } catch (error) {
    console.error("Batch generation error:", error);
    return NextResponse.json({ error: "Failed to generate question batch" }, { status: 500 });
  }
}