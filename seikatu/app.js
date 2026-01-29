// =========================
// Supabase設定
// =========================

// ★ここを自分のプロジェクトのURLとanon keyに書き換える★
const SUPABASE_URL = "https://vegfslogwlhaiqcoctnq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZ2ZzbG9nd2xoYWlxY29jdG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjExNzgsImV4cCI6MjA4MDI5NzE3OH0.084PpKKOIZsufDR4YZVO7OQ1k6FqG5fb-jOHZQaswXI";

let supabaseClient = null;
let currentUser = null;

// Supabase 初期化 & ログインユーザーの予定読み込み
async function initSupabaseAndLoadEvents() {
  if (!window.supabase) {
    console.warn("Supabase SDK が読み込まれていません。");
    events = [];
    return;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  // ログイン中ユーザー取得
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    console.warn("ログインユーザーが取得できませんでした。", error);
    // ログインしてない場合はいったん events は空のまま
    events = [];
    return;
  }

  currentUser = user;

  // ユーザーごとの予定を取得
  const { data, error: fetchError } = await supabaseClient
    .from("life_events")
    .select("id, date, time, text")
    .eq("user_id", user.id)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (fetchError) {
    console.error("予定の読み込みに失敗しました", fetchError);
    alert(
      "予定の読み込みに失敗しました。\n時間をおいて、もう一度開いてみてください。"
    );
    events = [];
    return;
  }

  events = (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    time: row.time,
    text: row.text,
  }));
}

// Supabase に予定を1件追加
async function addEventToSupabase(date, time, text) {
  if (!supabaseClient || !currentUser) {
    alert("ログインしていないため、予定を保存できません。");
    return null;
  }

  const { data, error } = await supabaseClient
    .from("life_events")
    .insert({
      id: crypto.randomUUID(),
      user_id: currentUser.id,
      date,
      time,
      text,
    })
    .select("id, date, time, text")
    .single();

  if (error) {
    console.error("予定の保存に失敗しました", error);

    // ★ ここを追加：エラーの中身をダイアログで表示
    let msg = error.message || "不明なエラー";
    if (error.details) msg += "\n\nDETAILS: " + error.details;
    if (error.hint) msg += "\n\nHINT: " + error.hint;
    alert("予定の保存に失敗した理由:\n\n" + msg);

    return null;
  }

  return {
    id: data.id,
    date: data.date,
    time: data.time,
    text: data.text,
  };
}


// Supabase から予定を削除
async function deleteEventFromSupabase(eventId) {
  if (!supabaseClient || !currentUser) {
    alert("ログインしていないため、予定を削除できません。");
    return false;
  }

  const { error } = await supabaseClient
    .from("life_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("予定の削除に失敗しました", error);
    alert("予定の削除に失敗しました。");
    return false;
  }

  // メモリ上からも削除
  events = events.filter((e) => e.id !== eventId);
  return true;
}

// =========================
// ヘルパー（日付）
// =========================

