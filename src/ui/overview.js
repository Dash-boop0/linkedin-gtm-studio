// Overview: the six-step playbook with progress and the next action for each step.
import { playbookProgress } from '../lib/progress.js';
import { totals } from '../lib/analytics.js';
import { engagementSummary } from '../lib/engagement.js';
import { auditProfile } from '../lib/profile.js';
import { languageBank } from '../lib/research.js';
import { pct, fmt } from '../lib/text.js';
import { esc, meter } from './h.js';

export function renderOverview(ctx) {
  const ws = ctx.ws();
  const today = ctx.today();
  const steps = playbookProgress(ws, today);
  const t = totals(ws.posts);
  const eng = engagementSummary(ws.engagement, today, ws.settings.dailyEngageMinutes, 7);
  const audit = auditProfile(ws.profile, { phrases: languageBank(ws.buyers).phrases.map((p) => p.text), offer: ws.offer });
  const kpi = (label, value, sub, view) => `<a class="kpi" href="#${view}"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></a>`;
  return `
  <div class="page-head"><div><h1>${esc(ws.name)}</h1><p class="muted">Work backwards from the client you want: research → profile → content → visuals → daily comments → measure.</p></div></div>
  <div class="kpis">
    ${kpi('Buyers researched', `${ws.buyers.length}/10`, 'target: 10 dream clients', 'research')}
    ${kpi('Profile score', `${audit.score}`, `${audit.checks.filter((c) => !c.pass).length} checks to fix`, 'profile')}
    ${kpi('Posts published', fmt(t.published), `${ws.posts.filter((p) => p.status !== 'published').length} planned or in draft`, 'content')}
    ${kpi('Median engagement', pct(t.medianER), `${t.measured} post(s) with metrics`, 'analytics')}
    ${kpi('Inbound leads', fmt(t.inbound), `${t.inboundPer1k === null ? 'n/a' : t.inboundPer1k.toFixed(2)} per 1,000 impressions`, 'analytics')}
    ${kpi('Comment streak', `${eng.streak}d`, `${eng.daysOnTarget}/7 days ≥ ${ws.settings.dailyEngageMinutes} min`, 'engage')}
  </div>
  <section class="card"><div class="card-head"><h2>The playbook</h2><span class="muted small">Progress is computed from your data — see Method.</span></div>
    <ol class="steps">${steps.map((s) => `
      <li class="step is-${s.status}">
        <div class="step__n" aria-hidden="true">${s.n}</div>
        <div class="step__body">
          <div class="step__title"><a href="#${s.view}">${esc(s.title)}</a> <span class="muted small">${Math.round(s.progress * 100)}%</span></div>
          ${meter(s.progress, s.title)}
          <p class="small">${esc(s.next)}</p>
        </div>
      </li>`).join('')}
    </ol>
  </section>`;
}
