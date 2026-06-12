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
      console.warn("Initial JSON.parse failed, attempting to salvage truncated JSON...");
      try {
        const lastBraceIndex = responseText.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
          let salvagedText = responseText.substring(0, lastBraceIndex + 1);
          if (salvagedText.includes('[')) {
             const startIdx = salvagedText.indexOf('[');
             salvagedText = salvagedText.substring(startIdx) + ']';
          }
          questionsData = JSON.parse(salvagedText);
          if (!Array.isArray(questionsData)) {
            throw new Error("Salvaged JSON is not an array");
          }
          console.log(`Successfully salvaged ${questionsData.length} questions from truncated JSON.`);
        } else {
          throw new Error("No valid objects found to salvage.");
        }
      } catch (salvageErr) {
        console.error("Failed to salvage batch JSON", salvageErr);
        console.error("Original parse error:", parseErr);
        // Do not return 500 here, use fallback instead.
      }
    }

    // Ultimate Fallback: if questionsData is empty or not an array, provide generic questions
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      console.warn("Using ultimate fallback generic questions because LLM generation failed completely.");
      questionsData = [
        { text: `Tell me about your experience as a ${role}.`, difficulty: "Level 1" },
        { text: "What is your greatest strength in this field?", difficulty: "Level 1" },
        { text: "Can you describe a challenging project you've worked on?", difficulty: "Level 2" },
        { text: "How do you handle disagreements with team members?", difficulty: "Level 2" },
        { text: "Where do you see your career going in the next 5 years?", difficulty: "Level 1" },
        { text: "How do you stay updated with the latest trends in your industry?", difficulty: "Level 1" },
        { text: "Describe a time when you had to learn a new skill quickly.", difficulty: "Level 2" },
        { text: "What are your expectations for this role?", difficulty: "Level 1" },
        { text: "How do you prioritize your tasks when facing tight deadlines?", difficulty: "Level 2" },
        { text: "Tell me about a time you failed and what you learned from it.", difficulty: "Level 3" }
      ];
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