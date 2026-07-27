# Training Hub

A personal training dashboard for a handball player. It pulls data from
**TUGG** (team strength & conditioning platform) and **Google Health**
(health.googleapis.com/v4 — the Fitbit Web API replacement), merges it with
manually logged sessions, and surfaces training load, readiness, body and
recovery metrics, match performance and test progression.

Single user, dark by default, deployed on Vercel with a nightly sync.

> **Where this is going:** see [`docs/vision.md`](docs/vision.md) for the north
> star, roadmap and open questions.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC, server actions), React 19 |
| Language | TypeScript (strict), `@/*` → `./src/*` |
| Styling | Tailwind v4 (CSS-first config, no `tailwind.config`), shadcn on `@base-ui/react` |
| Charts | Recharts, plus hand-rolled SVG for the heatmap and sparklines |
| Backend | Supabase — Postgres, RLS, Auth |
| Validation | Zod |
| Theme | `next-themes`, class-based `.dark` |
| Tests | Vitest (pure logic only — no DB harness) |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

### Environment

All of `.env.example` is required. Notable ones:

- `ENCRYPTION_KEY` — base64 32-byte key. Encrypts OAuth tokens at rest
  (`src/lib/crypto.ts`, AES-256-GCM). Generate with `openssl rand -base64 32`.
- `SYNC_SHARED_SECRET` — bearer token for `POST /api/sync/run` (manual trigger).
- `CRON_SECRET` — Vercel attaches this automatically to the scheduled `GET`.
- `TUGG_SUPABASE_URL` / `_ANON_KEY` — TUGG is itself a Supabase project; the
  adapter authenticates against it with a stored refresh token.

### Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run check       # lint + typecheck + test
```

## Database

Plain SQL migrations in `supabase/migrations/` — no ORM. Types in
`src/lib/supabase/types.ts` are generated (`supabase gen types typescript`),
**except** the `daily_facts` view and `app_local_date` function entries, which
are maintained by hand; re-add them if you regenerate the file.

```bash
npx supabase login      # once, interactive
npx supabase db push    # apply pending migrations
```

> `20260101000000_baseline_existing_schema.sql` is a pg_dump of the schema as it
> already existed before this repo had migrations. It documents current state
> and is marked applied via `supabase migration repair` — **it is not meant to
> be executed** against the live database.

### `daily_facts`

The keystone view: one row per user per calendar day, joining load, readiness,
body metrics, sleep and handball context into a single denormalised series.
Rest days exist as real zero-load rows because the view generates a full
calendar.

It backs the dashboard, the activity heatmap and the rolling load metrics, and
is the intended entry point for future exploration and analysis features. When
adding a new fact, prefer a column here over a bespoke query — see
`docs/vision.md`.

Day bucketing for `timestamptz` columns goes through `app_local_date()`, which
hardcodes `Europe/Oslo`. That function is the single place to change it.

## Architecture

```
src/
├── proxy.ts                  Next 16 middleware -> Supabase session refresh + auth gate
├── app/
│   ├── (app)/                Authenticated route group (Nav + BottomNav, error/loading boundaries)
│   ├── api/sync/run/         Cron + manual sync entry point
│   └── api/integrations/     Google Health OAuth authorize/callback
├── components/
│   ├── charts/               TrendChart (Recharts), ActivityHeatmap (SVG/CSS)
│   ├── forms/FormParts.tsx   Field + error + submit primitives for useActionState
│   └── StatTile.tsx          Dashboard tile: value, delta, sparkline, status
└── lib/
    ├── integrations/         Adapter registry: tugg/, google_health/
    ├── services/             dailyFacts, loadMetrics, trainingLoad, readiness*, sessionMerge, syncOrchestrator
    ├── validation/           Zod schemas + shared server-action state
    └── supabase/             Browser/server/service-role clients, generated types
```

### Integrations

Both sources implement `SourceAdapter.sync(account, db)` and are registered in
`src/lib/integrations/registry.ts`.

- **TUGG** reads its Supabase project directly via PostgREST. Currently a full
  table pull each run — see the roadmap for the incremental-cursor plan.
- **Google Health** fetches 10 data types over a 30-day window with
  `Promise.allSettled`, so a single failing endpoint degrades the run to
  `partial` with warnings rather than failing outright.

Sync runs are recorded in `sync_runs` and visible at `/sync`, which also has a
manual trigger.

### Session merging

TUGG and Google Health frequently record the same real workout. After each sync,
`sessionMerge.ts` finds overlapping sessions from *different* sources within a
trailing 60-day window and merges them: the richer session survives (hand-entered
exercise sets and match/practice detail always win), missing enrichment fields
are backfilled, and the loser is marked `merged_into` rather than deleted so its
source data stays auditable. **Every list query filters `.is("merged_into", null)`.**

### Forms

Server actions have the signature `(prevState, formData) => Promise<ActionState>`
and are driven by `useActionState`. They validate with a Zod schema from
`src/lib/validation/schemas.ts` and return field errors plus the submitted values
— React 19 resets uncontrolled inputs once an action settles, so echoing values
back is what stops a failed save from discarding everything typed.

Synced sessions (`external_source != null`) are not editable or deletable; the
next sync would just overwrite the changes. Enforced in both UI and action.

## Deployment

Vercel. `vercel.json` schedules `GET /api/sync/run` daily at 05:00 UTC (Hobby
caps cron at once per day). The route sets `maxDuration = 300`.