// ローカル時間ベースで YYYY-MM-DD を作る（UTCにしない）
function toDateOnlyString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 今日を先頭にした 7 日間
function getWeekStartFrom(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// =========================
// ローカルストレージ
// =========================

const STORAGE_KEYS = {
  meds: "life-meds",
  routines: "life-routines",
  // events は Supabase に保存するので使わない
  lastReset: "life-last-reset-date",
};

function loadJson(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (_) {
    return defaultValue;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// =========================
// 状態
// =========================

let meds = loadJson(STORAGE_KEYS.meds, []); // {id, name, time, taken}
let routines = loadJson(STORAGE_KEYS.routines, []); // {id, time, text, done}
// events: {id, date(YYYY-MM-DD), time(HH:MM), text} は Supabase から取る
let events = [];

let selectedWeekStart = getWeekStartFrom(getToday());
let selectedDate = toDateOnlyString(getToday());
let currentMonth = new Date(getToday().getFullYear(), getToday().getMonth(), 1);

// =========================
// 0時になったら服薬チェック＆ルーティン完了をリセット
// =========================

function resetIfNewDay() {
  const todayStr = toDateOnlyString(getToday());
  const lastReset = localStorage.getItem(STORAGE_KEYS.lastReset);

  if (lastReset !== todayStr) {
    meds = meds.map((m) => ({ ...m, taken: false }));
    routines = routines.map((r) => ({ ...r, done: false }));
    saveJson(STORAGE_KEYS.meds, meds);
    saveJson(STORAGE_KEYS.routines, routines);
    localStorage.setItem(STORAGE_KEYS.lastReset, todayStr);
  }
}

// =========================
// DOM 参照
// =========================

// 服薬
const medForm = document.getElementById("medForm");
const medNameInput = document.getElementById("medNameInput");
const medTimeInput = document.getElementById("medTimeInput");
const medListEl = document.getElementById("medList");

// ルーティン
const routineForm = document.getElementById("routineForm");
const routineTimeInput = document.getElementById("routineTimeInput");
const routineTextInput = document.getElementById("routineTextInput");
const routineListEl = document.getElementById("routineList");

// 週間カレンダー
const viewWeekBtn = document.getElementById("viewWeekBtn");
const viewMonthBtn = document.getElementById("viewMonthBtn");
const weekViewEl = document.getElementById("weekView");
const monthViewEl = document.getElementById("monthView");

const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const weekRangeTextEl = document.getElementById("weekRangeText");
const weekTabsEl = document.getElementById("weekTabs");
const eventForm = document.getElementById("eventForm");
const eventTextInput = document.getElementById("eventTextInput");
const eventDateInput = document.getElementById("eventDateInput");
const eventTimeInput = document.getElementById("eventTimeInput");
const eventFormDateLabel = document.getElementById("eventFormDateLabel");
const eventListEl = document.getElementById("eventList");

// 月カレンダー
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const monthTitleEl = document.getElementById("monthTitle");
const monthGridEl = document.getElementById("monthGrid");
const monthEventTitleEl = document.getElementById("monthEventTitle");
const monthEventListEl = document.getElementById("monthEventList");

// Google連携（ボタン）
const connectGoogleBtn = document.getElementById("connectGoogleBtn"); // 上のボタン（あれば）
const pullFromGoogleBtn = document.getElementById("pullFromGoogleBtn"); // 下の「読み込む」
const pushToGoogleBtn = document.getElementById("pushToGoogleBtn"); // 下の「Google カレンダーへ送信」

// =========================
// 服薬：描画 & 操作
// =========================

function renderMeds() {
  medListEl.innerHTML = "";
  if (!meds.length) {
    const empty = document.createElement("p");
    empty.textContent = "服薬メモはまだありません。";
    empty.className = "section-note";
    medListEl.appendChild(empty);
    return;
  }

  meds
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((med) => {
      const li = document.createElement("li");
      li.className = "item-row";

      const main = document.createElement("div");
      main.className = "item-main";

      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = med.name;

      const meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = `時間：${med.time}`;

      main.appendChild(title);
      main.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const badge = document.createElement("span");
      badge.className = "badge" + (med.taken ? " badge-success" : "");
      badge.textContent = med.taken ? "今日：飲んだ" : "未チェック";

      const doneBtn = document.createElement("button");
      doneBtn.type = "button";
      doneBtn.className = "btn-secondary";
      doneBtn.textContent = med.taken ? "取り消す" : "飲んだ";
      doneBtn.addEventListener("click", () => {
        med.taken = !med.taken;
        saveJson(STORAGE_KEYS.meds, meds);
        renderMeds();
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-secondary";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => {
        meds = meds.filter((m) => m.id !== med.id);
        saveJson(STORAGE_KEYS.meds, meds);
        renderMeds();
      });

      actions.appendChild(badge);
      actions.appendChild(doneBtn);
      actions.appendChild(delBtn);

      li.appendChild(main);
      li.appendChild(actions);

      medListEl.appendChild(li);
    });
}

medForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = medNameInput.value.trim();
  const time = medTimeInput.value;
  if (!name || !time) return;

  meds.push({
    id: Date.now(),
    name,
    time,
    taken: false,
  });
  saveJson(STORAGE_KEYS.meds, meds);
  medNameInput.value = "";
  medTimeInput.value = "";
  renderMeds();
});

// =========================
// ルーティン：描画 & 操作
// =========================

function renderRoutines() {
  routineListEl.innerHTML = "";
  if (!routines.length) {
    const empty = document.createElement("p");
    empty.textContent =
      "まだルーティンがありません。上のフォームから追加してください。";
    empty.className = "section-note";
    routineListEl.appendChild(empty);
    return;
  }

  routines
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((r) => {
      const li = document.createElement("li");
      li.className = "item-row";

      const main = document.createElement("div");
      main.className = "item-main";

      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = r.text;

      const meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = `時間：${r.time}`;

      main.appendChild(title);
      main.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const badge = document.createElement("span");
      badge.className = "badge" + (r.done ? " badge-success" : "");
      badge.textContent = r.done ? "今日：完了" : "未チェック";

      const doneBtn = document.createElement("button");
      doneBtn.type = "button";
      doneBtn.className = "btn-secondary";
      doneBtn.textContent = r.done ? "取り消す" : "完了";
      doneBtn.addEventListener("click", () => {
        r.done = !r.done;
        saveJson(STORAGE_KEYS.routines, routines);
        renderRoutines();
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-secondary";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => {
        routines = routines.filter((x) => x.id !== r.id);
        saveJson(STORAGE_KEYS.routines, routines);
        renderRoutines();
      });

      actions.appendChild(badge);
      actions.appendChild(doneBtn);
      actions.appendChild(delBtn);

      li.appendChild(main);
      li.appendChild(actions);

      routineListEl.appendChild(li);
    });
}

routineForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const time = routineTimeInput.value;
  const text = routineTextInput.value.trim();
  if (!time || !text) return;

  routines.push({
    id: Date.now(),
    time,
    text,
    done: false,
  });
  saveJson(STORAGE_KEYS.routines, routines);
  routineTimeInput.value = "";
  routineTextInput.value = "";
  renderRoutines();
});

