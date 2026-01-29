// ====== Gemini API キー（ここに埋め込む）======
const API_KEY = "AIzaSyBgvQYyCQ1LpZkKVtz-48Y1Wg4i3yKloTY"; // ← あなたのキーに書き換え

// 利用するモデル（1.5 は廃止されたので 2.5 を使う）
const MODEL_NAME = "gemini-2.5-flash";

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

// ====== AI に問い合わせ ======
async function askAI(text) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    MODEL_NAME +
    ":generateContent?key=" +
    API_KEY;

  const body = {
    contents: [{ parts: [{ text }] }],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("Gemini response:", data);

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AIの応答を取得できませんでした…少し時間を置いてください。";

    return reply;
  } catch (e) {
    console.error("Gemini fetch error:", e);
    return "通信エラーが発生しました…ネット環境を確認してください。";
  }
}

// ====== 送信処理 ======
async function send() {
  const text = userInput.value.trim();
  if (!text) return;

  // ユーザー発言
  addMessage(text, true);
  userInput.value = "";

  // 考え中バブル
  addMessage("考え中…", false);

  // AI からの返信
  const aiReply = await askAI(text);

  // 「考え中…」を削除して本物の返答に差し替え
  chatContainer.lastChild.remove();
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
