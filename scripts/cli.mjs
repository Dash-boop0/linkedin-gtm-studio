#!/usr/bin/env node
// Command-line access to the same rules the app uses — for the Claude skill and for quick checks.
//   node scripts/cli.mjs audit-profile <backup.json> [workspace name]
//   node scripts/cli.mjs lint-post <backup.json> <post.md> [workspace name]   (first line of post.md = hook)
//   node scripts/cli.mjs summary <backup.json> [workspace name]
import { readFileSync } from 'node:fs';
import { validateState, activeWorkspace } from '../src/lib/model.js';
import { languageBank, breakdown, topCompetitorPosts } from '../src/lib/research.js';
import { auditProfile } from '../src/lib/profile.js';
import { lintPost } from '../src/lib/content.js';
import { performanceBy, totals } from '../src/lib/analytics.js';
import { playbookProgress } from '../src/lib/progress.js';
import { systemToday } from '../src/lib/dates.js';

const [cmd, file, ...rest] = process.argv.slice(2);
const usage = () => { console.error('usage: cli.mjs <audit-profile|lint-post|summary> <backup.json> [post.md] [workspace name]'); process.exit(2); };
if (!cmd || !file) usage();
const v = validateState(JSON.parse(readFileSync(file, 'utf8')));
if (!v.ok) { console.error(v.errors.join('\n')); process.exit(1); }
const wsName = cmd === 'lint-post' ? rest[1] : rest[0];
const ws = wsName ? v.state.workspaces.find((w) => w.name === wsName) : activeWorkspace(v.state);
if (!ws) { console.error(`No workspace named "${wsName}". Have: ${v.state.workspaces.map((w) => w.name).join(', ')}`); process.exit(1); }
const phrases = languageBank(ws.buyers).phrases.map((p) => p.text);

if (cmd === 'audit-profile') {
  const a = auditProfile(ws.profile, { phrases, offer: ws.offer });
  console.log(`Profile score: ${a.score}/100 (${ws.name})`);
  for (const c of a.checks) console.log(`${c.pass ? '✓' : '✗'} [${c.area}] ${c.label}${c.pass ? '' : ` — ${c.fix}`}`);
  process.exit(a.score === 100 ? 0 : 1);
} else if (cmd === 'lint-post') {
  if (!rest[0]) usage();
  const [hook, ...body] = readFileSync(rest[0], 'utf8').replace(/\r/g, '').split('\n');
  const issues = lintPost({ hook, body: body.join('\n').replace(/^\n+/, ''), kind: 'opinion', visual: 'text-only' }, { phrases });
  for (const i of issues.filter((x) => x.id !== 'visual')) console.log(`${i.level === 'good' ? '✓' : i.level === 'bad' ? '✗' : '!'} ${i.message}`);
  process.exit(issues.some((i) => i.level === 'bad') ? 1 : 0);
} else if (cmd === 'summary') {
  const today = v.state.meta?.synthetic && v.state.meta.demoToday ? v.state.meta.demoToday : systemToday();
  const bank = languageBank(ws.buyers);
  const out = {
    workspace: ws.name,
    offer: ws.offer,
    playbook: playbookProgress(ws, today).map((s) => ({ step: s.n, title: s.title, progress: Math.round(s.progress * 100), next: s.next })),
    buyerLanguage: { pains: bank.pains.slice(0, 8), tried: bank.tried.slice(0, 5), phrases: bank.phrases.slice(0, 10) },
    competitorAngles: breakdown(ws, 'angle', ws.settings.weights).map(({ key, n, median }) => ({ angle: key, posts: n, medianScore: median })),
    topCompetitorHooks: topCompetitorPosts(ws, ws.settings.weights, 5).map((p) => ({ hook: p.hook, angle: p.angle, hookType: p.hookType, score: p.score })),
    outsideIdeas: ws.outsideIdeas,
    totals: totals(ws.posts),
    byBucket: performanceBy(ws.posts, 'bucket', { minSample: ws.settings.minSample }),
    byHookType: performanceBy(ws.posts, 'hookType', { minSample: ws.settings.minSample }),
  };
  console.log(JSON.stringify(out, null, 2));
} else usage();
