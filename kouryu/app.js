/* ============================
      community.js（完全版）
   初期データゼロ・最新安定版
   ============================ */

// ---------- utils ----------
const kv = {
  get: (k, f) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : f;
    } catch {
      return f;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

const by = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- LocalStorage keys ----------
const K = {
  POSTS: "community.posts.v2",
  RES: "info.resources.v2",
  ADMIN: "community.admin.enabled"
};

// ---------- seed（初期データゼロ） ----------
function seed() {
  if (!kv.get(K.RES)) kv.set(K.RES, []);     // 情報資料 → 空
  if (!kv.get(K.POSTS)) kv.set(K.POSTS, []); // 投稿 → 空
}

// ---------- 管理者モード ----------
const isAdmin = () => !!kv.get(K.ADMIN, false);
const setAdmin = (v) => kv.set(K.ADMIN, !!v);

function applyAdminUI() {
  document
    .querySelectorAll(".admin-only")
    .forEach((el) => el.classList.toggle("hidden", !isAdmin()));

  const btn = by("adminToggle");
  if (btn)
    btn.textContent = isAdmin()
      ? "管理者モード：ON（クリックでOFF）"
      : "管理者モード";
}

function wireAdminToggle() {
  const btn = by("adminToggle");
  if (!btn) return;

  btn.onclick = () => {
    if (isAdmin()) {
      setAdmin(false);
      applyAdminUI();
      return;
    }
    const code = prompt("管理者パスコードを入力（デモ: admin）");
    if (code === "admin") {
      setAdmin(true);
      applyAdminUI();
    } else {
      alert("パスコードが違います");
    }
  };
}

// ---------- 掲示板（投稿・返信・いいね・削除・ソート） ----------
function addPost() {
  const input = by("postText");
  const text = (input?.value || "").trim();
  if (!text) return;

  const posts = kv.get(K.POSTS, []);
  posts.push({
    id: uid(),
    text,
    date: new Date().toLocaleString(),
    likes: 0,
    replies: []
  });

  kv.set(K.POSTS, posts);
  input.value = "";
  renderPosts();
}

function renderPosts() {
  const ul = by("postList");
  if (!ul) return;

  const sortSel = by("sortSelect") || by("filterGroup");
  let sort = sortSel ? sortSel.value : "likes";

  let posts = kv.get(K.POSTS, []).slice();

  // ソート処理
  if (sort === "likes") {
    posts.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  } else if (sort === "new") {
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (sort === "relevance") {
    const keyword = prompt("関連度で並べ替え：キーワードを入力");
    if (keyword) {
      const re = new RegExp(keyword, "gi");
      posts = posts
        .map((p) => ({ ...p, _score: (p.text.match(re) || []).length }))
        .sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
    }
  }

  ul.innerHTML = "";

  posts.forEach((p) => {
    const li = document.createElement("li");
    li.className = "post-card";
    li.innerHTML = `
      <div class="text-sm text-slate-500 mb-1">${p.date}</div>
      <div class="text-base mb-2 break-words">${escapeHTML(p.text)}</div>
      <div class="flex gap-2 text-sm mb-2">
        <button class="like-btn px-2 py-1 bg-slate-100 rounded">${p.likes} ❤️</button>
        <button class="reply-toggle px-2 py-1 bg-slate-100 rounded">返信</button>
        <button class="delete-btn admin-only hidden px-2 py-1 bg-slate-100 rounded">削除</button>
      </div>

      <div class="reply-box hidden">
        <input class="reply-input border rounded-lg px-2 py-1 text-sm w-full"
               placeholder="返信を書く（Enterで送信）">
        <ul class="reply-list mt-2 space-y-1"></ul>
      </div>
    `;

    const replyBox = li.querySelector(".reply-box");
    const replyList = li.querySelector(".reply-list");

    const renderReplies = () => {
      replyList.innerHTML = "";
      (p.replies || []).forEach((r) => {
        const el = document.createElement("li");
        el.className =
          "text-sm text-slate-700 bg-slate-50 rounded px-2 py-1 break-words";
        el.textContent = r.text;
        replyList.appendChild(el);
      });
    };
    renderReplies();

    li.querySelector(".like-btn").onclick = () => {
      p.likes++;
      savePost(p);
      renderPosts();
    };

    li.querySelector(".delete-btn").onclick = () => {
      if (!isAdmin()) return;
      if (!confirm("削除しますか？")) return;
      const posts = kv.get(K.POSTS, []).filter((x) => x.id !== p.id);
      kv.set(K.POSTS, posts);
      renderPosts();
    };

    li.querySelector(".reply-toggle").onclick = () => {
      replyBox.classList.toggle("hidden");
    };

    li.querySelector(".reply-input").onkeypress = (e) => {
      if (e.key !== "Enter") return;
      const txt = e.target.value.trim();
      if (!txt) return;

      p.replies.push({ id: uid(), text: txt });
      savePost(p);
      e.target.value = "";
      renderReplies();
    };

    if (isAdmin())
      li.querySelectorAll(".admin-only").forEach((el) => el.classList.remove("hidden"));

    ul.appendChild(li);
  });
}

function savePost(p) {
  const posts = kv.get(K.POSTS, []);
  const i = posts.findIndex((x) => x.id === p.id);
  if (i !== -1) {
    posts[i] = p;
    kv.set(K.POSTS, posts);
  }
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
      c
    ];
  });
}

