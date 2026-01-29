// tabs/メンタル/mental.js（想定）

// ====== UI 要素 ======
const chatContainer = document.getElementById("chatContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// ====== メッセージ追加 ======
function addMessage(text, isUser) {
  const row = document.createElement("div");
  row.className = "msg-row";

  const bubble = document.createElement("div");
  bubble.className = isUser ? "msg-user" : "msg-ai";
  bubble.innerText = text;

  row.appendChild(bubble);
  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ====== AI に問い合わせ（Netlify Function） ======
async function askAI(prompt) {
  const body = {
    prompt,
    // model: "gemini-2.0-flash", // もし 2.5 が弾かれるならここだけ切替
    system:
      "あなたは落ち着いて優しく短めに返す相談相手です。相手を否定せず、次にできる一歩を1つだけ提案してください。",
  };

  try {
    const res = await fetch("/api/text-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        res.status === 429
          ? "AIの利用上限に達しています（429）。少し時間を置いてください。"
          : `AIの応答取得に失敗しました（HTTP${res.status}）。`;
      return msg + (data?.debug ? `\n\n[debug]\n${JSON.stringify(data.debug, null, 2)}` : "");
    }

    return data.text || "AIの応答を取得できませんでした…少し時間を置いてください。";
  } catch (e) {
    console.error("AI fetch error:", e);
    return "通信エラーが発生しました…ネット環境を確認してください。";
  }
}

// ====== 送信処理 ======
async function send() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, true);
  userInput.value = "";

  addMessage("考え中…", false);

  const aiReply = await askAI(text);

  chatContainer.lastChild?.remove();
  addMessage(aiReply, false);
}

// ボタン & Enter で送信
sendBtn.addEventListener("click", send);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
