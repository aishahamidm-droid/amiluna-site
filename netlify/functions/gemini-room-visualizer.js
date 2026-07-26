import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";

const GEMINI_MODEL = "gemini-3.1-flash-image";
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

function parseJson(body) {
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

function base64ByteLength(value) {
  return Math.floor((value.length * 3) / 4);
}

function getGeneratedImage(response) {
  const parts = response?.candidates?.flatMap((candidate) => candidate?.content?.parts || []) || [];
  return parts.find((part) => part?.inlineData?.data || part?.inline_data?.data) || null;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  if (event.httpMethod !== "POST") return methodNotAllowed(["POST", "OPTIONS"]);

  if (!process.env.GEMINI_API_KEY) {
    return jsonResponse(503, {
      ok: false,
      error: "The AI room visualizer is not configured yet."
    });
  }

  const payload = parseJson(event.body);
  const imageBase64 = String(payload?.imageBase64 || "").replace(/^data:[^;]+;base64,/, "");
  const mimeType = payload?.mimeType === "image/png" ? "image/png" : "image/jpeg";
  const artworkTitle = String(payload?.artworkTitle || "Selected AmiLuna artwork").trim().slice(0, 140);
  const environment = String(payload?.environment || "a refined living room").trim().slice(0, 360);

  if (!imageBase64 || base64ByteLength(imageBase64) > MAX_IMAGE_BYTES) {
    return jsonResponse(400, {
      ok: false,
      error: "Please choose an artwork image that is smaller than 7 MB."
    });
  }

  const prompt = [
    "Create one photorealistic, premium interior-design visualization.",
    `Place the supplied AmiLuna artwork, titled \"${artworkTitle}\", as a single framed wall artwork in ${environment}.`,
    "Keep the supplied artwork recognizable and undistorted. Preserve its aspect ratio, colors, and composition.",
    "Use realistic scale, natural perspective, tasteful furniture, and soft gallery-quality lighting.",
    "Do not add text, logos, watermarks, duplicate artworks, or people. Return an image only."
  ].join(" ");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: {
            responseModalities: ["IMAGE"]
          }
        })
      }
    );

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Gemini room visualizer request failed", { status: response.status });
      return jsonResponse(502, {
        ok: false,
        error: "Unable to create an AI room preview right now. Please try again."
      });
    }

    const generatedImage = getGeneratedImage(responseBody);
    const imageData = generatedImage?.inlineData?.data || generatedImage?.inline_data?.data;
    const imageMimeType = generatedImage?.inlineData?.mimeType || generatedImage?.inline_data?.mime_type || "image/png";
    if (!imageData) {
      return jsonResponse(502, {
        ok: false,
        error: "The AI room visualizer did not return an image. Please try again."
      });
    }

    return jsonResponse(200, {
      ok: true,
      imageDataUrl: `data:${imageMimeType};base64,${imageData}`
    });
  } catch (error) {
    console.error("Gemini room visualizer error", { message: error?.message });
    return jsonResponse(502, {
      ok: false,
      error: "Unable to create an AI room preview right now. Please try again."
    });
  }
}
