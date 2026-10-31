// Generates the synthetic sample workspace and CSV examples in sample-data/. Deterministic (seeded).
// Run: node scripts/generate-sample-data.mjs
import { writeFileSync } from 'node:fs';
import { createRng } from '../src/lib/rng.js';
import { addDays } from '../src/lib/dates.js';
import { objectsToCSV } from '../src/lib/csv.js';
import { DEFAULT_SETTINGS } from '../src/lib/constants.js';

const rng = createRng(20261030);
const TODAY = '2026-10-30';
const OUT = new URL('../sample-data/', import.meta.url);
let n = 0;
const id = (p) => `${p}_s${(n += 1)}`;

// Ten fictional buyers: seed-stage B2B SaaS founders. Names and companies are invented; URLs use example.com.
const BUYERS = [
  ['Rhea Kapoor', 'Founder & CEO', 'Ledgerleaf (synthetic)', ['founder-led sales doesn’t scale', 'no time to post consistently'], ['hired an agency that posted generic content'], ['posting into the void', 'I know I should be on LinkedIn']],
  ['Arjun Mehta', 'Co-founder', 'Shipwise (synthetic)', ['no time to post consistently', 'pipeline depends on referrals'], ['scheduled posts with a tool for a month'], ['posting into the void', 'every deal comes from referrals']],
  ['Meera Iyer', 'CEO', 'Clinicflow (synthetic)', ['content gets likes but no leads', 'doesn’t know what to write about'], ['wrote thought-leadership essays'], ['likes but no leads', 'vanity metrics']],
  ['Kabir Shah', 'Founder', 'Tallystack (synthetic)', ['pipeline depends on referrals', 'founder-led sales doesn’t scale'], ['cold email sequences'], ['every deal comes from referrals', 'I hate selling']],
  ['Nisha Rao', 'Co-founder & CEO', 'Formbase (synthetic)', ['content gets likes but no leads', 'no time to post consistently'], ['hired an agency that posted generic content', 'ghostwriter who didn’t understand the product'], ['likes but no leads', 'sounds like everyone else']],
  ['Dev Malhotra', 'Founder', 'Rentroll (synthetic)', ['doesn’t know what to write about', 'profile doesn’t explain the product'], ['reposted company page updates'], ['I know I should be on LinkedIn', 'nobody gets what we do']],
  ['Tara Nair', 'CEO', 'Quoteloop (synthetic)', ['profile doesn’t explain the product', 'content gets likes but no leads'], ['wrote thought-leadership essays'], ['nobody gets what we do', 'vanity metrics']],
  ['Vikram Bose', 'Co-founder', 'Stackyard (synthetic)', ['founder-led sales doesn’t scale', 'pipeline depends on referrals'], ['cold email sequences', 'scheduled posts with a tool for a month'], ['I hate selling', 'every deal comes from referrals']],
  ['Ananya Gupta', 'Founder & CEO', 'Hirelane (synthetic)', ['no time to post consistently', 'doesn’t know what to write about'], ['ghostwriter who didn’t understand the product'], ['posting into the void', 'sounds like everyone else']],
  ['Rohan Pillai', 'CEO', 'Metricly (synthetic)', ['content gets likes but no leads', 'founder-led sales doesn’t scale'], ['hired an agency that posted generic content'], ['likes but no leads', 'I know I should be on LinkedIn']],
].map(([name, role, company, pains, tried, phrases], i) => ({
  id: id('buyer'), name: `${name} (synthetic)`, role, company, url: `https://www.example.com/buyer-${i + 1}`, pains, tried, phrases, notes: 'Fictional buyer for the demo.',
}));

const COMPETITORS = ['Northline Content (synthetic)', 'Ghostloop Studio (synthetic)', 'Foundervoice Co (synthetic)', 'Pipeline Pages (synthetic)', 'Brightpost Agency (synthetic)']
  .map((name, i) => ({ id: id('comp'), name, url: `https://www.example.org/competitor-${i + 1}`, audience: 'B2B SaaS founders' }));

