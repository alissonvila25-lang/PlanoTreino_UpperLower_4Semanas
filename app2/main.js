const state = {
  week: 1,
  day: 'Segunda',
  plan: [],
  techniques: [],
  view: 'treino',
  session: { active: false, index: 0, list: [] },
  autoAdvance: false,
  theme: 'dark',
  vibrate: true,
  beep: true,
  wakeLock: false,
};

const els = {
  week: document.getElementById('week-select'),
  day: document.getElementById('day-select'),
  exerciseList: document.getElementById('exercise-list'),
  techList: document.getElementById('tech-list'),
  summary: document.getElementById('summary'),
  summaryImport: document.getElementById('summary-import'),
  summaryExport: document.getElementById('summary-export'),
  summaryExportCsv: document.getElementById('summary-export-csv'),
  sessionDay: document.getElementById('session-day'),
  sessionWeek: document.getElementById('session-week'),
  sessionStart: document.getElementById('session-start'),
  sessionPrev: document.getElementById('session-prev'),
  sessionNext: document.getElementById('session-next'),
  sessionEnd: document.getElementById('session-end'),
  sessionComplete: document.getElementById('session-complete'),
  sessionBody: document.getElementById('session-body'),
  sessionProgress: document.getElementById('session-progress'),
  timerPanel: document.querySelector('.timer-panel'),
  timerDisplay: document.querySelector('.timer-display'),
  timerToggle: document.getElementById('timer-toggle'),
  headerTimer: document.getElementById('header-timer'),
  themeToggle: document.getElementById('theme-toggle'),
  timerStart: document.getElementById('timer-start'),
  timerPause: document.getElementById('timer-pause'),
  timerReset: document.getElementById('timer-reset'),
  timerPresets: document.querySelectorAll('.timer-presets [data-seconds]'),
  timerFull: document.getElementById('timer-fullscreen'),
  timerApplyCurrent: document.getElementById('timer-apply-current-rest'),
  vibrateToggle: document.getElementById('vibrate-toggle'),
  beepToggle: document.getElementById('beep-toggle'),
  wakeToggle: document.getElementById('wakelock-toggle'),
  sessionAutoAdvance: document.getElementById('session-auto-advance'),
};

// Navegação entre abas
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');
    const targetId = `tab-${btn.dataset.tab}`;
    const target = document.getElementById(targetId);
    if (target) target.classList.add('is-active');
    state.view = btn.dataset.tab;
    render();
  });
});


