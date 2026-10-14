import { pickQuestions, score, QUIZ_SIZE } from './quiz.js?v=1';
import * as store from './store.js?v=1';
import { TYPE_LABEL, esc, pct } from './render.js?v=1';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let bank = [], byId = {}, quiz = null, inv = null, notables = null;

nav.innerHTML = `<button data-go="start">Quiz</button><button data-go="index">Index</button><button data-go="stats">Stats</button><button data-go="history">History</button>`;
nav.onclick = e => { setKeys(null); const g = e.target.dataset.go; if (g) ({ start, index, stats, history })[g](); };

async function init() {
  try {
    const res = await fetch('data/questions.json?v=1');
    bank = await res.json();
    byId = Object.fromEntries(bank.map(q => [q.id, q]));
  } catch (e) {
    app.innerHTML = `<div class="card">Could not load questions (${esc(e.message)}). If you opened this file directly, run <code>python3 -m http.server</code> in this folder.</div>`;
    return;
  }
  const saved = store.load('current', null);
  saved && saved.questions?.length && saved.idx < saved.questions.length ? resumePrompt(saved) : start();
}

function resumePrompt(saved) {
  app.innerHTML = `<div class="card"><p>You have a quiz in progress (question ${saved.idx + 1} of ${saved.questions.length}).</p>
  <div class="row"><button class="primary" id="res">Resume</button><button id="new">Start over</button></div></div>`;
  document.getElementById('res').onclick = () => { quiz = saved; showQuestion(); };
  document.getElementById('new').onclick = () => { store.clear('current'); start(); };
}

const chapterOptions = () => Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');

function start() {
  const s = store.getSettings();
  const missed = missedIds();
  const count = t => bank.filter(q => t.includes(q.type)).length;
  app.innerHTML = `<div class="card"><h2>Take a quiz</h2>
  <p>${QUIZ_SIZE} random questions from a bank of ${bank.length}: ${count(['which_chapter'])} “which chapter”, ${count(['who_said', 'context'])} quotes, ${count(['fill_blank'])} fill-in-the-blank.</p>
  <label>Question type <select id="t"><option value="all">All types</option><option value="which_chapter">Which chapter</option><option value="quotes">Who said / context</option><option value="fill_blank">Fill in the blank</option></select></label>
  <div class="range"><label>Chapters <select id="fr">${chapterOptions()}</select></label><label>to <select id="to">${chapterOptions()}</select></label></div>
  <label><input type="checkbox" id="f"> Focus mode (favor unseen and previously missed)</label>
  <div class="row"><button class="primary" id="go">Start quiz</button>
  <button id="miss" ${missed.length ? '' : 'disabled'}>Retry missed (${missed.length})</button></div></div>`;
  t.value = s.type; fr.value = s.from; to.value = s.to; f.checked = s.focus;
  go.onclick = () => {
    const a = +fr.value, b = +to.value;
    begin({ type: t.value, from: Math.min(a, b), to: Math.max(a, b), focus: f.checked });
  };
  miss.onclick = () => begin({ ...store.getSettings(), type: 'all', from: 1, to: 28, focus: false, only: missed });
}

function missedIds() { const g = store.lastGrades(); return Object.keys(g).filter(id => g[id] === 'missed' && byId[id]); }

function begin(opts) {
  if (!opts.only) store.saveSettings({ type: opts.type, from: opts.from, to: opts.to, focus: opts.focus });
  const qs = pickQuestions(bank, opts, store.lastGrades());
  if (!qs.length) { app.innerHTML = '<div class="card">No questions match those filters.</div>'; return; }
  quiz = { questions: qs.map(q => q.id), idx: 0, answers: [], startedAt: Date.now() };
  store.save('current', quiz);
  showQuestion();
}

// Keyboard: Cmd/Ctrl+Enter reveals the answer; then g / p / m grade it.
let keyHandler = null;
function setKeys(fn) {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = fn;
  if (fn) document.addEventListener('keydown', fn);
}

