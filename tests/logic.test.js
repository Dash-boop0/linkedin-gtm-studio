import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { median, ratio, recurringNgrams, containsPhrase } from '../src/lib/text.js';
import { languageBank, classifyHook, engagementScore, breakdown, researchProgress } from '../src/lib/research.js';
import { auditProfile, headlineFromOffer } from '../src/lib/profile.js';
import { lintPost, recommendVisual, bucketMix, nextBucket, calendar } from '../src/lib/content.js';
import { streak, engagementSummary } from '../src/lib/engagement.js';
import { engagementRate, performanceBy, totals } from '../src/lib/analytics.js';
import { importBuyers, importCompPosts, importPostMetrics, exportPostsCSV } from '../src/lib/io.js';
import { emptyWorkspace, validateState, emptyState, updateWorkspace, activeWorkspace } from '../src/lib/model.js';
import { playbookProgress } from '../src/lib/progress.js';
import { parseCSVObjects } from '../src/lib/csv.js';

const W = { reactions: 1, comments: 2, reposts: 3 };

test('median, ratio and n/a handling', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
  assert.equal(ratio(1, 0), null);
  assert.equal(ratio(1, 4), 0.25);
});

test('phrase matching is whole-word and case/punctuation-insensitive', () => {
  assert.ok(containsPhrase('Getting LIKES, but no leads!', 'likes but no leads'));
  assert.ok(!containsPhrase('unlikes but no leadsx', 'likes but no leads'));
});

test('language bank counts each buyer once per phrase', () => {
  const buyers = [
    { name: 'A', pains: ['No time', 'no time'], tried: ['agency'], phrases: ['posting into the void'] },
    { name: 'B', pains: ['no time!'], tried: [], phrases: ['Posting into the void'] },
    { name: 'C', pains: ['bad leads'], tried: ['Agency'], phrases: [] },
  ];
  const bank = languageBank(buyers);
  assert.deepEqual(bank.pains.map((p) => [p.text, p.count]), [['No time', 2], ['bad leads', 1]]);
  assert.deepEqual(bank.tried.map((p) => p.count), [2]);
  assert.equal(bank.phrases[0].count, 2);
});

test('recurring n-grams prefer the longer phrase at equal count', () => {
  const g = recurringNgrams(['founder led sales is hard', 'our founder led sales again'], { min: 2 });
  assert.ok(g.some((x) => x.phrase === 'founder led sales'));
  assert.ok(!g.some((x) => x.phrase === 'founder led'));
  assert.ok(!g.some((x) => x.phrase.startsWith('is ')), 'no stopword edges');
});

test('hook classifier rules', () => {
  assert.equal(classifyHook('Stop posting thought leadership.'), 'contrarian');
  assert.equal(classifyHook('How I booked 9 calls'), 'how-to');
  assert.equal(classifyHook('We grew a client from 0 to 40k impressions'), 'result');
  assert.equal(classifyHook('Why do your posts get no DMs?'), 'question');
  assert.equal(classifyHook('7 hooks I reuse'), 'number');
  assert.equal(classifyHook('Last month a founder told me something'), 'story');
  assert.equal(classifyHook('Your profile is a landing page.'), 'statement');
  assert.equal(classifyHook(''), 'statement');
});

test('engagement score uses weights and treats all-missing as null', () => {
  assert.equal(engagementScore({ reactions: 10, comments: 3, reposts: 1 }, W), 10 + 6 + 3);
  assert.equal(engagementScore({ reactions: 10, comments: null, reposts: null }, W), 10);
  assert.equal(engagementScore({ reactions: null, comments: null, reposts: null }, W), null);
});

test('competitor breakdown ranks by median score', () => {
  const ws = emptyWorkspace();
  ws.competitors = [{ id: 'c1', name: 'C1' }];
  const p = (angle, reactions) => ({ competitorId: 'c1', angle, hook: 'x', reactions, comments: 0, reposts: 0 });
  ws.compPosts = [p('story', 10), p('story', 30), p('story', 20), p('list', 100)];
  const b = breakdown(ws, 'angle', W);
  assert.deepEqual(b.map((g) => [g.key, g.n, g.median]), [['list', 1, 100], ['story', 3, 20]]);
  assert.equal(b[1].best.reactions, 30);
});