// =========================
// 予定：週ビュー
// =========================

function getWeekDates() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(
      selectedWeekStart.getFullYear(),
      selectedWeekStart.getMonth(),
      selectedWeekStart.getDate() + i
    );
    days.push(d);
  }
  return days;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function renderWeekHeader() {
  const days = getWeekDates();
  const first = days[0];
  const last = days[days.length - 1];

  weekRangeTextEl.textContent = `${first.getMonth() + 1}/${first.getDate()}（${
    WEEKDAY_LABELS[first.getDay()]
  }） 〜 ${last.getMonth() + 1}/${last.getDate()}（${
    WEEKDAY_LABELS[last.getDay()]
  }）`;
}

function renderWeekTabs() {
  weekTabsEl.innerHTML = "";
  const days = getWeekDates();

  days.forEach((d) => {
    const dateStr = toDateOnlyString(d);

    const card = document.createElement("div");
    card.className = "week-card";
    if (dateStr === selectedDate) {
      card.classList.add("week-card-active");
    }

    const header = document.createElement("div");
    header.className = "week-card-header";
    header.textContent = `${WEEKDAY_LABELS[d.getDay()]} ${d.getMonth() + 1}/${
      d.getDate()
    }`;

    const body = document.createElement("div");
    body.className = "week-card-body";

    const todaysEvents = events
      .filter((e) => e.date === dateStr)
      .slice()
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    if (!todaysEvents.length) {
      body.textContent = "タスクなし";
    } else {
      todaysEvents.forEach((ev) => {
        const row = document.createElement("div");
        row.className = "week-card-task";
        const timeLabel = ev.time ? `${ev.time} ` : "";
        row.textContent = `${timeLabel}${ev.text}`;
        body.appendChild(row);
      });
    }

    card.appendChild(header);
    card.appendChild(body);

    card.addEventListener("click", () => {
      selectedDate = dateStr;
      renderWeekHeader();
      renderWeekTabs();
      renderEventsForSelectedDate();
      renderMonth();
    });

    weekTabsEl.appendChild(card);
  });

  const d = parseDate(selectedDate);
  if (eventFormDateLabel) {
    eventFormDateLabel.textContent = `（${d.getMonth() + 1}/${d.getDate()} ${
      WEEKDAY_LABELS[d.getDay()]
    }曜日）`;
  }

  if (eventDateInput && !eventDateInput.value) {
    eventDateInput.value = selectedDate;
  }
}

