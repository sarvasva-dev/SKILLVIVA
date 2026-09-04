import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, safeParseJson } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const customKey = req.headers.get("x-sarvam-key") || req.headers.get("x-api-key") || undefined;
    const body = await req.json();
    const {
      question,
      answer,
      hesitationSeconds = 0,
      preAnswerDelay = 0,
      fillerCount = 0,
      currentLevel = 1,
      role,
      resumeContext,
      recentScores = []
    } = body;

    if (!answer || answer.trim().length < 5 || answer.includes("[No clear audio")) {
      const defaultIdeal = question
        ? `To effectively answer "${question}", outline your strategic framework, quantify your achievements with data/metrics, and demonstrate cross-functional leadership relevant to the ${role || 'targeted'} role.`
        : `A strong response should clearly define the problem context, outline your key actions, and present measurable business impact.`;

      return NextResponse.json({
        score: 0,
        feedback: "No clear spoken answer was detected. Practice articulating your experience with confidence and direct data points.",
        idealAnswer: defaultIdeal,
        nextLevel: 1,
        rollingAverage: 0
      });
    }

    let resumeAnalysisText = "";
    if (resumeContext && Object.keys(resumeContext).length > 0) {
      resumeAnalysisText = `
Candidate's AI Resume Analysis (Context):
- Missing Skills for Role: ${resumeContext.missingSkills?.join(', ') || 'None'}
- Key Mismatches: ${resumeContext.mismatches?.join(', ') || 'None'}
- Areas for Improvement: ${resumeContext.improvements?.join(', ') || 'None'}
      `;
    }

    const roleText = role ? `for the role of ${role}` : "for their targeted role";
    const prompt = `
You are a brutal, realistic expert interviewer conducting a mock interview ${roleText}.
Rate the candidate's answer to the following question.

Question: "${question}"
Candidate Answer: "${answer}"

Delivery Data:
- Silence/hesitation while speaking: ${hesitationSeconds} seconds.
- Delay before starting the answer: ${preAnswerDelay} seconds.
- Filler words detected: ${fillerCount}.

Instructions:
1. Provide a base score from 0 to 10 based purely on the accuracy and completeness of the answer relative to the expected knowledge for the ${role || 'targeted'} role.
   - CRITICAL REQUIREMENT: DO NOT evaluate a non-technical/business answer on "technical coding/programming" standards. Instead, grade it based on the communication quality, logical reasoning, domain knowledge, and problem-solving skills expected for the role of ${role || 'targeted role'}.
2. Penalize delivery only after judging content:
   - hesitation > 5 seconds can reduce confidence/communication score.
   - starting delay > 10 seconds can reduce readiness score.
   - many filler words can reduce clarity score.
   - Do not over-penalize a strong answer for minor pauses.
3. Output the final integer score.
4. Provide a brutal, 2-sentence feedback. No fluff.
5. Provide an 'idealAnswer' (3-4 sentences) showing what a perfect answer would look like for this specific question, heavily utilizing the context from the candidate's resume (if provided).

Resume Context:
${resumeContext?.feedback ? resumeContext.feedback.substring(0, 4000) : "Candidate has not provided a detailed resume."}

${resumeAnalysisText}

Output your response strictly in the following JSON format:
{
  "score": <integer 0-10>,
  "feedback": "<string>",
  "idealAnswer": "<string>"
}
    `;

    let rawResponse = "";
    try {
      rawResponse = await generateContentWithFallback(prompt, 600, 0.1, 12000, customKey);
    } catch (apiError) {
      console.error("LLM API Network/Timeout Error:", apiError);
      rawResponse = "";
    }
    
    const fallbackResult = {
      score: 5,
      feedback: "Your response has been recorded. Focus on articulating direct data points and key achievements.",
      idealAnswer: `A great answer for "${question}" outlines clear business impact, strategic problem solving, and relevant experience for ${role || 'the role'}.`
    };

    const aiResult = safeParseJson(rawResponse, fallbackResult);

    const parsedScore = Number(aiResult.score);
    const finalScore = Number.isFinite(parsedScore)
      ? Math.max(0, Math.min(10, Math.round(parsedScore)))
      : 5;

    const priorScores = Array.isArray(recentScores)
      ? recentScores
          .map((score) => Number(score))
          .filter((score) => Number.isFinite(score))
          .slice(-2)
      : [];
    const rollingScores = [...priorScores, finalScore].slice(-2);
    const rollingAverage = rollingScores.reduce((sum, score) => sum + score, 0) / rollingScores.length;

    const normalizedCurrentLevel = Math.max(1, Math.min(3, Number(currentLevel) || 1));
    let targetLevel = 2;
    if (rollingAverage < 5) {
      targetLevel = 1;
    } else if (rollingAverage >= 7.5) {
      targetLevel = 3;
    }

    const nextLevel = Math.abs(targetLevel - normalizedCurrentLevel) > 1
      ? normalizedCurrentLevel + Math.sign(targetLevel - normalizedCurrentLevel)
      : targetLevel;

    return NextResponse.json({
      score: finalScore,
      feedback: aiResult.feedback || fallbackResult.feedback,
      idealAnswer: aiResult.idealAnswer || fallbackResult.idealAnswer,
      nextLevel,
      rollingAverage: Math.round(rollingAverage)
    });

  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}