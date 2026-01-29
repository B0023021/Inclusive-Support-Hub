// 危機的な内容を簡易チェックするためのユーティリティ
// グローバルに window.MentalSafety として公開
window.MentalSafety = (function () {
  const crisisKeywords = [
    "死にたい",
    "消えたい",
    "自殺",
    "リスカ",
    "首を吊",
    "飛び降り",
    "もう無理",
    "限界",
  ];

  function hasCrisis(text) {
    if (!text) return false;
    return crisisKeywords.some((w) => text.includes(w));
  }

  function crisisMessage() {
    return (
      "とてもつらい気持ちの中で、ここに書いてくれてありがとう。\n\n" +
      "このチャットは医療行為や緊急対応はできないため、命に関わる状況では必ず人間のサポートを使ってください。\n\n" +
      "・今すぐ危険な行動をしてしまいそうなときは、119番や地域の救急窓口に連絡してください。\n" +
      "・少し余裕があれば、信頼できる人や、公的な相談窓口に連絡してみてください。\n\n" +
      "ここでは、一緒に気持ちを言葉にして整理していくことは続けられます。\n" +
      "よければ、いま一番つらいと感じていることを、短くでもいいので教えてもらえますか？"
    );
  }

  return {
    hasCrisis,
    crisisMessage,
  };
})();
