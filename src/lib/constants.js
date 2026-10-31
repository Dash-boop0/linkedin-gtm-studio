// Shared constants: storage key, the six-step playbook, content buckets and visual rules.

export const STORAGE_KEY = 'linkedin-gtm-studio.v1';
export const SCHEMA_VERSION = 1;

/** Research targets from the playbook: 10 buyers you want as clients, 5 competitors reaching them. */
export const TARGET_BUYERS = 10;
export const TARGET_COMPETITORS = 5;

/** LinkedIn's published character limits. */
export const LIMITS = {
  headline: 220,
  about: 2600,
  post: 3000,
  // Roughly what shows before "…see more" on mobile; LinkedIn does not publish an exact figure.
  postPreview: 210,
  aboutPreview: 265,
};

export const BUCKETS = [
  { id: 'problems', label: 'Buyer problems', short: 'Problems', color: 'var(--s1)',
    help: 'Mistakes, frustrations and decisions your buyer faces — written in the words they use.' },
  { id: 'industry', label: 'Industry take (top of funnel)', short: 'Industry take', color: 'var(--s2)',
    help: 'A recent happening in your buyer’s industry plus your opinion on it.' },
  { id: 'expertise', label: 'Expertise', short: 'Expertise', color: 'var(--s3)',
    help: 'Tutorials, checklists and breakdowns of how you solve a specific problem.' },
  { id: 'proof', label: 'Case studies & work stories', short: 'Proof', color: 'var(--s4)',
    help: 'Before/after of a client transformation with the story, or what is happening in your business.' },
];
export const BUCKET_IDS = BUCKETS.map((b) => b.id);
export const bucketLabel = (id) => BUCKETS.find((b) => b.id === id)?.label ?? id;

/** What the post is showing → the visual that supports it. */
export const VISUAL_RULES = [
  { kind: 'result', label: 'A result or metric', visual: 'screenshot', advice: 'Screenshot of the result with the relevant numbers highlighted.' },
  { kind: 'personal', label: 'A personal experience', visual: 'photo', advice: 'A real photo from that moment.' },
  { kind: 'process', label: 'A process or method', visual: 'steps-graphic', advice: 'A simple graphic showing the steps in order.' },
  { kind: 'comparison', label: 'A comparison', visual: 'side-by-side', advice: 'Put the options side by side in one image.' },
  { kind: 'walkthrough', label: 'A detailed walkthrough', visual: 'carousel', advice: 'A carousel (PDF) or infographic, readable on a phone.' },
  { kind: 'opinion', label: 'An opinion or short take', visual: 'text-only', advice: 'Text-only is fine; add an image only if it adds information.' },
];
export const VISUALS = ['screenshot', 'photo', 'steps-graphic', 'side-by-side', 'carousel', 'infographic', 'text-only', 'video', 'other'];
export const POST_KINDS = VISUAL_RULES.map((r) => r.kind);
export const POST_STATUSES = ['idea', 'draft', 'scheduled', 'published'];

/** Competitor post breakdown dimensions (topic is free text). */
export const ANGLES = ['how-to', 'mistakes', 'opinion', 'story', 'case-study', 'list', 'news-take', 'behind-the-scenes', 'other'];
export const HOOK_TYPES = ['question', 'number', 'contrarian', 'story', 'result', 'how-to', 'statement'];

/** Engagement weights: a comment or repost signals more intent than a reaction. Editable in Settings. */
export const DEFAULT_WEIGHTS = { reactions: 1, comments: 2, reposts: 3 };

export const DEFAULT_SETTINGS = {
  dailyEngageMinutes: 15,
  weeklyPosts: 3,
  bucketMix: { problems: 35, industry: 20, expertise: 30, proof: 15 },
  weights: { ...DEFAULT_WEIGHTS },
  // Minimum posts in a group before Analytics recommends doubling down or cutting.
  minSample: 3,
};

export const PLAYBOOK = [
  { id: 'research', n: 1, title: 'Research buyers and competitors', view: 'research' },
  { id: 'profile', n: 2, title: 'Optimise your profile', view: 'profile' },
  { id: 'buckets', n: 3, title: 'Plan four content buckets', view: 'content' },
  { id: 'visuals', n: 4, title: 'Match every post with the right visual', view: 'content' },
  { id: 'engage', n: 5, title: '15 minutes of daily comments', view: 'engage' },
  { id: 'measure', n: 6, title: 'Measure, double down, cut', view: 'analytics' },
];
