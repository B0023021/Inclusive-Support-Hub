// supabaseClient.js

// ★ここを自分の Supabase プロジェクトの値に書き換える★
const SUPABASE_URL = "https://vegfslogwlhaiqcoctnq.supabase.co";      // Project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZ2ZzbG9nd2xoYWlxY29jdG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjExNzgsImV4cCI6MjA4MDI5NzE3OH0.084PpKKOIZsufDR4YZVO7OQ1k6FqG5fb-jOHZQaswXI";   // anon public key

 // anon public key

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 現在ログインしているユーザーを取得
async function getCurrentUser() {
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

// ログアウト（どこからでも呼べる）
async function logoutAndRedirect(redirectTo = "login.html") {
  await sb.auth.signOut();
  alert("ログアウトしました。");
  if (redirectTo) {
    window.location.href = redirectTo;
  }
}
