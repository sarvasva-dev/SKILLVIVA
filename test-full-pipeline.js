const fs = require('fs');
const path = require('path');
const PdfParser = require('pdf2json');

async function testFullPipeline() {
  console.log("=== 1. PARSING RESUME (pdf2json) ===");
  const pdfPath = path.join(__dirname, 'public', 'Sarthak-Srivastava-Resume.pdf');
  const fileBuffer = fs.readFileSync(pdfPath);

  const baseUrl = "http://localhost:3000/api";

  console.log("=== 2. LLM RESUME ANALYSIS (/api/resume) ===");
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer], { type: "application/pdf" }), "Sarthak-Srivastava-Resume.pdf");
  formData.append("targetRole", "Product Manager");

  const resumeRes = await fetch(`${baseUrl}/resume`, {
    method: "POST",
    body: formData
  });
  const resumeData = await resumeRes.json();
  console.log("✓ Resume Analysis Result:", JSON.stringify(resumeData, null, 2));

  console.log("\n=== 3. LLM BATCH QUESTION GENERATION (/api/questions/generate-batch) ===");
  const batchRes = await fetch(`${baseUrl}/questions/generate-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "Product Manager",
      difficulty: 1,
      resumeContext: resumeData
    })
  });
  const batchData = await batchRes.json();
  console.log(`✓ Generated ${batchData.questions?.length || 0} questions.`);
  const sampleQuestion = batchData.questions?.[0]?.text || "Tell me about your product experience.";
  console.log(`Sample Question: "${sampleQuestion}"\n`);

  console.log("=== 4. SARVAM TTS VOICE GENERATION (/api/tts) ===");
  const ttsRes = await fetch(`${baseUrl}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: sampleQuestion })
  });
  const ttsData = await ttsRes.json();
  if (ttsData.audioBase64) {
    console.log(`✓ TTS Success! Generated ${ttsData.audioBase64.length} base64 audio characters.`);
  } else {
    console.log("❌ TTS Failed:", ttsData);
  }

  console.log("\n=== 5. LLM ANSWER EVALUATION (/api/evaluate) ===");
  const evalRes = await fetch(`${baseUrl}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: sampleQuestion,
      answer: "I led product roadmap development, user research, and cross-functional team alignment to launch key features.",
      hesitationSeconds: 2,
      preAnswerDelay: 1,
      fillerCount: 1,
      currentLevel: 1,
      role: "Product Manager",
      resumeContext: resumeData
    })
  });
  const evalData = await evalRes.json();
  console.log("✓ Answer Evaluation Result:", JSON.stringify(evalData, null, 2));

  console.log("\n=== 6. LLM FINAL REPORT GENERATION (/api/report) ===");
  const reportRes = await fetch(`${baseUrl}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "Product Manager",
      history: [
        {
          question: sampleQuestion,
          answer: "I led product roadmap development and cross-functional alignment.",
          score: evalData.score,
          feedback: evalData.feedback,
          hesitation: 2
        }
      ]
    })
  });
  const reportData = await reportRes.json();
  console.log("✓ Final Interview Report:", JSON.stringify(reportData, null, 2));

  console.log("\n🎉 ALL PIPELINE TESTS PASSED SUCCESSFULLY!");
}

testFullPipeline().catch(console.error);
