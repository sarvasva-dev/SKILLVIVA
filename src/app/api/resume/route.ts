import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, cleanJsonString } from "@/lib/ai";
// @ts-ignore
import PDFParser from "pdf2json";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const targetRole = formData.get("targetRole") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let text = "";
    try {
      text = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });
        pdfParser.parseBuffer(buffer);
      });
    } catch (parseError) {
      console.error("PDF2JSON Parsing error:", parseError);
      return NextResponse.json({ error: "Could not extract text from PDF. Ensure it's a valid PDF document." }, { status: 400 });
    }

    if (!text || text.trim() === "") {
       return NextResponse.json({ error: "Could not extract text from PDF." }, { status: 400 });
    }

    const roleContext = targetRole && targetRole !== "Unknown" 
        ? `You are evaluating this candidate STRICTLY for the role of: "${targetRole}".` 
        : `Guess the candidate's target role based on their resume.`;

    const persona = `
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

    const rawResponse = await generateContentWithFallback(persona);
    const responseText = cleanJsonString(rawResponse);

    let data;
    try {
      // Fix potential trailing commas in JSON array/object ends
      const sanitized = responseText.replace(/,\s*([\}\]])/g, '$1').replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      data = JSON.parse(sanitized);
    } catch (parseError) {
      console.error("Failed to parse JSON. Raw response was:");
      console.error(responseText);
      throw parseError;
    }

    // Send back both the analysis and the parsed text so the client can save it
    return NextResponse.json({ ...data, extractedText: text });
  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze resume" }, { status: 500 });
  }
}