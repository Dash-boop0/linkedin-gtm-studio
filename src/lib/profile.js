// Step 2 of the playbook: a transparent, rule-based profile audit. Every check says why it failed and how to fix it.
import { LIMITS } from './constants.js';
import { normalise, containsPhrase } from './text.js';

const HELP_RX = /\b(i help|helping|help|helps|for)\b/;
const OUTCOME_RX = /\b(grow|grew|get|gets|book|books|land|lands|win|wins|generate|generates|scale|scales|increase|increases|reduce|reduces|turn|turns|build|builds|launch|launches|close|closes|hire|hires|raise|raises|save|saves|double|doubles|attract|attracts)\b|(^|\s)\d[\d,.]*(%|x|k|\+)?(\s|$)/;
const PROOF_RX = /(\d+\s?(\+|%|x|k|m|clients|founders|companies|brands|posts|followers|impressions|meetings|calls|leads)|case stud|results?\b|testimonial|worked with)/;
const PROBLEM_RX = /\b(struggl\w*|problem|stuck|if you|tired of|frustrat\w*|hard to|can't|cannot|without|mistake\w*|challenge\w*|pain)\b/;
const APPROACH_RX = /\b(i help|my approach|how i|i work|my process|framework|method|system|step|we do|i do)\b/;
const CTA_RX = /\b(book|dm|message me|call|email|reach out|work with me|work together|calendar|link below|featured|apply)\b/;
const TITLE_ONLY_RX = /^(\w+\s){0,4}(manager|executive|specialist|associate|intern|consultant|freelancer|marketer|student|analyst)(\s(at|@)\s.+)?$/;

/**
 * Audit a profile. phrases = buyer language from research (used to check you speak their words).
 * Returns { score (0-100), checks:[{ id, area, label, pass, weight, fix }] }.
 */
export function auditProfile(profile, { phrases = [], offer = {} } = {}) {
  const headline = String(profile.headline ?? '');
  const banner = String(profile.banner ?? '');
  const about = String(profile.about ?? '');
  const featured = profile.featured ?? [];
  const h = normalise(headline);
  const a = normalise(about);
  const usesBuyerWords = phrases.filter((p) => containsPhrase(`${headline} ${about}`, p));
  const checks = [
    { id: 'headline-present', area: 'Headline', label: 'Headline written', weight: 1, pass: h.length > 0, fix: 'Write a headline: who you help + what you help them achieve.' },
    { id: 'headline-length', area: 'Headline', label: `Within ${LIMITS.headline} characters`, weight: 1, pass: headline.length > 0 && headline.length <= LIMITS.headline, fix: `Shorten to ${LIMITS.headline} characters (now ${headline.length}).` },
    { id: 'headline-who', area: 'Headline', label: 'Says who you help', weight: 2, pass: HELP_RX.test(h) || (offer.audience && containsPhrase(headline, offer.audience)), fix: 'Name your buyer: “I help <audience> …” or “… for <audience>”.' },
    { id: 'headline-outcome', area: 'Headline', label: 'Says what you help them achieve', weight: 2, pass: OUTCOME_RX.test(h), fix: 'Add the outcome as a verb or number: “… book 10 sales calls a month”.' },
    { id: 'headline-not-title', area: 'Headline', label: 'More than a job title', weight: 1, pass: h.length > 0 && !TITLE_ONLY_RX.test(h), fix: 'A job title alone tells buyers nothing about what they get. Lead with the offer.' },
    { id: 'banner-offer', area: 'Banner', label: 'Banner restates the offer', weight: 1, pass: normalise(banner).split(' ').length >= 4, fix: 'Describe the banner text: your offer in one line.' },
    { id: 'banner-proof', area: 'Banner', label: 'Banner shows a credible result', weight: 1, pass: PROOF_RX.test(normalise(banner)) || /\d/.test(banner), fix: 'Add one verifiable result or credential to the banner. Only use results you can show.' },
    { id: 'about-hook', area: 'About', label: 'Opening lines are about the buyer, not you', weight: 1, pass: a.length > 0 && !/^(i am|i'm|my name|hi i|hello)\b/.test(a), fix: `The first ~${LIMITS.aboutPreview} characters show before “see more”. Open with the buyer’s problem.` },
    { id: 'about-problem', area: 'About', label: 'Covers their problem', weight: 2, pass: PROBLEM_RX.test(a), fix: 'Describe the problem your buyer has, in their words.' },
    { id: 'about-approach', area: 'About', label: 'Explains your approach', weight: 2, pass: APPROACH_RX.test(a), fix: 'Explain how you solve it — your process in 2–4 steps.' },
    { id: 'about-cta', area: 'About', label: 'Says how to work with you', weight: 2, pass: CTA_RX.test(a), fix: 'End with how to work with you: “DM me ‘audit’” or “book a call via Featured”.' },
    { id: 'about-proof', area: 'About', label: 'Shows proof of work', weight: 2, pass: PROOF_RX.test(a), fix: 'Add proof: a result, a case study, or the number of clients — real ones only.' },
    { id: 'about-length', area: 'About', label: `Within ${LIMITS.about} characters`, weight: 1, pass: about.length > 0 && about.length <= LIMITS.about, fix: `Keep the About section under ${LIMITS.about} characters (now ${about.length}).` },
    { id: 'featured-case', area: 'Featured', label: 'Featured has a case study', weight: 2, pass: featured.some((f) => f.kind === 'case-study'), fix: 'Pin a case study (post, PDF or link) in Featured.' },
    { id: 'featured-cta', area: 'Featured', label: 'Featured has a booking / contact link', weight: 2, pass: featured.some((f) => f.kind === 'booking'), fix: 'Pin a “book a call” or contact link in Featured.' },
    { id: 'buyer-language', area: 'Language', label: 'Uses at least 2 buyer phrases from your research', weight: 1, pass: usesBuyerWords.length >= 2, fix: phrases.length ? 'Reuse the exact words buyers use (see Research → Language bank).' : 'Add buyer phrases in Research first.' },
  ];
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
  return { score: Math.round((got / total) * 100), checks, usesBuyerWords };
}

/** A headline suggestion assembled from the offer — a starting point to edit, not a final answer. */
export function headlineFromOffer(offer) {
  const audience = String(offer.audience ?? '').trim();
  const outcome = String(offer.outcome ?? '').trim();
  const proof = String(offer.proof ?? '').trim();
  if (!audience || !outcome) return '';
  const base = `I help ${audience} ${outcome.replace(/^to\s+/i, '')}`;
  const full = proof ? `${base} | ${proof}` : base;
  return full.length <= LIMITS.headline ? full : base.slice(0, LIMITS.headline);
}
