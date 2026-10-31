// Step 1: buyers (pains, what they tried, their words), competitors' best posts, and ideas from outside LinkedIn.
import { languageBank, breakdown, topCompetitorPosts, researchProgress, classifyHook } from '../lib/research.js';
import { horizontalBars } from '../lib/charts.js';
import { ANGLES, VISUALS, BUCKETS, TARGET_BUYERS, TARGET_COMPETITORS } from '../lib/constants.js';
import { newId, toList, toCount } from '../lib/model.js';
import { exportLanguageCSV } from '../lib/io.js';
import { fmt } from '../lib/text.js';
import { esc, input, textarea, select, btn, empty, table, pill } from './h.js';

const DIMENSIONS = [['angle', 'Angle'], ['hookType', 'Hook type'], ['graphic', 'Graphic'], ['topic', 'Topic'], ['competitor', 'Competitor']];

function buyerForm(b = {}) {
  return `<form data-form="buyer" class="form-grid">
    <input type="hidden" name="id" value="${esc(b.id ?? '')}">
    ${input('Name', 'name', b.name, { attrs: 'required' })}
    ${input('Role', 'role', b.role)}
    ${input('Company', 'company', b.company)}
    ${input('Profile URL', 'url', b.url, { type: 'url' })}
    ${textarea('What they struggle with (one per line)', 'pains', (b.pains ?? []).join('\n'), { hint: 'From their posts and comments.' })}
    ${textarea('What they already tried (one per line)', 'tried', (b.tried ?? []).join('\n'))}
    ${textarea('Their exact words (one per line)', 'phrases', (b.phrases ?? []).join('\n'), { hint: 'Copy the phrases they use — you will reuse them in your profile and posts.' })}
    ${textarea('Notes', 'notes', b.notes, { rows: 2 })}
    <div class="actions full">${btn(b.id ? 'Save buyer' : 'Add buyer', '', { cls: 'primary', type: 'submit' })}${b.id ? btn('Cancel', 'cancel-edit') : ''}</div>
  </form>`;
}

