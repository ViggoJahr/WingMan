# Training Hub — Vision & Roadmap

Living document. Captures where this project is going and why, so the reasoning
isn't scattered across commit messages. Last updated 2026-07-28.

---

## North star

> **Understand when I perform, and what the biggest factors are.**

Everything else serves that. The app aggregates every training-relevant signal
into one place, makes it explorable both visually and as raw numbers, and
eventually lets an LLM answer questions over the whole dataset.

Three supporting goals:

1. **Holistic picture.** One place for training load, readiness, sleep, body
   metrics, match performance and test results — regardless of which system
   originally recorded it.
2. **Self-serve exploration.** Interesting dashboards for a glance, dynamic
   instruments (sort, filter, spreadsheet view) for digging.
3. **Ask questions in natural language.** An LLM with access to the data, so
   questions like "how do I play after a heavy week?" don't require building a
   bespoke chart first.

---

## Design principles

**Dark first.** Dark is the default theme; light exists but is secondary.

**Matches are deliberate, practices are frictionless.** A match happens ~once or
twice a week and deserves careful, detailed capture. Practices happen constantly
— if logging one takes more than a few taps it will be abandoned within a month,
and a lapsed log is worth nothing. This asymmetry is a hard rule, not a
preference.

**Device split follows that asymmetry.**

| | Where | Implication |
|---|---|---|
| **Match logging** | Desktop / laptop | Can be dense and detailed. A court diagram with tap-to-place shots works well with a mouse and a big screen. Multi-column layouts are fine. |
| **Practice, readiness, workouts** | Phone | Must be thumb-reachable, few taps, large targets, no horizontal scrolling. Optimise ruthlessly for speed. |

Trend and analysis screens should work on both, but are designed for desktop
where a phone would compromise them.

**Capture losslessly, analyse coarsely.** Store the finest-grained data that's
free to collect (exact shot coordinates, raw HR samples), but drive statistics
off coarser buckets that actually have enough samples to mean something. You can
always derive the coarse view from the fine one; never the reverse.

**Branding is a token swap.** `--brand-accent` in `globals.css` is the single
hook. Rebranding later should mean changing a handful of CSS variables, not
touching components.

---

## The architectural keystone: `daily_facts`

The heatmap, the dashboard tiles, rolling load metrics, the planned spreadsheet
view, and any future LLM tool layer are all *the same query*. Rather than build
five bespoke aggregations, there is one denormalised SQL view —
`supabase/migrations/*_daily_facts_view.sql` — with **one row per user per
calendar day**, spanning:

- **Load** — session count, total session-RPE load, max RPE, duration, calories
- **Readiness** — score plus all nine sub-dimensions
- **Body & recovery** — weight, body fat, steps, resting HR, HRV, SpO2, active
  zone minutes, sleep hours
- **Handball** — had match, had practice, perceived performance and challenge
- **Context** — day of week, weekend flag, days since last match

Rest days exist as real rows with zero load (the view generates a full
calendar), which is what makes rolling windows line up with elapsed time rather
than "the last N rows that happen to exist".

**Adding a fact here makes it available to every consumer at once.** That is the
point. New analysis should almost always start by asking "can this be a column
on `daily_facts`?"

---

## Where things stand

### Done

- Data pipeline: TUGG + Google Health adapters behind a registry, nightly Vercel
  cron, AES-256-GCM token encryption, cross-source session dedup/merge.
- Manual logging: practice, match (16-stat box score), workout, 9-dimension
  readiness check-in — all with edit and delete.
- Trend pages: `/training-load`, `/readiness`, `/handball`, `/health`, `/tests`,
  `/plan`, `/history`, `/sync`.
- **Dark theme** (default, with a system/light toggle in `/more` and `/settings`).
- **`daily_facts` view** plus `loadMetrics.ts` (ACWR, monotony, strain).
- **Dashboard**: six stat tiles with deltas, sparklines, status colours and
  link-through, plus a 26-week GitHub-style activity heatmap.
- **Foundation**: database indexes, bounded merge window, error/loading
  boundaries, Zod validation on every form with inline errors and preserved
  input.
