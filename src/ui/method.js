// Method: how every number and check is computed, and what this tool deliberately does not do.
import { LIMITS } from '../lib/constants.js';

export function renderMethod(ctx) {
  const w = ctx.ws().settings.weights;
  return `
  <div class="page-head"><div><h1>Method and definitions</h1><p class="muted">Every score here is a transparent rule you can read in <code>src/lib/</code>. None of it is a prediction of reach.</p></div></div>
  <div class="grid grid-2">
    <section class="card prose"><h2>Research</h2>
      <p><strong>Language bank</strong> counts how many buyers mention each struggle, tried fix or phrase (case- and punctuation-insensitive; each buyer counted once). Recurring word groups are 2–3 word sequences, without stopwords at either end, that appear for at least two buyers.</p>
      <p><strong>Competitor engagement score</strong> = reactions × ${w.reactions} + comments × ${w.comments} + reposts × ${w.reposts}. Groups are ranked by <em>median</em> score so one viral post doesn’t dominate. Posts with no numbers are listed but not scored.</p>
      <p><strong>Hook type</strong> is classified by rules checked in order: contrarian (“Stop…”, “Unpopular opinion”), how-to (“How I…”), result (a number with % / k / x and a change verb), question (ends with “?”), number (“7 hooks…”), story (“Last month…”, “I…”), otherwise statement.</p>
      <p>A buyer counts as <strong>complete</strong> when it has at least one struggle and one phrase; a competitor counts as <strong>broken down</strong> when it has a post with topic, angle and hook.</p>
    </section>
    <section class="card prose"><h2>Profile audit</h2>
      <p>16 weighted checks (weight 1 or 2) across headline, banner, About, Featured and buyer language. Score = passed weight ÷ total weight. Limits used: headline ${LIMITS.headline} characters, About ${LIMITS.about}; the About preview is about ${LIMITS.aboutPreview} characters (LinkedIn doesn’t publish an exact figure).</p>
      <p>The checks look for signals (e.g. “I help”/“for”, an outcome verb or number, a call to action). Passing them means the pieces are present — not that the writing is good.</p>
    </section>
    <section class="card prose"><h2>Content and visuals</h2>
      <p><strong>Bucket mix</strong> = posts per bucket ÷ dated posts in a 28-day window (two weeks back, two weeks ahead). The next suggested bucket is the one furthest below its target share.</p>
      <p><strong>Visual rules</strong>: result → screenshot with numbers highlighted; personal experience → a real photo; process → steps graphic; comparison → side by side; detailed walkthrough → carousel or infographic; opinion → text-only is fine.</p>
      <p><strong>Post checks</strong>: hook present and under ~140 characters; total under ${LIMITS.post}; a line break inside the first ~${LIMITS.postPreview} characters; no paragraph over 60 words; ≤ 5 hashtags; links flagged as something to test; buyer phrases used; a closing question or next step.</p>
    </section>
    <section class="card prose"><h2>Engagement and analytics</h2>
      <p><strong>Streak</strong> = consecutive days with logged minutes ≥ the daily target, counting back from today (today not yet logged doesn’t break it).</p>
      <p><strong>Engagement rate</strong> = (reactions + comments + reposts) ÷ impressions; n/a when impressions are missing or zero. <strong>Leads per 1,000 impressions</strong> = inbound leads × 1000 ÷ impressions.</p>
      <p><strong>Verdicts</strong> compare each group’s median engagement rate to the overall median: ≥ 1.2× double down, ≤ 0.8× cut back, otherwise keep testing; fewer than the minimum posts → need more posts. Small samples are noisy — treat verdicts as what to test next.</p>
    </section>
  </div>
  <section class="card prose"><h2>What this tool does not do</h2>
    <ul><li>It does not log in to, scrape or post to LinkedIn or X. You paste or import what you have read and your own analytics — this keeps your account safe and within LinkedIn’s terms.</li>
    <li>It does not write posts for you. Idea prompts are built from your research; the optional Claude skill drafts from your exported data, and every draft is yours to edit.</li>
    <li>It does not predict reach. The playbook comes from a public “LinkedIn Maxing 101” video; the tool turns its steps into a workflow.</li></ul>
  </section>`;
}
