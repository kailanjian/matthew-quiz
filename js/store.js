const P = 'mq:v1:';
export function load(key, fallback) {
  try { const v = localStorage.getItem(P + key); return v == null ? fallback : JSON.parse(v); }
  catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(P + key, JSON.stringify(value)); } catch { /* private mode etc. */ }
}
export function clear(key) { try { localStorage.removeItem(P + key); } catch {} }

export const getSettings = () => ({ type: 'all', from: 1, to: 28, focus: false, ...load('settings', {}) });
export const saveSettings = s => save('settings', s);
export const getHistory = () => load('history', []);
export function addResult(result) {
  const h = [result, ...getHistory()].slice(0, 200);
  save('history', h);
}
// Last grade per question id, derived from history (newest first).
export function lastGrades() {
  const out = {};
  for (const r of getHistory().slice().reverse()) for (const a of r.answers) out[a.id] = a.grade;
  return out;
}
export function exportData() {
  return JSON.stringify({ settings: getSettings(), history: getHistory() }, null, 1);
}
export function importData(text) {
  const d = JSON.parse(text);
  if (!Array.isArray(d.history)) throw new Error('No history array found');
  save('history', d.history.slice(0, 200));
  if (d.settings) save('settings', d.settings);
}