function showQuestion(revealed = false, typed = '') {
  const q = byId[quiz.questions[quiz.idx]];
  app.innerHTML = `<div class="card"><div class="meta">Question ${quiz.idx + 1} of ${quiz.questions.length} · ${esc(TYPE_LABEL[q.type])}</div>
  <p class="q">${esc(q.question)}</p>
  <label class="meta" for="typed">Your answer (optional, not auto-graded) · ⌘/Ctrl+Enter to submit</label>
  <textarea id="typed">${esc(typed)}</textarea>
  <div id="reveal"></div></div>`;
  const reveal = () => {
    const ta = document.getElementById('typed');
    const typedNow = ta.value;
    ta.readOnly = true; ta.blur();
    document.getElementById('reveal').innerHTML = `<div class="answer"><strong>Answer:</strong> ${esc(q.answer)}
    <div class="meta">${esc(q.reference)}</div></div>
    <p>How did you do?</p><div class="row"><button data-g="got" class="good">Got it (G)</button><button data-g="partly" class="part">Partly (P)</button><button data-g="missed" class="bad">Missed (M)</button></div>`;
    setKeys(e => {
      const g = { g: 'got', p: 'partly', m: 'missed' }[e.key.toLowerCase()];
      if (g && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setKeys(null); grade(q, g, typedNow); }
    });
    document.getElementById('reveal').onclick = e => { const g = e.target.dataset.g; if (g) grade(q, g, typedNow); };
  };
  document.getElementById('reveal').innerHTML = '<div class="row"><button class="primary" id="show">Show answer</button></div>';
  document.getElementById('show').onclick = reveal;
  document.getElementById('typed').focus();
  setKeys(e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); reveal(); }
  });
}

function grade(q, g, typed) {
  setKeys(null);
  quiz.answers.push({ id: q.id, grade: g, typed });
  quiz.idx++;
  quiz.idx >= quiz.questions.length ? finish() : (store.save('current', quiz), showQuestion());
}

function finish() {
  const result = { date: Date.now(), answers: quiz.answers, score: score(quiz.answers), total: quiz.questions.length };
  store.addResult(result);
  store.clear('current');
  showResult(result);
}

function showResult(r) {
  const rows = r.answers.map(a => { const q = byId[a.id]; return q ? `<tr><td>${esc(q.question)}<div class="meta">${esc(q.answer)} (${esc(q.reference)})</div></td>
    <td class="${a.grade === 'got' ? 'good' : a.grade === 'partly' ? 'part' : 'bad'}">${a.grade}</td></tr>` : ''; }).join('');
  app.innerHTML = `<div class="card"><h2>Score: ${r.score} / ${r.total}</h2><div class="bar"><i style="width:${pct(r.score, r.total)}%"></i></div>
  <table class="idx">${rows}</table><div class="row"><button class="primary" id="again">New quiz</button></div></div>`;
  document.getElementById('again').onclick = start;
}