export function renderResearch(ctx) {
  const ws = ctx.ws();
  const w = ws.settings.weights;
  const bank = languageBank(ws.buyers);
  const prog = researchProgress(ws, { buyers: TARGET_BUYERS, competitors: TARGET_COMPETITORS });
  const editBuyer = ws.buyers.find((b) => b.id === ctx.ui.edit?.buyer);
  const dim = ctx.ui.researchDim ?? 'angle';
  const groups = breakdown(ws, dim, w);
  const top = topCompetitorPosts(ws, w, 5);
  const compName = new Map(ws.competitors.map((c) => [c.id, c.name]));
  const list = (items, label) => (items.length
    ? `<ul class="bank">${items.slice(0, 12).map((x) => `<li><span>${esc(x.text ?? x.phrase)}</span><span class="num muted" title="${esc(x.buyers?.join(', ') ?? '')}">${x.count}</span></li>`).join('')}</ul>`
    : `<p class="muted small">No ${label} yet.</p>`);

  return `
  <div class="page-head"><div><h1>1 · Research buyers and competitors</h1>
    <p class="muted">List ${TARGET_BUYERS} people you want as clients. Read their posts and comments; note what they struggle with, what they tried, and the words they use. Then study ${TARGET_COMPETITORS} competitors reaching them.</p></div>
    <div class="chips">${pill(`${prog.buyersComplete}/${TARGET_BUYERS} buyers complete`)} ${pill(`${prog.competitorsBrokenDown}/${TARGET_COMPETITORS} competitors broken down`)}</div></div>

  <div class="grid grid-2">
    <section class="card"><div class="card-head"><h2>Dream buyers</h2><span class="muted small">${ws.buyers.length} listed</span></div>
      ${ws.buyers.length ? table('Buyers — click Edit to add pains and phrases', [
        { label: 'Buyer', html: (b) => `<div class="cell-main">${esc(b.name)}</div><div class="cell-sub">${esc([b.role, b.company].filter(Boolean).join(' · '))}</div>` },
        { label: 'Pains', num: true, html: (b) => String(b.pains.length) },
        { label: 'Phrases', num: true, html: (b) => String(b.phrases.length) },
        { label: '', html: (b) => `<div class="actions">${btn('Edit', 'edit', { cls: 'small', data: { type: 'buyer', id: b.id } })}${btn('Delete', 'delete', { cls: 'small danger', data: { type: 'buyers', id: b.id } })}</div>` },
      ], ws.buyers) : empty('No buyers yet', 'Add the first person you would love to have as a client, or import a CSV on the Data page.')}
    </section>
    <section class="card" id="buyer-form"><div class="card-head"><h2>${editBuyer ? `Edit ${esc(editBuyer.name)}` : 'Add a buyer'}</h2></div>${buyerForm(editBuyer)}</section>
  </div>

  <section class="card"><div class="card-head"><h2>Language bank</h2>
      <div class="actions">${btn('Export CSV', 'export-language', { cls: 'small' })}</div></div>
    <p class="muted small">How many buyers said each thing. Hover a count to see who. Reuse these exact words in your headline, About section and hooks.</p>
    <div class="grid grid-3">
      <div><h3>Struggles</h3>${list(bank.pains, 'struggles')}</div>
      <div><h3>Already tried</h3>${list(bank.tried, 'tried fixes')}</div>
      <div><h3>Their words</h3>${list(bank.phrases, 'phrases')}${bank.ngrams.length ? `<h3 class="mt">Recurring word groups</h3>${list(bank.ngrams.slice(0, 8), 'word groups')}` : ''}</div>
    </div>
  </section>

  <section class="card"><div class="card-head"><h2>Competitor post breakdown</h2><span class="muted small">${ws.compPosts.length} posts from ${ws.competitors.length} competitors</span></div>
    <p class="muted small">Engagement score = reactions × ${w.reactions} + comments × ${w.comments} + reposts × ${w.reposts} (weights in Data → Settings). Groups are ranked by median score, so one viral post doesn’t dominate.</p>
    <div class="filter-row">${select('Break down by', 'dim', dim, DIMENSIONS, { attrs: 'data-change="research-dim"' })}</div>
    ${groups.length ? `<div class="chart-box">${horizontalBars({ title: `Median engagement score by ${dim}`, items: groups.map((g) => ({ label: `${g.key} (${g.n})`, value: g.median ?? 0 })), format: (v) => fmt(v) })}</div>` : empty('No competitor posts yet', 'Add a competitor and log their best-performing posts below.')}
    ${top.length ? `<h3 class="mt">Top posts to study</h3>${table('Highest-scoring competitor posts', [
      { label: 'Hook', html: (p) => `<div class="cell-main">${esc(p.hook)}</div><div class="cell-sub">${esc(compName.get(p.competitorId) ?? '')}${p.topic ? ` · ${esc(p.topic)}` : ''}</div>` },
      { label: 'Angle', key: 'angle' }, { label: 'Hook type', key: 'hookType' }, { label: 'Graphic', key: 'graphic' },
      { label: 'Score', num: true, html: (p) => fmt(p.score) },
    ], top)}` : ''}
  </section>

  <div class="grid grid-2">
    <section class="card"><div class="card-head"><h2>Competitors</h2></div>
      ${ws.competitors.length ? `<ul class="timeline">${ws.competitors.map((c) => `<li><div class="row-between"><span><strong>${esc(c.name)}</strong> <span class="muted small">${ws.compPosts.filter((p) => p.competitorId === c.id).length} posts</span></span>${btn('Delete', 'delete', { cls: 'small danger', data: { type: 'competitors', id: c.id } })}</div></li>`).join('')}</ul>` : '<p class="muted small">None yet.</p>'}
      <form data-form="competitor" class="form-grid mt">${input('Competitor name', 'name', '', { attrs: 'required' })}${input('Profile URL', 'url', '', { type: 'url' })}<div class="actions full">${btn('Add competitor', '', { cls: 'primary', type: 'submit' })}</div></form>
    </section>
    <section class="card"><div class="card-head"><h2>Log a competitor post</h2></div>
      ${ws.competitors.length ? `<form data-form="compPost" class="form-grid">
        ${select('Competitor', 'competitorId', '', ws.competitors.map((c) => [c.id, c.name]))}
        ${input('Date', 'date', ctx.today(), { type: 'date' })}
        ${input('Hook (first line)', 'hook', '', { full: true, attrs: 'required' })}
        ${input('Topic', 'topic')}
        ${select('Angle', 'angle', 'how-to', ANGLES)}
        ${select('Graphic', 'graphic', 'text-only', VISUALS)}
        ${input('Reactions', 'reactions', '', { type: 'number', attrs: 'min="0"' })}
        ${input('Comments', 'comments', '', { type: 'number', attrs: 'min="0"' })}
        ${input('Reposts', 'reposts', '', { type: 'number', attrs: 'min="0"' })}
        <div class="actions full">${btn('Add post', '', { cls: 'primary', type: 'submit' })}</div>
      </form>` : '<p class="muted small">Add a competitor first.</p>'}
    </section>
  </div>

  <section class="card"><div class="card-head"><h2>Ideas from outside LinkedIn</h2><span class="muted small">X, newsletters, podcasts — build on them with your experience, examples or opinion.</span></div>
    ${ws.outsideIdeas.length ? table('Saved ideas', [
      { label: 'Idea', html: (o) => `<div class="cell-main">${esc(o.summary)}</div><div class="cell-sub">${esc(o.source)}</div>` },
      { label: 'Your take', html: (o) => (o.myTake ? esc(o.myTake) : '<span class="badge issue">Add your take</span>') },
      { label: 'Bucket', html: (o) => esc(BUCKETS.find((b) => b.id === o.bucket)?.short ?? o.bucket) },
      { label: '', html: (o) => btn('Delete', 'delete', { cls: 'small danger', data: { type: 'outsideIdeas', id: o.id } }) },
    ], ws.outsideIdeas) : ''}
    <form data-form="idea" class="form-grid mt">
      ${input('Source', 'source', 'X')}${input('Link', 'url', '', { type: 'url' })}
      ${input('What it says', 'summary', '', { full: true, attrs: 'required' })}
      ${input('Your take (experience, example or opinion)', 'myTake', '', { full: true })}
      ${select('Bucket', 'bucket', 'industry', BUCKETS.map((b) => [b.id, b.label]))}
      <div class="actions full">${btn('Save idea', '', { cls: 'primary', type: 'submit' })}</div>
    </form>
  </section>`;
}

