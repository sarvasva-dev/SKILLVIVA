import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, cleanJsonString } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { history, role } = body;

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: "No history provided." }, { status: 400 });
    }

    const prompt = `
You are a brutally honest, expert interviewer evaluating a candidate for the role of ${role}.
Analyze the candidate's performance details for this mock interview.

Interview History:
${JSON.stringify(history, null, 2)}

Provide a detailed summary of their overall profile and interview behavior (including their answers and hesitation/silence patterns). DO NOT evaluate a non-technical/business candidate against technical coding or programming standards. Judge them strictly on the skills, tools, methods, and communication quality relevant to the role of ${role}.
Output your response strictly in the following JSON format:
{
  "strong_areas": ["Strong topic/skill 1", "Strong topic/skill 2"],
  "weak_areas": ["Weak topic/skill 1", "Weak topic/skill 2"],
  "overall_feedback": "A brutally honest 3-4 sentence evaluation of their performance and readiness.",
  "recommendations": ["Concrete learning/prep recommendation 1", "Concrete learning/prep recommendation 2"]
}

Return ONLY the JSON. No markdown backticks, no wrap.
`;

    const rawResponse = await generateContentWithFallback(prompt);
    const responseText = cleanJsonString(rawResponse);

    const reportData = JSON.parse(responseText);
    return NextResponse.json(reportData);

  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}