test('research progress counts only complete buyers and broken-down competitors', () => {
  const ws = emptyWorkspace();
  ws.buyers = [{ pains: ['a'], phrases: ['b'] }, { pains: ['a'], phrases: [] }];
  ws.competitors = [{ id: 'c1' }, { id: 'c2' }];
  ws.compPosts = [{ competitorId: 'c1', topic: 't', angle: 'story', hook: 'h' }, { competitorId: 'c2', topic: '', angle: 'story', hook: 'h' }];
  const r = researchProgress(ws);
  assert.equal(r.buyersComplete, 1);
  assert.equal(r.competitorsBrokenDown, 1);
  assert.equal(r.done, false);
});

test('profile audit: weak profile fails the right checks; strong profile scores 100', () => {
  const weak = auditProfile({ headline: 'Marketing Manager at Acme', banner: '', about: 'I am a marketer. Feel free to connect.', featured: [] });
  const failed = weak.checks.filter((c) => !c.pass).map((c) => c.id);
  for (const id of ['headline-outcome', 'headline-not-title', 'about-hook', 'about-problem', 'about-cta', 'featured-case', 'featured-cta']) assert.ok(failed.includes(id), id);
  assert.ok(weak.score < 40);
  const strong = auditProfile({
    headline: 'I help seed-stage SaaS founders book 10 sales calls a month from LinkedIn',
    banner: 'Founder-led LinkedIn for SaaS — 12 clients served',
    about: 'Posting into the void? If you are a founder with likes but no leads, the problem is who you write for.\n\nMy approach: research your buyers, rewrite your profile, then post in four buckets.\n\nProof: 12 clients, case studies in Featured.\n\nBook a call via the link in Featured.',
    featured: [{ kind: 'case-study' }, { kind: 'booking' }],
  }, { phrases: ['posting into the void', 'likes but no leads'] });
  assert.deepEqual(strong.checks.filter((c) => !c.pass).map((c) => c.id), []);
  assert.equal(strong.score, 100);
});

test('"B2B" is not mistaken for a numeric outcome', () => {
  const a = auditProfile({ headline: 'Content for B2B SaaS' });
  assert.equal(a.checks.find((c) => c.id === 'headline-outcome').pass, false);
});

test('headline from offer stays within 220 characters', () => {
  assert.equal(headlineFromOffer({ audience: 'SaaS founders', outcome: 'to book more calls', proof: '' }), 'I help SaaS founders book more calls');
  assert.equal(headlineFromOffer({ audience: '', outcome: 'x' }), '');
  assert.ok(headlineFromOffer({ audience: 'a', outcome: 'b'.repeat(300) }).length <= 220);
});

test('post linter flags missing hook, wall of text, hashtags, links and visual mismatch', () => {
  const issues = lintPost({ hook: '', body: `${'word '.repeat(70)}\n\n#a #b #c #d #e #f https://example.com`, kind: 'result', visual: 'text-only' }, { phrases: ['no leads'] });
  const ids = issues.map((i) => i.id);
  for (const id of ['hook-missing', 'dense', 'hashtags', 'link', 'buyer-words', 'cta', 'visual']) assert.ok(ids.includes(id), id);
  const ok = lintPost({ hook: 'Likes but no leads?', body: 'Short para.\n\nWhat do you think?', kind: 'opinion', visual: 'text-only' }, { phrases: ['no leads'] });
  assert.deepEqual(ok.filter((i) => i.level !== 'good').map((i) => i.id), []);
});

test('visual recommendations follow the playbook', () => {
  assert.equal(recommendVisual('result').visual, 'screenshot');
  assert.equal(recommendVisual('process').visual, 'steps-graphic');
  assert.equal(recommendVisual('comparison').visual, 'side-by-side');
  assert.equal(recommendVisual('walkthrough').visual, 'carousel');
  assert.equal(recommendVisual('personal').visual, 'photo');
});

