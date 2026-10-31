// Steps 3-4: four content buckets, idea prompts from research, a post editor with checks and visual matching.
import { BUCKETS, POST_STATUSES, VISUALS, VISUAL_RULES, LIMITS, bucketLabel } from '../lib/constants.js';
import { ideaPrompts, lintPost, recommendVisual, bucketMix, calendar, nextBucket } from '../lib/content.js';
import { languageBank, classifyHook } from '../lib/research.js';
import { newId } from '../lib/model.js';
import { formatDate, addDays } from '../lib/dates.js';
import { pct } from '../lib/text.js';
import { esc, input, textarea, select, btn, formData, table, pill } from './h.js';

const phrasesOf = (ws) => languageBank(ws.buyers).phrases.map((p) => p.text);

function lintHTML(post, phrases) {
  const rule = recommendVisual(post.kind);
  const issues = lintPost(post, { phrases });
  return `<p class="small"><strong>Recommended visual:</strong> ${esc(rule.advice)}</p>
    <ul class="checks">${issues.map((i) => `<li class="${i.level === 'good' ? 'pass' : i.level === 'bad' ? 'fail' : 'warn'}"><span class="mark" aria-hidden="true">${i.level === 'good' ? '✓' : i.level === 'bad' ? '✗' : '!'}</span><span>${esc(i.message)}</span></li>`).join('')}</ul>`;
}

function postForm(ctx, p, phrases) {
  const ws = ctx.ws();
  const post = p ?? { id: '', date: addDays(ctx.today(), 1), bucket: nextBucket(ws.posts, ws.settings.bucketMix, addDays(ctx.today(), -13)), kind: 'opinion', visual: 'text-only', status: 'draft', title: '', hook: '', body: '' };
  return `<form data-form="post" data-live="post" class="form-grid">
    <input type="hidden" name="id" value="${esc(post.id)}">
    ${input('Working title', 'title', post.title, { full: true, attrs: 'required' })}
    ${select('Bucket', 'bucket', post.bucket, BUCKETS.map((b) => [b.id, b.label]))}
    ${select('What the post shows', 'kind', post.kind, VISUAL_RULES.map((r) => [r.kind, r.label]))}
    ${select('Visual', 'visual', post.visual, VISUALS)}
    ${select('Status', 'status', post.status, POST_STATUSES)}
    ${input('Date', 'date', post.date, { type: 'date' })}
    ${input('Hook (first line)', 'hook', post.hook, { full: true })}
    ${textarea(`Body (${(post.hook.length + post.body.length)}/${LIMITS.post})`, 'body', post.body, { rows: 10 })}
    <div class="actions full">${btn(post.id ? 'Save post' : 'Add post', '', { cls: 'primary', type: 'submit' })}${post.id ? btn('Cancel', 'cancel-edit') + btn('Delete', 'delete', { cls: 'danger', data: { type: 'posts', id: post.id } }) : ''}</div>
  </form>
  <div id="lint" class="mt" aria-live="polite">${lintHTML(post, phrases)}</div>`;
}

