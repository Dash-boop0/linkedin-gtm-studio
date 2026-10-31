// Step 5 of the playbook: 15 minutes a day commenting on your ideal customers and the people in their network.
import { addDays, diffDays } from './dates.js';
import { ratio } from './text.js';

/** Minutes per day for the `days` days ending at `today` (inclusive), oldest first. */
export function dailyMinutes(entries, today, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const minutes = entries.filter((e) => e.date === date).reduce((s, e) => s + (e.minutes || 0), 0);
    return { date, minutes };
  });
}

/**
 * Consecutive days meeting the target, counting back from today.
 * Today not yet logged does not break the streak (the day isn't over).
 */
export function streak(entries, today, target) {
  const byDay = new Map();
  entries.forEach((e) => byDay.set(e.date, (byDay.get(e.date) ?? 0) + (e.minutes || 0)));
  let n = 0;
  let d = (byDay.get(today) ?? 0) >= target ? today : addDays(today, -1);
  while ((byDay.get(d) ?? 0) >= target) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

/** Summary for the last `days` days: minutes, days on target, ICP share, unique people. */
export function engagementSummary(entries, today, target, days = 7) {
  const recent = entries.filter((e) => diffDays(e.date, today) >= 0 && diffDays(e.date, today) < days);
  const series = dailyMinutes(entries, today, days);
  const icp = recent.filter((e) => e.relation === 'icp').length;
  return {
    minutes: recent.reduce((s, e) => s + (e.minutes || 0), 0),
    daysOnTarget: series.filter((d) => d.minutes >= target).length,
    days,
    comments: recent.length,
    icpShare: ratio(icp, recent.length),
    people: new Set(recent.map((e) => e.person.trim().toLowerCase()).filter(Boolean)).size,
    streak: streak(entries, today, target),
  };
}