test('bucket mix shares and the next under-target bucket', () => {
  const posts = [
    { date: '2026-11-02', bucket: 'problems' }, { date: '2026-11-03', bucket: 'problems' },
    { date: '2026-11-04', bucket: 'expertise' }, { date: '2026-11-05', bucket: 'industry' },
    { date: '2026-12-30', bucket: 'proof' }, // outside the 28-day window
  ];
  const target = { problems: 35, industry: 20, expertise: 30, proof: 15 };
  const mix = bucketMix(posts, target, '2026-11-01');
  assert.deepEqual(mix.map((m) => m.count), [2, 1, 1, 0]);
  assert.equal(mix[0].share, 0.5);
  assert.equal(nextBucket(posts, target, '2026-11-01'), 'proof');
  assert.equal(bucketMix([], target, '2026-11-01')[0].share, null);
});

test('calendar groups posts into Monday-start weeks', () => {
  const cal = calendar([{ date: '2026-11-03', title: 'a' }, { date: '2026-11-10', title: 'b' }], '2026-11-04', 2);
  assert.equal(cal[0].from, '2026-11-02');
  assert.deepEqual(cal.map((w) => w.items.length), [1, 1]);
});

test('engagement streak: an unlogged today does not break it; a missed day does', () => {
  const e = (date, minutes) => ({ date, minutes, person: 'x', relation: 'icp' });
  const entries = [e('2026-10-27', 15), e('2026-10-28', 10), e('2026-10-28', 5), e('2026-10-29', 15)];
  assert.equal(streak(entries, '2026-10-30', 15), 3);
  assert.equal(streak([...entries, e('2026-10-30', 15)], '2026-10-30', 15), 4);
  assert.equal(streak([e('2026-10-27', 15)], '2026-10-30', 15), 0);
  const s = engagementSummary(entries, '2026-10-30', 15, 7);
  assert.equal(s.minutes, 45);
  assert.equal(s.daysOnTarget, 3);
  assert.equal(s.icpShare, 1);
  assert.equal(engagementSummary([], '2026-10-30', 15).icpShare, null);
});

test('engagement rate and performance verdicts', () => {
  assert.equal(engagementRate({ impressions: 1000, reactions: 30, comments: 8, reposts: 2 }), 0.04);
  assert.equal(engagementRate({ impressions: 0, reactions: 3 }), null);
  const post = (bucket, er) => ({ status: 'published', bucket, hook: '', metrics: { impressions: 1000, reactions: er * 1000, comments: 0, reposts: 0, inbound: 1 } });
  const posts = [post('a', 0.06), post('a', 0.06), post('a', 0.06), post('b', 0.03), post('b', 0.03), post('b', 0.03), post('c', 0.04), post('c', 0.04), post('c', 0.04), post('d', 0.1)];
  // overall median of [.03 .03 .03 .04 .04 .04 .06 .06 .06 .1] = .04
  const v = Object.fromEntries(performanceBy(posts, 'bucket').map((g) => [g.key, g.verdict]));
  assert.deepEqual(v, { d: 'need-data', a: 'double-down', c: 'keep', b: 'cut' });
  const t = totals(posts);
  assert.equal(t.inbound, 10);
  assert.equal(t.inboundPer1k, 1);
});

test('buyer CSV import: lists split on ";" and duplicates skipped', () => {
  const ws = emptyWorkspace();
  const csv = 'name,role,company,pains,phrases\r\nA,CEO,X,"one; two",p1\r\nA,CEO,X,three,\r\n,CEO,Y,,\r\n';
  const r = importBuyers(ws, csv);
  assert.equal(r.added, 1);
  assert.deepEqual(r.ws.buyers[0].pains, ['one', 'two']);
  assert.equal(r.errors.length, 2);
  assert.equal(importBuyers(ws, 'role\r\nCEO\r\n').ok, false);
});

