// Step 1 of the playbook: buyer language bank and competitor post breakdowns.
import { normalise, median, mean, recurringNgrams } from './text.js';

/**
 * Count how many buyers mention each pain / tried-fix / phrase. Matching is case- and punctuation-insensitive.
 * Returns { pains, tried, phrases, ngrams } — each a list of { text, count, buyers[] } sorted by count.
 */
export function languageBank(buyers) {
  const tally = (field) => {
    const map = new Map();
    for (const b of buyers) {
      const seen = new Set();
      for (const item of b[field] ?? []) {
        const key = normalise(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const e = map.get(key) ?? { text: item.trim(), count: 0, buyers: [] };
        e.count += 1;
        e.buyers.push(b.name || b.id);
        map.set(key, e);
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
  };
  const docs = buyers.map((b) => [...(b.pains ?? []), ...(b.phrases ?? [])].join('. '));
  return { pains: tally('pains'), tried: tally('tried'), phrases: tally('phrases'), ngrams: recurringNgrams(docs, { min: 2 }) };
}

/** Research completeness against the playbook targets. */
export function researchProgress(ws, targets = { buyers: 10, competitors: 5 }) {
  const complete = ws.buyers.filter((b) => b.pains.length && b.phrases.length).length;
  const brokenDown = new Set(ws.compPosts.filter((p) => p.topic && p.angle && p.hook).map((p) => p.competitorId));
  return {
    buyers: ws.buyers.length,
    buyersComplete: complete,
    competitors: ws.competitors.length,
    competitorsBrokenDown: ws.competitors.filter((c) => brokenDown.has(c.id)).length,
    outsideIdeas: ws.outsideIdeas.length,
    targets,
    done: complete >= targets.buyers && brokenDown.size >= targets.competitors,
  };
}

/**
 * Classify a hook (first line of a post) with transparent rules, checked in this order.
 * Returns one of HOOK_TYPES.
 */
export function classifyHook(hook) {
  const h = String(hook ?? '').trim();
  const n = normalise(h);
  if (!n) return 'statement';
  if (/^(stop|don't|dont|never|unpopular opinion|hot take|nobody|everyone is wrong|forget)\b/.test(n) || /\b(is dead|is overrated|myth|wrong about)\b/.test(n)) return 'contrarian';
  if (/^how (to|i|we)\b/.test(n) || /\bhere's how\b/.test(n)) return 'how-to';
  if (/[%₹$]|\b\d+(\.\d+)?\s?(k|m|x|lakh|cr|crore)\b/.test(h.toLowerCase()) && /\b(grew|got|booked|generated|went|increased|cut|saved|from|to|in \d+)\b/.test(n)) return 'result';
  if (h.endsWith('?')) return 'question';
  if (/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/.test(n)) return 'number';
  if (/^(i |i'|we |last (week|month|year)|\d+ (years|months|days) ago|yesterday|today i|when i)/.test(n)) return 'story';
  return 'statement';
}

export const engagementScore = (p, w) => {
  const parts = [['reactions', w.reactions], ['comments', w.comments], ['reposts', w.reposts]];
  if (parts.every(([k]) => p[k] === null || p[k] === undefined)) return null;
  return parts.reduce((s, [k, wt]) => s + (p[k] ?? 0) * wt, 0);
};

/**
 * Group competitor posts by a dimension and rank groups by median weighted engagement.
 * dimension: 'angle' | 'hookType' | 'graphic' | 'topic' | 'competitor'
 */
export function breakdown(ws, dimension, weights) {
  const compName = new Map(ws.competitors.map((c) => [c.id, c.name]));
  const keyOf = (p) => {
    if (dimension === 'hookType') return classifyHook(p.hook);
    if (dimension === 'competitor') return compName.get(p.competitorId) ?? 'Unknown';
    if (dimension === 'topic') return normalise(p.topic) || '(no topic)';
    return p[dimension] || 'other';
  };
  const groups = new Map();
  for (const p of ws.compPosts) {
    const score = engagementScore(p, weights);
    const k = keyOf(p);
    const g = groups.get(k) ?? { key: k, posts: [], scores: [] };
    g.posts.push(p);
    if (score !== null) g.scores.push(score);
    groups.set(k, g);
  }
  return [...groups.values()]
    .map((g) => {
      const best = g.posts.reduce((a, b) => ((engagementScore(b, weights) ?? -1) > (engagementScore(a, weights) ?? -1) ? b : a));
      return { key: g.key, n: g.posts.length, scored: g.scores.length, median: median(g.scores), mean: mean(g.scores), best };
    })
    .sort((a, b) => (b.median ?? -1) - (a.median ?? -1) || b.n - a.n);
}

/** The top-N competitor posts by weighted engagement — the ones worth studying line by line. */
export function topCompetitorPosts(ws, weights, n = 5) {
  return ws.compPosts
    .map((p) => ({ ...p, score: engagementScore(p, weights), hookType: classifyHook(p.hook) }))
    .filter((p) => p.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