const COMP_HOOKS = [
  ['Stop posting “thought leadership” if you want leads.', 'mistakes', 'lead generation', 'text-only'],
  ['How I turned one founder’s comments into 9 sales calls', 'case-study', 'founder-led sales', 'screenshot'],
  ['Your profile is a landing page. Most founders treat it like a CV.', 'opinion', 'profile', 'side-by-side'],
  ['7 hooks I reuse every week (steal them)', 'list', 'writing', 'carousel'],
  ['Last month a founder told me LinkedIn “doesn’t work for B2B”.', 'story', 'founder-led sales', 'photo'],
  ['Why are your posts getting likes but no DMs?', 'mistakes', 'lead generation', 'text-only'],
  ['How to write a LinkedIn post in 20 minutes: my 4-step process', 'how-to', 'writing', 'steps-graphic'],
  ['The new LinkedIn feed update, explained for founders', 'news-take', 'platform changes', 'text-only'],
  ['We grew a client from 0 to 40 inbound leads in 90 days', 'case-study', 'lead generation', 'screenshot'],
  ['Behind the scenes: how we plan a month of founder content', 'behind-the-scenes', 'process', 'carousel'],
];
const compPosts = [];
COMPETITORS.forEach((c, ci) => {
  for (let k = 0; k < 4; k += 1) {
    const [hook, angle, topic, graphic] = COMP_HOOKS[(ci * 3 + k) % COMP_HOOKS.length];
    const boost = { 'case-study': 2.2, mistakes: 1.6, story: 1.4, list: 1.2, 'how-to': 1.1, opinion: 1, 'behind-the-scenes': 0.8, 'news-take': 0.6 }[angle] ?? 1;
    const reactions = Math.round(rng.int(60, 160) * boost);
    compPosts.push({ id: id('cp'), competitorId: c.id, date: addDays(TODAY, -rng.int(3, 40)), topic, angle, hook, graphic, reactions, comments: Math.round(reactions * (0.12 + rng.next() * 0.15)), reposts: Math.round(reactions * (0.02 + rng.next() * 0.05)), url: `https://www.example.org/post-${compPosts.length + 1}` });
  }
});

const outsideIdeas = [
  { id: id('idea'), source: 'X', url: 'https://www.example.net/x-post-1', summary: 'A thread arguing that founder-led content beats paid ads for early B2B (illustrative)', myTake: 'True only if the founder posts about buyer problems, not the product', bucket: 'industry' },
  { id: id('idea'), source: 'X', url: 'https://www.example.net/x-post-2', summary: 'A chart of rising AI-written content on social feeds (illustrative)', myTake: 'Specific stories are the only thing AI can’t fake — use yours', bucket: 'industry' },
  { id: id('idea'), source: 'Newsletter', url: 'https://www.example.net/newsletter-1', summary: 'A breakdown of how buyers research vendors before a first call (illustrative)', myTake: '', bucket: 'expertise' },
];

// Your own posts over the last six weeks (published, with metrics) and the next three weeks (planned).
const PLAN = [
  ['problems', 'opinion', 'text-only', 'Likes but no leads? Your posts are written for peers, not buyers.'],
  ['proof', 'result', 'screenshot', 'From posting into the void to 6 inbound calls: a founder’s first 60 days (illustrative)'],
  ['expertise', 'process', 'steps-graphic', 'How I write a founder post in 25 minutes: 4 steps'],
  ['industry', 'opinion', 'text-only', 'Everyone is talking about the new feed update. Here’s what changes for founders.'],
  ['problems', 'opinion', 'text-only', 'Every deal comes from referrals? That’s a pipeline risk, not a strength.'],
  ['expertise', 'walkthrough', 'carousel', '5 profile fixes that make founders easier to buy from'],
  ['proof', 'personal', 'photo', 'I lost a client last month. Here’s what I changed.'],
  ['problems', 'comparison', 'side-by-side', 'Thought leadership vs buyer-problem posts: same founder, two weeks each'],
  ['industry', 'opinion', 'text-only', 'AI-written posts are flooding the feed. Specific stories still win.'],
  ['expertise', 'walkthrough', 'carousel', 'The 15-minute daily comment routine I give every client'],
  ['problems', 'opinion', 'text-only', 'I know I should be on LinkedIn — the sentence I hear from every founder'],
  ['proof', 'result', 'screenshot', 'What 90 days of buyer-problem posts did for one founder’s inbound (illustrative)'],
];
const ER = { problems: 0.044, proof: 0.066, expertise: 0.027, industry: 0.018 };
const posts = PLAN.map(([bucket, kind, visual, title], i) => {
  const date = addDays(TODAY, -42 + i * 3);
  const impressions = rng.int(1400, 4200);
  const er = ER[bucket] * (0.8 + rng.next() * 0.4);
  const eng = Math.round(impressions * er);
  const comments = Math.round(eng * 0.22);
  const reposts = Math.round(eng * 0.05);
  return {
    id: id('post'), date, bucket, kind, visual, status: 'published', title, hook: title,
    body: 'Synthetic sample post body.\n\nThe content and numbers in this sample are fictional.\n\nWhat would you add?',
    metrics: { impressions, reactions: eng - comments - reposts, comments, reposts, profileViews: Math.round(impressions * 0.012), inbound: bucket === 'proof' || bucket === 'problems' ? rng.int(0, 2) : 0 },
  };
});
const UPCOMING = [
  ['problems', 'opinion', 'text-only', 'scheduled', 'The ghostwriter didn’t understand your product. That’s a briefing problem.'],
  ['expertise', 'process', 'steps-graphic', 'scheduled', 'How to turn one sales call into three posts'],
  ['industry', 'opinion', 'text-only', 'idea', 'React to this week’s industry news with my take'],
  ['proof', 'result', 'screenshot', 'draft', 'Before → after: a founder profile rewrite (illustrative)'],
  ['problems', 'opinion', 'text-only', 'idea', 'Posting into the void: why consistency isn’t the fix'],
];
UPCOMING.forEach(([bucket, kind, visual, status, title], i) => {
  posts.push({ id: id('post'), date: addDays(TODAY, 1 + i * 3), bucket, kind, visual, status, title, hook: title, body: '', metrics: { impressions: null, reactions: null, comments: null, reposts: null, profileViews: null, inbound: null } });
});

