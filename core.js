// core.js  完全版（タブ切り替え専用）

document.addEventListener("DOMContentLoaded", () => {
  const frame = document.getElementById("tabFrame");
  const tabs  = document.querySelectorAll(".shell-tab");

  // タブ名 → 読み込むHTML
  const TAB_PATHS = {
    isisotuu: "tabs/isisotuu/index.html",
    mental:   "tabs/mental/mental.html",
    seikatu:  "tabs/seikatu/index.html",
    kouryu:   "tabs/kouryu/index.html",
    shindan:  "tabs/shindan/testindex.html",   // ← 診断だけ testindex.html
    iro:      "tabs/iro/index.html",
    settei:   "tabs/settei/index.html",
  };

  function switchTab(name) {
    // ボタンの見た目切り替え
    tabs.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === name);
    });

    // パス決定（なければ isisotuu）
    const src = TAB_PATHS[name] || TAB_PATHS.isisotuu;
    frame.src = src;
  }

  // クリックイベント
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // 初期表示タブ
  const initial =
    document.querySelector(".shell-tab.active")?.dataset.tab || "isisotuu";
  switchTab(initial);
});
