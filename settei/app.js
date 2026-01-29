// /tabs/settei/app.js
const STORAGE_KEY = "inclusive_support_app_v1";

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveState(partial) {
  const cur = loadState();
  const next = { ...cur, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

const darkModeToggle = document.getElementById("darkModeToggle");
const helpToggle = document.getElementById("helpToggle");
const helpBox = document.getElementById("helpBox");

const ttsRate = document.getElementById("ttsRate");
const ttsRateLabel = document.getElementById("ttsRateLabel");

const resetAppDataBtn = document.getElementById("resetAppDataBtn");
const dataStatus = document.getElementById("dataStatus");

function syncUI() {
  const s = loadState();

  // theme
  const theme = s.theme || "light";
  if (darkModeToggle) darkModeToggle.checked = theme === "dark";

  // help
  const helpEnabled = s.helpEnabled ?? true;
  if (helpToggle) helpToggle.checked = !!helpEnabled;
  if (helpBox) helpBox.style.display = helpEnabled ? "block" : "none";

  // tts rate
  let rate = Number(s.ttsRate ?? 1.0);
  if (!Number.isFinite(rate)) rate = 1.0;
  rate = Math.min(2.0, Math.max(0.5, rate));
  if (ttsRate) ttsRate.value = String(rate);
  if (ttsRateLabel) ttsRateLabel.textContent = rate.toFixed(1);

  // 共通側へ適用（settings-common.js）
  if (window.ISH?.applyTheme) window.ISH.applyTheme();

  if (dataStatus) {
    dataStatus.textContent = `テーマ：${theme} ／ 読み上げ速度：${rate.toFixed(1)}x ／ ヘルプ：${helpEnabled ? "ON" : "OFF"}`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  syncUI();

  darkModeToggle?.addEventListener("change", () => {
    saveState({ theme: darkModeToggle.checked ? "dark" : "light" });
    syncUI();
  });

  helpToggle?.addEventListener("change", () => {
    saveState({ helpEnabled: helpToggle.checked });
    syncUI();
  });

  ttsRate?.addEventListener("input", () => {
    const v = Number(ttsRate.value);
    if (ttsRateLabel) ttsRateLabel.textContent = v.toFixed(1);
  });

  ttsRate?.addEventListener("change", () => {
    let v = Number(ttsRate.value);
    if (!Number.isFinite(v)) v = 1.0;
    v = Math.min(2.0, Math.max(0.5, v));
    saveState({ ttsRate: v });
    syncUI();
  });

  resetAppDataBtn?.addEventListener("click", () => {
    const ok = confirm("設定（ダーク/速度/ヘルプ）をリセットします。よろしいですか？");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    syncUI();
    alert("設定をリセットしました。");
  });
});
