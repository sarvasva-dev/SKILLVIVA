const http = require("http");

async function runTests() {
  const baseUrl = "http://localhost:3000/api";
  
  try {
    console.log("=== Testing Pipeline 1: Resume Analysis (/api/resume) ===");
    const resumeRes = await fetch(`${baseUrl}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "I am a frontend developer with 5 years of experience in React and Node.js.",
        targetRole: "Frontend Developer"
      })
    });
    const resumeData = await resumeRes.json();
    console.log("Response:", JSON.stringify(resumeData, null, 2));

    console.log("\n=== Testing Pipeline 2: Question Generation (/api/questions/generate-batch) ===");
    const qRes = await fetch(`${baseUrl}/questions/generate-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "Frontend Developer",
        difficulty: 3,
        resumeContext: resumeData?.feedback || "Has React experience"
      })
    });
    const qData = await qRes.json();
    console.log("Response:", JSON.stringify(qData, null, 2));

    console.log("\n=== Testing Pipeline 3: Evaluation (/api/evaluate) ===");
    const evalRes = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "Explain what a React Hook is.",
        candidateAnswer: "A React hook is a function that lets you hook into React state and lifecycle features from function components.",
        role: "Frontend Developer",
        questionContext: "React fundamentals"
      })
    });
    const evalData = await evalRes.json();
    console.log("Response:", JSON.stringify(evalData, null, 2));

    console.log("\n=== Testing Pipeline 4: Report Generation (/api/report) ===");
    const reportRes = await fetch(`${baseUrl}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "Frontend Developer",
        history: [
          {
            question: "Explain what a React Hook is.",
            candidateAnswer: "A React hook is a function that lets you hook into React state and lifecycle features from function components.",
            evaluation: evalData.feedback,
            score: evalData.score
          }
        ]
      })
    });
    const reportData = await reportRes.json();
    console.log("Response:", JSON.stringify(reportData, null, 2));

  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTests();
