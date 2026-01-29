/**
 * Netlify Function: /api/env-analyze
 * - Keeps your Gemini API key on the server (Netlify env var)
 * - Simply forwards the request body to Gemini generateContent
 *
 * Required env var on Netlify:
 *   GEMINI_API_KEY = <your API key>
 *
 * Optional:
 *   GEMINI_MODEL = gemini-2.5-flash (default)
 */
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

exports.handler = async (event) => {
  // CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Missing GEMINI_API_KEY env var on Netlify",
      }),
    };
  }

  let bodyJson;
  try {
    bodyJson = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  // Allow client to specify a model, otherwise use default.
  const model = (bodyJson.model && String(bodyJson.model)) || DEFAULT_MODEL;
  // Remove "model" key so Gemini doesn't reject unknown fields.
  if (bodyJson.model) delete bodyJson.model;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyJson),
    });

    const text = await resp.text();
    // Pass-through Gemini status codes (429/403 etc.)
    return {
      statusCode: resp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Upstream fetch failed", detail: String(e) }),
    };
  }
};