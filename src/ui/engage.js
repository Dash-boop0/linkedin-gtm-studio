// Step 5: 15 minutes a day commenting on ideal customers and the people in their network.
import { dailyMinutes, engagementSummary } from '../lib/engagement.js';
import { stackedColumns, legendHTML } from '../lib/charts.js';
import { newId, toCount } from '../lib/model.js';
import { formatDate } from '../lib/dates.js';
import { pct } from '../lib/text.js';
import { esc, input, select, btn, table } from './h.js';

export function renderEngage(ctx) {
  const ws = ctx.ws();
  const today = ctx.today();
  const target = ws.settings.dailyEngageMinutes;
  const s = engagementSummary(ws.engagement, today, target, 7);
  const days = dailyMinutes(ws.engagement, today, 14);
  const recent = [...ws.engagement].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  const series = [{ name: 'Minutes', color: 'var(--s1)', values: days.map((d) => d.minutes) }];
  return `
  <div class="page-head"><div><h1>5 · Daily comments</h1>
    <p class="muted">Spend ${target} minutes a day commenting on your ideal customers and the people in their network. Add something specific — an example, a number, a question — not “Great post!”.</p></div></div>
  <div class="kpis">
    <div class="kpi"><div class="label">Streak</div><div class="value">${s.streak}d</div><div class="sub">days ≥ ${target} min</div></div>
    <div class="kpi"><div class="label">This week</div><div class="value">${s.daysOnTarget}/7</div><div class="sub">days on target</div></div>
    <div class="kpi"><div class="label">Minutes (7d)</div><div class="value">${s.minutes}</div><div class="sub">target ${target * 7}</div></div>
    <div class="kpi"><div class="label">Comments (7d)</div><div class="value">${s.comments}</div><div class="sub">${s.people} different people</div></div>
    <div class="kpi"><div class="label">On ideal customers</div><div class="value">${pct(s.icpShare, 0)}</div><div class="sub">rest: their network</div></div>
  </div>
  <div class="grid grid-2">
    <section class="card"><div class="card-head"><h2>Last 14 days</h2></div>
      <div class="chart-box">${stackedColumns({ title: 'Minutes spent commenting per day', categories: days.map((d) => formatDate(d.date, { year: false }).replace(' ', ' ')), series, line: { name: 'Target', color: 'var(--s2)', values: days.map(() => target) } })}</div>
      ${legendHTML([...series, { name: 'Target', color: 'var(--s2)', kind: 'line' }])}
    </section>
    <section class="card"><div class="card-head"><h2>Log a comment</h2></div>
      <form data-form="engagement" class="form-grid">
        ${input('Date', 'date', today, { type: 'date' })}
        ${input('Minutes', 'minutes', '5', { type: 'number', attrs: 'min="1" max="240"' })}
        ${input('Whose post', 'person', '', { full: true, attrs: 'list="buyer-names" required' })}
        <datalist id="buyer-names">${ws.buyers.map((b) => `<option value="${esc(b.name)}">`).join('')}</datalist>
        ${select('Who they are', 'relation', 'icp', [['icp', 'Ideal customer'], ['network', 'In their network']])}
        ${input('What you added', 'note')}
        <div class="actions full">${btn('Log comment', '', { cls: 'primary', type: 'submit' })}</div>
      </form>
    </section>
  </div>
  <section class="card"><div class="card-head"><h2>Recent comments</h2></div>
    ${recent.length ? table('Most recent 25', [
      { label: 'Date', html: (e) => formatDate(e.date) },
      { label: 'Person', key: 'person' },
      { label: 'Type', html: (e) => (e.relation === 'icp' ? 'Ideal customer' : 'Network') },
      { label: 'Min', num: true, key: 'minutes' },
      { label: 'Note', key: 'note' },
      { label: '', html: (e) => btn('Delete', 'delete', { cls: 'small danger', data: { type: 'engagement', id: e.id } }) },
    ], recent) : '<p class="muted small">Nothing logged yet.</p>'}
  </section>`;
}

export const engageForms = {
  engagement(ctx, d) {
    const minutes = toCount(d.minutes);
    if (!d.person?.trim() || !minutes) return ctx.announce('Person and minutes are required.');
    ctx.update((ws) => ({ ...ws, engagement: [...ws.engagement, { id: newId('eng'), date: d.date, minutes, person: d.person.trim(), relation: d.relation, note: d.note ?? '' }] }), `Logged ${minutes} min on ${d.person.trim()}’s post.`);
  },
};
