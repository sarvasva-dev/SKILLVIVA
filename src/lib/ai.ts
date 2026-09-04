import JSON5 from "json5";
import dns from "dns";

if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

/**
 * Helper to call LLM using Sarvam-105B with fallbacks.
 * Accepts an optional customKey passed from client request headers.
 */
export async function generateContentWithFallback(
  promptText: string,
  maxTokens: number = 4096,
  temperature: number = 0.1,
  timeoutMs: number = 45000,
  customKey?: string
): Promise<string> {
  const allKeys = [
    customKey,
    process.env.SARVAM_API_KEY_LLM,
    process.env.SARVAM_API_KEY_TTS,
    process.env.SARVAM_API_KEY_STT
  ].filter((k): k is string => Boolean(k && k.trim() !== "" && k !== "your_sarvam_api_key_here"));

  if (allKeys.length === 0) {
    throw new Error("No Sarvam/AI API keys configured. Please configure an API key in settings or .env.");
  }

  const isJsonRequest = promptText.includes("JSON");
  const effectiveMaxTokens = isJsonRequest ? Math.max(maxTokens, 4096) : maxTokens;

  // Helper function to try all keys for a given model
  const tryModelWithKeys = async (modelName: string) => {
    for (let i = 0; i < allKeys.length; i++) {
      const currentKey = allKeys[i];
      console.log(`Attempting generation with ${modelName} (Key ${i + 1}/${allKeys.length})...`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-subscription-key": currentKey
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: "system",
                content: isJsonRequest
                  ? "You are an expert AI API. Output strictly raw valid JSON. Do not output reasoning or markdown."
                  : "You are an expert, helpful assistant."
              },
              {
                role: "user",
                content: isJsonRequest
                  ? promptText + "\n\nCRITICAL: Output ONLY raw valid JSON. Start directly with '{' or '['. No thinking, no markdown blocks."
                  : promptText + "\n\nCRITICAL: DO NOT output any reasoning, thinking, or markdown formatting."
              }
            ],
            max_tokens: effectiveMaxTokens,
            temperature: temperature
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const msg = data.choices?.[0]?.message;
          
          let content = msg?.content;
          
          // If content is null/empty but reasoning_content exists, try to extract JSON from reasoning_content
          if ((!content || typeof content !== "string" || content.trim() === "") && msg?.reasoning_content) {
            const reasoning = msg.reasoning_content;
            console.log("Sarvam model returned reasoning_content. Attempting to extract output...");
            content = extractJsonFromText(reasoning) || reasoning;
          }
          
          if (content && typeof content === "string" && content.trim().length > 0) {
            return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
          }
        } else {
          console.warn(`${modelName} API Error response (Key ${i + 1}):`, await response.text());
        }
      } catch (errM: any) {
        console.warn(`${modelName} request failed (Key ${i + 1}):`, errM.name === 'AbortError' ? `Timeout after ${timeoutMs/1000}s` : errM);
      }
    }
    return null; // All keys failed for this model
  };

  // Try sarvam-105b-conversations first (fast direct output), then sarvam-105b
  const resConv = await tryModelWithKeys("sarvam-105b-conversations");
  if (resConv) return resConv;

  const res105B = await tryModelWithKeys("sarvam-105b");
  if (res105B) return res105B;

  throw new Error("All Sarvam AI models failed or timed out across all available keys.");
}

/**
 * Helper to extract embedded JSON string from reasoning or noisy text.
 */
function extractJsonFromText(text: string): string | null {
  if (!text) return null;
  const matchBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (matchBlock && matchBlock[1]) return matchBlock[1].trim();

  const startObj = text.indexOf('{');
  const startArr = text.indexOf('[');
  let startIdx = -1;
  if (startObj !== -1 && startArr !== -1) startIdx = Math.min(startObj, startArr);
  else if (startObj !== -1) startIdx = startObj;
  else if (startArr !== -1) startIdx = startArr;

  const endObj = text.lastIndexOf('}');
  const endArr = text.lastIndexOf(']');
  let endIdx = -1;
  if (endObj !== -1 && endArr !== -1) endIdx = Math.max(endObj, endArr);
  else if (endObj !== -1) endIdx = endObj;
  else if (endArr !== -1) endIdx = endArr;

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return text.substring(startIdx, endIdx + 1);
  }
  return null;
}

/**
 * Utility to clean markdown JSON formatting code blocks and thinking tags from LLM output.
 */
export function cleanJsonString(rawText: string): string {
  if (!rawText) return "";
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const extracted = extractJsonFromText(cleaned);
  return extracted || cleaned;
}

/**
 * Ultra-robust JSON parser that attempts standard JSON.parse, JSON5.parse,
 * trailing comma stripping, and structure extraction before falling back.
 */
export function safeParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== "string") return fallback;
  const cleaned = cleanJsonString(rawText);

  // 1. Standard JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {}

  // 2. JSON5 parse
  try {
    return JSON5.parse(cleaned);
  } catch (e) {}

  // 3. Sanitized JSON parse (remove trailing commas, unescaped control chars)
  try {
    const sanitized = cleaned
      .replace(/,\s*([\}\]])/g, "$1")
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    return JSON.parse(sanitized);
  } catch (e) {}

  // 4. Try extract object / array matching regex
  try {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const sanitizedObj = objMatch[0].replace(/,\s*([\}])/g, "$1");
      return JSON5.parse(sanitizedObj);
    }
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const sanitizedArr = arrMatch[0].replace(/,\s*([\]])/g, "$1");
      return JSON5.parse(sanitizedArr);
    }
  } catch (e) {}

  console.warn("safeParseJson failed to parse LLM response, returning fallback default.");
  return fallback;
}

/**
 * Transcribes audio content using Sarvam STT.
 */
export async function transcribeAudioWithSarvam(audioBase64: string, mimeType: string, customKey?: string): Promise<string> {
  const apiKey = customKey || process.env.SARVAM_API_KEY_STT || process.env.SARVAM_API_KEY_LLM;
  if (!apiKey || apiKey === "your_sarvam_api_key_here") {
    throw new Error("Sarvam STT API key is not configured");
  }
  
  try {
    const formData = new FormData();
    const buffer = Buffer.from(audioBase64, "base64");
    const blob = new Blob([buffer], { type: mimeType });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "saaras:v3");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Sarvam STT fallback error:", err);
      throw new Error(`STT failed: ${response.status}`);
    }

    const data = await response.json();
    return data.transcript || "";
  } catch (error) {
    console.error("Sarvam STT error:", error);
    throw error;
  }
}
