import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, cleanJsonString } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
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
      // 500 maxTokens and 10000ms timeout per key is enough for a short evaluation and prevents 4-minute hanging.
      rawResponse = await generateContentWithFallback(prompt, 500, 0.1, 10000);
    } catch (apiError) {
      console.error("LLM API Network/Timeout Error:", apiError);
      rawResponse = "INVALID_JSON_FORCE_FALLBACK";
    }
    
    const responseText = cleanJsonString(rawResponse);

    let aiResult;
    try {
      aiResult = JSON.parse(responseText);
    } catch (e) {
      // If parsing fails (e.g., due to repeated text + JSON blocks), try extracting the first non-greedy block
      try {
        const match = rawResponse.match(/\{[\s\S]*?\}/g);
        let parsed = null;
        if (match) {
           for (const m of match) {
             try {
               const temp = JSON.parse(m);
               if (temp && temp.score !== undefined) {
                 parsed = temp;
                 break;
               }
             } catch(err) {}
           }
        }
        if (parsed) {
          aiResult = parsed;
        } else {
          throw new Error("Regex JSON extraction failed");
        }
      } catch (regexErr) {
        console.error("Failed to parse AI evaluation JSON. Raw output:", rawResponse);
        aiResult = {
          score: 5, // FIXED: Changed from 50 (which resulted in 10/10) to a neutral 5
          feedback: "The AI evaluator had trouble generating a complete response for this answer, but it has been recorded.",
          idealAnswer: "A great answer would be clearly structured and directly address the role requirements."
        };
      }
    }
    
    const parsedScore = Number(aiResult.score);
    const finalScore = Number.isFinite(parsedScore)
      ? Math.max(0, Math.min(10, Math.round(parsedScore)))
      : 0;

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
      feedback: aiResult.feedback,
      idealAnswer: aiResult.idealAnswer,
      nextLevel,
      rollingAverage: Math.round(rollingAverage)
    });

  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}