- **Match video review**: `/sessions/[id]/review` — keyboard tagging against
  local video, per-event writes, derived box score. See the note at the bottom.
- **CI**: `.github/workflows/ci.yml` runs `check` + `build` on push and PR.
- **One definition of load.** `/training-load` recomputed weekly load from
  `sessions.rpe` itself, which ignored `manual_rpe` and counted an unrated
  session as zero — so it contradicted the dashboard tile that links to it, and
  every RPE entered by hand was invisible there. It reads `daily_facts` now, and
  `trainingLoad.ts` only buckets days into ISO weeks.

### Medium term

Roughly in priority order. Items 1 and 2 capture data that cannot be
backfilled, so they should start early even if polish lags.

#### 1. Shot and match event tracking

The largest new capture surface and the highest-value one.

> **Superseded in part — built as `match_events`, not `shots`.** A shot *is* a
> match event, and two tables would mean two timelines to merge in the clip
> library. `match_events` carries `event_type` (the outcome), `shot_origin` (the
> separate origin dimension), `phase`, and nullable `court_x` / `court_y` /
> `goal_cell` columns that nothing writes yet. So everything below still holds —
> it is now UI work on an existing table rather than a new migration.

A `shots` table: `match_id`, `match_minute`, `court_x` / `court_y` (metres on a
40×20 court), derived `court_zone`, `goal_cell` (1–9, null when off target),
`outcome` (goal / save / miss / block / post), `shot_type` (jump / set / running
/ dive / lob / seven_metre / fastbreak), `phase` (positional / counter /
power_play / short_handed).

**Store coordinates, analyse by zone.** Tapping a court diagram is one gesture
either way, so coordinates cost no extra friction. At ~15 shots × ~30 matches ≈
450 shots/season, continuous positions have to be binned to be analysable — and
binning *is* zoning. But coordinates are lossless and give a real shot-map
scatter. They add genuine signal in two places: wing shots, where a metre of
lateral position swings the shooting angle enormously, and breakthroughs, where
release depth is the whole story.