test('competitor post import creates competitors by name and parses dates', () => {
  const r = importCompPosts(emptyWorkspace(), 'competitor,date,hook,reactions\r\nAcme,30/10/2026,Hello,5\r\nacme,bad,Again,\r\n');
  assert.equal(r.ws.competitors.length, 1);
  assert.equal(r.ws.compPosts[0].date, '2026-10-30');
  assert.equal(r.ws.compPosts[1].reactions, null);
  assert.equal(r.errors.length, 1);
});

test('post metrics import updates by title and adds unknown posts as published', () => {
  const ws = emptyWorkspace();
  ws.posts = [{ id: 'p1', title: 'Hello world', status: 'draft', metrics: { impressions: null } }];
  const r = importPostMetrics(ws, 'title,impressions,reactions\r\nhello WORLD,1000,40\r\nNew one,500,5\r\n');
  assert.equal(r.updated, 1);
  assert.equal(r.added, 1);
  assert.equal(r.ws.posts[0].status, 'published');
  assert.equal(r.ws.posts[0].metrics.impressions, 1000);
  const csv = parseCSVObjects(exportPostsCSV(r.ws)).records;
  assert.equal(csv[0].engagement_rate, '0.0400');
});

test('state validation and workspace updates', () => {
  assert.equal(validateState({}).ok, false);
  const s = emptyState();
  const v = validateState(JSON.parse(JSON.stringify(s)));
  assert.ok(v.ok);
  const next = updateWorkspace(s, (w) => ({ ...w, name: 'Renamed' }));
  assert.equal(activeWorkspace(next).name, 'Renamed');
  assert.equal(activeWorkspace(s).name, 'My LinkedIn');
});

test('sample workspace is valid, labelled synthetic, and exercises every verdict', () => {
  const raw = JSON.parse(readFileSync(new URL('../sample-data/sample-workspace.json', import.meta.url)));
  const v = validateState(raw);
  assert.ok(v.ok, v.errors.join(' '));
  assert.equal(v.state.meta.synthetic, true);
  const ws = activeWorkspace(v.state);
  assert.ok(ws.buyers.every((b) => b.name.includes('(synthetic)')));
  assert.ok(JSON.stringify(raw).match(/https?:\/\/[^"]+/g).every((u) => /example\.(com|org|net)/.test(u)));
  const verdicts = new Set(performanceBy(ws.posts, 'bucket').map((g) => g.verdict));
  for (const x of ['double-down', 'cut', 'need-data']) assert.ok(verdicts.has(x), x);
  const steps = playbookProgress(ws, raw.meta.demoToday);
  assert.equal(steps.length, 6);
  assert.ok(steps.find((s) => s.id === 'profile').progress < 0.6, 'sample profile is deliberately weak');
});

test('weekStatus: setup, today, this week and Friday numbers', async () => {
  const { weekStatus } = await import('../src/lib/progress.js');
  const ws = emptyWorkspace();
  let s = weekStatus(ws, '2026-10-30');
  assert.equal(s.setupDone, false);
  assert.deepEqual(s.setup.map((x) => x.done), [false, false, false]);
  ws.offer = { audience: 'SaaS founders', outcome: 'book calls', proof: '' };
  ws.engagement = [{ date: '2026-10-30', minutes: 10 }, { date: '2026-10-30', minutes: 5 }, { date: '2026-10-29', minutes: 15 }];
  const m = (impressions) => ({ impressions, reactions: impressions ? 10 : null, comments: null, reposts: null });
  ws.posts = [
    { date: '2026-10-27', status: 'published', bucket: 'problems', metrics: m(null) }, // Monday this week, no numbers
    { date: '2026-10-31', status: 'scheduled', bucket: 'proof', metrics: m(null) },
    { date: '2026-10-25', status: 'published', bucket: 'proof', metrics: m(1000) }, // last week
    { date: '2026-10-28', status: 'draft', bucket: 'proof', metrics: m(null) },
  ];
  s = weekStatus(ws, '2026-10-30');
  assert.equal(s.setup[0].done, true);
  assert.equal(s.today.minutes, 15);
  assert.equal(s.today.streak, 2);
  assert.equal(s.posts.count, 2);
  assert.equal(s.friday.missingNumbers, 1);
});
