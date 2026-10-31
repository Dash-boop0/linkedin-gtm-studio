// State shape, validation and immutable helpers. No DOM access.
import { SCHEMA_VERSION, DEFAULT_SETTINGS, BUCKET_IDS, POST_STATUSES, VISUALS, POST_KINDS } from './constants.js';
import { isValidISODate } from './dates.js';

let counter = 0;
export function newId(prefix) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * One workspace = one personal brand (Dash's own, or a client she ghostwrites for).
 */
export function emptyWorkspace(name = 'My LinkedIn') {
  return {
    id: newId('ws'),
    name,
    offer: { audience: '', outcome: '', proof: '' },
    buyers: [], // { id, name, role, company, url, pains[], tried[], phrases[], notes }
    competitors: [], // { id, name, url, audience }
    compPosts: [], // { id, competitorId, date, topic, angle, hook, graphic, reactions, comments, reposts, url }
    outsideIdeas: [], // { id, source, url, summary, myTake, bucket }
    profile: { headline: '', banner: '', about: '', featured: [] }, // featured: { id, kind, title, url }
    posts: [], // { id, date, bucket, kind, visual, status, title, hook, body, metrics:{impressions,reactions,comments,reposts,profileViews,inbound} }
    engagement: [], // { id, date, minutes, person, relation:'icp'|'network', note }
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

export function emptyState() {
  const ws = emptyWorkspace();
  return { version: SCHEMA_VERSION, meta: { synthetic: false }, activeId: ws.id, workspaces: [ws], log: [] };
}

export const activeWorkspace = (state) => state.workspaces.find((w) => w.id === state.activeId) ?? state.workspaces[0];

/** Return a new state with the active workspace replaced by fn(workspace). */
export function updateWorkspace(state, fn) {
  const cur = activeWorkspace(state);
  return { ...state, workspaces: state.workspaces.map((w) => (w.id === cur.id ? fn(structuredClone(w)) : w)) };
}

export function appendLog(state, message, at = new Date().toISOString()) {
  const log = [{ at, message }, ...(state.log ?? [])].slice(0, 200);
  return { ...state, log };
}

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[, ]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
export const toCount = num;

const strList = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/\n|;/)).map((s) => String(s).trim()).filter(Boolean);
export const toList = strList;

function cleanPost(p, errors, i) {
  const out = {
    id: p.id || newId('post'),
    date: isValidISODate(p.date) ? p.date : '',
    bucket: BUCKET_IDS.includes(p.bucket) ? p.bucket : 'problems',
    kind: POST_KINDS.includes(p.kind) ? p.kind : 'opinion',
    visual: VISUALS.includes(p.visual) ? p.visual : 'text-only',
    status: POST_STATUSES.includes(p.status) ? p.status : 'idea',
    title: String(p.title ?? ''),
    hook: String(p.hook ?? ''),
    body: String(p.body ?? ''),
    metrics: {},
  };
  for (const k of ['impressions', 'reactions', 'comments', 'reposts', 'profileViews', 'inbound']) out.metrics[k] = num(p.metrics?.[k]);
  if (p.date && !out.date) errors.push(`Post ${i + 1}: invalid date "${p.date}".`);
  return out;
}

/** Validate and normalise an imported/stored state. Returns { ok, state, errors }. */
export function validateState(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.workspaces) || !raw.workspaces.length) {
    return { ok: false, errors: ['Not a LinkedIn GTM Studio backup: expected a "workspaces" list.'] };
  }
  if (raw.version !== SCHEMA_VERSION) errors.push(`Unsupported version ${raw.version}; expected ${SCHEMA_VERSION}.`);
  const workspaces = raw.workspaces.map((w) => {
    const base = emptyWorkspace(String(w.name || 'Workspace'));
    base.id = w.id || base.id;
    base.offer = { ...base.offer, ...(w.offer ?? {}) };
    base.buyers = (w.buyers ?? []).map((b) => ({
      id: b.id || newId('buyer'), name: String(b.name ?? ''), role: String(b.role ?? ''), company: String(b.company ?? ''),
      url: String(b.url ?? ''), pains: strList(b.pains), tried: strList(b.tried), phrases: strList(b.phrases), notes: String(b.notes ?? ''),
    }));
    base.competitors = (w.competitors ?? []).map((c) => ({ id: c.id || newId('comp'), name: String(c.name ?? ''), url: String(c.url ?? ''), audience: String(c.audience ?? '') }));
    base.compPosts = (w.compPosts ?? []).map((p) => ({
      id: p.id || newId('cp'), competitorId: String(p.competitorId ?? ''), date: isValidISODate(p.date) ? p.date : '',
      topic: String(p.topic ?? ''), angle: String(p.angle ?? 'other'), hook: String(p.hook ?? ''), graphic: String(p.graphic ?? 'text-only'),
      reactions: num(p.reactions), comments: num(p.comments), reposts: num(p.reposts), url: String(p.url ?? ''),
    }));
    base.outsideIdeas = (w.outsideIdeas ?? []).map((o) => ({
      id: o.id || newId('idea'), source: String(o.source ?? 'X'), url: String(o.url ?? ''), summary: String(o.summary ?? ''),
      myTake: String(o.myTake ?? ''), bucket: BUCKET_IDS.includes(o.bucket) ? o.bucket : 'industry',
    }));
    const pr = w.profile ?? {};
    base.profile = {
      headline: String(pr.headline ?? ''), banner: String(pr.banner ?? ''), about: String(pr.about ?? ''),
      featured: (pr.featured ?? []).map((f) => ({ id: f.id || newId('feat'), kind: String(f.kind ?? 'other'), title: String(f.title ?? ''), url: String(f.url ?? '') })),
    };
    base.posts = (w.posts ?? []).map((p, i) => cleanPost(p, errors, i));
    base.engagement = (w.engagement ?? []).filter((e) => isValidISODate(e.date)).map((e) => ({
      id: e.id || newId('eng'), date: e.date, minutes: num(e.minutes) ?? 0, person: String(e.person ?? ''),
      relation: e.relation === 'network' ? 'network' : 'icp', note: String(e.note ?? ''),
    }));
    const s = w.settings ?? {};
    base.settings = {
      ...DEFAULT_SETTINGS, ...s,
      bucketMix: { ...DEFAULT_SETTINGS.bucketMix, ...(s.bucketMix ?? {}) },
      weights: { ...DEFAULT_SETTINGS.weights, ...(s.weights ?? {}) },
    };
    return base;
  });
  const activeId = workspaces.some((w) => w.id === raw.activeId) ? raw.activeId : workspaces[0].id;
  const state = { version: SCHEMA_VERSION, meta: { synthetic: !!raw.meta?.synthetic, demoToday: raw.meta?.demoToday }, activeId, workspaces, log: Array.isArray(raw.log) ? raw.log : [] };
  const fatal = errors.filter((e) => e.startsWith('Unsupported'));
  return { ok: fatal.length === 0, state, errors };
}
