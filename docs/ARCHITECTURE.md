# Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[src/ui/* views] -->|ctx.update| APP[src/app.js<br/>state · routing · events]
    APP -->|render| UI
    APP <--> LS[(localStorage)]
    UI --> LIB
  end
  subgraph LIB[src/lib — pure, tested in Node]
    M[model.js<br/>state + validation]
    R[research.js<br/>language bank · hook types · breakdowns]
    P[profile.js<br/>16-check audit]
    C[content.js<br/>buckets · ideas · post checks · visuals]
    E[engagement.js<br/>streak · daily minutes]
    A[analytics.js<br/>ER · verdicts]
    IO[io.js + csv.js<br/>CSV import/export]
    PR[progress.js<br/>playbook progress]
  end
  CSV[CSV files] --> IO
  APP -->|backup JSON| CLI[scripts/cli.mjs]
  CLI --> LIB
  SKILL[skill/linkedin-gtm/SKILL.md<br/>Claude] --> CLI
```

- **State:** `{ version, meta, activeId, workspaces[], log[] }`. A workspace holds `offer`, `buyers`, `competitors`,
  `compPosts`, `outsideIdeas`, `profile`, `posts` (with `metrics`), `engagement` and `settings`.
- **Rendering:** each view is a function `(ctx) → HTML string`; events are delegated in `app.js` through
  `data-action`, `data-form`, `data-change` and `data-live` attributes. Live checks (profile audit, post checks)
  update one container without re-rendering the form, so focus is never lost.
- **One rule set, two front ends:** the browser and `scripts/cli.mjs` import the same `src/lib` modules, so the
  Claude skill is checked by exactly the rules the user sees.
- **No network:** the only request is the sample JSON from the same origin.
