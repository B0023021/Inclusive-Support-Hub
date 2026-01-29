document.addEventListener('DOMContentLoaded', ()=> {
  const container = document.getElementById('history');
  if(!container) return;

  // load all histories
  const color = JSON.parse(localStorage.getItem('color_history')||'[]');
  const hearing = JSON.parse(localStorage.getItem('hearing_history')||'[]');
  const cognition = JSON.parse(localStorage.getItem('cognition_history')||'[]');
  const motor = JSON.parse(localStorage.getItem('motor_history')||'[]');

  let html = "";

  // --- 色覚 ---
  html += "<h3>🎨 色覚テスト</h3>";
  if (color.length) {
    const c = color[0];
    // 修正: c.result には <br> が含まれるため、innerHTMLで表示する
    html += `<p>${new Date(c.time).toLocaleString()} </p>
             <div style="margin-left: 15px; line-height: 1.6;"><strong>${c.result}</strong></div>`;
  } else html += "<p class='chip'>記録なし</p>";

  // --- 聴覚 ---
  html += "<h3>👂 聴覚テスト</h3>";
  if (hearing.length) {
    const h = hearing[0];
    html += `<p>${new Date(h.time).toLocaleString()}</p>`;
    html += "<ul>";
    for (const [freq, val] of Object.entries(h.summary)) {
      html += `<li>${freq}Hz：${val === true ? '聞こえた' : val === false ? '聞こえない' : '未測定'}</li>`;
    }
    html += "</ul>";
  } else html += "<p class='chip'>記録なし</p>";

// --- 認知 ---
html += "<h3>🧠 認知機能テスト</h3>";
if (cognition.length) {
  const c = cognition[0];
  html += `<p>${new Date(c.time).toLocaleString()}</p>`;
  
  // 各モードの集計
  const forwardRounds = c.rounds.filter(r => r.mode === 'forward');
  const backwardRounds = c.rounds.filter(r => r.mode === 'backward');
  const stroopRounds = c.rounds.filter(r => r.mode === 'stroop');
  
  const forwardCorrect = forwardRounds.filter(r => r.correct).length;
  const backwardCorrect = backwardRounds.filter(r => r.correct).length;
  const stroopCorrect = stroopRounds.filter(r => r.correct).length;
  
  // 運動機能テストと同様にリスト形式で表示
  html += "<ul>";
  html += `<li>前方記憶テスト：${forwardCorrect}/${forwardRounds.length}問 正答</li>`;
  html += `<li>逆順記憶テスト：${backwardCorrect}/${backwardRounds.length}問 正答</li>`;
  html += `<li>注意（Stroop簡易）：${stroopCorrect}/${stroopRounds.length}問 正答</li>`;
  html += "</ul>";
  
} else html += "<p class='chip'>記録なし</p>";

  // --- 運動 ---
  html += "<h3>💪 運動機能テスト</h3>";
  if (motor.length) {
    const m = motor[0];
    const valid = m.trials.filter(t=> !t.missed).map(t=>t.rt);
    const avg = valid.length? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length) : 'N/A';
    html += `<p>${new Date(m.time).toLocaleString()} — 平均反応速度：${avg} ms (5回平均)</p>`;
  } else html += "<p class='chip'>記録なし</p>";


  container.innerHTML = html;
});