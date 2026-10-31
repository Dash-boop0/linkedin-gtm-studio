// CSV import/export for the three tables people usually keep in spreadsheets. Templates live in sample-data/.
import { parseCSVObjects, objectsToCSV } from './csv.js';
import { newId, toCount, toList } from './model.js';
import { parseFlexibleDate } from './dates.js';
import { BUCKET_IDS, VISUALS, POST_KINDS } from './constants.js';
import { normalise } from './text.js';
import { engagementRate } from './analytics.js';
import { classifyHook } from './research.js';

export const TEMPLATES = {
  buyers: ['name', 'role', 'company', 'url', 'pains', 'tried', 'phrases', 'notes'],
  compPosts: ['competitor', 'date', 'topic', 'angle', 'hook', 'graphic', 'reactions', 'comments', 'reposts', 'url'],
  posts: ['date', 'title', 'bucket', 'kind', 'visual', 'hook', 'impressions', 'reactions', 'comments', 'reposts', 'profile_views', 'inbound'],
};

const REQUIRED = { buyers: ['name'], compPosts: ['competitor', 'hook'], posts: ['title'] };

function rowsFrom(text, kind) {
  const { records: rows, headers } = parseCSVObjects(text);
  const missing = REQUIRED[kind].filter((h) => !headers.includes(h));
  return { rows, headers, missing };
}

/** Buyers CSV: list fields (pains/tried/phrases) are separated by ";" inside the cell. Dedup by name+company. */
export function importBuyers(ws, text) {
  const { rows, missing } = rowsFrom(text, 'buyers');
  if (missing.length) return { ok: false, errors: [`Missing column(s): ${missing.join(', ')}.`] };
  const errors = [];
  const key = (b) => `${normalise(b.name)}|${normalise(b.company)}`;
  const existing = new Set(ws.buyers.map(key));
  const added = [];
  rows.forEach((r) => {
    if (!String(r.name ?? '').trim()) { errors.push(`Row ${r._line}: name is required.`); return; }
    const b = { id: newId('buyer'), name: r.name.trim(), role: r.role ?? '', company: r.company ?? '', url: r.url ?? '', pains: toList(r.pains), tried: toList(r.tried), phrases: toList(r.phrases), notes: r.notes ?? '' };
    if (existing.has(key(b))) { errors.push(`Row ${r._line}: ${b.name} already exists — skipped.`); return; }
    existing.add(key(b));
    added.push(b);
  });
  return { ok: true, ws: { ...ws, buyers: [...ws.buyers, ...added] }, added: added.length, errors };
}

/** Competitor posts CSV: competitors are matched by name (created if new). */
export function importCompPosts(ws, text) {
  const { rows, missing } = rowsFrom(text, 'compPosts');
  if (missing.length) return { ok: false, errors: [`Missing column(s): ${missing.join(', ')}.`] };
  const errors = [];
  const competitors = [...ws.competitors];
  const byName = new Map(competitors.map((c) => [normalise(c.name), c]));
  const added = [];
  rows.forEach((r) => {
    const name = String(r.competitor ?? '').trim();
    if (!name || !String(r.hook ?? '').trim()) { errors.push(`Row ${r._line}: competitor and hook are required.`); return; }
    let c = byName.get(normalise(name));
    if (!c) { c = { id: newId('comp'), name, url: '', audience: '' }; competitors.push(c); byName.set(normalise(name), c); }
    const date = r.date ? parseFlexibleDate(r.date) : '';
    if (r.date && !date) errors.push(`Row ${r._line}: could not read date "${r.date}" — left blank.`);
    added.push({ id: newId('cp'), competitorId: c.id, date: date || '', topic: r.topic ?? '', angle: r.angle || 'other', hook: r.hook.trim(), graphic: r.graphic || 'text-only', reactions: toCount(r.reactions), comments: toCount(r.comments), reposts: toCount(r.reposts), url: r.url ?? '' });
  });
  return { ok: true, ws: { ...ws, competitors, compPosts: [...ws.compPosts, ...added] }, added: added.length, errors };
}

/**
 * Your post metrics CSV (copied from LinkedIn's post analytics). Rows matching an existing post by title (or by
 * date + hook) update its metrics and mark it published; others are added as published posts.
 */
export function importPostMetrics(ws, text) {
  const { rows, missing } = rowsFrom(text, 'posts');
  if (missing.length) return { ok: false, errors: [`Missing column(s): ${missing.join(', ')}.`] };
  const errors = [];
  const posts = ws.posts.map((p) => ({ ...p, metrics: { ...p.metrics } }));
  let updated = 0;
  let added = 0;
  rows.forEach((r) => {
    const title = String(r.title ?? '').trim();
    if (!title) { errors.push(`Row ${r._line}: title is required.`); return; }
    const date = r.date ? parseFlexibleDate(r.date) : '';
    const metrics = { impressions: toCount(r.impressions), reactions: toCount(r.reactions), comments: toCount(r.comments), reposts: toCount(r.reposts), profileViews: toCount(r.profile_views), inbound: toCount(r.inbound) };
    const match = posts.find((p) => normalise(p.title) === normalise(title)) ?? posts.find((p) => date && p.date === date && r.hook && normalise(p.hook) === normalise(r.hook));
    if (match) {
      Object.assign(match.metrics, Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== null)));
      match.status = 'published';
      if (date) match.date = date;
      updated += 1;
    } else {
      posts.push({ id: newId('post'), date: date || '', title, bucket: BUCKET_IDS.includes(r.bucket) ? r.bucket : 'problems', kind: POST_KINDS.includes(r.kind) ? r.kind : 'opinion', visual: VISUALS.includes(r.visual) ? r.visual : 'text-only', status: 'published', hook: r.hook ?? '', body: '', metrics });
      added += 1;
    }
  });
  return { ok: true, ws: { ...ws, posts }, added, updated, errors };
}

export function exportPostsCSV(ws) {
  const rows = ws.posts.map((p) => ({ date: p.date, title: p.title, bucket: p.bucket, kind: p.kind, visual: p.visual, status: p.status, hook: p.hook, hook_type: classifyHook(p.hook), impressions: p.metrics.impressions, reactions: p.metrics.reactions, comments: p.metrics.comments, reposts: p.metrics.reposts, profile_views: p.metrics.profileViews, inbound: p.metrics.inbound, engagement_rate: engagementRate(p.metrics)?.toFixed(4) ?? '' }));
  return objectsToCSV(rows, ['date', 'title', 'bucket', 'kind', 'visual', 'status', 'hook', 'hook_type', 'impressions', 'reactions', 'comments', 'reposts', 'profile_views', 'inbound', 'engagement_rate']);
}

export function exportLanguageCSV(bank) {
  const rows = [
    ...bank.pains.map((x) => ({ type: 'pain', text: x.text, buyers: x.count })),
    ...bank.tried.map((x) => ({ type: 'tried', text: x.text, buyers: x.count })),
    ...bank.phrases.map((x) => ({ type: 'phrase', text: x.text, buyers: x.count })),
    ...bank.ngrams.map((x) => ({ type: 'recurring-words', text: x.phrase, buyers: x.count })),
  ];
  return objectsToCSV(rows, ['type', 'text', 'buyers']);
}

export const templateCSV = (kind) => `${TEMPLATES[kind].join(',')}\r\n`;
