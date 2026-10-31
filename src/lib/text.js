// Text and statistics helpers shared by the research, profile, content and analytics modules.

export const STOPWORDS = new Set(('a an the and or but if then so to of in on for with at by from as is are was were be been being it its this that these those '
  + 'i me my we our you your they them their he she his her not no do does did have has had can could will would should just very really '
  + 'into out up about over than too also more most all any some what which who how when where why there here get got').split(' '));

export const normalise = (s) => String(s ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}'%₹$ ]+/gu, ' ').replace(/\s+/g, ' ').trim();

export const words = (s) => normalise(s).split(' ').filter(Boolean);

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function mean(values) {
  const v = values.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Ratio that returns null (shown as "n/a") instead of dividing by zero. */
export const ratio = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b > 0 ? a / b : null);

export const pct = (v, digits = 1) => (v === null || v === undefined ? 'n/a' : `${(v * 100).toFixed(digits)}%`);
export const fmt = (v, digits = 0) => (v === null || v === undefined ? 'n/a' : Number(v).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }));

/** Does `text` contain `phrase` as whole words (case/punctuation-insensitive)? */
export function containsPhrase(text, phrase) {
  const p = normalise(phrase);
  if (!p) return false;
  return ` ${normalise(text)} `.includes(` ${p} `);
}

/** Recurring 2- and 3-word sequences (without stopword edges) across documents; count = number of documents. */
export function recurringNgrams(docs, { min = 2, sizes = [2, 3] } = {}) {
  const counts = new Map();
  for (const doc of docs) {
    const w = words(doc);
    const seen = new Set();
    for (const n of sizes) {
      for (let i = 0; i + n <= w.length; i += 1) {
        const g = w.slice(i, i + n);
        if (STOPWORDS.has(g[0]) || STOPWORDS.has(g[n - 1])) continue;
        seen.add(g.join(' '));
      }
    }
    for (const g of seen) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const out = [...counts].filter(([, c]) => c >= min).map(([phrase, count]) => ({ phrase, count }));
  // Drop a bigram when a trigram containing it has the same count (keep the more specific phrase).
  return out
    .filter((a) => !out.some((b) => b.phrase !== a.phrase && b.count === a.count && b.phrase.includes(a.phrase)))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));
}

/** Sum ignoring null/undefined. */
export const sum0 = (values) => values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
