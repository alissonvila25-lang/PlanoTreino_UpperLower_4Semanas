const state = {
  week: 1,
  day: 'Segunda',
  plan: [],
  techniques: [],
  view: 'treino',
  session: { active: false, index: 0, list: [] },
  autoAdvance: false,
  theme: 'dark',
};

const els = {
  week: document.getElementById('week-select'),
  day: document.getElementById('day-select'),
  exerciseList: document.getElementById('exercise-list'),
  techList: document.getElementById('tech-list'),
  summary: document.getElementById('summary'),
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
  sessionAutoAdvance: document.getElementById('session-auto-advance'),
};

// Tabs
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('is-active');
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
    nota: localStorage.getItem(keyFor(id,week,'nota')) || ''
  };
}
function setEntry(id, week, field, value){ localStorage.setItem(keyFor(id,week,field), value); }

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
  const planText = await fetchCsv(['../plano-4-semanas.csv','./plano-4-semanas.csv','/plano-4-semanas.csv']);
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
function tick(ts){
  if(!running) return;
  if(!lastTs) lastTs = ts; const dt = (ts-lastTs)/1000; lastTs = ts; remaining -= dt;
  if(remaining<=0){
    remaining=0; running=false; updateTimer(); cancelAnimationFrame(rafId);
    // Auto-avançar ao terminar o timer, se ativo na Sessão
    if (state.view === 'sessao' && state.session.active && state.autoAdvance) {
      if (state.session.index < state.session.list.length - 1) { state.session.index++; renderSessao(); }
    }
    return;
  }
  updateTimer(); rafId = requestAnimationFrame(tick);
}
function setSeconds(s){ remaining = s; updateTimer(); }
function start(){ if(remaining<=0 || running) return; running = true; lastTs = 0; cancelAnimationFrame(rafId); rafId = requestAnimationFrame(tick); }
function pause(){ running = false; cancelAnimationFrame(rafId); }
function reset(){ pause(); remaining = 0; updateTimer(); }
els.timerToggle.addEventListener('click', ()=>{ els.timerPanel.hidden = !els.timerPanel.hidden; });
if (els.headerTimer) els.headerTimer.addEventListener('click', ()=>{ els.timerPanel.hidden = !els.timerPanel.hidden; });
els.timerStart.addEventListener('click', start);
els.timerPause.addEventListener('click', pause);
els.timerReset.addEventListener('click', reset);
els.timerPresets.forEach(b => b.addEventListener('click', ()=> setSeconds(Number(b.dataset.seconds))));
setSeconds(120);

// Tema (Claro/Escuro)
function applyTheme(theme){ state.theme = theme; const isLight = theme === 'light'; document.body.classList.toggle('light', isLight); localStorage.setItem('app2:theme', theme); if (els.themeToggle) els.themeToggle.textContent = isLight ? 'Tema: Claro' : 'Tema: Escuro'; }
if (els.themeToggle) els.themeToggle.addEventListener('click', ()=>{ applyTheme(state.theme === 'light' ? 'dark' : 'light'); });

// Auto-avançar preferência
function applyAutoAdvance(val){ state.autoAdvance = !!val; localStorage.setItem('app2:autoAdvance', state.autoAdvance ? '1' : '0'); if (els.sessionAutoAdvance) els.sessionAutoAdvance.checked = state.autoAdvance; }
if (els.sessionAutoAdvance) els.sessionAutoAdvance.addEventListener('change', (e)=> applyAutoAdvance(e.target.checked));

// Renderers
function renderTreino(){
  const week = Number(state.week);
  const list = state.plan.filter(x => sanitize(x.Dia) === state.day);
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
  for (const ex of state.plan){ const id = ex._id; const day = sanitize(ex.Dia); const e = getEntry(id, week); if (!byDay[day]) byDay[day] = []; if (e.carga || e.reps || e.done || e.nota){ byDay[day].push({ ex, e }); } }
  Object.keys(byDay).forEach(day => {
    const section = document.createElement('div'); section.className = 'card';
    const h3 = document.createElement('h3'); h3.textContent = day; section.appendChild(h3);
    for (const { ex, e } of byDay[day]){
      const p = document.createElement('div'); p.className = 'meta'; p.innerHTML = `
        <span>${sanitize(ex.Exercicio)}</span>
        <span>S${week} · Carga: ${e.carga || '-'} · Reps: ${e.reps || '-'}</span>
        <span>${e.done ? 'Concluído' : 'Pendente'}</span>
        ${e.nota ? `<span>Obs: ${sanitize(e.nota)}</span>` : ''}
      `; section.appendChild(p);
    }
    els.summary.appendChild(section);
  });
}

