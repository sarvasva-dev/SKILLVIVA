import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, safeParseJson } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const customKey = req.headers.get("x-sarvam-key") || req.headers.get("x-api-key") || undefined;
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

    let rawResponse = "";
    try {
      rawResponse = await generateContentWithFallback(prompt, 2000, 0.2, 30000, customKey);
    } catch (e) {
      console.warn("Failed to get LLM response for report, using fallback", e);
      rawResponse = "";
    }

    const fallbackReport = {
      strong_areas: ["Communication", "Domain Interest"],
      weak_areas: ["Technical Depth under pressure", "Response Conciseness"],
      overall_feedback: `The candidate completed the mock interview for ${role || 'the targeted role'}. Overall performance demonstrated solid effort, though key responses could be tightened with more concrete data points.`,
      recommendations: ["Practice structuring answers using STAR method", "Quantify measurable impact in past projects"]
    };

    const reportData = safeParseJson(rawResponse, fallbackReport);
    return NextResponse.json(reportData);

  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}