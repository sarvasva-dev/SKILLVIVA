const fs = require('fs');

async function test() {
  const formData = new FormData();
  
  // Note: the native fetch FormData expects a Blob or File
  const fileBuffer = fs.readFileSync('public/Sarthak-Srivastava-Resume.pdf');
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  
  formData.append('file', blob, 'Sarthak-Srivastava-Resume.pdf');
  formData.append('targetRole', 'Frontend Developer');

  console.log("Sending request...");
  try {
    const res = await fetch('http://localhost:3000/api/resume', {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
