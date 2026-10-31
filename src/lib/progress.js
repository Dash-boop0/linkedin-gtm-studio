// Overview: how far the workspace is through the six-step playbook, and the single next action for each step.
import { TARGET_BUYERS, TARGET_COMPETITORS, PLAYBOOK, BUCKET_IDS } from './constants.js';
import { researchProgress, languageBank } from './research.js';
import { auditProfile } from './profile.js';
import { recommendVisual } from './content.js';
import { engagementSummary } from './engagement.js';
import { publishedWithMetrics, engagementRate, performanceBy } from './analytics.js';
import { startOfWeek, diffDays } from './dates.js';

const clamp = (x) => Math.max(0, Math.min(1, x));

/** Returns [{ ...step, progress (0-1), status, next }] in playbook order. */
export function playbookProgress(ws, today) {
  const r = researchProgress(ws, { buyers: TARGET_BUYERS, competitors: TARGET_COMPETITORS });
  const bank = languageBank(ws.buyers);
  const audit = auditProfile(ws.profile, { phrases: bank.phrases.map((p) => p.text), offer: ws.offer });
  const planned = ws.posts.filter((p) => p.status !== 'idea');
  const bucketsUsed = new Set(planned.map((p) => p.bucket)).size;
  const withVisual = planned.filter((p) => p.visual === recommendVisual(p.kind).visual || (p.visual === 'infographic' && p.kind === 'walkthrough')).length;
  const eng = engagementSummary(ws.engagement, today, ws.settings.dailyEngageMinutes, 7);
  const measured = publishedWithMetrics(ws.posts).length;

  const steps = {
    research: {
      progress: clamp((r.buyersComplete / TARGET_BUYERS) * 0.6 + (r.competitorsBrokenDown / TARGET_COMPETITORS) * 0.4),
      next: r.buyersComplete < TARGET_BUYERS
        ? `Research ${TARGET_BUYERS - r.buyersComplete} more buyer(s): pains, what they tried, their exact words.`
        : r.competitorsBrokenDown < TARGET_COMPETITORS ? `Break down posts for ${TARGET_COMPETITORS - r.competitorsBrokenDown} more competitor(s).` : 'Keep adding buyer phrases as you read their comments.',
    },
    profile: {
      progress: audit.score / 100,
      next: audit.checks.find((c) => !c.pass)?.fix ?? 'Profile passes every check. Re-audit after each offer change.',
    },
    buckets: {
      progress: clamp((bucketsUsed / BUCKET_IDS.length) * 0.5 + Math.min(planned.length, 12) / 24),
      next: bucketsUsed < BUCKET_IDS.length ? `Plan at least one post in each of the 4 buckets (${bucketsUsed}/4 used).` : planned.length < 12 ? `Draft ${12 - planned.length} more posts to fill a month.` : 'A month is planned. Keep the mix close to target.',
    },
    visuals: {
      progress: planned.length ? withVisual / planned.length : 0,
      next: !planned.length ? 'Plan posts first — each gets a recommended visual.' : withVisual === planned.length ? 'Every planned post uses the recommended visual.' : `${planned.length - withVisual} planned post(s) use a different visual than recommended.`,
    },
    engage: {
      progress: eng.daysOnTarget / eng.days,
      next: `${eng.daysOnTarget}/${eng.days} days on target this week. Log today’s comments.`,
    },
    measure: {
      progress: clamp(measured / 10),
      next: measured < 10 ? `Add metrics for ${10 - measured} more published post(s) to compare what works.` : 'Check Analytics weekly: double down and cut.',
    },
  };
  return PLAYBOOK.map((s) => {
    const p = steps[s.id];
    const status = p.progress >= 0.999 ? 'done' : p.progress > 0 ? 'in-progress' : 'not-started';
    return { ...s, ...p, status };
  });
}

/**
 * Simple mode: the four things that matter this week.
 * setup (once) · today's comments · this week's posts · Friday numbers.
 */
export function weekStatus(ws, today) {
  const r = researchProgress(ws, { buyers: TARGET_BUYERS, competitors: TARGET_COMPETITORS });
  const audit = auditProfile(ws.profile, { phrases: languageBank(ws.buyers).phrases.map((p) => p.text), offer: ws.offer });
  const setup = [
    { id: 'offer', label: 'Write who you help and what you get them', done: !!(ws.offer.audience.trim() && ws.offer.outcome.trim()), view: 'profile' },
    { id: 'buyers', label: `Add ${TARGET_BUYERS} dream clients with their problems and words`, done: r.buyersComplete >= TARGET_BUYERS, detail: `${r.buyersComplete}/${TARGET_BUYERS}`, view: 'research' },
    { id: 'profile', label: 'Fix your profile until it scores 80+', done: audit.score >= 80, detail: `${audit.score}/100`, view: 'profile' },
  ];
  const minutesToday = ws.engagement.filter((e) => e.date === today).reduce((s, e) => s + (e.minutes || 0), 0);
  const weekStart = startOfWeek(today);
  const thisWeek = ws.posts.filter((p) => p.date && diffDays(weekStart, p.date) >= 0 && diffDays(weekStart, p.date) < 7 && (p.status === 'published' || p.status === 'scheduled'));
  const missingNumbers = ws.posts.filter((p) => p.status === 'published' && engagementRate(p.metrics) === null && p.date && p.date <= today);
  const winners = performanceBy(ws.posts, 'bucket', { minSample: ws.settings.minSample }).filter((g) => g.verdict === 'double-down').map((g) => g.key);
  return {
    setup,
    setupDone: setup.every((s) => s.done),
    today: { minutes: minutesToday, target: ws.settings.dailyEngageMinutes, streak: engagementSummary(ws.engagement, today, ws.settings.dailyEngageMinutes).streak },
    posts: { count: thisWeek.length, target: ws.settings.weeklyPosts, items: thisWeek },
    friday: { missingNumbers: missingNumbers.length, winners },
  };
}
