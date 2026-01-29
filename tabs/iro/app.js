// ... (既存の app.js の内容) ...

// ================================================================
// Pixel Picker (picxel.htmlの内容を統合)
// ================================================================

(() => {
  // ===== 要素
  const fileInput = document.getElementById('fileInput');
  const btnPick   = document.getElementById('btnPick');
  const btnDemo   = document.getElementById('btnDemo');
  const btnSave   = document.getElementById('btnSave');
  const btnInstall= document.getElementById('btnInstall');
  const pxSize    = document.getElementById('pxSize');
  const scale     = document.getElementById('scale');
  const avg       = document.getElementById('avg');
  const pxLabel   = document.getElementById('pxLabel');
  const scaleLabel= document.getElementById('scaleLabel');
  const avgLabel  = document.getElementById('avgLabel');
  const canvas    = document.getElementById('canvas');
  if(!canvas) return; // Pixel Pickerの要素が存在しない場合は実行しない
  const ctx       = canvas.getContext('2d', { willReadFrequently: true });
  const overlay   = document.getElementById('overlay');
  const octx      = overlay.getContext('2d', { willReadFrequently: true });
  const dropArea  = document.getElementById('dropArea');
  const statusEl  = document.getElementById('status');
  const swatch    = document.getElementById('swatch');
  const hexEl     = document.getElementById('hex');
  const rgbEl     = document.getElementById('rgb');
  const hslEl     = document.getElementById('hsl');
  const cssEl     = document.getElementById('cssvar');
  const nameChip  = document.getElementById('nameChip');
  const copyHexBtn= document.getElementById('copyHex');
  const copyRgbBtn= document.getElementById('copyRgb');
  const copyHslBtn= document.getElementById('copyHsl');
  const copyCssBtn= document.getElementById('copyCss');
  const loupeToggle = document.getElementById('loupeToggle');
  const speakToggle = document.getElementById('speakToggle');
  const btnSpeak  = document.getElementById('btnSpeak');
  const loupe     = document.getElementById('loupe');
  const lctx      = loupe.getContext('2d', { willReadFrequently: true });
  const splitBar  = document.getElementById('splitBar');
  const cvdType   = document.getElementById('cvdType');
  const compare   = document.getElementById('compare');
  const compBox   = document.getElementById('comp');
  const triadBox  = document.getElementById('triad');
  const historyBox= document.getElementById('history');
  const btnShare  = document.getElementById('btnShare');
  const btnTile   = document.getElementById('btnTile');
  const btnPalette= document.getElementById('btnPalette');
  const paletteBox= document.getElementById('palette');
  const installHint = document.getElementById('installHint');

  // プレビュー要素
  const pwN = document.getElementById('pw-n');
  const pwL = document.getElementById('pw-l');
  const pbN = document.getElementById('pb-n');
  const pbL = document.getElementById('pb-l');
  const pwAA = document.getElementById('pw-aa'),  pwAAA = document.getElementById('pw-aaa');
  const pbAA = document.getElementById('pb-aa'),  pbAAA = document.getElementById('pb-aaa');
  const previewWhite = document.getElementById('previewWhite');
  const previewBlack = document.getElementById('previewBlack');

  // ===== 状態
  let showGrid = false;
  let originalImg = null;
  let displayWidth = 0, displayHeight = 0;
  const DPR = window.devicePixelRatio || 1;
  const supportsOffscreen = !!window.OffscreenCanvas;
  const HISTORY_KEY   = 'pp_hist_v1';
  const SETTINGS_KEY  = 'pp_settings_v1';
  let history = loadHistory();
  let sel = { x:null, y:null };
  let deferredPrompt = null;

  // ===== PWA: SW登録 & Install UI
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js');
    });
  }
  // Android のインストールバナー
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.style.display = 'inline-block';
  });
  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) { alert('iPhoneは共有→ホーム画面に追加'); return; }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstall.style.display = 'none';
  });
  // iPhone向けのヒント
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isStandalone && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    installHint.style.display = 'block';
  }

  // ===== ユーティリティ (一部 app.js の関数と重複するが、ここではピクセルピッカー用に再定義)
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const round = (v) => Math.round(v);
  const toHex = (n) => n.toString(16).padStart(2,'0');
  const rgbToHex = (r,g,b) => ('#' + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
  // app.jsのhexToRgbと異なる定義だが、ピクセルピッカー側で必要なため使用
  const hexToRgb = (hex) => { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return m?[+`0x${m[1]}`,+`0x${m[2]}`,+`0x${m[3]}`]:null; };

  function rgbToHsl(r,g,b){ r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b); let h,s,l=(max+min)/2;
    if(max===min){h=s=0}else{ const d=max-min; s=l>0.5? d/(2-max-min) : d/(max+min);
      switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;} h/=6;
    }
    return [Math.round(h*360),Math.round(s*100),Math.round(l*100)];
  }
  function hslToRgb(h,s,l){ s/=100;l/=100; const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
    let r1=0,g1=0,b1=0;
    if(0<=h&&h<60){r1=c;g1=x}else if(h<120){r1=x;g1=c}
    else if(h<180){g1=c;b1=x}else if(h<240){g1=x;b1=c}
    else if(h<300){r1=x;b1=c}else{r1=c;b1=x}
    return [Math.round((r1+m)*255),Math.round((g1+m)*255),Math.round((b1+m)*255)];
  }
  // app.jsのrelativeLuminance関数に依存しない、ピクセルピッカー用の輝度計算
  function luminance(r,g,b){ const a=[r,g,b].map(v=>{v/=255;return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  function contrastRatio(rgb1,rgb2){ const L1=luminance(...rgb1), L2=luminance(...rgb2); const lighter=Math.max(L1,L2), darker=Math.min(L1,L2); return ((lighter+0.05)/(darker+0.05)); }

  function readAsDataURL(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(file); }); }
  async function fileToImage(file){ const dataURL = await readAsDataURL(file); return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=dataURL; }); }

  function updateLabels(){ pxLabel.textContent = `${pxSize.value}px`; scaleLabel.textContent = `${Number(scale.value).toFixed(2)}x`; avgLabel.textContent = `${avg.value}×${avg.value}`; }

  function colorNameFromHsl(h,s,l){
    if(s<10 && l>=90) return 'ホワイト';
    if(s<10 && l<=10) return 'ブラック';
    if(s<12)          return 'グレイッシュ';
    const T=[['赤',0],['橙',20],['黄',45],['黄緑',75],['緑',130],['青緑',165],['青',200],['藍',230],['紫',275],['赤紫',320],['赤',360]];
    let base='赤'; for(let i=1;i<T.length;i++){ if(h<T[i][1]){ base=T[i-1][0]; break; } }
    if(l>80) return 'ライト'+base; if(l<25) return 'ダーク'+base; if(s<35) return 'ペール'+base; return base;
  }

  // CVD簡易
  const CVD = {
    protan: [[0.56667,0.43333,0],[0.55833,0.44167,0],[0,0.24167,0.75833]],
    deutan: [[0.625,0.375,0],[0.70,0.30,0],[0,0.30,0.70]],
    tritan: [[0.95,0.05,0],[0,0.43333,0.56667],[0,0.475,0.525]],
  };
  const applyMatrix=(r,g,b,M)=>[M[0][0]*r+M[0][1]*g+M[0][2]*b, M[1][0]*r+M[1][1]*g+M[1][2]*b, M[2][0]*r+M[2][1]*g+M[2][2]*b].map(v=>Math.max(0,Math.min(255,Math.round(v))));
  function simulateImageData(imgData, type){
    if(type==='none') return imgData;
    const out = new ImageData(imgData.width, imgData.height);
    const M = CVD[type];
    for(let i=0;i<imgData.data.length;i+=4){
      const [nr,ng,nb] = applyMatrix(imgData.data[i],imgData.data[i+1],imgData.data[i+2],M);
      out.data[i]=nr; out.data[i+1]=ng; out.data[i+2]=nb; out.data[i+3]=imgData.data[i+3];
    }
    return out;
  }

  // 描画
  function drawPixelated(){
    if(!originalImg) return;

    const s = parseFloat(scale.value); // 縮小係数
    const maxCSSW = dropArea.clientWidth;
    const maxW = Math.min(Math.round(maxCSSW * DPR), 8000); // 最大幅

    const srcW = originalImg.naturalWidth || originalImg.videoWidth;
    const srcH = originalImg.naturalHeight || originalImg.videoHeight;
    const rawW = clamp(Math.round(srcW * s), 1, 10000);
    const rawH = clamp(Math.round(srcH * s), 1, 10000);
    const aspect = rawW / rawH;

    displayWidth = Math.min(maxW, rawW); // 最大幅 or 縮小後の幅
    displayHeight = Math.max(1, Math.round(displayWidth / aspect));

    canvas.width = displayWidth; canvas.height = displayHeight;
    overlay.width = displayWidth; overlay.height = displayHeight;

    const px = parseInt(pxSize.value, 10);
    const w = Math.max(1, Math.floor(displayWidth / px));
    const h = Math.max(1, Math.floor(displayHeight / px));

    const makeCanvas = (W,H)=>{ if(supportsOffscreen){ return new OffscreenCanvas(W,H); } const c=document.createElement('canvas'); c.width=W; c.height=H; return c; };

    const tmp = makeCanvas(rawW,rawH), tctx = tmp.getContext('2d');
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(originalImg, 0,0, srcW,srcH, 0,0, rawW,rawH);

    const low = makeCanvas(w,h), lctx2 = low.getContext('2d',{willReadFrequently:true});
    lctx2.imageSmoothingEnabled = false;
    lctx2.drawImage(tmp, 0,0,rawW,rawH, 0,0,w,h);

    const viewNorm = makeCanvas(displayWidth,displayHeight);
    const vn = viewNorm.getContext('2d');
    vn.imageSmoothingEnabled = false;
    vn.drawImage(low, 0,0,w,h, 0,0,displayWidth,displayHeight);

    const viewCvd = makeCanvas(displayWidth,displayHeight);
    const vc = viewCvd.getContext('2d',{willReadFrequently:true});
    vc.imageSmoothingEnabled = false;
    vc.drawImage(viewNorm,0,0);
    if(cvdType.value!=='none'){
      const id = vc.getImageData(0,0,displayWidth,displayHeight);
      const sim = simulateImageData(id, cvdType.value);
      vc.putImageData(sim,0,0);
    }

    const split = Math.round(displayWidth * parseFloat(compare.value));
    ctx.clearRect(0,0,displayWidth,displayHeight);
    if(split>0) ctx.drawImage(viewNorm, 0,0, split,displayHeight, 0,0, split,displayHeight);
    if(split<displayWidth) ctx.drawImage(viewCvd, split,0, displayWidth-split,displayHeight, split,0, displayWidth-split,displayHeight);

    if(showGrid) drawGrid(px);

    if(cvdType.value!=='none' && split>0 && split<displayWidth){
      splitBar.style.display='block';
      const rect = canvas.getBoundingClientRect();
      splitBar.style.left = `${split}px`; // CSSサイズではなくピクセル座標
      splitBar.style.top  = `0px`;
      splitBar.style.height = `${rect.height}px`;
    } else splitBar.style.display='none';

    statusEl.textContent = `画像: ${srcW}×${srcH} → 表示: ${displayWidth}×${displayHeight}`;

    drawSelectionOverlay();
  }

  function drawGrid(px){
    ctx.save();
    ctx.strokeStyle='rgba(128,128,128,.1)'; ctx.lineWidth=1;
    const cols = Math.floor(displayWidth/px), rows = Math.floor(displayHeight/px);
    for(let x=0;x<=cols;x++){ ctx.beginPath(); ctx.moveTo(x*px+.5,0); ctx.lineTo(x*px+.5,rows*px); ctx.stroke(); }
    for(let y=0;y<=rows;y++){ ctx.beginPath(); ctx.moveTo(0,y*px+.5); ctx.lineTo(cols*px,y*px+.5); ctx.stroke(); }
    ctx.restore();
  }

  function drawSelectionOverlay(){
    octx.clearRect(0,0,overlay.width,overlay.height);
    if(sel.x==null || sel.y==null || !canvas.width) return;
    const px = parseInt(pxSize.value,10);
    const cellX = clamp(Math.floor(sel.x/px)*px, 0, canvas.width - px);
    const cellY = clamp(Math.floor(sel.y/px)*px, 0, canvas.height- px);
    octx.save();
    octx.lineWidth = 3; octx.strokeStyle = 'rgba(255,255,255,0.9)'; octx.strokeRect(cellX+0.5, cellY+0.5, px-1, px-1);
    octx.lineWidth = 1; octx.strokeStyle = 'rgba(0,0,0,0.95)'; octx.strokeRect(cellX+0.5, cellY+0.5, px-1, px-1);
    octx.restore();
  }

  function canvasPoint(evt){
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
    const y = (evt.clientY - rect.top)  * (canvas.height / rect.height);
    return { x: Math.floor(x), y: Math.floor(y), rect };
  }

  function pickAt(pt, speak=true){
    const n = parseInt(avg.value, 10);
    const half = Math.floor(n/2);
    let r=0,g=0,b=0,cnt=0;
    for(let dy=-half; dy<=half; dy++){
      for(let dx=-half; dx<=half; dx++){
        const sx = clamp(pt.x+dx, 0, canvas.width-1);
        const sy = clamp(pt.y+dy, 0, canvas.height-1);
        const d = ctx.getImageData(sx, sy, 1, 1).data;
        r+=d[0]; g+=d[1]; b+=d[2]; cnt++;
      }
    }
    sel.x = clamp(pt.x,0,canvas.width-1);
    sel.y = clamp(pt.y,0,canvas.height-1);
    drawSelectionOverlay();
    updateReadout(Math.round(r/cnt), Math.round(g/cnt), Math.round(b/cnt), speak);
  }

  function updateReadout(r,g,b, speakNow=true){
    const hex = rgbToHex(r,g,b);
    const [h,s,l] = rgbToHsl(r,g,b);
    const [rArr,gArr,bArr] = [r,g,b]; // WCAG判定用

    swatch.style.background = `rgb(${r},${g},${b})`;
    hexEl.textContent = hex;
    rgbEl.textContent = `rgb(${r}, ${g}, ${b})`;
    hslEl.textContent = `hsl(${h} ${s}% ${l}%)`;
    cssEl.textContent  = `--color: ${hex};`;
    const name = colorNameFromHsl(h,s,l);
    nameChip.textContent = '色名: ' + name;

    updateAccessibilityUI([rArr,gArr,bArr], hex);
    renderSchemes(h,s,l, hex);

    addHistory(hex);

    if(speakToggle.checked && speakNow){ speakColor(name, hex); }
  }

  function updateAccessibilityUI([r,g,b], hex){
    const white=[255,255,255], black=[0,0,0];
    const crW = contrastRatio([r,g,b], white);
    const crB = contrastRatio([r,g,b], black);
    
    // プレビューボックスの更新
    previewWhite.style.background = hex; previewWhite.style.color = '#fff';
    previewBlack.style.background = hex; previewBlack.style.color = '#000';

    // コントラストテキストの更新
    pwN.textContent = `通常（16px） コントラスト ${crW.toFixed(2)}`;
    pwL.textContent = `大きな文字（24px/Bold）`;
    pbN.textContent = `通常（16px） コントラスト ${crB.toFixed(2)}`;
    pbL.textContent = `大きな文字（24px/Bold）`;

    // バッジの更新
    // 白文字
    setBadge(pwAA , crW>=4.5, `AA ${crW>=4.5?'合格':'不合格'}`);
    setBadge(pwAAA, crW>=7.0, `AAA ${crW>=7.0?'合格':'不合格'}`);
    // 黒文字
    setBadge(pbAA , crB>=4.5, `AA ${crB>=4.5?'合格':'不合格'}`);
    setBadge(pbAAA, crB>=7.0, `AAA ${crB>=7.0?'合格':'不合格'}`);
    
    pwL.title = `大きな文字基準：AA 3.0 / AAA 4.5、現在 ${crW.toFixed(2)}`;
    pbL.title = `大きな文字基準：AA 3.0 / AAA 4.5、現在 ${crB.toFixed(2)}`;
  }
  
  function setBadge(el, pass, text){ 
    el.textContent=text; 
    el.classList.remove('pass','fail'); 
    el.classList.add(pass?'pass':'fail'); 
  }

  function renderSchemes(h,s,l, baseHex){
    const hc = (h+180)%360;
    const [cr,cg,cb] = hslToRgb(hc,s,l);
    const compHex = rgbToHex(cr,cg,cb);
    compBox.innerHTML=''; compBox.appendChild(makeSwatch(compHex));
    const h1=(h+120)%360, h2=(h+240)%360;
    const [r1,g1,b1]=hslToRgb(h1,s,l);
    const [r2,g2,b2]=hslToRgb(h2,s,l);
    const tri1=rgbToHex(r1,g1,b1), tri2=rgbToHex(r2,g2,b2);
    triadBox.innerHTML='';
    triadBox.appendChild(makeSwatch(baseHex));
    triadBox.appendChild(makeSwatch(tri1));
    triadBox.appendChild(makeSwatch(tri2));
  }
  
  function makeSwatch(hex){
    const d=document.createElement('button');
    d.className='p'; d.style.background=hex; d.title=hex; d.dataset.hex=hex;
    d.addEventListener('click', ()=>copy(hex));
    // ダブルタップ（モバイル）対応
    let last=0; d.addEventListener('click', ()=>{
      const now=Date.now(); if(now-last<350){ const rgb=hexToRgb(hex); if(rgb) updateReadout(rgb[0],rgb[1],rgb[2]); }
      last=now;
    }, {capture:false});
    return d;
  }

  function drawLoupe(pt){
    if(!loupeToggle.checked || !canvas.width){ loupe.style.display='none'; return; }
    const SIZE = loupe.width, ZOOM = 3;
    const srcW = Math.max(1, Math.floor(SIZE / ZOOM));
    const srcH = srcW;
    const sx = clamp(pt.x - srcW/2, 0, canvas.width  - srcW);
    const sy = clamp(pt.y - srcH/2, 0, canvas.height - srcH);
    lctx.imageSmoothingEnabled = false;
    lctx.clearRect(0,0,SIZE,SIZE);
    lctx.drawImage(canvas, sx, sy, srcW, srcH, 0, 0, SIZE, SIZE);
    lctx.strokeStyle = '#000'; lctx.lineWidth = 1;
    lctx.beginPath(); lctx.moveTo(SIZE/2, 0); lctx.lineTo(SIZE/2, SIZE);
    lctx.moveTo(0, SIZE/2); lctx.lineTo(SIZE, SIZE/2); lctx.stroke();
    const areaRect = dropArea.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const cssX = canvasRect.left + (pt.x * (canvasRect.width / canvas.width));
    const cssY = canvasRect.top  + (pt.y * (canvasRect.height/ canvas.height));
    let left = cssX + 12, top = cssY - SIZE - 10;
    if(top < areaRect.top) top = cssY + 12;
    if(left + SIZE > areaRect.right) left = cssX - SIZE - 10;
    loupe.style.left = `${left - areaRect.left}px`;
    loupe.style.top  = `${top  - areaRect.top }px`;
    loupe.style.display = 'block';
  }

  // 画像読み込み
  async function handleFile(file){
    if(!file) return;
    statusEl.textContent = `読み込み中… (${file.name||'image'})`;
    const isHeic = /image\/heic|image\/heif/i.test(file.type) || /\.hei(c|f)$/i.test(file.name||'');
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if(isHeic && !isSafari){
      statusEl.textContent = 'このブラウザはHEIC非対応です。JPG/PNGを選んでください。';
      alert('HEICはSafari以外で表示できません。JPG/PNGで試してください。');
      fileInput.value=''; return;
    }
    try{
      originalImg = await fileToImage(file);
      drawPixelated(); statusEl.textContent = '画像をタップして色を取得';
      extractPalette();
      sel.x = Math.floor(canvas.width/2); sel.y = Math.floor(canvas.height/2); drawSelectionOverlay();
      pickAt({x:sel.x, y:sel.y}, false); // 中央の色を初期選択
    }catch(e){ console.error(e); statusEl.textContent = '画像の読み込みに失敗しました'; }
    finally{ fileInput.value=''; }
  }

  // 画像を選ぶ / デモ
  btnPick.addEventListener('click', ()=>fileInput.click());
  fileInput.addEventListener('change', (e)=>handleFile(e.target.files && e.target.files[0]));
  btnDemo.addEventListener('click', ()=>{
    const c=document.createElement('canvas'); c.width=480; c.height=280;
    const g=c.getContext('2d');
    const grad=g.createLinearGradient(0,0,c.width,0);
    grad.addColorStop(0,'#ff5a5a'); grad.addColorStop(0.5,'#5aff9a'); grad.addColorStop(1,'#5acaff');
    g.fillStyle=grad; g.fillRect(0,0,c.width,c.height);
    g.fillStyle='#222'; g.fillRect(160,80,140,100);
    const img=new Image();
    img.onload=()=>{ originalImg=img; drawPixelated(); statusEl.textContent='画像をタップして色を取得'; extractPalette();
      sel.x = Math.floor(canvas.width/2); sel.y = Math.floor(canvas.height/2); drawSelectionOverlay();
      pickAt({x:sel.x, y:sel.y}, false);
    };
    img.src=c.toDataURL('image/png');
  });

  // D&D（PC用だが無害）
  ['dragenter','dragover','dragleave','drop'].forEach(ev=>{
    dropArea.addEventListener(ev, e=>{ e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropArea.addEventListener('drop', e=>{
    const f=e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) handleFile(f);
  });

  // UI変更＋設定保存
  function saveSettings(){
    const data = {
      px: parseInt(pxSize.value,10),
      scale: parseFloat(scale.value),
      avg: parseInt(avg.value,10),
      grid: showGrid,
      loupe: !!loupeToggle.checked,
      speak: !!speakToggle.checked,
      cvd: cvdType.value,
      compare: parseFloat(compare.value),
    };
    try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(data)); }catch{}
  }
  function loadSettings(){
    try{
      const j = localStorage.getItem(SETTINGS_KEY); if(!j) return;
      const s = JSON.parse(j);
      if(s.px)    pxSize.value = s.px;
      if(s.scale) scale.value  = s.scale;
      if(s.avg)   avg.value    = s.avg;
      if(typeof s.grid==='boolean'){ showGrid = s.grid; btnGrid.textContent = showGrid?'グリッドON':'グリッドOFF'; }
      if(typeof s.loupe==='boolean') loupeToggle.checked = s.loupe;
      if(typeof s.speak==='boolean') speakToggle.checked= s.speak;
      if(s.cvd)   cvdType.value = s.cvd;
      if(typeof s.compare==='number') compare.value = s.compare;
    }catch{}
  }
  pxSize.addEventListener('input', ()=>{ updateLabels(); drawPixelated(); saveSettings(); });
  scale .addEventListener('input', ()=>{ updateLabels(); drawPixelated(); saveSettings(); });
  avg   .addEventListener('input',  ()=>{ updateLabels(); saveSettings(); });
  loupeToggle.addEventListener('change', ()=>{ saveSettings(); });
  speakToggle.addEventListener('change', ()=>{ saveSettings(); });
  btnGrid.addEventListener('click', ()=>{ showGrid=!showGrid; btnGrid.textContent = showGrid ? 'グリッドON' : 'グリッドOFF'; drawPixelated(); saveSettings(); });
  cvdType.addEventListener('change', ()=>{ compare.disabled = (cvdType.value==='none'); drawPixelated(); saveSettings(); });
  compare.addEventListener('input', ()=>{ drawPixelated(); saveSettings(); });
  
  // キャンバス操作（タップで確定 / スワイプでルーペ追随）
  canvas.addEventListener('pointerdown', (e)=>{ if(!canvas.width) return; const pt=canvasPoint(e); pickAt(pt); drawLoupe(pt); });
  canvas.addEventListener('pointermove', (e)=>{ if(!canvas.width) return; const pt=canvasPoint(e); drawLoupe(pt); });
  canvas.addEventListener('pointerleave', ()=>{ loupe.style.display='none'; });

  // 保存（ピクセル化PNG）
  btnSave.addEventListener('click', ()=>{
    if(!canvas.width) return;
    const a=document.createElement('a');
    a.download='pixelated.png';
    a.href=canvas.toDataURL('image/png');
    a.click();
  });

  // 履歴（localStorage）
  function loadHistory(){ try{ const j=localStorage.getItem(HISTORY_KEY); return j? JSON.parse(j):[]; }catch{ return []; } }
  function saveHistory(){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }catch{} }
  function addHistory(hex){
    hex = (hex||'').toUpperCase(); if(!/^#?[0-9A-F]{6}$/.test(hex)) return; if(hex[0]!=='#') hex = '#'+hex;
    history = [hex, ...history.filter(h=>h!==hex)].slice(0,20);
    saveHistory(); renderHistory();
  }
  function renderHistory(){
    historyBox.innerHTML='';
    history.forEach(hex=>{
      const b=document.createElement('button');
      b.className='p'; b.style.background=hex; b.title=`${hex}（タップでコピー／長押し削除／ダブルタップで適用）`; b.dataset.hex=hex;
      b.addEventListener('click', ()=>copy(hex));
      let t=null;
      b.addEventListener('pointerdown', ()=>{ t=setTimeout(()=>{ history=history.filter(h=>h!==hex); saveHistory(); renderHistory(); },600); });
      ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev, ()=>{ if(t){clearTimeout(t); t=null;} }));
      // ダブルタップ
      let last=0; b.addEventListener('click', ()=>{ const now=Date.now(); if(now-last<350){ const rgb=hexToRgb(hex); if(rgb) updateReadout(rgb[0],rgb[1],rgb[2]); } last=now; });
      historyBox.appendChild(b);
    });
  }

  // 共有
  btnShare.addEventListener('click', async ()=>{
    const hex = (hexEl.textContent||'').trim();
    if(!/^#[0-9A-F]{6}$/i.test(hex)) return alert('まず画像をタップして色を選んでください');
    const text = `選択色 ${hex} ${location.href}`;
    if(navigator.share){
      try{ await navigator.share({ title:'Pixel Picker', text }); }catch{}
    }else{
      try{ await navigator.clipboard.writeText(text); alert('共有非対応のためテキストをコピーしました'); }catch{ alert('コピーに失敗'); }
    }
  });

  // 色タイルPNG
  btnTile.addEventListener('click', ()=>{
    const hex = (hexEl.textContent||'').trim();
    if(!/^#[0-9A-F]{6}$/i.test(hex)) return alert('まず画像をタップして色を選んでください');
    const size = 512;
    const c=document.createElement('canvas'); c.width=size; c.height=size;
    const g=c.getContext('2d');
    const rgbArr=hexToRgb(hex);
    g.fillStyle=hex; g.fillRect(0,0,size,size);
    const cw = contrastRatio(rgbArr, [255,255,255]);
    const fg = cw>=4.5? '#000':'#FFF'; // 背景が白ベースなので、コントラスト比4.5以上で黒文字、未満で白文字
    g.fillStyle=fg; g.font='bold 48px system-ui, -apple-system, Segoe UI, Roboto';
    g.textAlign='center'; g.textBaseline='middle';
    g.fillText(hex, size/2, size/2);
    const a=document.createElement('a');
    a.download=`color_${hex.replace('#','')}.png`;
    a.href=c.toDataURL('image/png'); a.click();
  });

  // パレット抽出（簡易K-means）
  btnPalette.addEventListener('click', extractPalette);
  function extractPalette(K=5){
    paletteBox.innerHTML='';
    if(!canvas.width){ return; }
    const maxSide=120;
    const sCanvas=document.createElement('canvas');
    const ratio=Math.min(maxSide/canvas.width, maxSide/canvas.height, 1);
    sCanvas.width=Math.max(1,Math.round(canvas.width*ratio));
    sCanvas.height=Math.max(1,Math.round(canvas.height*ratio));
    const sctx=sCanvas.getContext('2d');
    sctx.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,sCanvas.width,sCanvas.height);
    const id=sctx.getImageData(0,0,sCanvas.width,sCanvas.height);
    const pts=[];
    for(let i=0;i<id.data.length;i+=4){
      const a=id.data[i+3]; if(a<10) continue;
      pts.push([id.data[i],id.data[i+1],id.data[i+2]]);
    }
    if(pts.length===0) return;

    const centers=[]; const used=new Set();
    while(centers.length<K && centers.length<pts.length){
      const idx=Math.floor(Math.random()*pts.length);
      if(used.has(idx)) continue; used.add(idx); centers.push(pts[idx].slice());
    }
    const iters=8; const assign=new Array(pts.length).fill(0);
    for(let t=0;t<iters;t++){
      for(let i=0;i<pts.length;i++){
        let bi=0,bd=1e12;
        for(let k=0;k<centers.length;k++){
          const d=dist2(pts[i],centers[k]); if(d<bd){ bd=d; bi=k; }
        }
        assign[i]=bi;
      }
      const sum=Array.from({length:centers.length},()=>[0,0,0,0]);
      for(let i=0;i<pts.length;i++){
        const k=assign[i]; sum[k][0]+=pts[i][0]; sum[k][1]+=pts[i][1]; sum[k][2]+=pts[i][2]; sum[k][3]++;
      }
      for(let k=0;k<centers.length;k++){
        if(sum[k][3]===0) continue;
        centers[k][0]=Math.round(sum[k][0]/sum[k][3]);
        centers[k][1]=Math.round(sum[k][1]/sum[k][3]);
        centers[k][2]=Math.round(sum[k][2]/sum[k][3]);
      }
    }
    const counts=new Array(centers.length).fill(0);
    for(let i=0;i<pts.length;i++) counts[assign[i]]++;
    const order=centers.map((c,i)=>({c,i,n:counts[i]})).sort((a,b)=>b.n-a.n);

    order.slice(0,K).forEach(({c})=>{
      const hex=rgbToHex(c[0],c[1],c[2]);
      const b=makeSwatch(hex);
      // ダブルタップで適用
      let last=0; b.addEventListener('click', ()=>{ const now=Date.now(); if(now-last<350){ updateReadout(c[0],c[1],c[2]); } last=now; });
      paletteBox.appendChild(b);
    });

    function dist2(a,b){ const dx=a[0]-b[0], dy=a[1]-b[1], dz=a[2]-b[2]; return dx*dx+dy*dy+dz*dz; }
  }

  // 音声
  function speakColor(name, hex){
    try{
      if(!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const uttr = new SpeechSynthesisUtterance(`${name}、${hex} です`);
      uttr.lang = 'ja-JP';
      const voices = window.speechSynthesis.getVoices();
      const jp = voices.find(v=>/ja/i.test(v.lang||v.name)); if(jp) uttr.voice = jp;
      window.speechSynthesis.speak(uttr);
    }catch{}
  }
  btnSpeak.addEventListener('click', ()=>{
    const name = (nameChip.textContent||'').replace(/^色名:\s*/,'').trim();
    const hex  = (hexEl.textContent||'').trim();
    if(!/^#[0-9A-F]{6}$/i.test(hex)) return alert('まず画像をタップして色を選んでください');
    speakColor(name||'色', hex);
  });

  // コピー
  async function copy(t){ try{ await navigator.clipboard.writeText(t); alert('コピーしました'); }catch{ alert('コピーに失敗'); } }
  copyHexBtn.addEventListener('click', ()=>copy(hexEl.textContent));
  copyRgbBtn.addEventListener('click', ()=>copy(rgbEl.textContent));
  copyHslBtn.addEventListener('click', ()=>copy(hslEl.textContent));
  copyCssBtn.addEventListener('click', ()=>copy(cssEl.textContent));

  // 初期化
  function init(){
    loadSettings(); updateLabels(); renderHistory();
    compare.disabled = (cvdType.value==='none');
    // 初期表示としてデフォルトの読み取り結果をクリア
    updateReadout(0, 0, 0, false); 
  }
  if(canvas) init();
})();