**Goal placement is the more valuable half.** A 3×3 grid over a 3m × 2m goal
gives ~1m × 0.67m cells, matches how shooters and keepers actually think ("far
top corner"), is less sparse than court zones so patterns emerge sooner, and is
the part that can actually be trained.

Components: `src/lib/handball/zones.ts` (pure `coordsToZone`, unit-testable),
`CourtInput.tsx` and `GoalGridInput.tsx` (tap-to-place SVG, desktop-first).

**Other match context worth capturing** — all cheap, all analytically useful:
kickoff time of day, minutes played per half, plus/minus while on court,
position played.

Also finish the long-deferred **attach-to-detected-session** flow. Google Health
already auto-creates bare `handball_sessions` rows with `subtype: 'individual'`;
the code comments note the attach UI was left for later. This is what makes
practice logging genuinely frictionless — two taps on a session that already
exists, rather than a form.

#### 2. Persist raw heart-rate — now the highest-value item

Promoted after measuring intensity coverage on 2026-07-26 (see "Training load
and the RPE gap" below). Raw `heart-rate` is sampled passively all day,
**independent of whether the watch classified a workout as an exercise**. So
computing load for a session doesn't require the device to have recognised it —
only that HR samples cover its time window, which they do whenever the watch was
worn.

That is the difference between ~26% intensity coverage and near-total, which in
turn is the difference between ACWR being displayable and not.

`getHeartRateTimeline` currently does a fresh OAuth token exchange **and** a
Google rollUp POST on every single session-detail page view, and stores nothing.

- ~~Cache buckets~~ **Done 2026-08-01** as `sessions.hr_timeline` jsonb plus
  `hr_timeline_fetched_at`. A child table would have added a join and an index
  to serve a query nobody makes — the payload is ~80 buckets, read whole, for
  one session. The timestamp is what makes the *negative* case cacheable: a
  session Google has no samples for would otherwise be re-fetched on every view,
  which is the behaviour being removed.
- **The derivation is deliberately still pending.** Turning this into TRIMP, or
  into a new `load_estimate` tier, moves the load figure for most historical
  sessions — and with it every ACWR band, heatmap cell and dashboard tile. It
  has to be its own reviewable change, made after the cache is populated and
  spot-checked against sessions whose effort is known.
- With HR persisted, derive **TRIMP** as an objective load metric alongside
  session-RPE. Where the two disagree is real signal about perception vs
  physiology.
- Derive **HR recovery** after sessions — a genuine fitness-trend marker.
- `sessions.hr_zones` is already stored and currently rendered as four lines of
  plain text. Turn it into a stacked zone bar — no new data plumbing at all.

#### 3. Interactive exploration

- Install the missing shadcn primitives (`table`, `tabs`, `tooltip`, `popover`,
  `badge`, `skeleton`) — only seven are installed and there is no table
  component.
- `DataTable`: sortable columns, column visibility, CSV export. Replaces the two
  hand-rolled `<table>` blocks in `handball/page.tsx` and `sync/page.tsx`.
- Unify the two incompatible filter UIs on `/history` and `/plan`. *(The
  duplicated pagination block is done — `components/Pagination.tsx`.)*
- **`/explore`**: the spreadsheet view over `daily_facts` with a column picker,
  date range, sort and export. Falls out of the keystone view almost free.
- Extend `TrendChart` with multi-series, an area kind and a shared empty state.
  *(The two near-copies of it are gone — `training-load/chart.tsx` and
  `readiness/chart.tsx` were deleted and both callers now use `TrendChart`
  itself. `handball/chart.tsx` survives because it is genuinely multi-series,
  which is the feature above.)*

#### 4. The performance model

**Performance is tracked two ways, side by side** (decided 2026-07-25):

- **Subjective** — the existing `perceived_performance` (1–10). Honest, zero
  extra capture, arguably the most valid measure of how you actually played.
- **Objective** — a composite from the box score (shooting efficiency, assists,
  steals, technical faults, normalised per minute), in
  `src/lib/services/performanceScore.ts`.

Chart both. **Where they disagree is itself interesting data** about
self-perception — e.g. consistently rating yourself low after wins with poor
personal stats, or high after a strong defensive game the box score ignores.

A **drivers view** then joins lagged features from `daily_facts` against each
match's two scores: readiness that morning, sleep the night before, load over
the preceding 3 / 7 / 28 days, ACWR, days since last match, kickoff time of day.

> **Present this as "your 8 best matches vs your 8 worst — here's what
> differed", not as regression coefficients.** At 25–40 matches a season,
> correlation coefficients would be noise dressed up as insight. The comparison
> framing is both more honest and more actionable. Revisit only after several
> seasons of data.

#### 5. Remaining hardening

- ~~**TUGG incremental sync.**~~ **Done 2026-08-01.** `fetchAll` now pages
  through with `.range()`, ordered by `id` so a row cannot land on two pages or
  none. Deliberately *without* the suggested `SYNC_WINDOW_DAYS` cursor: paging
  is what fixes the bug, and a window trades correctness for a saving that does
  not exist yet — the largest sync so far moved 326 rows, `exercise_progress`
  has no event date to filter on, and a window silently skips rows edited after
  they age out, which is the same class of quiet wrongness. `fetchPaged` takes a
  `since` option for when volume justifies it.
- **Tests.** The suite was pure-functions-only by design, which left
  `sessionMerge` — the subtlest code here, and the only code that *mutates*
  data — entirely uncovered. **That constraint is now relaxed**, via a minimal
  fake PostgREST builder in `tests/support/fakeSupabase.ts`. It implements only
  the operators `sessionMerge` uses, so it cannot drift into a half-built ORM.
  Fifteen cases cover the richness rule, the hand-entered-detail override, the
  merge window and the backfill; they were mutation-tested (inverting the
  richness comparison fails 8, removing the same-source guard fails 9) to
  confirm they have teeth. Still open: the server actions and both adapter
  write paths.
- **Persist the running score properly.** The review UI snapshots `score_us` /
  `score_them` onto each event as it is tagged, and the box-score view takes
  `MAX()` over them. That means an opponent goal after the last tagged event is
  never recorded, and deleting a tagged goal does not decrement the count. Good
  enough while tagging is the only writer; wrong the moment anything else reads
  the score as authoritative.

---

## Training load and the RPE gap

Measured 2026-07-26 against real data, after the heatmap showed a genuine
training day as a rest day.

**Only 19 of 74 sessions (26%) carry an RPE** — 18/65 from TUGG, 1/9 from Google
Health. This is not a mapping bug: TUGG's gym `workout_sessions` payload has no
`rpe` field at all. Only its `endurance_runs` have one (10/10 populated). So
session-RPE load, which is undefined without an RPE, was silently reporting most
training days as zero — and ACWR, monotony and strain were being computed over a
series that was ~74% false zeros. They were displayed as confident, banded,
colour-coded numbers. That was worse than showing nothing.

The response separates two questions that had been conflated:

**"Did I train?"** — always answerable from duration and session count.

**"How hard?"** — resolved through tiers, in `daily_facts`, all expressed in the
same unit (RPE × hours) so one colour scale stays meaningful:

| Tier | Source | Quality |
|---|---|---|
| 1 | `manual_rpe` or synced `rpe` | `measured` |
| 2 | Heart-rate zone durations → Borg-anchored RPE equivalent (light 10, moderate 13, vigorous 16, peak 19) | `hr_derived` |
| 3 | Duration only, at a deliberately conservative assumed RPE of 11 | `assumed` |

The view exposes both `total_load` (strictly measured, honest) and
`load_estimate` (tiered), plus `sessions_with_intensity` / `session_count` so
consumers can judge trustworthiness. **ACWR and monotony are withheld entirely
below 50% coverage** rather than shown as a band.

`sessions.manual_rpe` is a user-supplied RPE that the sync path never writes, so
it can be added to a *synced* session without the next sync overwriting it —
adapters own `rpe`, the user owns `manual_rpe`, and load prefers the latter.
This is also what makes the app usable with no wearable at all.

## What Google Health actually provides

Probed live against the API on 2026-07-26 across 41 candidate data types, rather
than inferred from docs. Platform reports as **FITBIT**.

**Returning data (11):** `exercise`, `sleep`, `steps`, `daily-resting-heart-rate`,
`heart-rate-variability`, `oxygen-saturation`, `active-zone-minutes`, `weight`,
`body-fat`, `height`, `heart-rate`.

Nine of the eleven are synced. The two that are not:

- **`heart-rate`** — fetched on demand per session view and never persisted. See
  medium-term item 2; this is the highest-value gap.
- **`height`** — deliberately dropped. It is recorded once and never changes, so
  the source record always falls outside the 30-day sync window (0 of 24
  `body_metrics` rows ever received one). It is a profile field in Settings now.

**Valid types but empty for this device:** `vo2-max`, `blood-glucose`,
`distance`.

**Not offered by the v4 API at all** (400/404): nutrition, hydration, blood
pressure, respiratory rate, body/skin temperature, floors climbed, elevation,
speed, power, cadence, lean body mass, bone mass, mindfulness, all
cycle-tracking types.

**Important correction:** an earlier note claimed nutrition/hydration/ECG were
blocked behind unrequested OAuth scopes. That is wrong — the probe returned
**zero 403s**. The three existing scopes already grant everything the API
exposes; those data types simply do not exist. Re-consenting would gain nothing.

The gap is therefore not collection but use: raw heart-rate isn't persisted, and
sleep stages, body fat and height sit in the database unshown.

## Metrics glossary

| Metric | Definition | Why it matters |
|---|---|---|
| **Session-RPE load** | `RPE × duration_hours` | Standard training-stress proxy when no power meter exists |
| **ACWR** | 7-day load ÷ (28-day load ÷ 4) | How hard this week is relative to what the body is adapted to. Bands: <0.8 detraining, 0.8–1.3 sweet spot, 1.3–1.5 ramping, >1.5 spike |
| **Monotony** | mean daily load ÷ its SD, over 7 days (Foster) | High = every day the same, no easy days |
| **Strain** | weekly load × monotony | High load *and* no variation — the combination that precedes problems |
| **TRIMP** *(planned)* | HR-weighted training impulse | Objective counterpart to subjective session-RPE |
| **Readiness** | 9 dimensions → 0–100, EMA-smoothed 65/35 | Daily subjective state |

ACWR bands are population-level findings and the underlying research is
contested — treat them as a rough guide, not a law.

---

## Open questions

### How to expose the data to an LLM *(undecided — revisit)*

The goal is clear ("ask questions about my data in natural language"); the shape
is not. Three viable approaches:

1. **MCP server.** A read-only MCP server exposing curated queries and metrics;
   point Claude Desktop or Claude Code at it. No chat UI to build, full
   analytical power immediately, and the agent can write ad-hoc charts. Least
   work, most capable. Not available on a phone.
2. **In-app chat page.** An `/ask` route with server-side tool calling over the
   same curated queries. Works on mobile and is self-contained, but is real UI
   work, costs per token, and will always be less capable than a full agent.
3. **Both**, sharing one tool/metric layer underneath.

Whichever is chosen, the tool layer should read `daily_facts` first and fall
back to raw tables only for detail the view doesn't carry. Decide before
building — retrofitting the boundary is the expensive part.

### ~~Needs a human eyeball: do the `/health` and `/tests` charts render?~~ **Resolved 2026-08-01**

**They did not, and neither did most of the others.** The cause was not sizing
and not `ResponsiveContainer`: **Recharts 3.10 entrance animations never
complete under React 19 here**, and they fail silently.

- A `<Bar>` animates height from 0. Stalled at 0, and `Rectangle` returns `null`
  for a zero height — so a bar chart rendered axes, a grid, and a set of empty
  `<g>` elements. Weekly load, steps, sleep, active zone minutes and the
  handball box score were all blank frames.
- A `<Line>` is drawn by animating `stroke-dasharray` from `0, total` to
  `total, 0`. Stalled at `92px, 821px`, so only the first tenth was painted.
  This is why the weight chart looked like 28 dots joined by a stub, and why
  charts with few points looked plausible enough to pass inspection.

Fixed by `isAnimationActive={false}` on every series in `TrendChart` and
`handball/chart.tsx`. `HeartRateChart` already carried the same workaround,
which is the strongest hint that the problem predates this and was met once
before without being generalised.

The earlier investigation was looking in the wrong place; the 0×0
`getBoundingClientRect` readings really were a backgrounded-tab artefact, as
suspected. The original notes follow.

Investigated 2026-07-25/26 and **not conclusively resolved at the time.** Confirm by simply
looking at `/health` in a normal focused browser tab.

What is established:

- `/health` and `/tests` were previously failing outright with an RSC error —
  they passed inline `formatValue` arrow functions from server components into
  the client `TrendChart`. **Fixed**: `TrendChart` now takes a serializable
  `format` descriptor (`{ decimals, grouped, prefix, suffix }`), and the
  formatter itself lives in `src/lib/valueFormat.ts`, outside any `"use client"`
  module, so server components can call it too.
- `/training-load` renders its charts correctly (2 surfaces, 9 bars measured),
  so **Recharts itself works** under React 19 here.
- **This check got cheaper on 2026-07-28.** `/training-load` and `/readiness`
  used to have their own chart components, so their rendering said nothing about
  `TrendChart`. Both now go through `TrendChart` itself — so if the bars still
  render on `/training-load`, the component is fine and any blankness on
  `/health` is a sizing problem specific to those cards, not the chart.
- `/health` appeared to render cards and data but no chart SVG. However, the
  DOM measurements behind that conclusion are untrustworthy: every element on
  the page reported `getBoundingClientRect()` of 0×0, including card titles
  that were plainly visible in a screenshot. That is the signature of a browser
  tab that isn't computing layout (backgrounded/occluded).
- This matters because `ResponsiveContainer` sizes itself by measuring its
  parent — with no layout it measures 0 and renders nothing. **The blank charts
  may be an artefact of the inspection method rather than a real defect.**

If the charts genuinely are blank in a real tab, the next thing to try is giving
the chart wrapper an explicit height instead of relying on `ResponsiveContainer`
measuring an `auto`-height `CardContent`.

Unrelated but fixed along the way: `TrendChart`'s tooltip was built by a factory
that returned a **new component type on every render**, remounting the tooltip
each time. It is now a stable module-scope component passed as
`content={<ChartTooltip format={format} />}`.

### Others

- **Branding.** Deferred deliberately. `--brand-accent` is the hook. Worth doing
  when there's an identity worth expressing, purely because it's enjoyable.
- **Sub-daily sync.** Vercel Hobby caps cron at once per day. Moving to Pro
  would allow more frequent syncing; not obviously worth paying for yet.
- **Timezone constant.** `app_local_date()` hardcodes `Europe/Oslo` for day
  bucketing. Single place to change; would need revisiting on relocation, or
  replacing with a per-user setting if the app ever becomes multi-user.
- **TUGG readiness check-ins** are deliberately not synced — the qualitative
  good/medium/some scale doesn't map onto the 0–10 numeric `readiness` table.
  Still unresolved.

---

## Captured but not yet surfaced

Data already in the database that no screen reads. Cheap wins whenever a
relevant page is next touched:

Most of this list is now closed. What was surfaced on 2026-08-01, and how:

| Data | Status |
|---|---|
| `injuries` (whole table) | **Done.** `/log/injury` + `/injuries`, an open-injury banner on the dashboard, and injured days struck through on the heatmap — a light week means the opposite thing depending on whether you were hurt |
| `body_metrics.body_fat_percentage` | **Done.** Charted on `/trends/body` |
| `body_metrics.height_cm` | **Dropped** — the column is gone. Height is `users.height_cm`, entered in Settings |
| `sleep_logs.sleep_stages` | **Done.** The real shape was read off live rows, not the docs: an array of `{type, startTime, endTime}` segments with `LIGHT`/`DEEP`/`REM`/`AWAKE`. `lib/services/sleepStages.ts` sums them; `/trends/body` shows the longest sleep of the last week as a stacked bar with efficiency. Longest rather than latest because naps are `sleep_logs` too, and picking the newest row surfaced a 1h22m afternoon nap labelled "night of" |
| `sessions.hr_zones` | **Done.** Was four lines of plain text, now the same stacked bar |
| ~29 `daily_facts` columns fetched and never rendered | **Done.** Eleven with no consumer anywhere were dropped from `DAILY_FACT_COLUMNS` — the largest over-fetch in the app, on the query that runs every page load. They remain columns on the view, so adding one back is a word on one line |
| `handball_sessions.throws_count` | Written by the practice form as a band midpoint; shown on session detail, not yet trended |
| 9 of 16 match stats | Enterable and shown per-session, never trended |
| `strength_test_results.verification_status` | Stored, not selected by `/tests` |
| `sessions.surface` | Displayed on session detail; no form writes it |
| `active_rest.focus` | Written by the workout form; session detail never reads it |
| `raw_payload` (5 tables) | Deliberate audit trail, not for display |
| `users.gender`, `birth_date` | Never read or written |



New Idea, I want to clip my games. So I can log timestamps from each game, that same timestamp is then answering all the topics about my performance (So I can sit in a video-preview. In that preview I can clip videos)

> **Built** — `/sessions/[id]/review`. Tag against the video with the keyboard;
> every tag stores a video offset plus the derived period and match clock, and
> the clip list seeks straight back to any moment. The video itself stays on the
> machine: Postgres holds the tags and a `handle_key`, the browser holds the
> `FileSystemFileHandle` in IndexedDB, so a return visit costs at most one click.
> Box-score counters are derived from the events (`deriveBoxScore`, and the
> `match_box_score` view once the backfill lands) rather than typed twice.

I also consider integrating the games from profixio. I could use the stats from there? Or use the visual aspects? Not certain if I will use it.