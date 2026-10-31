// Steps 3-4 of the playbook: four content buckets, idea prompts from research, a post checker and visual matching.
import { BUCKETS, BUCKET_IDS, LIMITS, VISUAL_RULES } from './constants.js';
import { containsPhrase, normalise } from './text.js';
import { addDays, startOfWeek, diffDays } from './dates.js';
import { classifyHook } from './research.js';

export function recommendVisual(kind) {
  return VISUAL_RULES.find((r) => r.kind === kind) ?? VISUAL_RULES.at(-1);
}

/**
 * Idea prompts built from research. Each is a prompt to write from, with its source shown — never a finished post.
 * Returns [{ bucket, prompt, source }].
 */
export function ideaPrompts(ws, bank) {
  const out = [];
  const role = mostCommon(ws.buyers.map((b) => b.role).filter(Boolean)) || 'your buyer';
  for (const p of bank.pains.slice(0, 4)) {
    out.push({ bucket: 'problems', prompt: `The mistake most ${plural(role)} make with “${p.text}” — and what to do instead`, source: `Pain named by ${p.count} buyer(s)` });
  }
  for (const t of bank.tried.slice(0, 3)) {
    out.push({ bucket: 'problems', prompt: `Why “${t.text}” didn’t fix it — the decision ${plural(role)} actually face`, source: `Already tried by ${t.count} buyer(s)` });
  }
  for (const o of ws.outsideIdeas.slice(0, 3)) {
    out.push({ bucket: o.bucket, prompt: `${o.summary}${o.myTake ? ` → my take: ${o.myTake}` : ' → add your opinion'}`, source: `${o.source} post you saved` });
  }
  for (const p of bank.pains.slice(0, 3)) {
    out.push({ bucket: 'expertise', prompt: `Checklist: how I solve “${p.text}” in 5 steps`, source: 'Turn a pain into a tutorial' });
  }
  out.push({ bucket: 'proof', prompt: 'Before → after: one client’s starting point, what you changed, and the result (with their permission)', source: 'Case-study template' });
  out.push({ bucket: 'proof', prompt: 'What happened in my business this week — a decision, a mistake, a win', source: 'Work-story template' });
  return out;
}

function mostCommon(list) {
  const m = new Map();
  list.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
}
const plural = (role) => (/s$/i.test(role) ? role : `${role}s`);

/**
 * Check a post draft. Returns [{ id, level:'good'|'warn'|'bad', message }].
 * Rules are deliberately simple and explainable; they are guidance, not guarantees of reach.
 */
export function lintPost(post, { phrases = [] } = {}) {
  const hook = String(post.hook ?? '').trim();
  const body = String(post.body ?? '');
  const full = hook ? `${hook}\n\n${body}` : body;
  const issues = [];
  const add = (id, level, message) => issues.push({ id, level, message });
  if (!hook) add('hook-missing', 'bad', 'Add a hook — the first line is all most people see.');
  else if (hook.length > 140) add('hook-long', 'warn', `Hook is ${hook.length} characters. Under ~140 keeps it to one or two lines on a phone.`);
  else add('hook-ok', 'good', `Hook type: ${classifyHook(hook)} (${hook.length} characters).`);
  if (full.length > LIMITS.post) add('too-long', 'bad', `Post is ${full.length} characters; LinkedIn allows ${LIMITS.post}.`);
  const preview = full.slice(0, LIMITS.postPreview);
  if (full.length > LIMITS.postPreview && !preview.includes('\n')) add('preview-wall', 'warn', 'The preview before “see more” is one block of text. Break the hook onto its own line.');
  const paras = body.split(/\n\s*\n/).filter((p) => p.trim());
  const longest = Math.max(0, ...paras.map((p) => p.trim().split(/\s+/).length));
  if (longest > 60) add('dense', 'warn', `Longest paragraph is ${longest} words. Short paragraphs read better on a phone.`);
  const tags = (full.match(/(^|\s)#\w+/g) ?? []).length;
  if (tags > 5) add('hashtags', 'warn', `${tags} hashtags — 3 or fewer keeps the post readable.`);
  if (/https?:\/\//.test(full)) add('link', 'warn', 'Contains a link. Some creators put links in the first comment instead — test it against your own numbers.');
  const used = phrases.filter((p) => containsPhrase(full, p));
  if (phrases.length) {
    add('buyer-words', used.length ? 'good' : 'warn', used.length ? `Uses buyer language: ${used.slice(0, 3).map((u) => `“${u}”`).join(', ')}.` : 'No phrases from your buyer research. Use their words, not yours.');
  }
  const ending = body.trim().split('\n').slice(-3).join(' ');
  if (!ending.includes('?') && !/\b(comment|dm|reply|tell me|book|follow|save this|repost|share)\b/.test(normalise(ending))) {
    add('cta', 'warn', 'No ending prompt. Close with a question or a clear next step.');
  }
  const rule = recommendVisual(post.kind);
  if (post.visual && rule.visual !== post.visual && !(rule.visual === 'carousel' && post.visual === 'infographic')) {
    add('visual', 'warn', `For ${rule.label.toLowerCase()}: ${rule.advice}`);
  }
  return issues;
}

/** Planned bucket mix vs target, for posts dated within [from, from+days). */
export function bucketMix(posts, target, from, days = 28) {
  const inRange = posts.filter((p) => p.date && diffDays(from, p.date) >= 0 && diffDays(from, p.date) < days);
  const total = inRange.length;
  return BUCKETS.map((b) => {
    const count = inRange.filter((p) => p.bucket === b.id).length;
    const share = total ? count / total : null;
    const want = (target[b.id] ?? 0) / 100;
    return { bucket: b.id, label: b.short, count, share, target: want, gap: share === null ? null : share - want };
  });
}

/** Week-by-week calendar slots (Mon-start) for `weeks` weeks from `today`, with the posts in each. */
export function calendar(posts, today, weeks = 4) {
  const start = startOfWeek(today);
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDays(start, i * 7);
    const items = posts.filter((p) => p.date && diffDays(from, p.date) >= 0 && diffDays(from, p.date) < 7).sort((a, b) => a.date.localeCompare(b.date));
    return { from, to: addDays(from, 6), items };
  });
}

/** Which bucket is most under target in the planning window — suggested for the next post. */
export function nextBucket(posts, target, from) {
  const mix = bucketMix(posts, target, from);
  const total = mix.reduce((s, m) => s + m.count, 0);
  if (!total) return BUCKET_IDS[0];
  return [...mix].sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))[0].bucket;
}
