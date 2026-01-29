(function () {
  if (window.sb) return; // すでに作成済みなら何もしない

// ★ここを自分の Supabase プロジェクトの値に書き換える★
const SUPABASE_URL = "https://vegfslogwlhaiqcoctnq.supabase.co";      // Project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZ2ZzbG9nd2xoYWlxY29jdG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjExNzgsImV4cCI6MjA4MDI5NzE3OH0.084PpKKOIZsufDR4YZVO7OQ1k6FqG5fb-jOHZQaswXI";   // anon public key

  if (!window.supabase) {
    console.error("supabase-js が読み込まれていません");
    return;
  }

  var createClient = window.supabase.createClient;
  window.sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.getCurrentUser = async function () {
    const { data, error } = await window.sb.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  };

  window.logoutAndRedirect = async function (redirectTo = "login.html") {
    await window.sb.auth.signOut();
    alert("ログアウトしました。");
    if (redirectTo) window.location.href = redirectTo;
  };
})();