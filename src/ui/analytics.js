// Step 6: see what works, double down, cut what doesn't. Metrics come from your own LinkedIn post analytics.
import { totals, performanceBy, engagementRate, VERDICT_TEXT } from '../lib/analytics.js';
import { horizontalBars } from '../lib/charts.js';
import { toCount } from '../lib/model.js';
import { BUCKETS } from '../lib/constants.js';
import { formatDate } from '../lib/dates.js';
import { pct, fmt } from '../lib/text.js';
import { esc, input, select, btn, table, empty } from './h.js';

const DIMS = [['bucket', 'Bucket'], ['hookType', 'Hook type'], ['visual', 'Visual'], ['kind', 'What the post shows']];
const VERDICT_CLS = { 'double-down': 'won', cut: 'lost', keep: '', 'need-data': 'not_contacted' };

export function renderAnalytics(ctx) {
  const ws = ctx.ws();
  const dim = ctx.ui.analyticsDim ?? 'bucket';
  const t = totals(ws.posts);
  const groups = performanceBy(ws.posts, dim, { minSample: ws.settings.minSample });
  const label = (k) => (dim === 'bucket' ? BUCKETS.find((b) => b.id === k)?.short ?? k : k);
  const published = ws.posts.filter((p) => p.status === 'published').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sel = ws.posts.find((p) => p.id === ctx.ui.metricsPost) ?? published[0];
  return `
  <div class="page-head"><div><h1>6 · Measure, double down, cut</h1>
    <p class="muted">Copy each post’s numbers from LinkedIn’s post analytics (or import a CSV on the Data page). Groups need at least ${ws.settings.minSample} posts before a verdict.</p></div></div>
  <div class="kpis">
    <div class="kpi"><div class="label">Published</div><div class="value">${t.published}</div><div class="sub">${t.measured} with metrics</div></div>
    <div class="kpi"><div class="label">Impressions</div><div class="value">${fmt(t.impressions)}</div><div class="sub">sum of measured posts</div></div>
    <div class="kpi"><div class="label">Median engagement rate</div><div class="value">${pct(t.medianER)}</div><div class="sub">(reactions+comments+reposts) ÷ impressions</div></div>
    <div class="kpi"><div class="label">Profile views</div><div class="value">${fmt(t.profileViews)}</div><div class="sub">attributed to posts</div></div>
    <div class="kpi"><div class="label">Inbound leads</div><div class="value">${fmt(t.inbound)}</div><div class="sub">DMs / calls you logged</div></div>
    <div class="kpi"><div class="label">Leads per 1k impressions</div><div class="value">${t.inboundPer1k === null ? 'n/a' : t.inboundPer1k.toFixed(2)}</div><div class="sub">the number that pays</div></div>
  </div>
  <section class="card"><div class="card-head"><h2>What’s working</h2>${select('Compare by', 'dim', dim, DIMS, { attrs: 'data-change="analytics-dim"' })}</div>
    ${groups.length ? `
      <div class="chart-box">${horizontalBars({ title: `Median engagement rate by ${dim}`, items: groups.map((g) => ({ label: `${label(g.key)} (${g.n})`, value: g.medianER ?? 0 })), format: (v) => pct(v) })}</div>
      ${table('Verdict = group median vs overall median: ≥1.2× double down, ≤0.8× cut', [
        { label: 'Group', html: (g) => esc(label(g.key)) },
        { label: 'Posts', num: true, key: 'n' },
        { label: 'Median ER', num: true, html: (g) => pct(g.medianER) },
        { label: 'vs overall', num: true, html: (g) => (g.relative === null ? 'n/a' : `${g.relative.toFixed(2)}×`) },
        { label: 'Inbound', num: true, key: 'inbound' },
        { label: 'Verdict', html: (g) => `<span class="pill ${VERDICT_CLS[g.verdict]}">${VERDICT_TEXT[g.verdict]}</span>` },
      ], groups)}` : empty('No measured posts yet', 'Mark posts as published and add their impressions and reactions below.')}
  </section>
  <section class="card"><div class="card-head"><h2>Enter metrics for a post</h2></div>
    ${published.length ? `<form data-form="metrics" class="form-grid">
      ${select('Post', 'id', sel.id, published.map((p) => [p.id, `${p.date ? `${formatDate(p.date, { year: false })} · ` : ''}${p.title}`]), { full: true, attrs: 'data-change="metrics-post"' })}
      ${['impressions', 'reactions', 'comments', 'reposts', 'profileViews', 'inbound'].map((k) => input({ profileViews: 'Profile views', inbound: 'Inbound leads (DMs/calls)' }[k] ?? k[0].toUpperCase() + k.slice(1), k, sel.metrics[k] ?? '', { type: 'number', attrs: 'min="0"' })).join('')}
      <div class="actions full">${btn('Save metrics', '', { cls: 'primary', type: 'submit' })}</div>
    </form>` : '<p class="muted small">No published posts. Set a post’s status to “published” on the Content page.</p>'}
  </section>
  ${published.length ? `<section class="card"><div class="card-head"><h2>Published posts</h2></div>${table(`${published.length} post(s)`, [
    { label: 'Date', html: (p) => (p.date ? formatDate(p.date) : '—') },
    { label: 'Post', html: (p) => esc(p.title) },
    { label: 'Bucket', html: (p) => esc(BUCKETS.find((b) => b.id === p.bucket)?.short) },
    { label: 'Impr.', num: true, html: (p) => fmt(p.metrics.impressions) },
    { label: 'ER', num: true, html: (p) => pct(engagementRate(p.metrics)) },
    { label: 'Inbound', num: true, html: (p) => fmt(p.metrics.inbound) },
  ], published)}</section>` : ''}`;
}

export const analyticsForms = {
  metrics(ctx, d) {
    const metrics = Object.fromEntries(['impressions', 'reactions', 'comments', 'reposts', 'profileViews', 'inbound'].map((k) => [k, toCount(d[k])]));
    ctx.update((ws) => ({ ...ws, posts: ws.posts.map((p) => (p.id === d.id ? { ...p, metrics } : p)) }), 'Metrics saved.');
  },
};
export const analyticsChanges = {
  'analytics-dim': (ctx, el) => { ctx.ui.analyticsDim = el.value; ctx.render(); },
  'metrics-post': (ctx, el) => { ctx.ui.metricsPost = el.value; ctx.render(); },
};
