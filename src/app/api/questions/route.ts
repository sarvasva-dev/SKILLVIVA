import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateContentWithFallback } from "@/lib/ai";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role_id, difficulty = "1", questionNumber = 1, resumeContext = "", askedQuestionIds = [], previousQuestions = [] } = body;

    if (!role_id) {
      return NextResponse.json({ error: "role_id is required" }, { status: 400 });
    }

    const levelMap: Record<string, string> = {
      "1": "Level 1",
      "2": "Level 2",
      "3": "Level 3"
    };
    const diffText = levelMap[difficulty] || "Level 1";

    const client = await clientPromise;
    const db = client.db("skillviva");

    let resumeAnalysisText = "";
    
    let decoded: any = null;
    const token = req.cookies.get("skillviva_token")?.value;
    if (token) {
      try {
        decoded = verifyToken(token) as any;
        if (decoded && decoded.userId) {
          const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.userId) });
          if (user && user.resumeAnalysis) {
            const analysis = user.resumeAnalysis;
            resumeAnalysisText = `
Candidate's AI Resume Analysis (Use this to target weaknesses):
[WARNING: The following 'Missing Skills' are skills the candidate DOES NOT HAVE. Do NOT ask them to explain their experience in these skills. Instead, ask how they would handle situations requiring these skills, or ask about alternative skills they have.]
- Missing Skills for Role: ${analysis.missingSkills?.join(', ') || 'None'}
- Key Mismatches: ${analysis.mismatches?.join(', ') || 'None'}
- Areas for Improvement: ${analysis.improvements?.join(', ') || 'None'}
            `;
          }
        }
      } catch (e) {
        console.error("Token verification failed in questions route:", e);
      }
    }

    // Question 1: Introduction ONLY
    if (questionNumber === 1) {
      const prompt = `
You are an expert interviewer conducting a mock interview for the role of ${role_id}. 
This is the FIRST question of the interview. 
Ask the candidate to introduce themselves and briefly walk through their background.
CRITICAL REQUIREMENT 1: ONLY ask them to introduce themselves. Do NOT ask two questions at once (e.g., do not ask "Introduce yourself AND tell me about X").
CRITICAL REQUIREMENT 2: The question MUST be short and conversational (maximum 20 words). Example: "Welcome. Please introduce yourself and walk me through your background."
Return ONLY the text of the question, nothing else.
      `;
      let resultText = "Welcome. Please introduce yourself and walk me through your background.";
      try {
        const aiOutput = await generateContentWithFallback(prompt);
        if (aiOutput) resultText = aiOutput;
      } catch (err) {
        console.error("LLM API Network/Timeout Error (Q1):", err);
      }
      return NextResponse.json({ question: { text: resultText, difficulty: diffText } });
    }

    const query: any = { role_id, difficulty: diffText };

    // Convert string IDs to ObjectIds for MongoDB $nin query
    const objectIds = askedQuestionIds
      .filter((id: string) => id && id.length === 24)
      .map((id: string) => new ObjectId(id));

    // Exclude already-asked questions to prevent repetition
    let excludeFilter: any = objectIds.length > 0
      ? { ...query, _id: { $nin: objectIds } }
      : query;

    // FIRST: Check if the user has pre-generated CUSTOM questions
    let customQuestionFound = false;
    let adaptedText = "";
    let fetchedQuestionId = null;

    if (decoded && decoded.userId) {
      const customExcludeFilter = objectIds.length > 0
        ? { role_id, difficulty: diffText, user_id: new ObjectId(decoded.userId), _id: { $nin: objectIds } }
        : { role_id, difficulty: diffText, user_id: new ObjectId(decoded.userId) };

      const customQuestions = await db.collection("custom_questions").aggregate([
        { $match: customExcludeFilter },
        { $sample: { size: 1 } }
      ]).toArray();

      if (customQuestions.length > 0) {
        adaptedText = customQuestions[0].text;
        fetchedQuestionId = customQuestions[0]._id?.toString();
        customQuestionFound = true;
      }
    }

    if (!customQuestionFound) {
      // FALLBACK TO EXISTING LOGIC: Fetch generic question and adapt it
      let questions = await db.collection("questions").aggregate([
        { $match: excludeFilter },
        { $sample: { size: 1 } }
      ]).toArray();

      let dbQuestion = "";
      if (questions.length === 0) {
        // Fallback: ignore difficulty filter but still exclude asked questions
        const fallbackFilter = objectIds.length > 0
          ? { role_id, _id: { $nin: objectIds } }
          : { role_id };
        questions = await db.collection("questions").aggregate([
          { $match: fallbackFilter },
          { $sample: { size: 1 } }
        ]).toArray();
      }

      if (questions.length > 0) {
        dbQuestion = questions[0].text;
        fetchedQuestionId = questions[0]._id?.toString();
      }

      if (dbQuestion) {
        const adaptPrompt = `
You are an expert interviewer conducting a mock interview for the role of ${role_id}.
You want to ask the following standard interview question: "${dbQuestion}"

Rewrite this question so it applies directly to the candidate's experience, target domain, or skills/tools mentioned in their resume. 

CRITICAL REQUIREMENTS:
1. Make it sound conversational, direct, and brutal. 
2. The rewritten question MUST be short and crisp (maximum 25 words). Do NOT write a long paragraph.
3. This is a general role-specific mock interview, NOT a company-specific one. If the question mentions any specific company name (like Google, Amazon, Wipro, TCS, etc.), STRIP out that company name and make the question company-neutral.
4. CRITICAL: Do NOT hallucinate. You MUST pick a project, skill, or experience that is EXPLICITLY MENTIONED in the candidate's resume. If you cannot find a specific match, just ask the standard question generically.

Return ONLY the customized question text.

Resume:
${resumeContext.substring(0, 4000)}

${resumeAnalysisText}
        `;

        try {
          adaptedText = await generateContentWithFallback(adaptPrompt, 4000, 0.5);
        } catch (err) {
          console.error("LLM API Network/Timeout Error (Adapt):", err);
          adaptedText = dbQuestion || "Can you share an experience where you had to quickly adapt to a new requirement?";
        }
      } else {
        console.log(`No database questions found for custom role: ${role_id}. Generating dynamically...`);
        const dynamicQuestionPrompt = `
You are an expert interviewer conducting a mock interview for the role of ${role_id}.
Generate a single, realistic, and highly practical interview question that tests the core capabilities required for this role.
The question must match the difficulty level: "${diffText}".
It must apply directly to the candidate's experience, target domain, or skills/tools mentioned in their resume below.

CRITICAL REQUIREMENTS:
1. Make it sound conversational, direct, and brutal.
2. The question MUST be short and crisp (maximum 25 words). Do NOT write a long paragraph.
3. This is a general role-specific mock interview, NOT a company-specific one. Do NOT mention any specific company name.
4. CRITICAL: Do NOT hallucinate. You MUST pick a project, skill, or experience that is EXPLICITLY MENTIONED in the candidate's resume. If you cannot find a specific match, just ask a generic role-specific question.
5. EXTREMELY CRITICAL: Do NOT ask any of the questions that have already been asked:
${previousQuestions.join('\n')}
6. Return ONLY the customized question text. No introduction, no markdown formatting.

Resume:
${resumeContext.substring(0, 4000)}

${resumeAnalysisText}
        `;

        try {
          adaptedText = await generateContentWithFallback(dynamicQuestionPrompt, 4000, 0.7);
        } catch (err) {
          console.error("LLM API Network/Timeout Error (Dynamic):", err);
          adaptedText = "Tell me about a time you faced a significant challenge in your work and how you overcame it.";
        }
      }
    }

    return NextResponse.json({ question: { text: adaptedText, difficulty: diffText, _id: fetchedQuestionId } });

  } catch (error) {
    console.error("Fetch question error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}