// Storage
function keyFor(id, week, field){ return `app2:${id}:S${week}:${field}`; }
function getEntry(id, week){
  return {
    carga: localStorage.getItem(keyFor(id,week,'carga')) || '',
    reps: localStorage.getItem(keyFor(id,week,'reps')) || '',
    done: localStorage.getItem(keyFor(id,week,'done')) === '1',
    rpe: localStorage.getItem(keyFor(id,week,'rpe')) || '',
    rir: localStorage.getItem(keyFor(id,week,'rir')) || '',
    nota: localStorage.getItem(keyFor(id,week,'nota')) || ''
  };
}
function setEntry(id, week, field, value){ localStorage.setItem(keyFor(id,week,field), value); }
function listAllStateKeys(){ const keys = []; for (let i=0; i<localStorage.length; i++){ const k = localStorage.key(i); if (k && k.startsWith('app2:')) keys.push(k); } return keys; }
function exportData(){
  const data = { version: 1, exportedAt: new Date().toISOString(), entries: {} };
  for (const k of listAllStateKeys()) {
    // Excluir campos opcionais de RPE/RIR do export JSON
    if (/:S\d+:(rpe|rir)$/i.test(k)) continue;
    data.entries[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'app2-dados.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function exportDataCSV(){
  const map = new Map();
  const re = /^app2:(.+?):S(\d+):(carga|reps|nota|done|pr)$/i;
  for (const k of listAllStateKeys()){
    const m = String(k).match(re);
    if (!m) continue;
    const id = m[1]; const semana = parseInt(m[2],10)||0; const campo = m[3].toLowerCase();
    if (!id.includes('|') || semana < 1 || semana > 4) continue;
    const [dia, exercicio] = id.split('|');
    const key = `${id}|S${semana}`;
    if (!map.has(key)) map.set(key, { Dia: dia, Exercicio: exercicio, Semana: semana, Carga: '', Reps: '', Nota: '', Done: '', PR: '' });
    const row = map.get(key);
    if (campo === 'carga') row.Carga = localStorage.getItem(k) || '';
    else if (campo === 'reps') row.Reps = localStorage.getItem(k) || '';
    else if (campo === 'nota') row.Nota = localStorage.getItem(k) || '';
    else if (campo === 'done') row.Done = (localStorage.getItem(k) === '1') ? '1' : '';
    else if (campo === 'pr') row.PR = (localStorage.getItem(k) === '1') ? '1' : '';
  }
  const rows = Array.from(map.values()).sort((a,b)=>{
    if (a.Dia !== b.Dia) return a.Dia.localeCompare(b.Dia, 'pt-BR');
    if (a.Exercicio !== b.Exercicio) return a.Exercicio.localeCompare(b.Exercicio, 'pt-BR');
    return a.Semana - b.Semana;
  });
  const header = ['Dia','Exercicio','Semana','Carga','Reps','Nota','Done','PR'];
  const esc = s => {
    const str = String(s ?? '');
    return (/[",\n\r]/.test(str)) ? '"' + str.replace(/"/g,'""') + '"' : str;
  };
  const lines = [header.join(',')];
  for (const r of rows){
    lines.push([r.Dia, r.Exercicio, r.Semana, r.Carga, r.Reps, r.Nota, r.Done, r.PR].map(esc).join(','));
  }
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'app2-dados.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function getCaseInsensitive(obj, key){
  const lk = String(key).toLowerCase();
  for (const k of Object.keys(obj||{})){ if (String(k).toLowerCase() === lk) return obj[k]; }
  return undefined;
}
function tryImportFlexible(obj){
  let count = 0;
  // Format 1: { entries: { 'app2:...': value } }
  if (obj && typeof obj === 'object' && obj.entries && typeof obj.entries === 'object'){
    Object.entries(obj.entries).forEach(([k,v])=>{ if (String(k).startsWith('app2:')) { localStorage.setItem(k, String(v)); count++; } });
    return { count };
  }
  // Format 2: { 'app2:...': value, ... }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)){
    for (const [k,v] of Object.entries(obj)){
      if (String(k).startsWith('app2:')) { localStorage.setItem(k, String(v)); count++; }
      else if (String(k).startsWith('plano4s:')) {
        const kk = String(k);
        // theme/autoAdvance globals
        const g = kk.match(/^plano4s:(theme|autoAdvance)$/i);
        if (g){ localStorage.setItem(`app2:${g[1]}`, String(v)); count++; continue; }
        // plano4s:<Dia>|<Exercicio>:S<week>:<field>
        const m = kk.match(/^plano4s:(.+?):S(\d+):(carga|reps|nota|done|pr)$/i);
        if (m){
          const id = m[1]; const w = parseInt(m[2],10)||0; const field = m[3].toLowerCase();
          if (w>=1 && w<=4){
            if (field === 'done'){ localStorage.setItem(keyFor(id,w,'done'), (v===true || String(v)==='1') ? '1' : '0'); count++; }
            else if (field === 'pr'){ localStorage.setItem(keyFor(id,w,'pr'), (v===true || String(v)==='1') ? '1' : '0'); count++; }
            else { localStorage.setItem(keyFor(id,w,field), String(v)); count++; }
          }
        }
      }
    }
    if (count>0) return { count };
  }
  // Format 2b: { version, exportedAt, data: { 'plano4s:...': value } }
  const dataObj = obj && (obj.data || obj.Data);
  if (dataObj && typeof dataObj === 'object'){
    for (const [k,v] of Object.entries(dataObj)){
      const kk = String(k);
      const g = kk.match(/^(?:plano4s|app2):(theme|autoAdvance)$/i);
      if (g){ localStorage.setItem(`app2:${g[1]}`, String(v)); count++; continue; }
      const m = kk.match(/^(?:plano4s|app2):(.+?):S(\d+):(carga|reps|nota|done|pr)$/i);
      if (m){
        const id = m[1]; const w = parseInt(m[2],10)||0; const field = m[3].toLowerCase();
        if (w>=1 && w<=4){
          if (field === 'done'){ localStorage.setItem(keyFor(id,w,'done'), (v===true || String(v)==='1') ? '1' : '0'); count++; }
          else if (field === 'pr'){ localStorage.setItem(keyFor(id,w,'pr'), (v===true || String(v)==='1') ? '1' : '0'); count++; }
          else { localStorage.setItem(keyFor(id,w,field), String(v)); count++; }
        }
      }
    }
    if (count>0) return { count };
  }
  // Format 3: Array of exercise progress rows
  if (Array.isArray(obj)){
    for (const row of obj){
      const dia = getCaseInsensitive(row, 'Dia') || getCaseInsensitive(row,'day') || getCaseInsensitive(row,'dia');
      const exercicio = getCaseInsensitive(row, 'Exercicio') || getCaseInsensitive(row,'exercise') || getCaseInsensitive(row,'exercicio');
      if (!dia || !exercicio) continue;
      const id = `${sanitize(dia)}|${sanitize(exercicio)}`;
      for (let w=1; w<=4; w++){
        const carga = getCaseInsensitive(row, `Carga_S${w}`) || getCaseInsensitive(row, `carga_s${w}`);
        const reps = getCaseInsensitive(row, `Reps_S${w}`) || getCaseInsensitive(row, `reps_s${w}`);
        const nota = getCaseInsensitive(row, `Nota_S${w}`) || getCaseInsensitive(row, `nota_s${w}`) || getCaseInsensitive(row, `nota`);
        const done = getCaseInsensitive(row, `Done_S${w}`) || getCaseInsensitive(row, `done_s${w}`) || getCaseInsensitive(row, `done`);
        if (carga != null){ localStorage.setItem(keyFor(id,w,'carga'), String(carga)); count++; }
        if (reps != null){ localStorage.setItem(keyFor(id,w,'reps'), String(reps)); count++; }
        if (nota != null){ localStorage.setItem(keyFor(id,w,'nota'), String(nota)); count++; }
        if (done != null){ localStorage.setItem(keyFor(id,w,'done'), (done===true || String(done)==='1') ? '1' : '0'); count++; }
      }
    }
    if (count>0) return { count };
  }
  // Format 4: { '<Dia>|<Exercicio>': { S1: {carga,reps,nota,done}, ... } }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)){
    for (const [id,val] of Object.entries(obj)){
      if (!String(id).includes('|')) continue;
      for (let w=1; w<=4; w++){
        const wk = val && (val[`S${w}`] || val[`s${w}`]);
        if (!wk) continue;
        if (wk.carga != null){ localStorage.setItem(keyFor(id,w,'carga'), String(wk.carga)); count++; }
        if (wk.reps != null){ localStorage.setItem(keyFor(id,w,'reps'), String(wk.reps)); count++; }
        if (wk.nota != null){ localStorage.setItem(keyFor(id,w,'nota'), String(wk.nota)); count++; }
        if (wk.done != null){ localStorage.setItem(keyFor(id,w,'done'), (wk.done===true || String(wk.done)==='1') ? '1' : '0'); count++; }
      }
    }
    if (count>0) return { count };
  }
  throw new Error('Formato inválido: nenhum dado reconhecido');
}
function importDataFromFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      const res = tryImportFlexible(obj);
      alert(`Dados importados: ${res.count} entradas.`);
      render();
    } catch (e){ alert('Falha ao importar: ' + e.message); }
  };
  reader.readAsText(file);
}

