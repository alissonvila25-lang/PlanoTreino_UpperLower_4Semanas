// Register SW + atualização automática com aviso
const APP_VERSION = 'v29';
try {
  const verElInit = document.getElementById('version-label');
  if (verElInit) {
    verElInit.textContent = APP_VERSION;
    verElInit.title = `app ${APP_VERSION}`;
  }
} catch {}
function showUpdateBanner(message, actionLabel, onClick) {
  try {
    const bar = document.createElement('div');
    bar.style.position = 'fixed';
    bar.style.left = '50%';
    bar.style.bottom = '16px';
    bar.style.transform = 'translateX(-50%)';
    bar.style.zIndex = '1000';
    bar.style.display = 'flex';
    bar.style.gap = '8px';
    bar.style.alignItems = 'center';
    bar.style.border = '1px solid var(--border)';
    bar.style.background = 'var(--card)';
    bar.style.color = 'var(--text)';
    bar.style.padding = '10px 12px';
    bar.style.borderRadius = '10px';
    bar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    const span = document.createElement('span');
    span.textContent = message;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = actionLabel || 'Atualizar';
    btn.addEventListener('click', () => { try { onClick && onClick(); } finally { bar.remove(); } });
    const close = document.createElement('button');
    close.className = 'btn btn-danger';
    close.textContent = 'Fechar';
    close.addEventListener('click', () => bar.remove());
    bar.appendChild(span);
    bar.appendChild(btn);
    bar.appendChild(close);
    document.body.appendChild(bar);
  } catch (e) { console.error(e); }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`);

      // Recarrega automaticamente quando o novo SW assumir controle
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        // Opcional: mostrar feedback rápido
        try { showUpdateBanner('Atualizando...', 'Ok', () => {}); } catch {}
        window.location.reload();
      });

      // Se já houver um SW em espera (caso skipWaiting não tenha sido aplicado)
      if (reg.waiting) {
        showUpdateBanner('Atualização disponível', 'Atualizar', () => {
          try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
        });
      }

      // Detecta novas versões
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão pronta
            showUpdateBanner('Atualização disponível', 'Atualizar', () => {
              try { (reg.waiting || nw).postMessage({ type: 'SKIP_WAITING' }); } catch {}
            });
          }
        });
      });

      // Mensagens do SW: atualiza rótulo de versão visível
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event?.data?.type === 'SW_ACTIVATED') {
          try {
            const verEl = document.getElementById('version-label');
            if (verEl && event.data.version) {
              const raw = String(event.data.version);
              const short = raw.replace(/^.*-v/, 'v');
              verEl.textContent = short;
              verEl.title = raw;
            }
          } catch {}
        }
      });
    } catch (e) {
      console.error(e);
    }
  });
}

const state = {
  week: 1,
  day: 'Segunda',
  plan: [],
  techniques: [],
  view: 'treino',
  session: { active: false, index: 0, list: [] }
};
const els = {
  week: document.getElementById('week-select'),
  day: document.getElementById('day-select'),
  exerciseList: document.getElementById('exercise-list'),
  techList: document.getElementById('tech-list'),
  summary: document.getElementById('summary'),
  exportBtn: document.getElementById('export-data'),
  exportJsonBtn: document.getElementById('export-json'),
  importJsonBtn: document.getElementById('import-json'),
  importJsonInput: document.getElementById('import-json-input'),
  exportSlugsBtn: document.getElementById('export-slugs'),
  exportWeekFilter: document.getElementById('export-week-filter'),
  exportDayFilter: document.getElementById('export-day-filter'),
  clearBtn: document.getElementById('clear-data'),
  themeToggle: document.getElementById('theme-toggle'),
  timerToggle: document.getElementById('timer-toggle'),
  imgModal: document.getElementById('img-modal'),
  imgModalSrc: document.getElementById('img-modal-src'),
  imgModalClose: document.getElementById('img-modal-close'),
  sessionDay: document.getElementById('session-day'),
  sessionWeek: document.getElementById('session-week'),
  sessionStart: document.getElementById('session-start'),
  sessionEnd: document.getElementById('session-end'),
  sessionBody: document.getElementById('session-body'),
  sessionPrev: document.getElementById('session-prev'),
  sessionNext: document.getElementById('session-next'),
  sessionComplete: document.getElementById('session-complete'),
  sessionAutoAdvance: document.getElementById('session-auto-advance'),
};

// Tabs
for (const btn of document.querySelectorAll('.tab-btn')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('is-active');
    state.view = btn.dataset.tab;
    render();
  });
}

// Load CSVs
function decodeSmart(ab) {
  const u8 = new Uint8Array(ab);
  const hasBOM = u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF;
  try {
    let s = new TextDecoder('utf-8').decode(ab);
    if (hasBOM && s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    const garbled = (s.match(/Ã./g) || []).length;
    if (!hasBOM && garbled > 3) {
      try { return new TextDecoder('windows-1252').decode(ab); }
      catch { return new TextDecoder('iso-8859-1').decode(ab); }
    }
    return s;
  } catch {
    try { return new TextDecoder('windows-1252').decode(ab); }
    catch { return new TextDecoder('iso-8859-1').decode(ab); }
  }
}

function normalizeText(s) {
  if (!s) return s;
  let out = String(s);
  // Normalizações pontuais
  out = out.replace(/2030%/g, '20/30%');
  out = out.replace(/4050%/g, '40/50%');
  out = out.replace(/510%/g, '5/10%');
  // Faixas perdidas de hífen
  out = out.replace(/\b1x48\b/g, '1x4-8');
  out = out.replace(/\b148\b/g, '1x4-8');
  out = out.replace(/\b44\b/g, '4x4');
  out = out.replace(/\b1112\b(?=\s*reps?\b)/gi, '11-12');
  out = out.replace(/\b810\b(?=\s*reps?\b)/gi, '8-10');
  // Preparatórias
  out = out.replace(/Prep:23/g, 'Prep:2-3');
  // Em progresso: outros ajustes específicos podem ser adicionados aqui
  return out;
}

async function loadCSVs() {
  const planBuf = await fetch('./plano-4-semanas.csv').then(r => r.arrayBuffer());
  const techBuf = await fetch('./tecnicas.csv').then(r => r.arrayBuffer());
  const planText = decodeSmart(planBuf);
  const techText = decodeSmart(techBuf);
  const plan = Papa.parse(planText, { header: true, skipEmptyLines: true }).data;
  const techniques = Papa.parse(techText, { header: true, skipEmptyLines: true }).data;
  // Aplique normalização de texto aos campos relevantes
  state.plan = plan.map(row => {
    const r = { ...row };
    r.Protocolo = normalizeText(r.Protocolo);
    r.SeriesBase = normalizeText(r.SeriesBase);
    r.Pausa = normalizeText(r.Pausa);
// PWA install prompt (Android/Chrome)
let deferredPrompt = null;
const installBtn = document.getElementById('install-btn');
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    const ev = deferredPrompt;
    deferredPrompt = null;
    try {
      await ev.prompt();
    } catch {}
    installBtn.hidden = true;
  });
}
    r.Notas = normalizeText(r.Notas);
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});
    r._id = `${r.Dia}|${r.Exercicio}`;
    return r;
  });
  state.techniques = techniques.map(t => ({
    ...t,
    Nome: normalizeText(t.Nome),
    ["Como executar"]: normalizeText(t["Como executar"]),
    Descanso: normalizeText(t.Descanso),
    Progresso: normalizeText(t.Progresso),
  }));
}

// Storage helpers
function keyFor(id, week, field) { return `plano4s:${id}:S${week}:${field}`; }
function getEntry(id, week) {
  return {
    carga: localStorage.getItem(keyFor(id, week, 'carga')) || '',
    reps: localStorage.getItem(keyFor(id, week, 'reps')) || '',
    done: localStorage.getItem(keyFor(id, week, 'done')) === '1',
    nota: localStorage.getItem(keyFor(id, week, 'nota')) || ''
  };
}
function setEntry(id, week, field, value) {
  localStorage.setItem(keyFor(id, week, field), value);
}

function sanitize(text) {
  if (text == null) return '';
  return String(text);
}

function slugify(text){
  return sanitize(text).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}

function tryImageSrc(exName){
  const slug = slugify(exName);
  return `./images/${slug}.webp`;
}

function setExerciseImage(imgEl, exName){
  const slug = slugify(exName);
  const placeholder = './images/placeholder.svg';
  const candidates = [
    `./images/${slug}.webp`,
    `./images/${slug}.png`,
    `./images/${slug}.jpg`,
    `./images/${slug}.jpeg`
  ];
  let i = 0;
  function tryNext(){
    if (i >= candidates.length){
      imgEl.src = placeholder;
      // Attempt remote Wikimedia image after local fallbacks
      attemptRemote();
      return;
    }
    const src = candidates[i++];
    imgEl.onerror = () => { tryNext(); };
    imgEl.src = src;
  }
  // start trying
  tryNext();

  function attemptRemote(){
    const term = exName + ' exercicio academia';
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=6&format=json&origin=*`;
    // Run slightly async to avoid blocking initial paint
    setTimeout(()=>{
      fetch(searchUrl).then(r=>r.json()).then((data)=>{
        const hits = (data && data.query && data.query.search) ? data.query.search : [];
        if (!hits.length) return;
        const title = hits[0].title;
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
        return fetch(infoUrl).then(r=>r.json()).then((d2)=>{
          const pages = d2 && d2.query && d2.query.pages ? d2.query.pages : {};
          for (const k in pages){
            const ii = pages[k].imageinfo;
            if (ii && ii.length && ii[0].url){ imgEl.src = ii[0].url; break; }
          }
        });
      }).catch(()=>{});
    }, 50);
  }
}

