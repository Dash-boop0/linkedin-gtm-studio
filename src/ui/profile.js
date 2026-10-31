// Step 2: optimise the profile before anything else. The audit re-runs as you type.
import { auditProfile, headlineFromOffer } from '../lib/profile.js';
import { languageBank } from '../lib/research.js';
import { LIMITS } from '../lib/constants.js';
import { newId } from '../lib/model.js';
import { esc, input, textarea, select, btn, formData } from './h.js';

const FEATURED_KINDS = [['case-study', 'Case study'], ['booking', 'Book a call / contact'], ['post', 'Post'], ['lead-magnet', 'Lead magnet / guide'], ['other', 'Other']];

export function auditHTML(audit) {
  const areas = [...new Set(audit.checks.map((c) => c.area))];
  return `<div class="score"><span class="score__v ${audit.score >= 80 ? 'good' : audit.score >= 50 ? 'warn' : 'bad'}">${audit.score}</span><span class="muted small">/ 100 · weighted checks</span></div>
    ${areas.map((a) => `<h3 class="mt">${esc(a)}</h3><ul class="checks">${audit.checks.filter((c) => c.area === a).map((c) => `
      <li class="${c.pass ? 'pass' : 'fail'}"><span class="mark" aria-hidden="true">${c.pass ? '✓' : '✗'}</span><span><span class="sr-only">${c.pass ? 'Pass' : 'Fail'}: </span>${esc(c.label)}${c.pass ? '' : `<br><span class="muted small">${esc(c.fix)}</span>`}</span></li>`).join('')}</ul>`).join('')}
    ${audit.usesBuyerWords.length ? `<p class="small mt">Buyer phrases found: ${audit.usesBuyerWords.map((p) => `“${esc(p)}”`).join(', ')}</p>` : ''}`;
}

const phrasesOf = (ws) => languageBank(ws.buyers).phrases.map((p) => p.text);

export function renderProfile(ctx) {
  const ws = ctx.ws();
  const pr = ws.profile;
  const audit = auditProfile(pr, { phrases: phrasesOf(ws), offer: ws.offer });
  const suggestion = headlineFromOffer(ws.offer);
  return `
  <div class="page-head"><div><h1>2 · Optimise your profile</h1>
    <p class="muted">Headline: who you help and what you help them achieve. Banner: your offer plus a credible result. About: their problem, your approach, how to work with you, proof. Featured: case studies and a way to book a call.</p></div></div>

  <section class="card"><div class="card-head"><h2>Your offer</h2><span class="muted small">Everything else is built from this.</span></div>
    <form data-form="offer" class="form-grid">
      ${input('Who you help', 'audience', ws.offer.audience, { hint: 'e.g. seed-stage B2B SaaS founders' })}
      ${input('What you help them achieve', 'outcome', ws.offer.outcome, { hint: 'e.g. book sales calls from LinkedIn' })}
      ${input('Proof you can show', 'proof', ws.offer.proof, { full: true, hint: 'Only real, verifiable results.' })}
      <div class="actions full">${btn('Save offer', '', { cls: 'primary', type: 'submit' })}</div>
    </form>
  </section>

  <div class="grid grid-2">
    <section class="card"><div class="card-head"><h2>Profile draft</h2></div>
      <form data-form="profile" data-live="profile" class="form-grid">
        ${input(`Headline (${pr.headline.length}/${LIMITS.headline})`, 'headline', pr.headline, { full: true, attrs: `maxlength="${LIMITS.headline * 2}" data-count="${LIMITS.headline}"` })}
        ${suggestion ? `<p class="hint full">Starting point from your offer: <button type="button" class="btn link" data-action="use-headline" data-text="${esc(suggestion)}">${esc(suggestion)}</button></p>` : ''}
        ${textarea('Banner — describe the text and image', 'banner', pr.banner, { rows: 2 })}
        ${textarea(`About (${pr.about.length}/${LIMITS.about})`, 'about', pr.about, { rows: 9, attrs: `data-count="${LIMITS.about}"`, hint: `The first ~${LIMITS.aboutPreview} characters show before “see more”.` })}
        <div class="actions full">${btn('Save profile', '', { cls: 'primary', type: 'submit' })}</div>
      </form>
      <h3 class="mt">Featured section</h3>
      ${pr.featured.length ? `<ul class="timeline">${pr.featured.map((f) => `<li><div class="row-between"><span><strong>${esc(FEATURED_KINDS.find((k) => k[0] === f.kind)?.[1] ?? f.kind)}</strong> · ${esc(f.title)}</span>${btn('Remove', 'remove-featured', { cls: 'small danger', data: { id: f.id } })}</div></li>`).join('')}</ul>` : '<p class="muted small">Nothing featured yet.</p>'}
      <form data-form="featured" class="form-grid mt">
        ${select('Type', 'kind', 'case-study', FEATURED_KINDS)}${input('Title', 'title', '', { attrs: 'required' })}
        ${input('Link', 'url', '', { type: 'url', full: true })}
        <div class="actions full">${btn('Add to Featured', '', { type: 'submit' })}</div>
      </form>
    </section>
    <section class="card" aria-live="polite"><div class="card-head"><h2>Audit</h2><span class="muted small">Updates as you type</span></div><div id="audit">${auditHTML(audit)}</div></section>
  </div>`;
}

export const profileForms = {
  offer(ctx, d) {
    ctx.update((ws) => ({ ...ws, offer: { audience: d.audience ?? '', outcome: d.outcome ?? '', proof: d.proof ?? '' } }), 'Offer saved.');
  },
  profile(ctx, d) {
    ctx.update((ws) => ({ ...ws, profile: { ...ws.profile, headline: d.headline ?? '', banner: d.banner ?? '', about: d.about ?? '' } }), 'Profile saved.');
  },
  featured(ctx, d) {
    if (!d.title?.trim()) return;
    ctx.update((ws) => ({ ...ws, profile: { ...ws.profile, featured: [...ws.profile.featured, { id: newId('feat'), kind: d.kind, title: d.title.trim(), url: d.url ?? '' }] } }), 'Added to Featured.');
  },
};

export const profileActions = {
  'use-headline': (ctx, el) => {
    const f = document.querySelector('form[data-form="profile"] [name="headline"]');
    f.value = el.dataset.text;
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.focus();
  },
  'remove-featured': (ctx, el) => ctx.update((ws) => ({ ...ws, profile: { ...ws.profile, featured: ws.profile.featured.filter((f) => f.id !== el.dataset.id) } }), 'Removed from Featured.'),
};

export const profileLive = {
  profile(ctx, form) {
    const ws = ctx.ws();
    const d = formData(form);
    const audit = auditProfile({ ...ws.profile, ...d }, { phrases: phrasesOf(ws), offer: ws.offer });
    document.getElementById('audit').innerHTML = auditHTML(audit);
  },
};
