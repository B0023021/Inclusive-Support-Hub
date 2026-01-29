// tabs/意思疎通/app.js（想定）
// 画像軽量化（必要なら 640 に下げると上限に当たりにくい）
const IMAGE_MAX_W = 1024;
const IMAGE_QUALITY = 0.85;

// クールダウン（連打防止）
const COOLDOWN_OK_MS = 30000;
const COOLDOWN_ERR_MS = 60000;

/* ========= 共通：読み上げ ========= */
function speakText(text) {
  if (window.ISH?.speak) return window.ISH.speak(text);
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/* ========= コミュニケーションボード ========= */
const DEFAULT_PHRASES = [
  "こんにちは",
  "ありがとうございます",
  "ゆっくり話してください",
  "少し待ってください",
  "助けてください",
];

function loadPhrases() {
  try {
    const raw = localStorage.getItem("isisotuu_phrases");
    const arr = raw ? JSON.parse(raw) : null;
    if (Array.isArray(arr) && arr.length) return arr;
  } catch {}
  return DEFAULT_PHRASES.slice();
}
function savePhrases(arr) {
  localStorage.setItem("isisotuu_phrases", JSON.stringify(arr));
}
function renderPhrases(listEl, phrases, autoSpeak) {
  listEl.innerHTML = "";
  phrases.forEach((text, idx) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.tabIndex = 0;
    chip.textContent = text;

    const speak = () => {
      if (autoSpeak.checked) speakText(text);
    };
    chip.addEventListener("click", speak);
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        speak();
      }
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "×";
    del.title = "削除";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      phrases.splice(idx, 1);
      savePhrases(phrases);
      renderPhrases(listEl, phrases, autoSpeak);
    });

    chip.appendChild(del);
    listEl.appendChild(chip);
  });
}
function initPhraseBoard() {
  const form = document.getElementById("phraseForm");
  const input = document.getElementById("phraseInput");
  const list = document.getElementById("phraseList");
  const autoSpeak = document.getElementById("autoSpeakToggle");

  const phrases = loadPhrases();
  renderPhrases(list, phrases, autoSpeak);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (input.value || "").trim();
    if (!v) return;

    phrases.unshift(v);
    savePhrases(phrases);
    renderPhrases(list, phrases, autoSpeak);

    if (autoSpeak.checked) speakText(v);
    input.value = "";
  });
}

/* ========= リアルタイム文字化（Web Speech API） ========= */
function initSTT() {
  const startBtn = document.getElementById("sttStartBtn");
  const stopBtn = document.getElementById("sttStopBtn");
  const status = document.getElementById("sttStatus");
  const output = document.getElementById("sttOutput");

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    status.textContent = "このブラウザは非対応（Chrome推奨）";
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }

  const rec = new SR();
  rec.lang = "ja-JP";
  rec.continuous = true;
  rec.interimResults = true;

  let finalText = "";
  rec.onstart = () => (status.textContent = "聞き取り中…");
  rec.onerror = () => (status.textContent = "エラー（マイク許可/設定を確認）");
  rec.onend = () => (status.textContent = "停止中");

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t + "\n";
      else interim += t;
    }
    output.value = finalText + (interim ? `(${interim})` : "");
    output.scrollTop = output.scrollHeight;
  };

  startBtn.addEventListener("click", () => {
    finalText = output.value.replace(/\(.*\)\s*$/s, "");
    rec.start();
  });
  stopBtn.addEventListener("click", () => rec.stop());
}

/* ========= 環境認識（Netlify Function へ） ========= */
async function captureResizedBlob(video, maxW = IMAGE_MAX_W, quality = IMAGE_QUALITY) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;

  const scale = Math.min(1, maxW / vw);
  const cw = Math.round(vw * scale);
  const ch = Math.round(vh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  canvas.getContext("2d").drawImage(video, 0, 0, cw, ch);

  return await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
}

async function callEnvAnalyze({ base64, mimeType }) {
  const res = await fetch("/api/env-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
      // model: "gemini-2.0-flash", // もし 2.5 が弾かれるならここだけ切替
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      res.status === 429
        ? "AIの利用上限に達しています（429）。時間をおいて再度お試しください。"
        : `AI解析に失敗しました（HTTP${res.status}）。`;
    return { ok: false, message: msg, debug: data };
  }

  return { ok: true, message: (data.text || "").trim(), raw: data.raw };
}

function initEnvAI() {
  const video = document.getElementById("envVideo");
  const camBtn = document.getElementById("envCameraBtn");
  const analyzeBtn = document.getElementById("envAnalyzeBtn");
  const descBox = document.getElementById("envDescription");
  const speakToggle = document.getElementById("envSpeakToggle");
  const speakBtn = document.getElementById("envSpeakOnceBtn");

  let stream = null;
  let cooldownUntil = 0;

  function setAnalyzeBusy(busy, label) {
    analyzeBtn.disabled = busy;
    analyzeBtn.textContent = label || (busy ? "解析中…" : "AIに今の状況を説明してもらう");
  }

  camBtn.onclick = async () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
      return;
    }
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
  };

  speakBtn.onclick = () => speakText(descBox.value);

  analyzeBtn.onclick = async () => {
    if (Date.now() < cooldownUntil) {
      const sec = Math.ceil((cooldownUntil - Date.now()) / 1000);
      descBox.value = `待機中です（あと${sec}秒）。`;
      return;
    }
    if (!video.srcObject) {
      descBox.value = "先にカメラを起動してください。";
      return;
    }

    setAnalyzeBusy(true, "解析中…");
    descBox.value = "AIが解析中です…";

    try {
      const blob = await captureResizedBlob(video);
      if (!blob) {
        descBox.value = "画像の取得に失敗しました。カメラを再起動してください。";
        setAnalyzeBusy(false);
        return;
      }

      const base64 = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(",")[1]);
        fr.readAsDataURL(blob);
      });

      const result = await callEnvAnalyze({
        base64,
        mimeType: blob.type || "image/jpeg",
      });

      if (result.ok) {
        descBox.value = result.message || "説明文を生成できませんでした。";
        if (speakToggle?.checked) speakText(descBox.value);

        cooldownUntil = Date.now() + COOLDOWN_OK_MS;
        setAnalyzeBusy(true, "待機中…");
        setTimeout(() => setAnalyzeBusy(false), COOLDOWN_OK_MS);
      } else {
        descBox.value =
          result.message + (result.debug ? `\n\n[debug]\n${JSON.stringify(result.debug, null, 2)}` : "");

        cooldownUntil = Date.now() + COOLDOWN_ERR_MS;
        setAnalyzeBusy(true, "待機中…");
        setTimeout(() => setAnalyzeBusy(false), COOLDOWN_ERR_MS);
      }
    } catch (e) {
      console.error(e);
      descBox.value = "AI解析中にエラーが発生しました。";

      cooldownUntil = Date.now() + COOLDOWN_ERR_MS;
      setAnalyzeBusy(true, "待機中…");
      setTimeout(() => setAnalyzeBusy(false), COOLDOWN_ERR_MS);
    }
  };

  window.addEventListener("beforeunload", () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  });
}

/* ========= 起動 ========= */
window.addEventListener("DOMContentLoaded", () => {
  initSTT();
  initPhraseBoard();
  initEnvAI();
});
