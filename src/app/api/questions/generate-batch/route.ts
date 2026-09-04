import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, safeParseJson } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const customKey = req.headers.get("x-sarvam-key") || req.headers.get("x-api-key") || undefined;
    const body = await req.json();
    const { role, resumeContext, difficulty } = body;

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    let resumeAnalysisText = "";
    if (resumeContext && Object.keys(resumeContext).length > 0) {
      resumeAnalysisText = `
Candidate's AI Resume Analysis:
- Missing Skills for Role: ${resumeContext.missingSkills?.join(', ') || 'None'}
- Key Mismatches: ${resumeContext.mismatches?.join(', ') || 'None'}
- Areas for Improvement: ${resumeContext.improvements?.join(', ') || 'None'}
      `;
    }

    const persona = `
You are an expert technical and behavioral interviewer conducting a mock interview for the role of ${role}.
Generate EXACTLY 10 highly personalized interview questions based strictly on the candidate's resume provided below.

DISTRIBUTION:
- 4 Questions at Level 1 (Foundational / Basic / Introduction)
- 3 Questions at Level 2 (Intermediate / Scenario-based / Problem-solving)
- 3 Questions at Level 3 (Advanced / Complex / Stress-test / Deep dive)

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
${resumeContext?.feedback ? resumeContext.feedback.substring(0, 4000) : "Candidate has not provided a detailed resume."}

${resumeAnalysisText}
    `;

    let rawResponse = "";
    try {
      rawResponse = await generateContentWithFallback(persona, 4000, 0.7, 15000, customKey);
    } catch (llmErr) {
      console.warn("LLM API call timed out or failed, proceeding with fallback batch questions:", llmErr);
      rawResponse = "";
    }

    let questionsData = safeParseJson<any[]>(rawResponse, []);

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      console.warn("Using ultimate fallback generic questions because LLM generation returned empty/invalid format.");
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

    const formattedQuestions = questionsData.map((q: any) => ({
      difficulty: q.difficulty || "Level 1",
      text: q.text || "Tell me about your background.",
      used: false,
      id: crypto.randomUUID()
    }));

    return NextResponse.json({ success: true, questions: formattedQuestions });

  } catch (error) {
    console.error("Batch generation error:", error);
    return NextResponse.json({ error: "Failed to generate question batch" }, { status: 500 });
  }
}