export const researchForms = {
  buyer(ctx, d) {
    if (!d.name?.trim()) return ctx.announce('Name is required.');
    const b = { id: d.id || newId('buyer'), name: d.name.trim(), role: d.role ?? '', company: d.company ?? '', url: d.url ?? '', pains: toList(d.pains), tried: toList(d.tried), phrases: toList(d.phrases), notes: d.notes ?? '' };
    ctx.ui.edit = {};
    ctx.update((ws) => ({ ...ws, buyers: d.id ? ws.buyers.map((x) => (x.id === d.id ? b : x)) : [...ws.buyers, b] }), d.id ? `Saved ${b.name}.` : `Added ${b.name}.`);
  },
  competitor(ctx, d) {
    if (!d.name?.trim()) return;
    ctx.update((ws) => ({ ...ws, competitors: [...ws.competitors, { id: newId('comp'), name: d.name.trim(), url: d.url ?? '', audience: '' }] }), `Added competitor ${d.name.trim()}.`);
  },
  compPost(ctx, d) {
    if (!d.hook?.trim()) return ctx.announce('Hook is required.');
    const p = { id: newId('cp'), competitorId: d.competitorId, date: d.date, topic: d.topic ?? '', angle: d.angle, hook: d.hook.trim(), graphic: d.graphic, reactions: toCount(d.reactions), comments: toCount(d.comments), reposts: toCount(d.reposts), url: '' };
    ctx.update((ws) => ({ ...ws, compPosts: [...ws.compPosts, p] }), `Logged competitor post (hook type: ${classifyHook(p.hook)}).`);
  },
  idea(ctx, d) {
    if (!d.summary?.trim()) return;
    ctx.update((ws) => ({ ...ws, outsideIdeas: [...ws.outsideIdeas, { id: newId('idea'), source: d.source || 'X', url: d.url ?? '', summary: d.summary.trim(), myTake: d.myTake ?? '', bucket: d.bucket }] }), 'Saved idea.');
  },
};

export const researchActions = {
  'export-language': (ctx) => ctx.download(`language-bank-${ctx.today()}.csv`, exportLanguageCSV(languageBank(ctx.ws().buyers))),
};
export const researchChanges = {
  'research-dim': (ctx, el) => { ctx.ui.researchDim = el.value; ctx.render(); },
};
