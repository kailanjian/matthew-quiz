export const QUIZ_SIZE = 10;
export const GRADE_POINTS = { got: 1, partly: 0.5, missed: 0 };

// Filter groups: "quotes" covers both who-said and context questions.
export const TYPE_GROUPS = { which_chapter: ['which_chapter'], quotes: ['who_said', 'context'], fill_blank: ['fill_blank'] };

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Efraimidis-Spirakis weighted sampling without replacement.
function weighted(items, weightOf, n, rng) {
  return items
    .map(it => ({ it, k: Math.pow(rng(), 1 / weightOf(it)) }))
    .sort((a, b) => b.k - a.k)
    .slice(0, n)
    .map(x => x.it);
}

export function pickQuestions(bank, { type = 'all', from = 1, to = 28, focus = false, only = null } = {}, grades = {}, rng = Math.random, n = QUIZ_SIZE) {
  const types = TYPE_GROUPS[type];
  let pool = bank.filter(q => (!types || types.includes(q.type)) && q.chapter >= from && q.chapter <= to);
  if (only) pool = pool.filter(q => only.includes(q.id));
  if (!focus) return shuffle(pool, rng).slice(0, n);
  const w = q => ({ undefined: 3, missed: 4, partly: 2, got: 1 })[grades[q.id]] ?? 1;
  return weighted(pool, w, n, rng);
}

export function score(answers) {
  return answers.reduce((s, a) => s + (GRADE_POINTS[a.grade] ?? 0), 0);
}