// ---------- 情報・資料 ----------
let resShowAll = false;

function renderResources() {
  const list = by("resList");
  if (!list) return;

  let items = kv.get(K.RES, []).slice();

  // 読まれた数の多い順
  items.sort((a, b) => (b.reads ?? 0) - (a.reads ?? 0));

  list.innerHTML = "";

  (resShowAll ? items : items.slice(0, 5)).forEach((r) => {
    const li = document.createElement("li");
    li.className = "info-card";
    li.innerHTML = `
      <div class="info-title">${r.title}</div>
      <p class="info-summary">${r.summary}</p>
      <div class="text-xs text-slate-500 mb-2">${r.reads}人が読みました</div>
      <a href="${r.url}" target="_blank"
         class="inline-block bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">
        開く
      </a>
    `;

    li.querySelector("a").onclick = () => {
      r.reads++;
      updateResource(r);
      renderResources();
    };

    list.appendChild(li);
  });
}

function updateResource(r) {
  const arr = kv.get(K.RES, []);
  const idx = arr.findIndex((x) => x.id === r.id);
  if (idx !== -1) {
    arr[idx] = r;
    kv.set(K.RES, arr);
  }
}

function addResource() {
  const title = prompt("資料タイトルを入力");
  if (!title) return;

  const summary = prompt("要約（2〜3行）") || "";
  const url = prompt("URLを入力");
  if (!url) return;

  const arr = kv.get(K.RES, []);
  arr.push({
    id: uid(),
    title: title.trim(),
    summary: summary.trim(),
    url: url.trim(),
    reads: 0
  });

  kv.set(K.RES, arr);
  resShowAll = true;
  renderResources();
}

// ---------- タブ切り替え ----------
function switchTab(tab) {
  const comm = by("sectionCommunity");
  const info = by("sectionInfo");
  const tc = by("tabCommunity");
  const ti = by("tabInfo");

  const isInfo = tab === "info";

  comm.classList.toggle("hidden", isInfo);
  info.classList.toggle("hidden", !isInfo);

  tc.classList.toggle("bg-blue-600", !isInfo);
  tc.classList.toggle("text-white", !isInfo);
  ti.classList.toggle("bg-blue-600", isInfo);
  ti.classList.toggle("text-white", isInfo);
}

// ---------- init ----------
document.addEventListener("DOMContentLoaded", () => {
  seed();

  // 掲示板
  renderPosts();
  on(by("postBtn"), "click", addPost);
  on(by("postText"), "keypress", (e) => e.key === "Enter" && addPost());
  on(by("filterGroup"), "change", renderPosts);

  // 資料
  renderResources();
  on(by("seeAllBtn"), "click", () => {
    resShowAll = true;
    renderResources();
  });
  on(by("addResourceBtn"), "click", addResource);

  // タブ
  on(by("tabCommunity"), "click", () => switchTab("community"));
  on(by("tabInfo"), "click", () => switchTab("info"));

  // 管理者
  wireAdminToggle();
  applyAdminUI();
});