function renderEventsForSelectedDate() {
  if (!eventListEl) return;

  eventListEl.innerHTML = "";
  const todaysEvents = events
    .filter((e) => e.date === selectedDate)
    .slice()
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  if (!todaysEvents.length) {
    const empty = document.createElement("p");
    empty.textContent = "この日はまだ予定が登録されていません。";
    empty.className = "section-note";
    eventListEl.appendChild(empty);
    return;
  }

  todaysEvents.forEach((ev) => {
    const li = document.createElement("li");
    li.className = "item-row";

    const main = document.createElement("div");
    main.className = "item-main";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = ev.time ? `${ev.time} ${ev.text}` : ev.text;

    main.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-secondary";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", async () => {
      const ok = await deleteEventFromSupabase(ev.id);
      if (!ok) return;
      renderEventsForSelectedDate();
      renderWeekTabs();
      renderMonth();
    });

    actions.appendChild(delBtn);

    li.appendChild(main);
    li.appendChild(actions);

    eventListEl.appendChild(li);
  });
}

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = eventTextInput.value.trim();
  const date = (eventDateInput && eventDateInput.value) || selectedDate;
  const time = eventTimeInput ? eventTimeInput.value : "";

  if (!text || !date) return;

  const newEv = await addEventToSupabase(date, time, text);
  if (!newEv) {
    return; // 保存失敗
  }

  events.push(newEv);

  eventTextInput.value = "";
  if (eventTimeInput) eventTimeInput.value = "";

  renderWeekTabs();
  renderEventsForSelectedDate();
  renderMonth();
});

prevWeekBtn.addEventListener("click", () => {
  selectedWeekStart = new Date(
    selectedWeekStart.getFullYear(),
    selectedWeekStart.getMonth(),
    selectedWeekStart.getDate() - 7
  );
  renderWeekHeader();
  renderWeekTabs();
  renderEventsForSelectedDate();
});

nextWeekBtn.addEventListener("click", () => {
  selectedWeekStart = new Date(
    selectedWeekStart.getFullYear(),
    selectedWeekStart.getMonth(),
    selectedWeekStart.getDate() + 7
  );
  renderWeekHeader();
  renderWeekTabs();
  renderEventsForSelectedDate();
});

// =========================
// 予定：月ビュー
// =========================

function buildMonthGrid(dateForMonth) {
  const year = dateForMonth.getFullYear();
  const month = dateForMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = new Date(year, month, 1 - firstDay.getDay());

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      startDay.getFullYear(),
      startDay.getMonth(),
      startDay.getDate() + i
    );
    cells.push(d);
  }
  return cells;
}

function renderMonth() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  monthTitleEl.textContent = `${year}年${month + 1}月`;
  monthGridEl.innerHTML = "";

  const cells = buildMonthGrid(currentMonth);

  cells.forEach((d) => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    const dateStr = toDateOnlyString(d);

    if (d.getMonth() !== month) {
      cell.classList.add("calendar-cell-other");
    }
    if (dateStr === toDateOnlyString(getToday())) {
      cell.classList.add("calendar-cell-today");
    }
    if (dateStr === selectedDate) {
      cell.classList.add("calendar-cell-selected");
    }

    const num = document.createElement("div");
    num.textContent = d.getDate();
    cell.appendChild(num);

    const todaysEvents = events.filter((e) => e.date === dateStr);
    if (todaysEvents.length > 0) {
      const dot = document.createElement("div");
      dot.style.width = "6px";
      dot.style.height = "6px";
      dot.style.borderRadius = "50%";
      dot.style.background = "#2563eb";
      dot.style.margin = "4px auto 0";
      dot.style.pointerEvents = "none";
      cell.appendChild(dot);
    }

    cell.addEventListener("click", () => {
      selectedDate = dateStr;
      renderMonth();
      renderMonthEventPanel();
      selectedWeekStart = getWeekStartFrom(d);
      renderWeekHeader();
      renderWeekTabs();
      renderEventsForSelectedDate();
    });

    monthGridEl.appendChild(cell);
  });

  renderMonthEventPanel();
}

