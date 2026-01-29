// settings-common.js
(function applyThemeOnLoad(){
  const saved = localStorage.getItem("theme"); // "dark" or "light"
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
})();
