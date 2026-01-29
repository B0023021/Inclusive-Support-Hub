export default async (req, context) => {
  try {
    const { prompt } = await req.json();

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY ||
      "";

    if (!apiKey) {
      return new Response(JSON.stringify({ text: "サーバ側のAPIキー未設定です（Netlify env を確認）" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash";
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    const body = {
      contents: [{ role: "user", parts: [{ text: String(prompt || "") }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await r.json();

    if (!r.ok) {
      return new Response(JSON.stringify({ text: `生成に失敗（HTTP${r.status}）`, debug: json }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const text =
      json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ||
      "返答が空でした。";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ text: "サーバ側エラー", error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