function renderMonthEventPanel() {
  const d = parseDate(selectedDate);
  monthEventTitleEl.textContent = `${d.getMonth() + 1}/${d.getDate()}（${
    WEEKDAY_LABELS[d.getDay()]
  }曜日）の予定`;

  monthEventListEl.innerHTML = "";
  const list = events
    .filter((e) => e.date === selectedDate)
    .slice()
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  if (!list.length) {
    const empty = document.createElement("p");
    empty.textContent = "この日はまだ予定が登録されていません。";
    empty.className = "section-note";
    monthEventListEl.appendChild(empty);
    return;
  }

  list.forEach((ev) => {
    const li = document.createElement("li");
    li.className = "item-row";

    const main = document.createElement("div");
    main.className = "item-main";
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = ev.time ? `${ev.time} ${ev.text}` : ev.text;
    main.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-secondary";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", async () => {
      const ok = await deleteEventFromSupabase(ev.id);
      if (!ok) return;
      renderMonth();
      renderWeekTabs();
      renderEventsForSelectedDate();
    });

    actions.appendChild(delBtn);

    li.appendChild(main);
    li.appendChild(actions);

    monthEventListEl.appendChild(li);
  });
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1
  );
  renderMonth();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    1
  );
  renderMonth();
});

// =========================
// 週ビュー／月ビュー 切り替え
// =========================

viewWeekBtn.addEventListener("click", () => {
  weekViewEl.classList.remove("hidden");
  monthViewEl.classList.add("hidden");
  viewWeekBtn.classList.add("is-active");
  viewMonthBtn.classList.remove("is-active");
});

viewMonthBtn.addEventListener("click", () => {
  weekViewEl.classList.add("hidden");
  monthViewEl.classList.remove("hidden");
  viewWeekBtn.classList.remove("is-active");
  viewMonthBtn.classList.add("is-active");
});


// =========================
// ICSファイルを生成してダウンロード
// =========================

function pad2(n) {
  return n.toString().padStart(2, "0");
}

// "YYYY-MM-DD" + "HH:MM" → "YYYYMMDDTHHMMSS"
function toIcsDateTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  let hh = 9,
    mm = 0;
  if (timeStr) {
    const [th, tm] = timeStr.split(":").map(Number);
    hh = th;
    mm = tm;
  }
  return y.toString() + pad2(m) + pad2(d) + "T" + pad2(hh) + pad2(mm) + "00";
}

function downloadEventsAsIcs() {
  if (!events.length) {
    alert("エクスポートする予定がありません。");
    return;
  }

  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//SeikatsuSupport//JP");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  events.forEach((ev) => {
    const dtStart = toIcsDateTime(ev.date, ev.time || "");
    const dtEnd = toIcsDateTime(ev.date, ev.time || "");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id || ev.date + "-" + Math.random()}@seikatsu-app`);
    lines.push(`DTSTAMP:${dtStart}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push("SUMMARY:" + (ev.text || "予定"));
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "seikatsu_schedule.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =========================
// 初期化
// =========================

async function init() {
  resetIfNewDay();

  selectedWeekStart = getWeekStartFrom(getToday());
  selectedDate = toDateOnlyString(getToday());
  currentMonth = new Date(getToday().getFullYear(), getToday().getMonth(), 1);

  renderMeds();
  renderRoutines();

  // Supabase から予定を読み込む
  await initSupabaseAndLoadEvents();

  renderWeekHeader();
  renderWeekTabs();
  renderEventsForSelectedDate();
  renderMonth();
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