function sanitize(s){ return s == null ? '' : String(s); }
function slugify(text){ return sanitize(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

// CSV loader (robust paths)
async function fetchCsv(paths){
  for (const p of paths){
    try { const r = await fetch(p); if (r.ok) return r.text(); } catch {}
  }
  throw new Error('Falha ao carregar CSV');
}
async function loadCSVs(){
  let planTextFull = await fetchCsv(['../plano-4-semanas.csv','./plano-4-semanas.csv','/plano-4-semanas.csv']);
  // Usa apenas o bloco detalhado (com Carga_S1...) para evitar linhas antigas/duplicadas
  const idxCarga = planTextFull.indexOf('Carga_S1');
  const planText = idxCarga > -1 ? planTextFull.slice(planTextFull.lastIndexOf('\n', idxCarga) + 1) : planTextFull;
  const techText = await fetchCsv(['../tecnicas.csv','./tecnicas.csv','/tecnicas.csv']);
  const planRaw = Papa.parse(planText, { header: true, skipEmptyLines: true }).data;
  const plan = planRaw.map((r, i) => ({ ...r, _row: i }));
  const techniques = Papa.parse(techText, { header: true, skipEmptyLines: true }).data;
  state.plan = plan
    .filter(r => sanitize(r.Dia) && sanitize(r.Exercicio))
    .map(r => ({
      ...r,
      _id: `${sanitize(r.Dia)}|${sanitize(r.Exercicio)}`
    }));
  // Filtra apenas técnicas válidas (GERxx com Nome/Como executar)
  state.techniques = techniques.filter(t => {
    const ger = sanitize(t.GER);
    const nome = sanitize(t.Nome);
    const como = sanitize(t["Como executar"]);
    return /^GER\d+$/i.test(ger) && nome && como;
  }).map(t => ({ ...t }));
}

// Timer
let remaining = 0; let running = false; let rafId = 0; let lastTs = 0;
function fmt(sec){ const s = Math.max(0, Math.round(sec)); const m = Math.floor(s/60).toString().padStart(2,'0'); const r = (s%60).toString().padStart(2,'0'); return `${m}:${r}`; }
function updateTimer(){ els.timerDisplay.textContent = fmt(remaining); if (els.headerTimer) els.headerTimer.textContent = fmt(remaining); }
function vibrate(pattern){ if (!state.vibrate) return; try { if (navigator && typeof navigator.vibrate === 'function') { navigator.vibrate(pattern || [250, 125, 250]); } } catch(e) { /* noop */ } }
function beep(){
  if (!state.beep) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880; // A5
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    o.start();
    // fade out
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.stop(ctx.currentTime + 0.3);
    o.onended = () => ctx.close();
  } catch(e) { /* noop */ }
}
function tick(ts){
  if(!running) return;
  if(!lastTs) lastTs = ts; const dt = (ts-lastTs)/1000; lastTs = ts; remaining -= dt;
  if(remaining<=0){
    remaining=0; running=false; updateTimer(); cancelAnimationFrame(rafId);
    if (els.headerTimer) els.headerTimer.classList.remove('timer-running');
    vibrate([200,100,200]);
    beep();
    // Auto-avançar ao terminar o timer, se ativo na Sessão
    if (state.view === 'sessao' && state.session.active && state.autoAdvance) {
      if (state.session.index < state.session.list.length - 1) { state.session.index++; renderSessao(); }
    }
    return;
  }
  updateTimer(); rafId = requestAnimationFrame(tick);
}
function setSeconds(s){ remaining = s; updateTimer(); }
function start(){ if(remaining<=0 || running) return; running = true; lastTs = 0; cancelAnimationFrame(rafId); if (els.headerTimer) els.headerTimer.classList.add('timer-running'); rafId = requestAnimationFrame(tick); }
function pause(){ running = false; cancelAnimationFrame(rafId); if (els.headerTimer) els.headerTimer.classList.remove('timer-running'); }
function reset(){ pause(); remaining = 0; updateTimer(); if (els.headerTimer) els.headerTimer.classList.remove('timer-running'); }
els.timerToggle.addEventListener('click', ()=>{ els.timerPanel.hidden = !els.timerPanel.hidden; });
if (els.headerTimer) els.headerTimer.addEventListener('click', ()=>{
  els.timerPanel.hidden = !els.timerPanel.hidden;
  if (!els.timerPanel.hidden && window.innerWidth <= 520) {
    const wrap = document.getElementById('timer');
    if (wrap && typeof wrap.scrollIntoView === 'function') {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});
if (els.timerApplyCurrent) els.timerApplyCurrent.addEventListener('click', ()=>{
  const ex = state.session && state.session.active ? state.session.list[state.session.index] : null;
  let secs = 120;
  if (ex) {
    const m = String(ex.Pausa||'').match(/(\d+):(\d+)/);
    if (m) secs = (parseInt(m[1],10)||0)*60 + (parseInt(m[2],10)||0);
  }
  setSeconds(secs); start(); els.timerPanel.hidden = false;
});
els.timerStart.addEventListener('click', start);
els.timerPause.addEventListener('click', pause);
els.timerReset.addEventListener('click', reset);
// Editable presets: load, apply and edit via long-press
const defaultPresets = [120, 90, 60];
function loadPresets(){
  return [
    parseInt(localStorage.getItem('app2:preset1')||defaultPresets[0],10)||defaultPresets[0],
    parseInt(localStorage.getItem('app2:preset2')||defaultPresets[1],10)||defaultPresets[1],
    parseInt(localStorage.getItem('app2:preset3')||defaultPresets[2],10)||defaultPresets[2],
  ];
}
function labelFor(sec){ const m = Math.floor(sec/60); const s = sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
function applyPresetLabels(){
  const vals = loadPresets();
  els.timerPresets.forEach((b,i)=>{ const v = vals[i] ?? defaultPresets[i]; b.dataset.seconds = String(v); b.textContent = labelFor(v); });
}
applyPresetLabels();
function parseTimeInput(str){
  const s = String(str||'').trim();
  const mmss = s.match(/^([0-9]+)\s*[:\-]\s*([0-9]{1,2})$/);
  if (mmss){ return (parseInt(mmss[1],10)||0)*60 + (parseInt(mmss[2],10)||0); }
  const n = parseInt(s,10);
  if (!isNaN(n) && n>=0) return n;
  return null;
}
function editPreset(i){
  const current = loadPresets()[i] ?? defaultPresets[i];
  const input = prompt('Novo tempo para o preset (mm:ss ou segundos):', labelFor(current));
  const secs = parseTimeInput(input);
  if (secs == null) { alert('Valor inválido. Use mm:ss ou número de segundos.'); return; }
  localStorage.setItem(`app2:preset${i+1}`, String(secs));
  applyPresetLabels();
}
els.timerPresets.forEach((b,i)=>{
  // Aplicar
  b.addEventListener('click', ()=> setSeconds(Number(b.dataset.seconds)));
  // Editar via long-press
  let pressTimer = null;
  const start = ()=>{ clearTimeout(pressTimer); pressTimer = setTimeout(()=> editPreset(i), 650); };
  const cancel = ()=>{ clearTimeout(pressTimer); };
  b.addEventListener('mousedown', start);
  b.addEventListener('mouseup', cancel);
  b.addEventListener('mouseleave', cancel);
  b.addEventListener('touchstart', start, { passive: true });
  b.addEventListener('touchend', cancel);
  // Editar via contexto (desktop)
  b.addEventListener('contextmenu', (e)=>{ e.preventDefault(); editPreset(i); });
});
setSeconds(120);

// Tema (Claro/Escuro)
function applyTheme(theme){ state.theme = theme; const isLight = theme === 'light'; document.body.classList.toggle('light', isLight); localStorage.setItem('app2:theme', theme); if (els.themeToggle) els.themeToggle.textContent = isLight ? 'Tema: Claro' : 'Tema: Escuro'; }
if (els.themeToggle) els.themeToggle.addEventListener('click', ()=>{ applyTheme(state.theme === 'light' ? 'dark' : 'light'); });
// Fullscreen toggle
if (els.timerFull) {
  const timerEl = document.getElementById('timer');
  els.timerFull.addEventListener('click', async ()=>{
    try {
      if (!document.fullscreenElement) {
        if (timerEl && timerEl.requestFullscreen) await timerEl.requestFullscreen({ navigationUI: 'hide' });
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
      }
    } catch(e) { /* noop */ }
  });
}

// Auto-avançar preferência
function applyAutoAdvance(val){ state.autoAdvance = !!val; localStorage.setItem('app2:autoAdvance', state.autoAdvance ? '1' : '0'); if (els.sessionAutoAdvance) els.sessionAutoAdvance.checked = state.autoAdvance; }
if (els.sessionAutoAdvance) els.sessionAutoAdvance.addEventListener('change', (e)=> applyAutoAdvance(e.target.checked));
if (els.summaryExport) els.summaryExport.addEventListener('click', exportData);
if (els.summaryExportCsv) els.summaryExportCsv.addEventListener('click', exportDataCSV);
if (els.summaryImport) els.summaryImport.addEventListener('click', ()=>{
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
  input.addEventListener('change', ()=>{ if (input.files && input.files[0]) importDataFromFile(input.files[0]); });
  input.click();
});

// Vibrate preference toggle
function applyVibrate(val){ state.vibrate = !!val; localStorage.setItem('app2:vibrate', state.vibrate ? '1' : '0'); if (els.vibrateToggle) els.vibrateToggle.checked = state.vibrate; }
if (els.vibrateToggle) els.vibrateToggle.addEventListener('change', (e)=> applyVibrate(e.target.checked));

// Beep preference toggle
function applyBeep(val){ state.beep = !!val; localStorage.setItem('app2:beep', state.beep ? '1' : '0'); if (els.beepToggle) els.beepToggle.checked = state.beep; }
if (els.beepToggle) els.beepToggle.addEventListener('change', (e)=> applyBeep(e.target.checked));

// Wake Lock preference toggle
let wakeLockSentinel = null;
async function requestWakeLock(){
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', ()=>{ /* released */ });
    }
  } catch(e) {
    // Could be disallowed or unsupported
  }
}
async function releaseWakeLock(){
  try { if (wakeLockSentinel) { await wakeLockSentinel.release(); wakeLockSentinel = null; } } catch(e) {}
}
async function applyWakeLock(val){
  state.wakeLock = !!val; localStorage.setItem('app2:wakeLock', state.wakeLock ? '1' : '0'); if (els.wakeToggle) els.wakeToggle.checked = state.wakeLock;
  if (state.wakeLock) { await requestWakeLock(); } else { await releaseWakeLock(); }
}
if (els.wakeToggle) els.wakeToggle.addEventListener('change', (e)=> applyWakeLock(e.target.checked));

// Reacquire wake lock on visibility change if enabled
document.addEventListener('visibilitychange', async ()=>{
  if (document.visibilityState === 'visible' && state.wakeLock) { await requestWakeLock(); }
});

// Renderers
function renderTreino(){
  const week = Number(state.week);
  const list = state.plan
    .filter(x => sanitize(x.Dia) === state.day)
    .sort((a,b)=> (a._row||0) - (b._row||0));
  els.exerciseList.innerHTML = '';
  if (!list.length){ els.exerciseList.innerHTML = '<div class="card">Nenhum exercício para o dia selecionado.</div>'; return; }
  for (const ex of list){
    const id = ex._id;
    const entry = getEntry(id, week);
    const cargaCsv = sanitize(ex[`Carga_S${week}`]);
    const repsCsv = sanitize(ex[`Reps_S${week}`]);

    const card = document.createElement('div'); card.className = 'card';
    const header = document.createElement('div'); header.className = 'ex-header';
    const titleWrap = document.createElement('div'); titleWrap.className = 'ex-title';
    const h3 = document.createElement('h3'); h3.textContent = `${sanitize(ex.Exercicio)} (${sanitize(ex.Grupo)})`;
    titleWrap.appendChild(h3); header.appendChild(titleWrap); card.appendChild(header);

    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `
      <span>${sanitize(ex.Protocolo)}</span>
      <span>Séries: ${sanitize(ex.SeriesBase)}</span>
      <span>Pausa: ${sanitize(ex.Pausa)}</span>
    `;
    card.appendChild(meta);


    const inputs = document.createElement('div'); inputs.className = 'inputs';
    const inputCarga = document.createElement('div'); inputCarga.className = 'input'; inputCarga.innerHTML = `<label>Carga S${week}</label>`;
    const cargaEl = document.createElement('input'); cargaEl.type = 'text'; cargaEl.placeholder = cargaCsv || 'ex: 40kg'; cargaEl.value = entry.carga || '';
    cargaEl.addEventListener('change', ()=> setEntry(id, week, 'carga', cargaEl.value)); inputCarga.appendChild(cargaEl);
    const inputReps = document.createElement('div'); inputReps.className = 'input'; inputReps.innerHTML = `<label>Reps S${week}</label>`;
    const repsEl = document.createElement('input'); repsEl.type = 'text'; repsEl.placeholder = repsCsv || 'ex: 6-8'; repsEl.value = entry.reps || '';
    repsEl.addEventListener('change', ()=> setEntry(id, week, 'reps', repsEl.value)); inputReps.appendChild(repsEl);
    inputs.appendChild(inputCarga); inputs.appendChild(inputReps);
    const inputNota = document.createElement('div'); inputNota.className = 'input'; inputNota.innerHTML = `<label>Nota S${week}</label>`;
    const notaEl = document.createElement('textarea'); notaEl.rows = 2; notaEl.placeholder = 'observações curtas'; notaEl.value = entry.nota || '';
    notaEl.addEventListener('change', ()=> setEntry(id, week, 'nota', notaEl.value)); inputNota.appendChild(notaEl);
    inputs.appendChild(inputNota);
    card.appendChild(inputs);

    const actions = document.createElement('div'); actions.className = 'actions';
    const done = document.createElement('input'); done.type = 'checkbox'; done.className = 'complete-toggle'; done.checked = entry.done;
    done.addEventListener('change', ()=> setEntry(id, week, 'done', done.checked ? '1' : '0'));
    const lbl = document.createElement('label'); lbl.style.fontSize = '12px'; lbl.style.color = 'var(--muted)'; lbl.textContent = 'Concluído';
    actions.appendChild(done); actions.appendChild(lbl);
    // Pausa apenas na Sessão; remover do Treino
    card.appendChild(actions);

    els.exerciseList.appendChild(card);
  }
}

function renderTecnicas(){
  els.techList.innerHTML = '';
  if (!state.techniques || !state.techniques.length){ els.techList.innerHTML = '<div class="card">Técnicas não carregadas.</div>'; return; }
  for (const t of state.techniques){
    const card = document.createElement('div'); card.className = 'card';
    const h3 = document.createElement('h3'); h3.textContent = `${sanitize(t.GER)} · ${sanitize(t.Nome)}`; card.appendChild(h3);
    const meta = document.createElement('div'); meta.className = 'meta'; meta.innerHTML = `<span>${sanitize(t["Como executar"])}</span>`; card.appendChild(meta);
    const note = document.createElement('div'); note.className = 'note'; note.innerHTML = `<strong>Descanso:</strong> ${sanitize(t.Descanso)} • <strong>Progresso:</strong> ${sanitize(t.Progresso)}`; card.appendChild(note);
    els.techList.appendChild(card);
  }
}

function parseLoad(s){ if(!s) return null; const m = String(s).match(/([0-9]+(?:\.[0-9]+)?)(\s*(kg|lb))?/i); if(!m) return null; return { value: parseFloat(m[1]), unit: (m[3]||'').toLowerCase() }; }
function keyFor(id, week, field){ return `app2:${id}:S${week}:${field}`; }
function bestPreviousLoad(exId, uptoWeek){ let best = null; for(let w=1; w<uptoWeek; w++){ const e = getEntry(exId, w); const p = parseLoad(e.carga); if(p){ if(!best || p.value > best.value) best = p; } } return best; }
function markPRIfAny(exId, week, cargaStr){ const now = parseLoad(cargaStr); if(!now) return false; const best = bestPreviousLoad(exId, week); const key = keyFor(exId, week, 'pr'); if(!best || now.value > best.value){ localStorage.setItem(key, '1'); return true; } else { localStorage.removeItem(key); return false; } }
function hasPR(exId, week){ return localStorage.getItem(keyFor(exId, week, 'pr')) === '1'; }

function renderResumo(){
  const week = Number(state.week);
  els.summary.innerHTML = '';
  // PR chart
  const prCounts = [0,0,0,0];
  for (const ex of state.plan){ for(let w=1; w<=4; w++){ if (hasPR(ex._id, w)) prCounts[w-1]++; } }
  const maxPr = Math.max(1, ...prCounts);
  const chartCard = document.createElement('div'); chartCard.className = 'card';
  const h3c = document.createElement('h3'); h3c.textContent = 'PRs por semana'; chartCard.appendChild(h3c);
  const chart = document.createElement('div'); chart.className = 'chart';
  prCounts.forEach((cnt,i)=>{
    const row = document.createElement('div'); row.className = 'chart-row';
    const label = document.createElement('div'); label.className = 'chart-label'; label.textContent = `S${i+1}`; row.appendChild(label);
    const barWrap = document.createElement('div'); barWrap.className = 'chart-bar-wrap';
    const bar = document.createElement('div'); bar.className = 'chart-bar'; bar.style.width = `${Math.round((cnt/maxPr)*100)}%`; barWrap.appendChild(bar); row.appendChild(barWrap);
    const value = document.createElement('div'); value.className = 'chart-value'; value.textContent = String(cnt); row.appendChild(value);
    chart.appendChild(row);
  });
  if (prCounts.every(c => c === 0)){ const msg = document.createElement('div'); msg.className = 'note'; msg.textContent = 'Sem PRs registrados ainda.'; chartCard.appendChild(msg); }
  chartCard.appendChild(chart);
  els.summary.appendChild(chartCard);

  const byDay = {};
  for (const ex of state.plan){
    const id = ex._id; const day = sanitize(ex.Dia); const e = getEntry(id, week);
    if (!byDay[day]) byDay[day] = [];
    if (e.carga || e.reps || e.done || e.nota){ byDay[day].push({ ex, e }); }
  }
  Object.keys(byDay).forEach(day => {
    const section = document.createElement('div'); section.className = 'card';
    const h3 = document.createElement('h3'); h3.textContent = day; section.appendChild(h3);
    const items = byDay[day].sort((a,b)=> (a.ex._row||0) - (b.ex._row||0));
    for (const { ex, e } of items){
      const pr = hasPR(ex._id, week);
      const p = document.createElement('div'); p.className = 'meta';
      const parts = [];
      parts.push(`<span>${sanitize(ex.Exercicio)} ${pr ? '<span class=\"badge\">PR</span>' : ''}</span>`);
      parts.push(`<span>S${week} · Carga: ${e.carga || '-'} · Reps: ${e.reps || '-'}</span>`);
      if (e.rpe) parts.push(`<span>RPE: ${sanitize(e.rpe)}</span>`);
      if (e.rir) parts.push(`<span>RIR: ${sanitize(e.rir)}</span>`);
      parts.push(`<span>${e.done ? 'Concluído' : 'Pendente'}</span>`);
      if (e.nota) parts.push(`<span>Obs: ${sanitize(e.nota)}</span>`);
      p.innerHTML = parts.join(''); section.appendChild(p);
    }
    els.summary.appendChild(section);
  });
}

function renderSessao(){
  els.sessionDay.textContent = `Dia: ${state.day}`;
  els.sessionWeek.textContent = `Semana ${state.week}`;
  els.sessionBody.innerHTML = '';
  if (!state.session.active){
    if (els.timerApplyCurrent){ els.timerApplyCurrent.style.display = 'none'; }
    els.sessionBody.innerHTML = '<div class="card">Clique em "Iniciar sessão" para começar.</div>';
    els.sessionStart.disabled = false; els.sessionEnd.disabled = true;
    els.sessionPrev.disabled = true; els.sessionNext.disabled = true; els.sessionComplete.disabled = true;
    // Mostra controles da barra quando não está em sessão
    els.sessionPrev.style.display = '';
    els.sessionNext.style.display = '';
    els.sessionComplete.style.display = '';
    return;
  }
  els.sessionStart.disabled = true; els.sessionEnd.disabled = false;
  els.sessionPrev.disabled = state.session.index <= 0;
  els.sessionNext.disabled = state.session.index >= (state.session.list.length - 1);
  els.sessionComplete.disabled = false;
  els.sessionComplete.textContent = 'Concluir e Pausar';
  // Esconde botões da barra; controles estarão dentro do card
  els.sessionPrev.style.display = 'none';
  els.sessionNext.style.display = 'none';
  els.sessionComplete.style.display = 'none';
  if (els.sessionProgress) {
    const total = state.session.list.length;
    const current = Math.min(state.session.index + 1, total);
    els.sessionProgress.textContent = `Exercício ${current} de ${total}`;
  }
  if (!state.session.list || !state.session.list.length){
    els.sessionBody.innerHTML = '<div class="card">Nenhum exercício disponível para o dia selecionado.</div>';
    els.sessionPrev.disabled = true; els.sessionNext.disabled = true; els.sessionComplete.disabled = true; return;
  }
  const ex = state.session.list[state.session.index];
  if (els.timerApplyCurrent){
    let label = 'Pausa válida (2:00)';
    const mm = String(ex.Pausa||'').match(/(\d+):(\d+)/);
    if (mm){
      const mmv = String(mm[1]).padStart(1,'0');
      const ssv = String(mm[2]).padStart(2,'0');
      label = `Pausa válida (${mmv}:${ssv})`;
    }
    els.timerApplyCurrent.textContent = label;
    els.timerApplyCurrent.style.display = '';
  }
  const week = Number(state.week);
  const id = ex._id;
  const entry = getEntry(id, week);
  const cargaCsv = sanitize(ex[`Carga_S${week}`]);
  const repsCsv = sanitize(ex[`Reps_S${week}`]);
  const progress = document.createElement('div'); progress.className = 'meta';
  progress.textContent = `Exercício ${state.session.index + 1} de ${state.session.list.length}`;
  const bar = document.createElement('div'); bar.className = 'progress';
  const fill = document.createElement('span');
  fill.style.width = `${Math.round(((state.session.index + 1)/state.session.list.length)*100)}%`;
  bar.appendChild(fill);
  const card = document.createElement('div'); card.className = 'card session-card';
  const h3 = document.createElement('h3'); h3.textContent = `${sanitize(ex.Exercicio)} (${sanitize(ex.Grupo)})`;
  if (hasPR(id, week)){
    const b = document.createElement('span'); b.className = 'badge'; b.textContent = 'PR'; b.style.marginLeft = '8px'; h3.appendChild(b);
  }
  card.appendChild(h3);
  // Imagem removida para evitar distração e bugs; podemos reativar depois

  // Meta badges
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.innerHTML = `
    <span>${sanitize(ex.Protocolo)}</span>
    <span>Séries: ${sanitize(ex.SeriesBase)}</span>
    <span>Pausa: ${sanitize(ex.Pausa)}</span>
  `;
  card.appendChild(meta);

  // Stage controls
  try {
    const group = sanitize(ex.Grupo);
    const { warmupTarget, prepMin, prepMax } = parseSeriesMeta(ex.SeriesBase);
    const stage = document.createElement('div'); stage.className = 'stage';
    if (warmupTarget > 0 && isFirstExerciseOfGroup(group, ex, state.session.list)) {
      const done = getWarmupCount(week, state.day, group);
      const row = document.createElement('div'); row.className = 'stage-row';
      const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = `Aquecimento: ${Math.min(done, warmupTarget)}/${warmupTarget}`; row.appendChild(hint);
      const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'Concluir aquecimento'; btn.disabled = done >= warmupTarget;
      btn.addEventListener('click', ()=>{ const n = Math.min(getWarmupCount(week, state.day, group) + 1, warmupTarget); setWarmupCount(week, state.day, group, n); const s = 60; setSeconds(s); start(); els.timerPanel.hidden = false; hint.textContent = `Aquecimento: ${n}/${warmupTarget}`; if (n >= warmupTarget) btn.disabled = true; reset.disabled = n <= 0; });
      row.appendChild(btn);
      const reset = document.createElement('button'); reset.className = 'btn btn-danger'; reset.textContent = 'Reset aquec.'; reset.disabled = done <= 0;
      reset.addEventListener('click', ()=>{ setWarmupCount(week, state.day, group, 0); hint.textContent = `Aquecimento: 0/${warmupTarget}`; btn.disabled = false; reset.disabled = true; });
      row.appendChild(reset);
      stage.appendChild(row);
    }
    if (prepMax > 0) {
      const doneP = getPrepCount(week, ex._id);
      const rowP = document.createElement('div'); rowP.className = 'stage-row';
      const hintP = document.createElement('span'); hintP.className = 'hint';
      const targetLabel = (prepMin && prepMax && prepMin !== prepMax) ? `${prepMin}-${prepMax}` : String(prepMax);
      hintP.textContent = `Preparatórias: ${Math.min(doneP, prepMax)}/${targetLabel}`; rowP.appendChild(hintP);
      const btnDone = document.createElement('button'); btnDone.className = 'btn'; btnDone.textContent = 'Concluir preparatória'; btnDone.disabled = doneP >= prepMax;
      btnDone.addEventListener('click', ()=>{ const n = Math.min(getPrepCount(week, ex._id) + 1, prepMax); setPrepCount(week, ex._id, n); const s = 90; setSeconds(s); start(); els.timerPanel.hidden = false; hintP.textContent = `Preparatórias: ${n}/${targetLabel}`; if (n >= prepMax) btnDone.disabled = true; btnReset.disabled = n <= 0; });
      rowP.appendChild(btnDone);
      const btnReset = document.createElement('button'); btnReset.className = 'btn btn-danger'; btnReset.textContent = 'Reset prep.'; btnReset.disabled = doneP <= 0;
      btnReset.addEventListener('click', ()=>{ setPrepCount(week, ex._id, 0); hintP.textContent = `Preparatórias: 0/${targetLabel}`; btnDone.disabled = false; btnReset.disabled = true; }); rowP.appendChild(btnReset);
      if (prepMin > 0 && doneP < prepMin) {
        const btnSkip = document.createElement('button'); btnSkip.className = 'btn btn-danger'; btnSkip.textContent = 'Ir para válida';
        btnSkip.addEventListener('click', ()=>{ const n = Math.max(prepMin, getPrepCount(week, ex._id)); setPrepCount(week, ex._id, n); hintP.textContent = `Preparatórias: ${n}/${targetLabel}`; btnDone.disabled = n >= prepMax; btnSkip.disabled = true; btnReset.disabled = n <= 0; const s = 120; setSeconds(s); start(); els.timerPanel.hidden = false; });
        rowP.appendChild(btnSkip);
      }
      stage.appendChild(rowP);
    }
    if (stage.childElementCount) card.appendChild(stage);
  } catch(e){ console.error(e); }
  const inputs = document.createElement('div'); inputs.className = 'inputs inputs-compact';
  const inputCarga = document.createElement('div'); inputCarga.className = 'input'; inputCarga.innerHTML = `<label>Carga S${week}</label>`;
  const cargaEl = document.createElement('input'); cargaEl.type = 'text'; cargaEl.placeholder = cargaCsv || 'ex: 40kg'; cargaEl.value = entry.carga || '';
  cargaEl.addEventListener('change', ()=> setEntry(id, week, 'carga', cargaEl.value)); inputCarga.appendChild(cargaEl);
  const inputReps = document.createElement('div'); inputReps.className = 'input'; inputReps.innerHTML = `<label>Reps S${week}</label>`;
  const repsEl = document.createElement('input'); repsEl.type = 'text'; repsEl.placeholder = repsCsv || 'ex: 6-8'; repsEl.value = entry.reps || '';
  repsEl.addEventListener('change', ()=> setEntry(id, week, 'reps', repsEl.value)); inputReps.appendChild(repsEl);
  inputs.appendChild(inputCarga); inputs.appendChild(inputReps);
  // RPE/RIR opcionais
  const inputRpe = document.createElement('div'); inputRpe.className = 'input'; inputRpe.innerHTML = `<label>RPE (0-10)</label>`;
  const rpeEl = document.createElement('input'); rpeEl.type = 'number'; rpeEl.min = '0'; rpeEl.max = '10'; rpeEl.step = '0.5'; rpeEl.placeholder = 'ex: 8'; rpeEl.value = entry.rpe || '';
  rpeEl.addEventListener('change', ()=> setEntry(id, week, 'rpe', rpeEl.value)); inputRpe.appendChild(rpeEl);
  const inputRir = document.createElement('div'); inputRir.className = 'input'; inputRir.innerHTML = `<label>RIR (0-5)</label>`;
  const rirEl = document.createElement('input'); rirEl.type = 'number'; rirEl.min = '0'; rirEl.max = '5'; rirEl.step = '1'; rirEl.placeholder = 'ex: 2'; rirEl.value = entry.rir || '';
  rirEl.addEventListener('change', ()=> setEntry(id, week, 'rir', rirEl.value)); inputRir.appendChild(rirEl);
  inputs.appendChild(inputRpe); inputs.appendChild(inputRir);
  card.appendChild(inputs);

  // Calculadora de anilhas
  const calcWrap = document.createElement('div'); calcWrap.className = 'calc-wrap';
  const calcBtn = document.createElement('button'); calcBtn.className = 'btn btn-small'; calcBtn.textContent = 'Calc. anilhas';
  const calcPanel = document.createElement('div'); calcPanel.className = 'calc-panel'; calcPanel.hidden = true;
  const prefUnits = (localStorage.getItem('app2:units') || 'kg').toLowerCase() === 'lb' ? 'lb' : 'kg';
  const prefBar = parseFloat(localStorage.getItem('app2:barWeight') || (prefUnits==='kg'? '20':'45')) || (prefUnits==='kg'?20:45);
  const prefPlates = (localStorage.getItem('app2:plates') || (prefUnits==='kg' ? '20,15,10,5,2.5,1.25' : '45,35,25,10,5,2.5'));
  calcPanel.innerHTML = `
    <div class="row">
      <label>Unidades</label>
      <select class="calc-units">
        <option value="kg" ${prefUnits==='kg'?'selected':''}>kg</option>
        <option value="lb" ${prefUnits==='lb'?'selected':''}>lb</option>
      </select>
    </div>
    <div class="row">
      <label>Peso da barra</label>
      <input type="number" class="calc-bar" value="${prefBar}" step="0.25" />
    </div>
    <div class="row">
      <label>Placas (maior→menor)</label>
      <input type="text" class="calc-plates" value="${prefPlates}" />
    </div>
    <div class="row">
      <button class="btn btn-small calc-run">Calcular</button>
    </div>
    <div class="result"></div>
  `;
  function parseNumberWithUnit(str){
    const s = String(str||'').trim();
    const m = s.match(/([0-9]+(?:\.[0-9]+)?)(?:\s*(kg|lb))?/i);
    if (!m) return { value: NaN, unit: prefUnits };
    const v = parseFloat(m[1]);
    const u = (m[2]||prefUnits).toLowerCase();
    return { value: v, unit: (u==='lb'?'lb':'kg') };
  }
  function toUnits(value, from, to){
    if (isNaN(value)) return NaN;
    if (from === to) return value;
    // 1 kg = 2.20462262 lb
    return to==='kg' ? (value / 2.20462262) : (value * 2.20462262);
  }
  function computePlates(total, bar, sizes){
    const perSide = (total - bar)/2;
    if (perSide <= 0) return { perSide, list: [], remainder: 0 };
    const list = [];
    let rem = perSide;
    for (const sz of sizes){
      const cnt = Math.floor((rem + 1e-9) / sz);
      if (cnt > 0){ list.push({ size: sz, count: cnt }); rem -= cnt * sz; }
    }
    return { perSide, list, remainder: rem };
  }
  function runCalc(){
    const resEl = calcPanel.querySelector('.result');
    const unitsSel = calcPanel.querySelector('.calc-units');
    const barEl = calcPanel.querySelector('.calc-bar');
    const platesEl = calcPanel.querySelector('.calc-plates');
    const units = unitsSel.value;
    const bar = parseFloat(barEl.value)||0;
    const sizes = String(platesEl.value||'').split(',').map(s=>parseFloat(s.trim())).filter(v=>!isNaN(v)).sort((a,b)=>b-a);
    localStorage.setItem('app2:units', units);
    localStorage.setItem('app2:barWeight', String(bar));
    localStorage.setItem('app2:plates', sizes.join(','));
    const parsed = parseNumberWithUnit(cargaEl.value);
    let target = parsed.value;
    let targetUnits = parsed.unit;
    if (isNaN(target)) { resEl.textContent = 'Informe a carga (ex: 60, 60kg, 135lb).'; return; }
    // converte alvo para unidades das preferências da calculadora
    target = toUnits(target, targetUnits, units);
    const { perSide, list, remainder } = computePlates(target, bar, sizes);
    const tol = units==='kg' ? 0.1 : 0.25;
    const lines = [];
    lines.push(`Alvo: ${target.toFixed(2)} ${units} | Barra: ${bar} ${units} | Por lado: ${perSide.toFixed(2)} ${units}`);
    if (perSide <= 0){ resEl.textContent = 'Alvo menor ou igual ao peso da barra.'; return; }
    if (!list.length){ resEl.textContent = 'Nenhuma placa aplicável.'; return; }
    const parts = list.map(it=> `${it.size}×${it.count}`);
    lines.push(`Por lado: ${parts.join(' + ')}`);
    if (remainder > tol){ lines.push(`Restante não coberto: ${remainder.toFixed(2)} ${units}`); }
    resEl.innerHTML = lines.map(l=>`<div>${l}</div>`).join('');
  }
  calcPanel.querySelector('.calc-run').addEventListener('click', runCalc);
  calcBtn.addEventListener('click', ()=>{ calcPanel.hidden = !calcPanel.hidden; if (!calcPanel.hidden) runCalc(); });
  calcWrap.appendChild(calcBtn); calcWrap.appendChild(calcPanel);
  card.appendChild(calcWrap);

  // Controles de navegação dentro do card
  const actionsCard = document.createElement('div'); actionsCard.className = 'actions session-controls';
  const btnPrev = document.createElement('button'); btnPrev.className = 'btn btn-prev'; btnPrev.textContent = 'Anterior'; btnPrev.disabled = state.session.index <= 0;
  btnPrev.addEventListener('click', () => { if (state.session.index > 0) { state.session.index--; renderSessao(); } });
  const btnComplete = document.createElement('button'); btnComplete.className = 'btn btn-complete'; btnComplete.textContent = 'Concluir e Pausar';
  btnComplete.addEventListener('click', () => {
    setEntry(id, week, 'done', '1');
    markPRIfAny(id, week, cargaEl.value);
    const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m ? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120;
    setSeconds(s); start(); els.timerPanel.hidden = false;
    if (state.session.index < state.session.list.length - 1){ state.session.index++; renderSessao(); }
  });
  const btnNext = document.createElement('button'); btnNext.className = 'btn btn-next'; btnNext.textContent = 'Próximo'; btnNext.disabled = state.session.index >= (state.session.list.length - 1);
  btnNext.addEventListener('click', () => { if (state.session.index < state.session.list.length - 1) { state.session.index++; renderSessao(); } });
  actionsCard.appendChild(btnPrev);
  actionsCard.appendChild(btnComplete);
  actionsCard.appendChild(btnNext);
  card.appendChild(actionsCard);
  const wrap = document.createElement('div');
  wrap.appendChild(progress);
  wrap.appendChild(bar);
  wrap.appendChild(card);
  // Garante somente um card por vez (sem empilhamento)
  els.sessionBody.replaceChildren(wrap);

  els.sessionComplete.onclick = () => {
    setEntry(id, week, 'done', '1');
    markPRIfAny(id, week, cargaEl.value);
    const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m ? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120;
    setSeconds(s); start(); els.timerPanel.hidden = false;
    // Avança imediatamente e evita empilhamento
    if (state.session.index < state.session.list.length - 1){ state.session.index++; renderSessao(); }
  };
}

function startSession(){
  const list = state.plan.filter(x => sanitize(x.Dia) === state.day).sort((a,b)=> (a._row||0) - (b._row||0));
  if (!list.length){ alert('Nenhum exercício para o dia selecionado.'); state.session.active = false; state.session.list = []; state.session.index = 0; renderSessao(); return; }
  state.session.active = true; state.session.list = list;
  const firstPending = list.findIndex(e => !getEntry(e._id, Number(state.week)).done);
  state.session.index = firstPending === -1 ? 0 : firstPending;
  renderSessao();
}
function endSession(){ state.session.active = false; state.session.list = []; state.session.index = 0; renderSessao(); }

// Controls
els.week.addEventListener('change', e => { state.week = Number(e.target.value); render(); });
els.day.addEventListener('change', e => { state.day = e.target.value; render(); });
els.sessionStart.addEventListener('click', startSession);
els.sessionEnd.addEventListener('click', endSession);
els.sessionPrev.addEventListener('click', () => { if (state.session.index > 0) { state.session.index--; renderSessao(); } });
els.sessionNext.addEventListener('click', () => { if (state.session.index < state.session.list.length - 1) { state.session.index++; renderSessao(); } });

function render(){
  if (state.view === 'treino') renderTreino();
  if (state.view === 'tecnicas') renderTecnicas();
  if (state.view === 'resumo') renderResumo();
  if (state.view === 'sessao') renderSessao();
}

(async function init(){
  try {
    await loadCSVs();
    // Inicializa preferências
    const savedTheme = localStorage.getItem('app2:theme');
    applyTheme(savedTheme === 'light' ? 'light' : 'dark');
    const savedAuto = localStorage.getItem('app2:autoAdvance') === '1';
    applyAutoAdvance(savedAuto);
    const savedVibrateStored = localStorage.getItem('app2:vibrate');
    applyVibrate((savedVibrateStored == null ? '1' : savedVibrateStored) === '1');
    const savedBeepStored = localStorage.getItem('app2:beep');
    applyBeep((savedBeepStored == null ? '1' : savedBeepStored) === '1');
    const savedWakeStored = localStorage.getItem('app2:wakeLock');
    await applyWakeLock((savedWakeStored == null ? '0' : savedWakeStored) === '1');
    render();
  } catch (e) {
    console.error(e);
    els.exerciseList.innerHTML = '<div class="card">Falha ao carregar CSVs.</div>';
  }
})();

// Helpers: aquecimento/prep + parsing
function parseSeriesMeta(seriesBase){
  const txt = sanitize(seriesBase||'');
  let warmupTarget = 0; let prepMin = 0, prepMax = 0;
  const mAq = txt.match(/Aquec\s*:?\s*(\d+)/i);
  if (mAq) warmupTarget = parseInt(mAq[1],10)||0;
  const mPrepRange = txt.match(/Prep\s*:?\s*(\d+)\s*[-–]\s*(\d+)/i);
  const mPrepX = txt.match(/Prep\s*:?\s*(\d+)\s*[x×]/i);
  if (mPrepRange){ prepMin = parseInt(mPrepRange[1],10)||0; prepMax = parseInt(mPrepRange[2],10)||prepMin; }
  else if (mPrepX){ prepMin = parseInt(mPrepX[1],10)||0; prepMax = prepMin; }
  if (/Prep/i.test(txt) && (prepMin===0 && prepMax===0)) { prepMin = 2; prepMax = 3; }
  return { warmupTarget, prepMin, prepMax };
}
function warmupKey(week, day, group){ return `app2:warmup:S${week}:${day}:${group}`; }
function getWarmupCount(week, day, group){ return parseInt(localStorage.getItem(warmupKey(week,day,group))||'0',10)||0; }
function setWarmupCount(week, day, group, n){ localStorage.setItem(warmupKey(week,day,group), String(n)); }
function prepKey(week, exId){ return `app2:prep:S${week}:${exId}`; }
function getPrepCount(week, exId){ return parseInt(localStorage.getItem(prepKey(week,exId))||'0',10)||0; }
function setPrepCount(week, exId, n){ localStorage.setItem(prepKey(week,exId), String(n)); }
function isFirstExerciseOfGroup(group, ex, list){ const firstIdx = list.findIndex(e => sanitize(e.Grupo) === group); const idx = list.findIndex(e => e._id === ex._id); return firstIdx !== -1 && idx === firstIdx; }
