import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const customKey = req.headers.get("x-sarvam-key") || req.headers.get("x-api-key");
    const apiKey = customKey || process.env.SARVAM_API_KEY_STT || process.env.SARVAM_API_KEY_LLM;

    if (!apiKey || apiKey === "your_sarvam_api_key_here") {
      return NextResponse.json({ error: "Sarvam API Key is not configured." }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || "audio/wav";
    const extension = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "wav";
    
    const audioBlob = new Blob([arrayBuffer], { type: mimeType });

    // Prepare the payload for Sarvam AI STT (saaras:v3)
    const sarvamFormData = new FormData();
    sarvamFormData.append("file", audioBlob, `audio.${extension}`);
    sarvamFormData.append("model", "saaras:v3");

    let transcript = "";

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey
      },
      body: sarvamFormData,
      signal: AbortSignal.timeout(25000)
    });

    if (response.ok) {
      const data = await response.json();
      transcript = data.transcript || "";
    } else {
      const errText = await response.text();
      console.error(`Sarvam STT returned status ${response.status}: ${errText}`);
      return NextResponse.json({ transcript: "", fallback: true });
    }

    return NextResponse.json({
      transcript: transcript,
      model: "saaras:v3",
      language_code: "en-IN"
    });

  } catch (error) {
    console.error("STT Route Error:", error);
    return NextResponse.json({ transcript: "", fallback: true });
  }
}