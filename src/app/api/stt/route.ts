import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.SARVAM_API_KEY_STT;

    if (!apiKey || apiKey === "your_sarvam_api_key_here") {
      return NextResponse.json({ error: "Sarvam API Key is not configured." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const forcedFile = new File([arrayBuffer], "speech.webm", { type: "audio/webm" });

    // Prepare the payload for Sarvam AI
    const sarvamFormData = new FormData();
    sarvamFormData.append("file", forcedFile, "speech.webm");
    sarvamFormData.append("model", "saaras:v3");
    sarvamFormData.append("mode", "transcribe");

    let transcript = "";

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey
      },
      body: sarvamFormData,
      signal: AbortSignal.timeout(10000) // 10s timeout to keep it fast
    });

    if (response.ok) {
      const data = await response.json();
      transcript = data.transcript || "";
    } else {
      const errText = await response.text();
      console.error(`Sarvam STT returned status ${response.status}: ${errText}`);
      return NextResponse.json({ error: "Sarvam STT failed." }, { status: 500 });
    }

    return NextResponse.json({
      transcript: transcript,
      model: "saaras:v3",
      language_code: "en-IN"
    });

  } catch (error) {
    console.error("STT Route Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}