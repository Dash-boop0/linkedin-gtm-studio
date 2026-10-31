// Step 6 of the playbook: see what works, double down on it, cut what doesn't. Metrics are entered or imported
// from your own LinkedIn analytics — nothing is scraped.
import { median, ratio, sum0 } from './text.js';
import { classifyHook } from './research.js';

/** Engagement rate = (reactions + comments + reposts) / impressions. null when impressions are missing or zero. */
export function engagementRate(m) {
  if (!m || !(m.impressions > 0)) return null;
  const parts = [m.reactions, m.comments, m.reposts];
  if (parts.every((x) => x === null || x === undefined)) return null;
  return sum0(parts) / m.impressions;
}

export const publishedWithMetrics = (posts) => posts.filter((p) => p.status === 'published' && engagementRate(p.metrics) !== null);

export function totals(posts) {
  const pub = posts.filter((p) => p.status === 'published');
  const t = (k) => sum0(pub.map((p) => p.metrics?.[k]));
  const measured = publishedWithMetrics(posts);
  return {
    published: pub.length,
    measured: measured.length,
    impressions: t('impressions'),
    profileViews: t('profileViews'),
    inbound: t('inbound'),
    medianER: median(measured.map((p) => engagementRate(p.metrics))),
    inboundPer1k: ratio(t('inbound') * 1000, t('impressions')),
  };
}

/**
 * Group measured posts by a dimension and give each group a verdict relative to the overall median.
 * verdict: 'double-down' (median ≥ 1.2× overall), 'cut' (≤ 0.8×), 'keep', or 'need-data' (n < minSample).
 */
export function performanceBy(posts, dimension, { minSample = 3 } = {}) {
  const measured = publishedWithMetrics(posts);
  const overall = median(measured.map((p) => engagementRate(p.metrics)));
  const keyOf = (p) => (dimension === 'hookType' ? classifyHook(p.hook) : p[dimension] || 'other');
  const groups = new Map();
  for (const p of measured) {
    const k = keyOf(p);
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return [...groups].map(([key, list]) => {
    const med = median(list.map((p) => engagementRate(p.metrics)));
    const rel = ratio(med, overall);
    let verdict = 'keep';
    if (list.length < minSample) verdict = 'need-data';
    else if (rel !== null && rel >= 1.2) verdict = 'double-down';
    else if (rel !== null && rel <= 0.8) verdict = 'cut';
    return { key, n: list.length, medianER: med, relative: rel, inbound: sum0(list.map((p) => p.metrics.inbound)), verdict };
  }).sort((a, b) => (b.medianER ?? -1) - (a.medianER ?? -1));
}

export const VERDICT_TEXT = {
  'double-down': 'Double down',
  cut: 'Cut back',
  keep: 'Keep testing',
  'need-data': 'Need more posts',
};