function parseLoad(s){
  if(!s) return null; const m = String(s).match(/([0-9]+(?:\.[0-9]+)?)(\s*(kg|lb))?/i);
  if(!m) return null; return { value: parseFloat(m[1]), unit: (m[3]||'').toLowerCase() };
}

function suggestNextLoad(prev){
  const p = parseLoad(prev); if(!p) return null;
  let val = p.value; let unit = p.unit;
  if(unit === 'kg') val += val >= 40 ? 2.5 : 1;
  else if(unit === 'lb') val += val >= 90 ? 5 : 2;
  else val = Math.round(val * 1.03 * 10)/10; // +3%
  return `${val}${unit? ' '+unit: ''}`;
}

function renderTreino() {
  const week = Number(state.week);
  const day = state.day;
  const list = state.plan.filter(x => sanitize(x.Dia) === day);
  els.exerciseList.innerHTML = '';
  for (const ex of list) {
    const id = ex._id;
    const entry = getEntry(id, week);

    const cargaCsv = sanitize(ex[`Carga_S${week}`]);
    const repsCsv = sanitize(ex[`Reps_S${week}`]);

    const card = document.createElement('div');
    card.className = 'card';

    const header = document.createElement('div');
    header.className = 'ex-header';
    const img = document.createElement('img');
    img.className = 'ex-thumb';
    img.alt = sanitize(ex.Exercicio);
    setExerciseImage(img, ex.Exercicio);
    img.addEventListener('click', () => {
      els.imgModalSrc.src = img.src;
      els.imgModal.removeAttribute('hidden');
    });
    header.appendChild(img);
    const titleWrap = document.createElement('div');
    titleWrap.className = 'ex-title';
    const h3 = document.createElement('h3');
    h3.textContent = `${sanitize(ex.Exercicio)} (${sanitize(ex.Grupo)})`;
    titleWrap.appendChild(h3);
    header.appendChild(titleWrap);
    card.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `
      <span class="badge">${sanitize(ex.GER)}</span>
      <span>${sanitize(ex.Protocolo)}</span>
      <span>Series: ${sanitize(ex.SeriesBase)}</span>
      <span>Pausa: ${sanitize(ex.Pausa)}</span>
    `;
    card.appendChild(meta);

    // Stage controls também no Treino
    try {
      const weekN = Number(state.week);
      const group = sanitize(ex.Grupo);
      const { warmupTarget, prepMin, prepMax } = parseSeriesMeta(ex.SeriesBase);
      const stage = document.createElement('div'); stage.className = 'stage';
      const cfg = getPauseConfig();

      // Aquecimento apenas no primeiro do grupo
      if (warmupTarget > 0 && isFirstExerciseOfGroup(group, ex)) {
        const done = getWarmupCount(weekN, state.day, group);
        const row = document.createElement('div'); row.className = 'stage-row';
        const hint = document.createElement('span'); hint.className = 'hint';
        hint.textContent = `Aquecimento: ${Math.min(done, warmupTarget)}/${warmupTarget}`;
        row.appendChild(hint);
        const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'Concluir aquecimento';
        btn.disabled = done >= warmupTarget;
        btn.addEventListener('click', ()=>{
          const n = Math.min(getWarmupCount(weekN, state.day, group) + 1, warmupTarget); setWarmupCount(weekN, state.day, group, n);
          if (window.timerControl) { window.timerControl.startSeconds(cfg.warmup); const panel = document.getElementById('timer'); if (panel) panel.hidden = false; }
          hint.textContent = `Aquecimento: ${n}/${warmupTarget}`;
          if (n >= warmupTarget) btn.disabled = true;
        });
        row.appendChild(btn);
        // Reset aquecimento
        const btnResetAq = document.createElement('button'); btnResetAq.className = 'btn btn-danger'; btnResetAq.textContent = 'Reset aquec.';
        btnResetAq.disabled = done <= 0;
        btnResetAq.addEventListener('click', ()=>{
          setWarmupCount(weekN, state.day, group, 0);
          hint.textContent = `Aquecimento: 0/${warmupTarget}`;
          btn.disabled = false;
          btnResetAq.disabled = true;
        });
        row.appendChild(btnResetAq);
        stage.appendChild(row);
      }

      // Preparatórias
      if (prepMax > 0) {
        const doneP = getPrepCount(weekN, ex._id);
        const rowP = document.createElement('div'); rowP.className = 'stage-row';
        const hintP = document.createElement('span'); hintP.className = 'hint';
        const targetLabel = (prepMin && prepMax && prepMin !== prepMax) ? `${prepMin}-${prepMax}` : String(prepMax);
        hintP.textContent = `Preparatórias: ${Math.min(doneP, prepMax)}/${targetLabel}`;
        rowP.appendChild(hintP);
        const btnDone = document.createElement('button'); btnDone.className = 'btn'; btnDone.textContent = 'Concluir preparatória';
        btnDone.disabled = doneP >= prepMax;
        btnDone.addEventListener('click', ()=>{
          const n = Math.min(getPrepCount(weekN, ex._id) + 1, prepMax); setPrepCount(weekN, ex._id, n);
          if (window.timerControl) { window.timerControl.startSeconds(cfg.prep); const panel = document.getElementById('timer'); if (panel) panel.hidden = false; }
          hintP.textContent = `Preparatórias: ${n}/${targetLabel}`;
          if (n >= prepMax) btnDone.disabled = true;
        });
        rowP.appendChild(btnDone);
        // Reset preparatórias
        const btnResetPrep = document.createElement('button'); btnResetPrep.className = 'btn btn-danger'; btnResetPrep.textContent = 'Reset prep.';
        btnResetPrep.disabled = doneP <= 0;
        btnResetPrep.addEventListener('click', ()=>{
          setPrepCount(weekN, ex._id, 0);
          hintP.textContent = `Preparatórias: 0/${targetLabel}`;
          btnDone.disabled = false;
          try { if (btnSkip) btnSkip.disabled = false; } catch {}
          btnResetPrep.disabled = true;
        });
        rowP.appendChild(btnResetPrep);
        if (prepMin > 0 && doneP < prepMin) {
          const btnSkip = document.createElement('button'); btnSkip.className = 'btn btn-danger'; btnSkip.textContent = 'Ir para válida';
          btnSkip.addEventListener('click', ()=>{
            const n = Math.max(prepMin, getPrepCount(weekN, ex._id)); setPrepCount(weekN, ex._id, n);
            hintP.textContent = `Preparatórias: ${n}/${targetLabel}`;
            if (window.timerControl) {
              const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120; window.timerControl.startSeconds(s);
              const panel = document.getElementById('timer'); if (panel) panel.hidden = false;
            }
            btnDone.disabled = n >= prepMax; btnSkip.disabled = true;
          });
          rowP.appendChild(btnSkip);
        }
        stage.appendChild(rowP);
      }

      if (stage.childElementCount) card.appendChild(stage);
    } catch (e) { console.error(e); }

    if (sanitize(ex.Notas)) {
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = sanitize(ex.Notas);
      card.appendChild(note);
    }

    const inputs = document.createElement('div');
    inputs.className = 'inputs';

    const inputCarga = document.createElement('div');
    inputCarga.className = 'input';
    inputCarga.innerHTML = `<label>Carga S${week}</label>`;
    const cargaEl = document.createElement('input');
    cargaEl.type = 'text';
    cargaEl.placeholder = cargaCsv || 'ex: 40kg';
    cargaEl.value = entry.carga || '';
    cargaEl.addEventListener('change', () => setEntry(id, week, 'carga', cargaEl.value));
    inputCarga.appendChild(cargaEl);

    const inputReps = document.createElement('div');
    inputReps.className = 'input';
    inputReps.innerHTML = `<label>Reps S${week}</label>`;
    const repsEl = document.createElement('input');
    repsEl.type = 'text';
    repsEl.placeholder = repsCsv || 'ex: 6-8';
    repsEl.value = entry.reps || '';
    repsEl.addEventListener('change', () => setEntry(id, week, 'reps', repsEl.value));
    inputReps.appendChild(repsEl);

    inputs.appendChild(inputCarga);
    inputs.appendChild(inputReps);
    const inputNota = document.createElement('div');
    inputNota.className = 'input';
    inputNota.innerHTML = `<label>Nota S${week}</label>`;
    const notaEl = document.createElement('textarea');
    notaEl.rows = 2;
    notaEl.placeholder = 'observações curtas';
    notaEl.value = entry.nota || '';
    notaEl.addEventListener('change', () => setEntry(id, week, 'nota', notaEl.value));
    inputNota.appendChild(notaEl);
    inputs.appendChild(inputNota);
    card.appendChild(inputs);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const done = document.createElement('input');
    done.type = 'checkbox';
    done.className = 'complete-toggle';
    done.checked = entry.done;
    done.addEventListener('change', () => setEntry(id, week, 'done', done.checked ? '1' : '0'));

    const lbl = document.createElement('label');
    lbl.style.fontSize = '12px';
    lbl.style.color = 'var(--muted)';
    lbl.textContent = 'Marcar como concluído';

    actions.appendChild(done);
    actions.appendChild(lbl);

    // Start pause timer button
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'btn btn-pause';
    pauseBtn.textContent = '⏱️ Pausa';
    pauseBtn.addEventListener('click', ()=>{
      const m = String(ex.Pausa||'').match(/(\d+):(\d+)/);
      const s = m? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120;
      if (window.timerControl && window.timerControl.startSeconds) {
        window.timerControl.startSeconds(s);
        const panel = document.getElementById('timer');
        if (panel) { panel.hidden = false; panel.scrollIntoView({behavior:'smooth', block:'start'}); }
      }
    });
    actions.appendChild(pauseBtn);
    card.appendChild(actions);

    // Suggest next load based on previous week
    if (week > 1) {
      const prev = getEntry(id, week-1);
      const suggestion = suggestNextLoad(prev.carga || cargaCsv);
      if (suggestion) {
        const sug = document.createElement('div');
        sug.className = 'note';
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = `Sugestão S${week}: ${suggestion}`;
        link.addEventListener('click', (e)=>{ e.preventDefault();
          const inputsEls = card.querySelectorAll('input');
          const cargaEl = inputsEls[0];
          cargaEl.value = suggestion; setEntry(id, week, 'carga', suggestion);
        });
        sug.appendChild(link);
        card.appendChild(sug);
      }
    }

    els.exerciseList.appendChild(card);
  }
}