const engagement = [];
for (let d = 13; d >= 0; d -= 1) {
  if (d === 5 || d === 9) continue; // two missed days, so the streak is realistic
  const date = addDays(TODAY, -d);
  const count = 3;
  for (let k = 0; k < count; k += 1) {
    const b = rng.pick(BUYERS);
    const icp = rng.next() < 0.7;
    engagement.push({ id: id('eng'), date, minutes: rng.int(5, 8), person: icp ? b.name : `Someone in ${b.company}’s network (synthetic)`, relation: icp ? 'icp' : 'network', note: icp ? 'Added a specific example to their post' : 'Replied to a comment thread' });
  }
}

const main = {
  id: 'ws_sample',
  name: 'Sample: founder-led content freelancer (synthetic)',
  offer: { audience: 'seed-stage B2B SaaS founders', outcome: 'turn LinkedIn into a pipeline instead of posting into the void', proof: 'illustrative sample — replace with your real proof' },
  buyers: BUYERS,
  competitors: COMPETITORS,
  compPosts,
  outsideIdeas,
  profile: {
    headline: 'Founder-led content for B2B SaaS | Writer',
    banner: 'Photo of me at my desk',
    about: 'I am a content writer with 4 years of experience. I love writing and storytelling. I have worked with startups across industries. Feel free to connect!',
    featured: [{ id: id('feat'), kind: 'post', title: 'My most-liked post', url: 'https://www.example.com/featured-1' }],
  },
  posts,
  engagement,
  settings: structuredClone(DEFAULT_SETTINGS),
};
const client = {
  id: 'ws_client', name: 'Client: Fernhill Analytics founder (synthetic)',
  offer: { audience: 'operations leaders at mid-size logistics firms', outcome: 'cut reporting time', proof: '' },
  buyers: [], competitors: [], compPosts: [], outsideIdeas: [], profile: { headline: '', banner: '', about: '', featured: [] }, posts: [], engagement: [],
  settings: structuredClone(DEFAULT_SETTINGS),
};

const state = { version: 1, meta: { synthetic: true, demoToday: TODAY, note: 'All people, companies, posts and metrics are fictional and illustrative.' }, activeId: main.id, workspaces: [main, client], log: [] };
writeFileSync(new URL('sample-workspace.json', OUT), `${JSON.stringify(state, null, 2)}\n`);

// CSV examples (same synthetic data) for testing the importers.
const compName = new Map(COMPETITORS.map((c) => [c.id, c.name]));
writeFileSync(new URL('buyers-example.csv', OUT), objectsToCSV(BUYERS.map((b) => ({ ...b, pains: b.pains.join('; '), tried: b.tried.join('; '), phrases: b.phrases.join('; ') })), ['name', 'role', 'company', 'url', 'pains', 'tried', 'phrases', 'notes']));
writeFileSync(new URL('competitor-posts-example.csv', OUT), objectsToCSV(compPosts.map((p) => ({ ...p, competitor: compName.get(p.competitorId) })), ['competitor', 'date', 'topic', 'angle', 'hook', 'graphic', 'reactions', 'comments', 'reposts', 'url']));
writeFileSync(new URL('post-metrics-example.csv', OUT), objectsToCSV(posts.filter((p) => p.status === 'published').map((p) => ({ ...p, ...p.metrics, profile_views: p.metrics.profileViews })), ['date', 'title', 'bucket', 'kind', 'visual', 'hook', 'impressions', 'reactions', 'comments', 'reposts', 'profile_views', 'inbound']));
console.log(`sample: ${BUYERS.length} buyers, ${COMPETITORS.length} competitors, ${compPosts.length} competitor posts, ${posts.length} posts, ${engagement.length} engagement entries`);
