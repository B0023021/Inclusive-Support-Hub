// settings-common.complete.js
// 目的：全タブ共通で「保存されたテーマ」を読み取り、html/bodyに theme-dark を付ける
(() => {
  const STORAGE_KEY = "inclusive_support_app_v1";

  function safeParse(json) {
    try { return JSON.parse(json || "{}"); } catch { return {}; }
  }

  function loadTheme() {
    // 新方式：設定タブが保存している形式
    const state = safeParse(localStorage.getItem(STORAGE_KEY));
    if (state?.theme === "dark" || state?.theme === "light") return state.theme;

    // 旧方式（残ってる環境向け保険）
    const legacy = localStorage.getItem("theme");
    if (legacy === "dark" || legacy === "light") return legacy;

    return "light";
  }

  function applyTheme() {
    const theme = loadTheme();
    const isDark = theme === "dark";

    // CSS側は :root.theme-dark / html.theme-dark を見ているのでクラスで制御
    document.documentElement.classList.toggle("theme-dark", isDark);

    // 一部タブが body.theme-dark を使っているので保険で付ける
    document.body?.classList.toggle("theme-dark", isDark);
  }

  // どのタブからでも呼べるように
  window.ISH = window.ISH || {};
  window.ISH.applyTheme = applyTheme;

  // 初期適用（bodyがまだ無い可能性があるので DOMContentLoaded でもう一回）
  applyTheme();
  document.addEventListener("DOMContentLoaded", applyTheme);

  // 他タブ/別ウィンドウで設定が変わった時に追従
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === "theme") applyTheme();
  });
})();