export function renderContent(ctx) {
  const ws = ctx.ws();
  const today = ctx.today();
  const phrases = phrasesOf(ws);
  const bank = languageBank(ws.buyers);
  const mix = bucketMix(ws.posts, ws.settings.bucketMix, addDays(today, -13), 28);
  const ideas = ideaPrompts(ws, bank);
  const cal = calendar(ws.posts, today, 4);
  const editing = ws.posts.find((p) => p.id === ctx.ui.edit?.post);
  const filter = ctx.ui.postFilter ?? 'planned';
  const shown = ws.posts.filter((p) => (filter === 'all' ? true : filter === 'planned' ? p.status !== 'published' : p.status === filter))
    .sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const next = nextBucket(ws.posts, ws.settings.bucketMix, addDays(today, -13));

  return `
  <div class="page-head"><div><h1>3–4 · Content buckets and visuals</h1>
    <p class="muted">Four buckets, each fed by your research. Every post gets a visual that fits what it shows. Mix below covers the 28 days from ${formatDate(addDays(today, -13), { year: false })}.</p></div>
    <div class="chips">${pill(`Next post: ${bucketLabel(next)}`)}</div></div>

  <div class="buckets">${BUCKETS.map((b) => {
    const m = mix.find((x) => x.bucket === b.id);
    return `<section class="card bucket" style="--bucket:${b.color}"><h2>${esc(b.label)}</h2><p class="small muted">${esc(b.help)}</p>
      <p class="small"><strong class="tabular">${m.count}</strong> post(s) · ${pct(m.share, 0)} of mix · target ${pct(m.target, 0)}</p></section>`;
  }).join('')}</div>

  <div class="grid grid-2 mt">
    <section class="card"><div class="card-head"><h2>${editing ? 'Edit post' : 'New post'}</h2></div>${postForm(ctx, editing, phrases)}</section>
    <section class="card"><div class="card-head"><h2>Idea prompts from your research</h2></div>
      <p class="muted small">Starting points built from buyer pains, what they tried and the ideas you saved — write the post in your own voice.</p>
      ${ideas.length ? `<ul class="timeline">${ideas.map((i, n) => `<li><div class="row-between"><span><span class="pill">${esc(BUCKETS.find((b) => b.id === i.bucket)?.short)}</span> ${esc(i.prompt)}<br><span class="muted small">${esc(i.source)}</span></span>${btn('Use', 'use-idea', { cls: 'small', data: { n } })}</div></li>`).join('')}</ul>` : '<p class="muted small">Add buyers with pains in Research to get prompts.</p>'}
    </section>
  </div>

  <section class="card"><div class="card-head"><h2>Next 4 weeks</h2><span class="muted small">Target: ${ws.settings.weeklyPosts} posts / week</span></div>
    <div class="weeks">${cal.map((w) => `<div class="week"><h3>${formatDate(w.from, { year: false })} – ${formatDate(w.to, { year: false })} <span class="muted small">${w.items.length}/${ws.settings.weeklyPosts}</span></h3>
      ${w.items.length ? `<ul>${w.items.map((p) => `<li><button type="button" class="btn link" data-action="edit" data-type="post" data-id="${esc(p.id)}">${esc(p.title || '(untitled)')}</button><br><span class="muted small">${formatDate(p.date, { year: false })} · ${esc(BUCKETS.find((b) => b.id === p.bucket)?.short)} · ${esc(p.status)}</span></li>`).join('')}</ul>` : '<p class="muted small">Nothing planned.</p>'}</div>`).join('')}</div>
  </section>

  <section class="card"><div class="card-head"><h2>All posts</h2>${select('Show', 'postFilter', filter, [['planned', 'Planned (not published)'], ['published', 'Published'], ['all', 'All']], { attrs: 'data-change="post-filter"' })}</div>
    ${shown.length ? table(`${shown.length} post(s)`, [
      { label: 'Date', html: (p) => (p.date ? formatDate(p.date) : '—') },
      { label: 'Post', html: (p) => `<div class="cell-main">${esc(p.title)}</div><div class="cell-sub">Hook type: ${esc(classifyHook(p.hook))}</div>` },
      { label: 'Bucket', html: (p) => esc(BUCKETS.find((b) => b.id === p.bucket)?.short) },
      { label: 'Visual', html: (p) => `${esc(p.visual)}${recommendVisual(p.kind).visual !== p.visual && !(p.kind === 'walkthrough' && p.visual === 'infographic') ? ' <span class="badge issue">check</span>' : ''}` },
      { label: 'Status', key: 'status' },
      { label: '', html: (p) => btn('Edit', 'edit', { cls: 'small', data: { type: 'post', id: p.id } }) },
    ], shown) : '<p class="muted small">No posts match.</p>'}
  </section>`;
}

export const contentForms = {
  post(ctx, d) {
    if (!d.title?.trim()) return ctx.announce('Working title is required.');
    ctx.ui.edit = {};
    ctx.update((ws) => {
      const prev = ws.posts.find((p) => p.id === d.id);
      const post = { ...(prev ?? { metrics: { impressions: null, reactions: null, comments: null, reposts: null, profileViews: null, inbound: null } }), id: d.id || newId('post'), title: d.title.trim(), bucket: d.bucket, kind: d.kind, visual: d.visual, status: d.status, date: d.date ?? '', hook: d.hook ?? '', body: d.body ?? '' };
      return { ...ws, posts: prev ? ws.posts.map((p) => (p.id === d.id ? post : p)) : [...ws.posts, post] };
    }, d.id ? 'Post saved.' : 'Post added.');
  },
};

export const contentActions = {
  'use-idea': (ctx, el) => {
    const ws = ctx.ws();
    const idea = ideaPrompts(ws, languageBank(ws.buyers))[Number(el.dataset.n)];
    const post = { id: newId('post'), date: '', bucket: idea.bucket, kind: idea.bucket === 'expertise' ? 'process' : idea.bucket === 'proof' ? 'result' : 'opinion', visual: 'text-only', status: 'idea', title: idea.prompt, hook: '', body: '', metrics: { impressions: null, reactions: null, comments: null, reposts: null, profileViews: null, inbound: null } };
    post.visual = recommendVisual(post.kind).visual;
    ctx.ui.edit = { post: post.id };
    ctx.update((w) => ({ ...w, posts: [...w.posts, post] }), 'Idea added — now draft it.');
  },
};

export const contentChanges = {
  'post-filter': (ctx, el) => { ctx.ui.postFilter = el.value; ctx.render(); },
};

export const contentLive = {
  post(ctx, form) {
    const d = formData(form);
    document.getElementById('lint').innerHTML = lintHTML(d, phrasesOf(ctx.ws()));
    const lab = form.querySelector('[name="body"]').labels[0];
    lab.textContent = `Body (${(d.hook ?? '').length + (d.body ?? '').length}/${LIMITS.post})`;
  },
};
