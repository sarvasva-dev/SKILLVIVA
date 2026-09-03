async function testGenerateBatch() {
  try {
    const res = await fetch('http://localhost:3000/api/questions/generate-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: "Frontend Engineer",
        resumeContext: {
          feedback: "Great frontend skills",
          missingSkills: ["Docker"],
          mismatches: [],
          improvements: []
        },
        difficulty: 1
      })
    });
    const data = await res.json();
    console.log("Success:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

testGenerateBatch();