// Browse the inventory of passages, quotes, verses, names and events.
async function index() {
  if (!inv) {
    try {
      [inv, notables] = await Promise.all(['inventory', 'notables'].map(f => fetch(`data/${f}.json?v=1`).then(r => r.json())));
    } catch (e) { app.innerHTML = `<div class="card">Could not load the index (${esc(e.message)}).</div>`; return; }
  }
  const ch = ref => +ref.split(':')[0];
  const chapters = Array.from({ length: 28 }, (_, i) => i + 1).map(c => {
    const rows = inv.filter(p => ch(p.ref) === c).map(p => `<tr><td><span class="tag ${p.type}">${p.type}</span> <strong>${esc(p.title)}</strong>
      <div class="meta">${esc(p.summary)}</div></td><td>${esc(p.ref)}</td></tr>`).join('');
    return `<details><summary>Chapter ${c}</summary><table class="idx">${rows}</table></details>`;
  }).join('');
  const quotes = notables.quotes.slice().sort((a, b) => ch(a.ref) - ch(b.ref) || parseInt(a.ref.split(':')[1]) - parseInt(b.ref.split(':')[1]))
    .map(q => `<tr><td>“${esc(q.text)}”<div class="meta">${esc(q.speaker)}</div></td><td>${esc(q.ref)}</td></tr>`).join('');
  const verses = notables.verses.map(v => `<tr><td>${esc(v.text.replace(/\[\[|\]\]/g, ''))}</td><td>${esc(v.ref)}</td></tr>`).join('');
  const names = kind => notables.names.filter(n => n.kind === kind).map(n => `<tr><td><strong>${esc(n.name)}</strong><div class="meta">${esc(n.note)}</div></td><td>${esc(n.refs)}</td></tr>`).join('');
  const events = notables.events.map(e => `<tr><td>${esc(e.event)}</td><td>${esc(e.ref)}</td></tr>`).join('');
  const n = t => inv.filter(p => p.type === t).length;
  app.innerHTML = `<div class="card"><h2>Index of Matthew</h2>
  <p class="meta">${inv.length} passages (${n('story')} stories, ${n('parable')} parables, ${n('teaching')} teachings) covering all 1,071 verses.</p>
  <h3>Stories, parables and teachings</h3>${chapters}
  <details><summary>Notable quotes (${notables.quotes.length})</summary><table class="idx">${quotes}</table></details>
  <details><summary>Notable verses (${notables.verses.length})</summary><table class="idx">${verses}</table></details>
  <details><summary>People (${notables.names.filter(x => x.kind === 'person').length})</summary><table class="idx">${names('person')}</table></details>
  <details><summary>Places (${notables.names.filter(x => x.kind === 'place').length})</summary><table class="idx">${names('place')}</table></details>
  <details><summary>Key events (${notables.events.length})</summary><table class="idx">${events}</table></details></div>`;
}

function history() {
  const h = store.getHistory();
  app.innerHTML = `<div class="card"><h2>History</h2>${h.length ? '' : '<p>No quizzes yet.</p>'}
  <table class="idx">${h.map((r, i) => `<tr><td><button data-i="${i}">${new Date(r.date).toLocaleString()}</button></td><td>${r.score} / ${r.total}</td></tr>`).join('')}</table>
  <div class="row"><button id="exp">Export</button><button id="imp">Import</button></div><textarea id="io" hidden></textarea></div>`;
  app.querySelector('table').onclick = e => { const i = e.target.dataset.i; if (i != null) showResult(h[i]); };
  exp.onclick = () => { io.hidden = false; io.value = store.exportData(); io.select(); };
  imp.onclick = () => {
    if (io.hidden) { io.hidden = false; io.value = ''; io.placeholder = 'Paste exported JSON, then click Import again'; return; }
    try { store.importData(io.value); history(); } catch (e) { alert('Import failed: ' + e.message); }
  };
}

function stats() {
  const h = store.getHistory();
  const agg = (keyFn) => {
    const m = {};
    for (const r of h) for (const a of r.answers) { const q = byId[a.id]; if (!q) continue; const k = keyFn(q); (m[k] ||= { n: 0, pts: 0 }); m[k].n++; m[k].pts += { got: 1, partly: .5, missed: 0 }[a.grade]; }
    return Object.entries(m).filter(([, v]) => v.n >= 3).sort((a, b) => a[1].pts / a[1].n - b[1].pts / b[1].n)
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${pct(v.pts, v.n)}%</td><td>${v.n}</td></tr>`).join('') || '<tr><td colspan=3 class="meta">Not enough data yet (3+ attempts per row).</td></tr>';
  };
  const sec = (title, fn) => `<h3>${title}</h3><table><tr><th></th><th>Accuracy</th><th>Tries</th></tr>${agg(fn)}</table>`;
  app.innerHTML = `<div class="card"><h2>Weak areas</h2>${sec('By question type', q => TYPE_LABEL[q.type])}${sec('By section', q => q.section)}
  ${sec('By chapter', q => `Chapter ${q.chapter}`)}</div>`;
}

init();
