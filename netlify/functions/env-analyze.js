// netlify/functions/env-analyze.js
// POST /api/env-analyze
//
// Netlify 環境変数に GEMINI_API_KEY を設定すること
// 任意: GEMINI_MODEL (例: gemini-2.5-flash / gemini-2.0-flash)
//
// クライアントからは { imageBase64, mimeType, prompt?, model? } を送る

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return j(cors, 405, { error: { message: "Method Not Allowed" } });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return j(cors, 500, { error: { message: "Missing GEMINI_API_KEY (Netlify env)" } });
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return j(cors, 400, { error: { message: "Invalid JSON body" } });
  }

  const model = (body.model && String(body.model)) || DEFAULT_MODEL;

  // 受け取り（推奨）
  const imageBase64 = (body.imageBase64 || "").trim();
  const mimeType = (body.mimeType || "image/jpeg").trim();
  const prompt =
    (body.prompt && String(body.prompt)) ||
    "写真に写っている状況を、日本語で分かりやすく1〜3文程度で説明してください。危険そうな点があれば簡単に注意してください。";

  if (!imageBase64) {
    return j(cors, 400, {
      error: { message: "imageBase64 is required" },
      hint: "Send { imageBase64, mimeType, prompt? }",
    });
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 250 },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return j(cors, resp.status, {
        error: data?.error || data || { message: "Upstream error" },
        status: resp.status,
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";

    return j(cors, 200, { text, raw: data });
  } catch (e) {
    return j(cors, 500, { error: { message: "Upstream fetch failed", detail: String(e) } });
  }
};

function j(cors, statusCode, obj) {
  return {
    statusCode,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}
