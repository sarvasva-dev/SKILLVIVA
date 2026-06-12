import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    const apiKey = process.env.SARVAM_API_KEY_TTS;

    if (!apiKey || apiKey === "your_sarvam_api_key_here") {
      return NextResponse.json({ error: "Sarvam API Key not configured" }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Sarvam Text-to-Speech API
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey
      },
      body: JSON.stringify({
        inputs: [text.substring(0, 500)], // Limit to avoid long processing
        target_language_code: "en-IN",
        speaker: "anushka", // Indian English female voice
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: "bulbul:v2"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam API Error:", errText);
      return NextResponse.json({ error: "Sarvam API Error" }, { status: response.status });
    }

    const data = await response.json();
    
    // Sarvam returns { audios: ["<base64_string>"] }
    if (data.audios && data.audios.length > 0) {
      return NextResponse.json({ audioBase64: data.audios[0] });
    } else {
      return NextResponse.json({ error: "No audio returned from Sarvam" }, { status: 500 });
    }

  } catch (error) {
    console.error("TTS Route Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}