function renderTecnicas() {
  els.techList.innerHTML = '';
  for (const t of state.techniques) {
    const card = document.createElement('div');
    card.className = 'card';
    const h3 = document.createElement('h3');
    h3.textContent = `${sanitize(t.GER)} · ${sanitize(t.Nome)}`;
    card.appendChild(h3);
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>${sanitize(t["Como executar"])}</span>`;
    card.appendChild(meta);
    const note = document.createElement('div');
    note.className = 'note';
    note.innerHTML = `<strong>Descanso:</strong> ${sanitize(t.Descanso)} • <strong>Progresso:</strong> ${sanitize(t.Progresso)}`;
    card.appendChild(note);
    els.techList.appendChild(card);
  }
}

function renderResumo() {
  const week = Number(state.week);
  els.summary.innerHTML = '';
  // PR chart: count PRs per week
  const prCounts = [0,0,0,0];
  for (const ex of state.plan) {
    for (let w = 1; w <= 4; w++) {
      if (hasPR(ex._id, w)) prCounts[w-1]++;
    }
  }
  const maxPr = Math.max(1, ...prCounts);
  const chartCard = document.createElement('div');
  chartCard.className = 'card';
  const h3c = document.createElement('h3'); h3c.textContent = 'PRs por semana'; chartCard.appendChild(h3c);
  const chart = document.createElement('div'); chart.className = 'chart';
  prCounts.forEach((cnt, i) => {
    const row = document.createElement('div'); row.className = 'chart-row';
    const label = document.createElement('div'); label.className = 'chart-label'; label.textContent = `S${i+1}`; row.appendChild(label);
    const barWrap = document.createElement('div'); barWrap.className = 'chart-bar-wrap';
    const bar = document.createElement('div'); bar.className = 'chart-bar'; bar.style.width = `${Math.round((cnt/maxPr)*100)}%`;
    barWrap.appendChild(bar); row.appendChild(barWrap);
    const value = document.createElement('div'); value.className = 'chart-value'; value.textContent = String(cnt);
    row.appendChild(value);
    chart.appendChild(row);
  });
  // message if no PRs
  if (prCounts.every(c => c === 0)) {
    const msg = document.createElement('div'); msg.className = 'note'; msg.textContent = 'Sem PRs registrados ainda.'; chartCard.appendChild(msg);
  }
  chartCard.appendChild(chart);
  els.summary.appendChild(chartCard);
  const byDay = {};
  for (const ex of state.plan) {
    const id = ex._id; const day = sanitize(ex.Dia);
    const e = getEntry(id, week);
    if (!byDay[day]) byDay[day] = [];
    if (e.carga || e.reps || e.done) {
      byDay[day].push({ ex, e });
    }
  }
  for (const day of Object.keys(byDay)) {
    const section = document.createElement('div');
    section.className = 'card';
    const h3 = document.createElement('h3');
    h3.textContent = day;
    section.appendChild(h3);
    for (const { ex, e } of byDay[day]) {
      const p = document.createElement('div');
      p.className = 'meta';
      p.innerHTML = `
        <span>${sanitize(ex.Exercicio)}</span>
        <span>S${week} · Carga: ${e.carga || '-'} · Reps: ${e.reps || '-'}</span>
        <span>${e.done ? 'Concluído' : 'Pendente'}</span>
        ${e.nota ? `<span>Obs: ${sanitize(e.nota)}</span>` : ''}
      `;
      section.appendChild(p);
    }
    els.summary.appendChild(section);
  }
}

function render() {
  if (state.view === 'treino') renderTreino();
  if (state.view === 'tecnicas') renderTecnicas();
  if (state.view === 'resumo') renderResumo();
  if (state.view === 'sessao') renderSessao();
}

function bestPreviousLoad(exId, uptoWeek) {
  let best = null;
  for (let w = 1; w < uptoWeek; w++) {
    const e = getEntry(exId, w);
    const p = parseLoad(e.carga);
    if (p) {
      if (!best || p.value > best.value) best = p;
    }
  }
  return best;
}

function markPRIfAny(exId, week, cargaStr) {
  const now = parseLoad(cargaStr);
  if (!now) return false;
  const best = bestPreviousLoad(exId, week);
  const key = keyFor(exId, week, 'pr');
  if (!best || now.value > best.value) {
    localStorage.setItem(key, '1');
    return true;
  } else {
    localStorage.removeItem(key);
    return false;
  }
}

function hasPR(exId, week) { return localStorage.getItem(keyFor(exId, week, 'pr')) === '1'; }

// Série helpers: aquecimento e preparatórias
function parseSeriesMeta(seriesBase){
  const txt = sanitize(seriesBase||'');
  let warmupTarget = 0;
  let prepMin = 0, prepMax = 0;
  const mAq = txt.match(/Aquec\s*:?\s*(\d+)/i);
  if (mAq) warmupTarget = parseInt(mAq[1],10)||0;
  const mPrepRange = txt.match(/Prep\s*:?\s*(\d+)\s*[-–]\s*(\d+)/i);
  const mPrepX = txt.match(/Prep\s*:?\s*(\d+)\s*[x×]/i);
  if (mPrepRange) { prepMin = parseInt(mPrepRange[1],10)||0; prepMax = parseInt(mPrepRange[2],10)||prepMin; }
  else if (mPrepX) { prepMin = parseInt(mPrepX[1],10)||0; prepMax = prepMin; }
  // Defaults se houver menção a Prep sem números claros
  if (/Prep/i.test(txt) && (prepMin===0 && prepMax===0)) { prepMin = 2; prepMax = 3; }
  return { warmupTarget, prepMin, prepMax };
}

function getPauseConfig(){
  const warmup = parseInt(localStorage.getItem('plano4s:pause:warmupSeconds')||'60',10)||60;
  const prep = parseInt(localStorage.getItem('plano4s:pause:prepSeconds')||'90',10)||90;
  return { warmup, prep };
}
function setPauseConfig(key, value){
  const v = Math.max(0, parseInt(value,10)||0);
  if (key === 'warmup') localStorage.setItem('plano4s:pause:warmupSeconds', String(v));
  if (key === 'prep') localStorage.setItem('plano4s:pause:prepSeconds', String(v));
}

function warmupKey(week, day, group){ return `plano4s:warmup:S${week}:${day}:${group}`; }
function getWarmupCount(week, day, group){ return parseInt(localStorage.getItem(warmupKey(week,day,group))||'0',10)||0; }
function setWarmupCount(week, day, group, n){ localStorage.setItem(warmupKey(week,day,group), String(n)); }

function prepKey(week, exId){ return `plano4s:prep:S${week}:${exId}`; }
function getPrepCount(week, exId){ return parseInt(localStorage.getItem(prepKey(week,exId))||'0',10)||0; }
function setPrepCount(week, exId, n){ localStorage.setItem(prepKey(week,exId), String(n)); }

function isFirstExerciseOfGroup(group, ex){
  const dayList = state.session && state.session.active ? state.session.list : state.plan.filter(x => sanitize(x.Dia) === state.day);
  const firstIdx = dayList.findIndex(e => sanitize(e.Grupo) === group);
  const idx = dayList.findIndex(e => e._id === ex._id);
  return firstIdx !== -1 && idx === firstIdx;
}

function renderSessionCard(ex) {
  const week = Number(state.week);
  const entry = getEntry(ex._id, week);
  const cargaCsv = sanitize(ex[`Carga_S${week}`]);
  const repsCsv = sanitize(ex[`Reps_S${week}`]);

  const wrap = document.createElement('div');
  wrap.className = 'card';
  const header = document.createElement('div');
  header.className = 'ex-header';
  const img = document.createElement('img');
  img.className = 'ex-thumb';
  img.alt = sanitize(ex.Exercicio);
  setExerciseImage(img, ex.Exercicio);
  img.addEventListener('click', () => { els.imgModalSrc.src = img.src; els.imgModal.removeAttribute('hidden'); });
  header.appendChild(img);
  const titleWrap = document.createElement('div');
  titleWrap.className = 'ex-title';
  const h3 = document.createElement('h3');
  h3.textContent = `${sanitize(ex.Exercicio)} (${sanitize(ex.Grupo)})`;
  if (hasPR(ex._id, week)) { const pr = document.createElement('span'); pr.className = 'pr-badge'; pr.textContent = 'PR!'; h3.appendChild(pr); }
  if (entry.nota) { const nb = document.createElement('span'); nb.className = 'badge'; nb.style.marginLeft = '6px'; nb.textContent = 'Nota'; h3.appendChild(nb); }
  titleWrap.appendChild(h3);
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.innerHTML = `
    <span class="badge">${sanitize(ex.GER)}</span>
    <span>${sanitize(ex.Protocolo)}</span>
    <span>Séries: ${sanitize(ex.SeriesBase)}</span>
    <span>Pausa: ${sanitize(ex.Pausa)}</span>
  `;
  titleWrap.appendChild(meta);
  header.appendChild(titleWrap);
  wrap.appendChild(header);

  // Stage controls: aquecimento (primeiro do grupo) e preparatórias
  try {
    const weekN = Number(state.week);
    const group = sanitize(ex.Grupo);
    const { warmupTarget, prepMin, prepMax } = parseSeriesMeta(ex.SeriesBase);
    const stage = document.createElement('div'); stage.className = 'stage';
    const cfg = getPauseConfig();

    // Aquecimento: só no primeiro exercício do grupo
    if (warmupTarget > 0 && isFirstExerciseOfGroup(group, ex)) {
      const done = getWarmupCount(weekN, state.day, group);
      const row = document.createElement('div'); row.className = 'stage-row';
      const hint = document.createElement('span'); hint.className = 'hint';
      hint.textContent = `Aquecimento: ${Math.min(done, warmupTarget)}/${warmupTarget}`;
      row.appendChild(hint);
      if (done < warmupTarget) {
        const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'Concluir aquecimento';
        btn.addEventListener('click', ()=>{
          const n = Math.min(done + 1, warmupTarget); setWarmupCount(weekN, state.day, group, n);
          if (window.timerControl) { window.timerControl.startSeconds(cfg.warmup); const panel = document.getElementById('timer'); if (panel) { panel.hidden = false; } }
          // Atualiza contador na UI
          hint.textContent = `Aquecimento: ${n}/${warmupTarget}`;
          if (n >= warmupTarget) btn.disabled = true;
        });
        row.appendChild(btn);
      }
      // Reset aquecimento
      const btnResetAq2 = document.createElement('button'); btnResetAq2.className = 'btn btn-danger'; btnResetAq2.textContent = 'Reset aquec.';
      btnResetAq2.disabled = done <= 0;
      btnResetAq2.addEventListener('click', ()=>{
        setWarmupCount(weekN, state.day, group, 0);
        hint.textContent = `Aquecimento: 0/${warmupTarget}`;
        btnResetAq2.disabled = true;
      });
      row.appendChild(btnResetAq2);
      stage.appendChild(row);
    }

    // Preparatórias: por exercício (range 2-3 ou fixo)
    if (prepMax > 0) {
      const doneP = getPrepCount(weekN, ex._id);
      const rowP = document.createElement('div'); rowP.className = 'stage-row';
      const hintP = document.createElement('span'); hintP.className = 'hint';
      const targetLabel = (prepMin && prepMax && prepMin !== prepMax) ? `${prepMin}-${prepMax}` : String(prepMax);
      hintP.textContent = `Preparatórias: ${Math.min(doneP, prepMax)}/${targetLabel}`;
      rowP.appendChild(hintP);

      const btnDone = document.createElement('button'); btnDone.className = 'btn'; btnDone.textContent = 'Concluir preparatória';
      btnDone.disabled = doneP >= prepMax;
      btnDone.addEventListener('click', ()=>{
        const n = Math.min(getPrepCount(weekN, ex._id) + 1, prepMax); setPrepCount(weekN, ex._id, n);
        if (window.timerControl) { window.timerControl.startSeconds(cfg.prep); const panel = document.getElementById('timer'); if (panel) { panel.hidden = false; } }
        hintP.textContent = `Preparatórias: ${n}/${targetLabel}`;
        if (n >= prepMax) btnDone.disabled = true;
      });
      rowP.appendChild(btnDone);

      if (prepMin > 0 && doneP < prepMin) {
        const btnSkip = document.createElement('button'); btnSkip.className = 'btn btn-danger'; btnSkip.textContent = 'Ir para válida';
        btnSkip.addEventListener('click', ()=>{
          const n = Math.max(prepMin, getPrepCount(weekN, ex._id)); setPrepCount(weekN, ex._id, n);
          hintP.textContent = `Preparatórias: ${n}/${targetLabel}`;
          // Opcional: iniciar pausa de 2:00 já para a série válida
          if (window.timerControl) {
            const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120; window.timerControl.startSeconds(s);
            const panel = document.getElementById('timer'); if (panel) panel.hidden = false;
          }
          btnDone.disabled = n >= prepMax; btnSkip.disabled = true;
        });
        rowP.appendChild(btnSkip);
      }
      // Reset preparatórias
      const btnResetPrep2 = document.createElement('button'); btnResetPrep2.className = 'btn btn-danger'; btnResetPrep2.textContent = 'Reset prep.';
      btnResetPrep2.disabled = doneP <= 0;
      btnResetPrep2.addEventListener('click', ()=>{
        setPrepCount(weekN, ex._id, 0);
        hintP.textContent = `Preparatórias: 0/${targetLabel}`;
        btnDone.disabled = false;
        try { if (typeof btnSkip !== 'undefined') btnSkip.disabled = false; } catch {}
        btnResetPrep2.disabled = true;
      });
      rowP.appendChild(btnResetPrep2);
      stage.appendChild(rowP);
    }

    if (stage.childElementCount) { wrap.appendChild(stage); }
  } catch (e) { console.error(e); }

  if (sanitize(ex.Notas)) { const note = document.createElement('div'); note.className = 'note'; note.textContent = sanitize(ex.Notas); wrap.appendChild(note); }
  if (entry.nota) { const noteUser = document.createElement('div'); noteUser.className = 'note'; noteUser.textContent = `Nota S${week}: ${entry.nota}`; wrap.appendChild(noteUser); }

  const inputs = document.createElement('div'); inputs.className = 'inputs';
  const inputCarga = document.createElement('div'); inputCarga.className = 'input'; inputCarga.innerHTML = `<label>Carga S${week}</label>`;
  const cargaEl = document.createElement('input'); cargaEl.type = 'text'; cargaEl.placeholder = cargaCsv || 'ex: 40kg'; cargaEl.value = entry.carga || '';
  cargaEl.addEventListener('change', () => setEntry(ex._id, week, 'carga', cargaEl.value)); inputCarga.appendChild(cargaEl);
  const inputReps = document.createElement('div'); inputReps.className = 'input'; inputReps.innerHTML = `<label>Reps S${week}</label>`;
  const repsEl = document.createElement('input'); repsEl.type = 'text'; repsEl.placeholder = repsCsv || 'ex: 6-8'; repsEl.value = entry.reps || '';
  repsEl.addEventListener('change', () => setEntry(ex._id, week, 'reps', repsEl.value)); inputReps.appendChild(repsEl);
  inputs.appendChild(inputCarga); inputs.appendChild(inputReps); wrap.appendChild(inputs);

  const actions = document.createElement('div'); actions.className = 'actions';
  const startPause = document.createElement('button'); startPause.className = 'btn btn-pause'; startPause.textContent = 'Iniciar pausa';
  startPause.addEventListener('click', ()=>{ const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120; if (window.timerControl) { window.timerControl.startSeconds(s); const panel = document.getElementById('timer'); if (panel) { panel.hidden = false; panel.scrollIntoView({behavior:'smooth', block:'start'}); } } });
  actions.appendChild(startPause);
  wrap.appendChild(actions);

  return { node: wrap, getCarga: () => cargaEl.value };
}

function renderSessao() {
  els.sessionDay.textContent = `Dia: ${state.day}`;
  els.sessionWeek.textContent = `Semana ${state.week}`;
  if (!state.session.active) {
    els.sessionBody.innerHTML = '<div class="card">Clique em "Iniciar sessão" para começar a sequência de exercícios do dia selecionado.</div>';
    els.sessionStart.disabled = false; els.sessionEnd.disabled = true; els.sessionPrev.disabled = true; els.sessionNext.disabled = true; els.sessionComplete.disabled = true;
    return;
  }
  els.sessionStart.disabled = true; els.sessionEnd.disabled = false;
  els.sessionPrev.disabled = state.session.index <= 0;
  els.sessionNext.disabled = state.session.index >= (state.session.list.length - 1);
  els.sessionComplete.disabled = false;

  const ex = state.session.list[state.session.index];
  els.sessionBody.innerHTML = '';
  const { node, getCarga } = renderSessionCard(ex);
  els.sessionBody.appendChild(node);

  const prev = bestPreviousLoad(ex._id, Number(state.week));
  const suggestion = suggestNextLoad(prev ? `${prev.value}${prev.unit? ' '+prev.unit: ''}` : null);
  if (suggestion) { const sug = document.createElement('div'); sug.className = 'note'; sug.textContent = `Sugestão de carga: ${suggestion}`; els.sessionBody.appendChild(sug); }

  els.sessionComplete.onclick = () => {
    setEntry(ex._id, Number(state.week), 'done', '1');
    const cargaVal = getCarga(); markPRIfAny(ex._id, Number(state.week), cargaVal);
    const m = String(ex.Pausa||'').match(/(\d+):(\d+)/); const s = m? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : 120; if (window.timerControl) window.timerControl.startSeconds(s);
    if (state.session.index < state.session.list.length - 1) { state.session.index++; renderSessao(); }
  };
}

function startSession() {
  const list = state.plan.filter(x => sanitize(x.Dia) === state.day);
  state.session.active = true;
  state.session.list = list;
  const firstPending = list.findIndex(e => !getEntry(e._id, Number(state.week)).done);
  state.session.index = firstPending === -1 ? 0 : firstPending;
  renderSessao();
}

function endSession() { state.session.active = false; state.session.list = []; state.session.index = 0; renderSessao(); }

// Controls
els.week.addEventListener('change', (e) => { state.week = Number(e.target.value); render(); });
els.day.addEventListener('change', (e) => { state.day = e.target.value; render(); });
// Session controls
els.sessionStart.addEventListener('click', startSession);
els.sessionEnd.addEventListener('click', endSession);
els.sessionPrev.addEventListener('click', () => { if (state.session.index > 0) { state.session.index--; renderSessao(); } });
els.sessionNext.addEventListener('click', () => { if (state.session.index < state.session.list.length - 1) { state.session.index++; renderSessao(); } });

// Export/clear
els.exportBtn.addEventListener('click', () => {
  const rows = [['Dia','Exercicio','Semana','Carga','Reps','Concluido','Nota','PR']];
  const weekFilter = els.exportWeekFilter ? els.exportWeekFilter.value : '';
  const dayFilter = els.exportDayFilter ? els.exportDayFilter.value : '';
  for (const ex of state.plan) {
    const day = sanitize(ex.Dia);
    if (dayFilter && day !== dayFilter) continue;
    const weeks = weekFilter ? [Number(weekFilter)] : [1,2,3,4];
    for (const w of weeks) {
      const e = getEntry(ex._id, w);
      if (e.carga || e.reps || e.done || e.nota) {
        const pr = hasPR(ex._id, w) ? '1' : '';
        rows.push([day, ex.Exercicio, `S${w}`, e.carga, e.reps, e.done ? '1' : '0', e.nota || '', pr]);
      }
    }
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'progresso-plano-4-semanas.csv'; a.click();
  URL.revokeObjectURL(url);
});

// Persist filters
if (els.exportWeekFilter) {
  const savedW = localStorage.getItem('plano4s:exportWeek') || '';
  els.exportWeekFilter.value = savedW;
  els.exportWeekFilter.addEventListener('change', () => {
    localStorage.setItem('plano4s:exportWeek', els.exportWeekFilter.value);
  });
}
if (els.exportDayFilter) {
  const savedD = localStorage.getItem('plano4s:exportDay') || '';
  els.exportDayFilter.value = savedD;
  els.exportDayFilter.addEventListener('change', () => {
    localStorage.setItem('plano4s:exportDay', els.exportDayFilter.value);
  });
}

els.clearBtn.addEventListener('click', () => {
  if (!confirm('Tem certeza que deseja limpar todo o progresso salvo localmente?')) return;
  Object.keys(localStorage).filter(k => k.startsWith('plano4s:')).forEach(k => localStorage.removeItem(k));
  render();
});

// Export JSON
if (els.exportJsonBtn) {
  els.exportJsonBtn.addEventListener('click', () => {
    const data = {};
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('plano4s:')) data[k] = localStorage.getItem(k);
    });
    const payload = { version: '1', exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'progresso-plano-4-semanas.json'; a.click();
    URL.revokeObjectURL(url);
  });
}

// Import JSON
if (els.importJsonBtn && els.importJsonInput) {
  els.importJsonBtn.addEventListener('click', () => { els.importJsonInput.click(); });
  els.importJsonInput.addEventListener('change', async () => {
    const file = els.importJsonInput.files && els.importJsonInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const data = payload && payload.data ? payload.data : payload;
      let count = 0;
      Object.keys(data).forEach(k => {
        if (String(k).startsWith('plano4s:')) { localStorage.setItem(k, data[k]); count++; }
      });
      alert(`Importados ${count} itens.`);
      render();
    } catch (e) {
      console.error(e);
      alert('Falha ao importar JSON.');
    } finally {
      els.importJsonInput.value = '';
    }
  });
}

// Export image slugs
if (els.exportSlugsBtn) {
  els.exportSlugsBtn.addEventListener('click', () => {
    const set = new Set();
    state.plan.forEach(ex => { const slug = slugify(sanitize(ex.Exercicio)); if (slug) set.add(slug); });
    const lines = Array.from(set).sort().map(s => `${s}.webp`);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'slugs-exercicios.txt'; a.click();
    URL.revokeObjectURL(url);
  });
}

// Theme
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('light');
    root.classList.remove('dark');
  }
}

function initTheme() {
  const saved = localStorage.getItem('plano4s:theme');
  applyTheme(saved || '');
  els.themeToggle.addEventListener('click', () => {
    const current = localStorage.getItem('plano4s:theme');
    const next = current === 'light' ? 'dark' : current === 'dark' ? '' : 'light';
    localStorage.setItem('plano4s:theme', next);
    applyTheme(next);
  });
}

// Auto-set today day
(function setDefaultDay() {
  const daysPt = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const today = new Date().getDay();
  const map = { 1: 'Segunda', 2: 'Terça', 4: 'Quinta', 6: 'Sábado' };
  if (map[today]) {
    state.day = map[today];
    els.day.value = state.day;
  }
})();

// Boot
initTheme();
loadCSVs().then(() => render()).catch(err => {
  console.error(err);
  els.exerciseList.innerHTML = '<div class="card">Falha ao carregar CSVs. Verifique se está usando um servidor local (http) e recarregue.</div>';
});

// Timer
(function initTimer(){
  const panel = document.getElementById('timer');
  const toggle = document.getElementById('timer-toggle');
  const display = document.querySelector('.timer-display');
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');
  const presetBtns = document.querySelectorAll('.timer-presets [data-seconds]');
  // Mini timer flutuante
  const fab = document.createElement('button');
  fab.className = 'timer-fab';
  fab.hidden = true;
  fab.addEventListener('click', ()=>{
    try { panel.hidden = false; panel.scrollIntoView({behavior:'smooth', block:'start'}); } catch {}
  });
  document.body.appendChild(fab);

  let remaining = 0; // seconds
  let running = false;
  let rafId = 0;
  let lastTs = 0;

  function fmt(sec){
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const r = (s%60).toString().padStart(2,'0');
    return `${m}:${r}`;
  }
  function updateDisplay(){ display.textContent = fmt(remaining); fab.textContent = fmt(remaining); }
  function updateFab(){ fab.hidden = !(running && remaining > 0); }

  function tick(ts){
    if(!running){ return; }
    if(!lastTs) lastTs = ts;
    const dt = (ts - lastTs)/1000;
    lastTs = ts;
    remaining -= dt;
    if (remaining <= 0){ remaining = 0; running = false; updateDisplay(); updateFab(); notify(); return; }
    updateDisplay();
    updateFab();
    rafId = requestAnimationFrame(tick);
  }
  function start(){ if(remaining<=0) return; if(!running){ running = true; lastTs = 0; cancelAnimationFrame(rafId); rafId = requestAnimationFrame(tick); updateFab(); } }
  function pause(){ running = false; cancelAnimationFrame(rafId); updateFab(); }
  function reset(){ pause(); remaining = 0; updateDisplay(); updateFab(); }
  function setSeconds(s){ remaining = s; updateDisplay(); }
  function notify(){
    try {
      // Beep
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime+0.01);
      o.start(); o.stop(ctx.currentTime+0.2);
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    } catch {}
    // Auto-advance session if enabled and active on Sessão tab
    try {
      const autoAdv = els.sessionAutoAdvance ? els.sessionAutoAdvance.checked : true;
      if (autoAdv && state.view === 'sessao' && state.session && state.session.active) {
        if (state.session.index < state.session.list.length - 1) {
          state.session.index++;
          renderSessao();
        }
      }
    } catch (e) { console.error(e); }
  }

  toggle.addEventListener('click', ()=>{ panel.hidden = !panel.hidden; });
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', reset);
  presetBtns.forEach(b=> b.addEventListener('click', ()=>{ setSeconds(Number(b.dataset.seconds)); }));

  // Configuração de pausas (aquec/prep)
  try {
    const controls = panel.querySelector('.timer-controls');
    if (controls) {
      const cfgWrap = document.createElement('div');
      cfgWrap.className = 'timer-presets';
      const { warmup, prep } = getPauseConfig();

      const wLabel = document.createElement('label'); wLabel.textContent = 'Aquec (s)';
      const wInput = document.createElement('input'); wInput.type = 'number'; wInput.min = '10'; wInput.step = '5'; wInput.value = String(warmup);
      wInput.style.width = '72px';
      wInput.addEventListener('change', ()=>{ setPauseConfig('warmup', wInput.value); });
      wLabel.appendChild(wInput);

      const pLabel = document.createElement('label'); pLabel.textContent = 'Prep (s)';
      const pInput = document.createElement('input'); pInput.type = 'number'; pInput.min = '15'; pInput.step = '5'; pInput.value = String(prep);
      pInput.style.width = '72px';
      pInput.addEventListener('change', ()=>{ setPauseConfig('prep', pInput.value); });
      pLabel.appendChild(pInput);

      cfgWrap.appendChild(wLabel);
      cfgWrap.appendChild(pLabel);
      controls.appendChild(cfgWrap);
    }
  } catch (e) { console.error(e); }

  // Predefine com base no exercício atual (Pausa) quando trocar dia/semana
  const oldRenderTreino = renderTreino;
  renderTreino = function(){
    oldRenderTreino();
    // Tenta capturar pausa padrão (ex.: "2:00") do primeiro exercício do dia
    const list = state.plan.filter(x => sanitize(x.Dia) === state.day);
    if (list.length){
      const p = String(list[0].Pausa||'');
      const m = p.match(/(\d+):(\d+)/);
      if (m){ setSeconds(parseInt(m[1],10)*60 + parseInt(m[2],10)); }
    }
  }

  // Inicial
  setSeconds(120);
  updateDisplay();
  updateFab();

  // expose minimal API
  window.timerControl = {
    setSeconds: (s)=>{ setSeconds(s); },
    startSeconds: (s)=>{ setSeconds(s); start(); },
    start, pause, reset
  };
})();

// Modal handlers
els.imgModalClose.addEventListener('click', ()=>{ els.imgModal.setAttribute('hidden',''); });
els.imgModal.addEventListener('click', (e)=>{ if (e.target === els.imgModal) els.imgModal.setAttribute('hidden',''); });

// QR modal handlers
(function initQR(){
  const btn = document.getElementById('qr-btn');
  const modal = document.getElementById('qr-modal');
  const close = document.getElementById('qr-modal-close');
  if (!btn || !modal || !close) return;
  btn.addEventListener('click', ()=>{ modal.removeAttribute('hidden'); });
  close.addEventListener('click', ()=>{ modal.setAttribute('hidden',''); });
  modal.addEventListener('click', (e)=>{ if (e.target === modal) modal.setAttribute('hidden',''); });
})();

// PWA install prompt (Android/Chrome)
let deferredPrompt = null;
const installBtn = document.getElementById('install-btn');
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    const ev = deferredPrompt;
    deferredPrompt = null;
    try { await ev.prompt(); } catch {}
    installBtn.hidden = true;
  });
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

// Session settings: auto-advance toggle
if (els.sessionAutoAdvance) {
  const pref = localStorage.getItem('plano4s:autoAdvance');
  const enabled = (pref == null) ? true : pref === '1';
  els.sessionAutoAdvance.checked = enabled;
  els.sessionAutoAdvance.addEventListener('change', ()=>{
    localStorage.setItem('plano4s:autoAdvance', els.sessionAutoAdvance.checked ? '1' : '0');
  });
}