function renderSessao(){
  els.sessionDay.textContent = `Dia: ${state.day}`;
  els.sessionWeek.textContent = `Semana ${state.week}`;
  els.sessionBody.innerHTML = '';
  if (!state.session.active){
    els.sessionBody.innerHTML = '<div class="card">Clique em "Iniciar sessão" para começar.</div>';
    els.sessionStart.disabled = false; els.sessionEnd.disabled = true;
    els.sessionPrev.disabled = true; els.sessionNext.disabled = true; els.sessionComplete.disabled = true;
    return;
  }
  els.sessionStart.disabled = true; els.sessionEnd.disabled = false;
  els.sessionPrev.disabled = state.session.index <= 0;
  els.sessionNext.disabled = state.session.index >= (state.session.list.length - 1);
  els.sessionComplete.disabled = false;
  els.sessionComplete.textContent = 'Concluir e Pausar';
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
  const week = Number(state.week);
  const id = ex._id;
  const entry = getEntry(id, week);
  const cargaCsv = sanitize(ex[`Carga_S${week}`]);
  const repsCsv = sanitize(ex[`Reps_S${week}`]);
  const progress = document.createElement('div'); progress.className = 'meta';
  progress.textContent = `Exercício ${state.session.index + 1} de ${state.session.list.length}`;
  const card = document.createElement('div'); card.className = 'card';
  const h3 = document.createElement('h3'); h3.textContent = `${sanitize(ex.Exercicio)} (${sanitize(ex.Grupo)})`; card.appendChild(h3);
  // Imagem do exercício, se disponível
  try {
    const slug = slugify(ex.Exercicio);
    const img = document.createElement('img');
    img.alt = slug;
    img.style.width = '100%';
    img.style.borderRadius = '8px';
    const webp = `../images/${slug}.webp`;
    const png = `../images/${slug}.png`;
    img.src = webp;
    img.onerror = () => { img.src = png; img.onerror = () => { img.src = '../images/placeholder.svg'; }; };
    card.appendChild(img);
  } catch {}

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
      btn.addEventListener('click', ()=>{ const n = Math.min(getWarmupCount(week, state.day, group) + 1, warmupTarget); setWarmupCount(week, state.day, group, n); const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m ? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120; setSeconds(s); start(); els.timerPanel.hidden = false; hint.textContent = `Aquecimento: ${n}/${warmupTarget}`; if (n >= warmupTarget) btn.disabled = true; });
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
      btnDone.addEventListener('click', ()=>{ const n = Math.min(getPrepCount(week, ex._id) + 1, prepMax); setPrepCount(week, ex._id, n); const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m ? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120; setSeconds(s); start(); els.timerPanel.hidden = false; hintP.textContent = `Preparatórias: ${n}/${targetLabel}`; if (n >= prepMax) btnDone.disabled = true; });
      rowP.appendChild(btnDone);
      const btnReset = document.createElement('button'); btnReset.className = 'btn btn-danger'; btnReset.textContent = 'Reset prep.'; btnReset.disabled = doneP <= 0;
      btnReset.addEventListener('click', ()=>{ setPrepCount(week, ex._id, 0); hintP.textContent = `Preparatórias: 0/${targetLabel}`; btnDone.disabled = false; btnReset.disabled = true; }); rowP.appendChild(btnReset);
      if (prepMin > 0 && doneP < prepMin) {
        const btnSkip = document.createElement('button'); btnSkip.className = 'btn btn-danger'; btnSkip.textContent = 'Ir para válida';
        btnSkip.addEventListener('click', ()=>{ const n = Math.max(prepMin, getPrepCount(week, ex._id)); setPrepCount(week, ex._id, n); hintP.textContent = `Preparatórias: ${n}/${targetLabel}`; btnDone.disabled = n >= prepMax; btnSkip.disabled = true; const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m ? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120; setSeconds(s); start(); els.timerPanel.hidden = false; });
        rowP.appendChild(btnSkip);
      }
      stage.appendChild(rowP);
    }
    if (stage.childElementCount) card.appendChild(stage);
  } catch(e){ console.error(e); }
  const inputs = document.createElement('div'); inputs.className = 'inputs';
  const cargaEl = document.createElement('input'); cargaEl.type = 'text'; cargaEl.placeholder = cargaCsv || 'ex: 40kg'; cargaEl.value = entry.carga || '';
  cargaEl.addEventListener('change', ()=> setEntry(id, week, 'carga', cargaEl.value)); inputs.appendChild(cargaEl);
  const repsEl = document.createElement('input'); repsEl.type = 'text'; repsEl.placeholder = repsCsv || 'ex: 6-8'; repsEl.value = entry.reps || '';
  repsEl.addEventListener('change', ()=> setEntry(id, week, 'reps', repsEl.value)); inputs.appendChild(repsEl);
  card.appendChild(inputs);
  const wrap = document.createElement('div');
  wrap.appendChild(progress);
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
