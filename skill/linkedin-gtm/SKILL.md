---
name: linkedin-gtm
description: Draft LinkedIn profile rewrites, weekly post plans and post drafts from a LinkedIn GTM Studio backup (buyer research, competitor breakdowns, analytics), then check them with the studio's own rules. Use when asked to write or improve LinkedIn content for the user or a client workspace.
---

# LinkedIn GTM skill

Works on a backup exported from LinkedIn GTM Studio (Data → "Back up all data (JSON)"). The studio holds the research;
this skill turns it into drafts, and the studio's rules check the drafts. Run commands from the repository root.

## 0. Load the data

```bash
node scripts/cli.mjs summary <backup.json> ["Workspace name"]
```

The summary gives the offer, playbook progress, buyer language (pains, what they tried, their exact phrases),
competitor angles ranked by median engagement, top competitor hooks, saved outside-LinkedIn ideas and
per-bucket / per-hook-type verdicts from the user's own analytics. Read it fully before writing anything.
If the workspace has fewer than 5 buyers with phrases, say so and ask for more research before drafting —
drafts without buyer language are generic.

## 1. Pick the task the user asked for

**Profile rewrite** — produce a headline (≤ 220 chars: who you help + what you help them achieve), banner text
(offer + one credible result the user actually has), an About section (≤ 2,600 chars: their problem in their
words → your approach in 2–4 steps → how to work with you → proof) and what to pin in Featured (a case study and
a booking link). Then check it: paste it into the studio's Profile page, or write it into a copy of the backup
and run `node scripts/cli.mjs audit-profile <copy.json>`. Fix every ✗ before presenting.

**Weekly plan** — `settings.weeklyPosts` posts. Choose buckets from the `byBucket` verdicts: more of
"double-down", fewer of "cut", and keep at least one post in any bucket marked "need-data" so it gets tested.
For each post give: bucket, working title, hook, what the post shows (result / personal / process / comparison /
walkthrough / opinion) and the visual the studio recommends for it.

**Post drafts** — write each draft to a file whose first line is the hook, then a blank line, then the body.
Run `node scripts/cli.mjs lint-post <backup.json> <draft.md>` and revise until there are no ✗ and as few ! as
the post allows. Under ~140-character hook, short paragraphs, a closing question or next step, ≤ 3 hashtags.

## 2. Writing rules

- Use the buyers' exact phrases from `buyerLanguage` — at least one per post and two in the profile.
- Model structure, not words, on `topCompetitorHooks`. Never copy a competitor's sentences.
- Industry-take posts start from `outsideIdeas` and must add the user's own take; if `myTake` is empty, ask.
- **Never invent clients, numbers, results, testimonials or screenshots.** Where proof is needed and the backup
  has none, write `[REAL RESULT NEEDED: …]` and tell the user. Sample workspaces are synthetic — say so if the
  user is working from the sample.
- Write in the first person, plainly. No "In today's fast-paced world", no emoji walls, no engagement bait.

## 3. Hand back

List what you produced, the audit score / lint result for each, and any `[REAL RESULT NEEDED]` placeholders.
To store drafts, the user adds them on the studio's Content page (or you edit the backup's `posts` array and the
user restores it on the Data page). Never post to LinkedIn, log in to it, or scrape it.
