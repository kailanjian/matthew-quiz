export const TYPE_LABEL = { which_chapter: 'Which chapter', who_said: 'Who said', context: 'Context', fill_blank: 'Fill in the blank' };

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
