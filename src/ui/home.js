// Simple mode home: set up once, comment today, post this week, add Friday numbers.
import { weekStatus } from '../lib/progress.js';
import { BUCKETS } from '../lib/constants.js';
import { formatDate } from '../lib/dates.js';
import { esc, input, btn, meter } from './h.js';

const bucketName = (id) => BUCKETS.find((b) => b.id === id)?.short ?? id;

export function renderHome(ctx) {
  const ws = ctx.ws();
  const s = weekStatus(ws, ctx.today());
  const todayDone = s.today.minutes >= s.today.target;
  const postsDone = s.posts.count >= s.posts.target;
  const tick = (done) => `<span class="tick ${done ? 'is-done' : ''}" aria-hidden="true">${done ? '✓' : ''}</span>`;
  return `
  <div class="page-head"><div><h1>This week</h1><p class="muted">${esc(ws.name)} · four things, nothing else.</p></div></div>

  ${s.setupDone ? '' : `<section class="card"><div class="card-head"><h2>Set up once</h2><span class="muted small">${s.setup.filter((x) => x.done).length}/3 done</span></div>
    <ul class="todo">${s.setup.map((x) => `<li>${tick(x.done)}<a href="#${x.view}">${esc(x.label)}</a>${x.detail ? ` <span class="muted small">${esc(x.detail)}</span>` : ''}</li>`).join('')}</ul>
  </section>`}

  <div class="grid grid-2">
    <section class="card"><div class="card-head"><h2>${tick(todayDone)} Comment today</h2><span class="muted small">${s.today.streak}-day streak</span></div>
      <p class="small">${s.today.minutes} of ${s.today.target} minutes. Comment on your dream clients’ posts — add an example or a question, not “great post”.</p>
      ${meter(s.today.minutes / s.today.target, 'Minutes today')}
      <form data-form="engagement" class="form-grid mt">
        <input type="hidden" name="date" value="${esc(ctx.today())}">
        ${input('Whose post', 'person', '', { attrs: 'list="buyer-names" required' })}
        <datalist id="buyer-names">${ws.buyers.map((b) => `<option value="${esc(b.name)}">`).join('')}</datalist>
        ${input('Minutes', 'minutes', '5', { type: 'number', attrs: 'min="1" max="240"' })}
        <input type="hidden" name="relation" value="icp"><input type="hidden" name="note" value="">
        <div class="actions full">${btn('Log comment', '', { cls: 'primary', type: 'submit' })}</div>
      </form>
    </section>

    <section class="card"><div class="card-head"><h2>${tick(postsDone)} Post this week</h2><span class="muted small">${s.posts.count}/${s.posts.target}</span></div>
      ${meter(s.posts.count / s.posts.target, 'Posts this week')}
      ${s.posts.items.length ? `<ul class="todo">${s.posts.items.map((p) => `<li>${tick(p.status === 'published')}<span>${esc(p.title)}<br><span class="muted small">${formatDate(p.date, { year: false })} · ${esc(p.status)}</span></span></li>`).join('')}</ul>` : '<p class="muted small">Nothing posted or scheduled yet this week.</p>'}
      <div class="actions mt"><a class="btn primary" href="#content">Write a post</a></div>
    </section>
  </div>

  <section class="card"><div class="card-head"><h2>${tick(s.friday.missingNumbers === 0)} Friday: add your numbers</h2></div>
    ${s.friday.missingNumbers
      ? `<p class="small">${s.friday.missingNumbers} published post(s) still need their numbers from LinkedIn (impressions, reactions, comments, reposts, and any DMs they brought).</p><div class="actions"><a class="btn" href="#analytics">Add numbers</a></div>`
      : '<p class="small">All published posts have numbers.</p>'}
    ${s.friday.winners.length ? `<p class="small mt"><strong>Post more:</strong> ${s.friday.winners.map(bucketName).map(esc).join(', ')} — these beat your average.</p>` : ''}
  </section>`;
}

