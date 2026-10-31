// App bootstrap: state, persistence, routing and event delegation. Views live in src/ui/*.
import { STORAGE_KEY } from './lib/constants.js';
import { emptyState, validateState, activeWorkspace, updateWorkspace, appendLog } from './lib/model.js';
import { systemToday, formatDate } from './lib/dates.js';
import { formData } from './ui/h.js';
import { renderOverview } from './ui/overview.js';
import { renderResearch, researchForms, researchActions, researchChanges } from './ui/research.js';
import { renderProfile, profileForms, profileActions, profileLive } from './ui/profile.js';
import { renderContent, contentForms, contentActions, contentChanges, contentLive } from './ui/content.js';
import { renderEngage, engageForms } from './ui/engage.js';
import { renderAnalytics, analyticsForms, analyticsChanges } from './ui/analytics.js';
import { renderData, dataForms, dataActions, handleFile } from './ui/data.js';
import { renderMethod } from './ui/method.js';

const SAMPLE_URL = 'sample-data/sample-workspace.json';
const START_EMPTY_KEY = `${STORAGE_KEY}.startEmpty`;
const RENDERERS = { overview: renderOverview, research: renderResearch, profile: renderProfile, content: renderContent, engage: renderEngage, analytics: renderAnalytics, data: renderData, method: renderMethod };
const FORMS = { ...researchForms, ...profileForms, ...contentForms, ...engageForms, ...analyticsForms, ...dataForms };
const CHANGES = { ...researchChanges, ...contentChanges, ...analyticsChanges };
const LIVE = { ...profileLive, ...contentLive };

const ctx = { state: emptyState(), storageOk: true, ui: { view: 'overview', edit: {} } };
ctx.ws = () => activeWorkspace(ctx.state);
// The sample is pinned to its own date so its streaks and calendars stay meaningful.
ctx.today = () => (ctx.state.meta?.synthetic && ctx.state.meta.demoToday) || systemToday();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx.state)); ctx.storageOk = true; } catch { ctx.storageOk = false; }
}

ctx.commit = (next, message) => {
  ctx.state = message ? appendLog(next, message) : next;
  save();
  render();
  if (message) ctx.announce(message);
};
ctx.update = (fn, message) => ctx.commit(updateWorkspace(ctx.state, fn), message);

let toastTimer = null;
ctx.announce = (message) => {
  const el = document.getElementById('status');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
};

ctx.download = (filename, text, type = 'text/csv;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  ctx.announce(`Downloaded ${filename}`);
};

ctx.loadSample = async ({ quiet = false } = {}) => {
  try {
    const res = await fetch(SAMPLE_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const v = validateState(await res.json());
    if (!v.ok) throw new Error(v.errors.join(' '));
    ctx.ui.edit = {};
    ctx.commit(v.state, quiet ? '' : 'Loaded the synthetic sample.');
  } catch (e) {
    banner(`Could not load ${SAMPLE_URL}: ${e.message}. Open the app through a local web server (python3 -m http.server 8000), not as a file.`, 'error');
  }
};

ctx.reset = () => {
  try { localStorage.setItem(START_EMPTY_KEY, '1'); } catch { /* storage unavailable */ }
  ctx.ui.edit = {};
  ctx.commit(emptyState(), 'Started an empty workspace.');
};

function banner(html, kind = '', action = '') {
  document.getElementById('banner').innerHTML = `<div class="sample-banner${kind ? ` is-${kind}` : ''}" role="${kind === 'error' ? 'alert' : 'note'}"><p class="sample-banner__text">${html}</p>${action}</div>`;
}

function renderBanner() {
  if (!ctx.storageOk) banner('<strong>Browser storage is unavailable.</strong> Changes will be lost when you close this tab — use “Back up” on the Data page.', 'error');
  else if (ctx.state.meta?.synthetic) banner('<strong>Synthetic sample.</strong> Every buyer, competitor, post and number is fictional. The sample is dated ' + formatDate(ctx.today()) + '.', '', '<button type="button" class="sample-banner__action" data-action="start-own">Start with my own data</button>');
  else banner('<strong>Your data stays in this browser.</strong> Nothing is uploaded, and nothing is posted to LinkedIn.', 'info');
  const sel = document.getElementById('ws-switch');
  sel.innerHTML = ctx.state.workspaces.map((w) => `<option value="${w.id}"${w.id === ctx.ws().id ? ' selected' : ''}>${w.name.replace(/[<>&"]/g, '')}</option>`).join('');
}

function render() {
  renderBanner();
  document.querySelectorAll('#tabs a').forEach((a) => (a.dataset.tab === ctx.ui.view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.getElementById('view').innerHTML = RENDERERS[ctx.ui.view](ctx);
}
ctx.render = render;

function route() {
  const v = location.hash.slice(1);
  const prev = ctx.ui.view;
  ctx.ui.view = RENDERERS[v] ? v : 'overview';
  if (prev !== ctx.ui.view) { ctx.ui.edit = {}; ctx.ui.importReport = null; ctx.ui.confirm = null; }
  render();
  if (prev !== ctx.ui.view) { window.scrollTo(0, 0); document.getElementById('main').focus({ preventScroll: true }); }
}

const ACTIONS = {
  ...researchActions, ...profileActions, ...contentActions, ...dataActions,
  edit: (c, el) => { c.ui.edit = { [el.dataset.type]: el.dataset.id }; render(); document.querySelector(`form[data-form="${el.dataset.type}"]`)?.scrollIntoView({ block: 'start' }); },
  'cancel-edit': (c) => { c.ui.edit = {}; render(); },
  delete: (c, el) => {
    c.ui.edit = {};
    c.update((ws) => ({ ...ws, [el.dataset.type]: ws[el.dataset.type].filter((x) => x.id !== el.dataset.id), ...(el.dataset.type === 'competitors' ? { compPosts: ws.compPosts.filter((p) => p.competitorId !== el.dataset.id) } : {}) }), 'Deleted.');
  },
  'start-own': (c) => c.reset(),
};

function init() {
  try { localStorage.setItem(`${STORAGE_KEY}.probe`, '1'); localStorage.removeItem(`${STORAGE_KEY}.probe`); } catch { ctx.storageOk = false; }
  const root = document.body;
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && ACTIONS[el.dataset.action]) { e.preventDefault(); ACTIONS[el.dataset.action](ctx, el, e); }
  });
  root.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form || !FORMS[form.dataset.form]) return;
    e.preventDefault();
    FORMS[form.dataset.form](ctx, formData(form), form);
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('input[type="file"]')) return handleFile(ctx, e.target);
    if (e.target.id === 'ws-switch') { ctx.ui.edit = {}; return ctx.commit({ ...ctx.state, activeId: e.target.value }, ''); }
    const name = e.target.dataset.change;
    if (name && CHANGES[name]) CHANGES[name](ctx, e.target);
  });
  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.count && el.labels?.[0]) el.labels[0].textContent = el.labels[0].textContent.replace(/\(\d+\/(\d+)\)/, `(${el.value.length}/$1)`);
    const form = el.closest('form[data-live]');
    if (form && LIVE[form.dataset.live]) LIVE[form.dataset.live](ctx, form);
  });
  window.addEventListener('hashchange', route);

  let stored = null;
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const v = validateState(JSON.parse(raw)); if (v.ok) stored = v.state; } } catch { /* ignore */ }
  let startEmpty = false;
  try { startEmpty = localStorage.getItem(START_EMPTY_KEY) === '1'; } catch { /* ignore */ }
  if (stored) ctx.state = stored;
  route();
  if (!stored && !startEmpty) ctx.loadSample({ quiet: true });
}

init();
