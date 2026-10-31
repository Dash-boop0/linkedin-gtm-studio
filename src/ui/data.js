// Workspaces (one per personal brand / client), CSV imports, backup/restore and settings.
import { importBuyers, importCompPosts, importPostMetrics, exportPostsCSV, templateCSV } from '../lib/io.js';
import { emptyWorkspace, validateState, activeWorkspace } from '../lib/model.js';
import { BUCKETS } from '../lib/constants.js';
import { esc, input, select, btn, table } from './h.js';

const IMPORTS = [
  ['buyers', 'Dream buyers', 'buyers-example.csv', importBuyers],
  ['compPosts', 'Competitor posts', 'competitor-posts-example.csv', importCompPosts],
  ['posts', 'Your post metrics', 'post-metrics-example.csv', importPostMetrics],
];

export function renderData(ctx) {
  const ws = ctx.ws();
  const s = ws.settings;
  const confirm = ctx.ui.confirm;
  return `
  <div class="page-head"><div><h1>Data, workspaces and settings</h1>
    <p class="muted">Everything stays in this browser. Use one workspace for your own brand and one per client you write for.</p></div></div>
  <div class="grid grid-2">
    <section class="card"><div class="card-head"><h2>Workspaces</h2></div>
      ${table('Click Open to switch', [
        { label: 'Name', html: (w) => `${esc(w.name)}${w.id === ws.id ? ' <span class="pill">active</span>' : ''}` },
        { label: 'Buyers', num: true, html: (w) => String(w.buyers.length) },
        { label: 'Posts', num: true, html: (w) => String(w.posts.length) },
        { label: '', html: (w) => `<div class="actions">${w.id === ws.id ? '' : btn('Open', 'switch-ws', { cls: 'small', data: { id: w.id } })}${ctx.state.workspaces.length > 1 ? btn('Delete', 'ask', { cls: 'small danger', data: { what: `delete-ws:${w.id}` } }) : ''}</div>` },
      ], ctx.state.workspaces)}
      <form data-form="workspace" class="form-grid mt">${input('New workspace name', 'name', '', { attrs: 'required', hint: 'e.g. “Client: <founder name>”' })}<div class="actions" style="align-self:end">${btn('Create', '', { cls: 'primary', type: 'submit' })}</div></form>
      <form data-form="rename" class="form-grid mt">${input('Rename active workspace', 'name', ws.name, { attrs: 'required' })}<div class="actions" style="align-self:end">${btn('Rename', '', { type: 'submit' })}</div></form>
    </section>
    <section class="card"><div class="card-head"><h2>Import CSV</h2><span class="muted small">into “${esc(ws.name)}”</span></div>
      ${IMPORTS.map(([kind, label, example]) => `<div class="import-row"><label for="imp-${kind}">${esc(label)}</label>
        <input id="imp-${kind}" type="file" accept=".csv,text/csv" data-import="${kind}">
        <p class="hint">${btn('Template', 'template', { cls: 'link', data: { kind } })} · <a href="sample-data/${example}" download>Synthetic example</a></p></div>`).join('')}
      ${ctx.ui.importReport ? `<div class="${ctx.ui.importReport.ok ? 'notice' : 'errors'}" role="status"><p>${esc(ctx.ui.importReport.summary)}</p>${ctx.ui.importReport.errors.length ? `<ul>${ctx.ui.importReport.errors.slice(0, 8).map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</div>` : ''}
    </section>
  </div>
  <div class="grid grid-2">
    <section class="card"><div class="card-head"><h2>Backup and restore</h2></div>
      <div class="actions">${btn('Back up all data (JSON)', 'backup', { cls: 'primary' })}${btn('Export posts CSV', 'export-posts')}
        <label class="btn" for="restore">Restore from backup</label><input id="restore" class="sr-only" type="file" accept=".json,application/json" data-restore></div>
      <p class="hint mt">The backup JSON is also the input for the Claude skill in <code>skill/linkedin-gtm/</code>.</p>
      <div class="actions mt">${btn('Load sample data', 'ask', { data: { what: 'sample' } })}${btn('Reset everything', 'ask', { cls: 'danger', data: { what: 'reset' } })}</div>
      ${confirm ? `<div class="errors mt" role="alert"><p>${esc(confirm.text)}</p><div class="actions">${btn('Yes, continue', 'confirm-yes', { cls: 'danger small' })}${btn('Cancel', 'confirm-no', { cls: 'small' })}</div></div>` : ''}
    </section>
    <section class="card"><div class="card-head"><h2>Settings for “${esc(ws.name)}”</h2></div>
      <form data-form="settings" class="form-grid">
        ${input('Daily comment minutes', 'dailyEngageMinutes', s.dailyEngageMinutes, { type: 'number', attrs: 'min="1" max="240"' })}
        ${input('Posts per week', 'weeklyPosts', s.weeklyPosts, { type: 'number', attrs: 'min="1" max="21"' })}
        ${BUCKETS.map((b) => input(`${b.short} target %`, `mix_${b.id}`, s.bucketMix[b.id], { type: 'number', attrs: 'min="0" max="100"' })).join('')}
        ${['reactions', 'comments', 'reposts'].map((k) => input(`Weight: ${k}`, `w_${k}`, s.weights[k], { type: 'number', attrs: 'min="0" step="0.5"' })).join('')}
        ${select('Min posts per verdict', 'minSample', s.minSample, [2, 3, 4, 5, 8])}
        <div class="actions full">${btn('Save settings', '', { cls: 'primary', type: 'submit' })}</div>
      </form>
    </section>
  </div>
  <section class="card"><div class="card-head"><h2>Activity log</h2></div>
    ${ctx.state.log.length ? `<ul class="timeline">${ctx.state.log.slice(0, 15).map((l) => `<li><span class="muted small tabular">${esc(l.at.slice(0, 16).replace('T', ' '))}</span> ${esc(l.message)}</li>`).join('')}</ul>` : '<p class="muted small">No activity yet.</p>'}
  </section>`;
}

export const dataForms = {
  workspace(ctx, d) {
    const w = emptyWorkspace(d.name.trim());
    ctx.commit({ ...ctx.state, workspaces: [...ctx.state.workspaces, w], activeId: w.id }, `Created workspace “${w.name}”.`);
  },
  rename(ctx, d) {
    ctx.update((ws) => ({ ...ws, name: d.name.trim() || ws.name }), 'Workspace renamed.');
  },
  settings(ctx, d) {
    const n = (v, def) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : def);
    const mix = Object.fromEntries(BUCKETS.map((b) => [b.id, n(d[`mix_${b.id}`], 0)]));
    const sum = Object.values(mix).reduce((a, b) => a + b, 0);
    if (sum !== 100) return ctx.announce(`Bucket targets add up to ${sum}% — they must total 100%.`);
    ctx.update((ws) => ({ ...ws, settings: { ...ws.settings, dailyEngageMinutes: n(d.dailyEngageMinutes, 15), weeklyPosts: n(d.weeklyPosts, 3), minSample: n(d.minSample, 3), bucketMix: mix, weights: { reactions: n(d.w_reactions, 1), comments: n(d.w_comments, 2), reposts: n(d.w_reposts, 3) } } }), 'Settings saved.');
  },
};

const CONFIRMS = {
  sample: 'Replace all workspaces with the synthetic sample? Back up first if you have real data.',
  reset: 'Delete all workspaces and start empty? This cannot be undone without a backup.',
};

export const dataActions = {
  'switch-ws': (ctx, el) => { ctx.ui.edit = {}; ctx.commit({ ...ctx.state, activeId: el.dataset.id }, `Switched to “${ctx.state.workspaces.find((w) => w.id === el.dataset.id)?.name}”.`); },
  template: (ctx, el) => ctx.download(`${el.dataset.kind}-template.csv`, templateCSV(el.dataset.kind)),
  backup: (ctx) => ctx.download(`linkedin-gtm-backup-${ctx.today()}.json`, JSON.stringify(ctx.state, null, 2), 'application/json'),
  'export-posts': (ctx) => ctx.download(`posts-${ctx.today()}.csv`, exportPostsCSV(ctx.ws())),
  ask: (ctx, el) => {
    const what = el.dataset.what;
    const text = what.startsWith('delete-ws:') ? `Delete workspace “${ctx.state.workspaces.find((w) => w.id === what.slice(10))?.name}” and all its data?` : CONFIRMS[what];
    ctx.ui.confirm = { what, text };
    ctx.render();
  },
  'confirm-no': (ctx) => { ctx.ui.confirm = null; ctx.render(); },
  'confirm-yes': async (ctx) => {
    const { what } = ctx.ui.confirm;
    ctx.ui.confirm = null;
    if (what === 'sample') return ctx.loadSample();
    if (what === 'reset') return ctx.reset();
    const id = what.slice(10);
    const workspaces = ctx.state.workspaces.filter((w) => w.id !== id);
    ctx.commit({ ...ctx.state, workspaces, activeId: ctx.state.activeId === id ? workspaces[0].id : ctx.state.activeId }, 'Workspace deleted.');
  },
};

/** File inputs: CSV imports and JSON restore. */
export async function handleFile(ctx, el) {
  const file = el.files?.[0];
  if (!file) return;
  const text = await file.text();
  el.value = '';
  if (el.dataset.restore !== undefined) {
    let v;
    try { v = validateState(JSON.parse(text)); } catch (e) { v = { ok: false, errors: [`Not valid JSON: ${e.message}`] }; }
    if (!v.ok) { ctx.ui.importReport = { ok: false, summary: 'Restore failed.', errors: v.errors }; return ctx.render(); }
    ctx.ui.importReport = { ok: true, summary: `Restored ${v.state.workspaces.length} workspace(s).`, errors: v.errors };
    return ctx.commit(v.state, `Restored backup “${file.name}”.`);
  }
  const imp = IMPORTS.find((i) => i[0] === el.dataset.import);
  const res = imp[3](ctx.ws(), text);
  if (!res.ok) { ctx.ui.importReport = { ok: false, summary: `${imp[1]}: import failed.`, errors: res.errors }; return ctx.render(); }
  const summary = `${imp[1]}: ${res.added} added${res.updated !== undefined ? `, ${res.updated} updated` : ''}${res.errors.length ? `, ${res.errors.length} row(s) skipped or adjusted` : ''}.`;
  ctx.ui.importReport = { ok: true, summary, errors: res.errors };
  const next = res.ws;
  ctx.commit({ ...ctx.state, workspaces: ctx.state.workspaces.map((w) => (w.id === activeWorkspace(ctx.state).id ? next : w)) }, summary);
}
