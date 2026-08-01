# Brand reference

Source: the `webdesign-wingman` Pinterest board, captured 2026-08-01.

## The palette spine

The board pins two colours explicitly, as a swatch card:

| | Hex | OKLCH |
|---|---|---|
| **Soft Sage** | `#ABC8A2` | `oklch(0.801 0.062 139)` |
| **Deep Olive** | `#1A2417` | `oklch(0.250 0.031 139)` |

They sit on **the same hue, 139°** — the light and dark ends of one family rather
than an accent plus an unrelated neutral. That is why `globals.css` builds every
surface, border and neutral at hue 139 with the chroma dialled down, instead of
laying a green accent over a grey UI.

**Soft Sage is a dark-mode value.** At 1.71:1 against the light-mode ground a
sage sparkline is invisible, so `:root` takes a deeper step of the same hue
(`oklch(0.560 0.088 139)`). Both modes are verified against rendered pixels — see
the contrast note in `globals.css`.

## Formal language taken from the pins

1. **Progress rings** — the Whoop pin (`84% SLEEP / 91% RECOVERY / 20.6 STRAIN`):
   big arc, big numeral, uppercase micro-label. The dashboard's headline form.
2. **Weekly dot strips** — Fitbit Premium and the Athlete's Hub: `M T W T F S S`
   with a marker per day. Fits `daily_facts` having a real row per calendar day.
3. **Sparkline stat cards** — already in `StatTile`; kept, with tabular numerals.
4. **Left sidebar** — the sidebar-spacing pin and the green analytics dashboards.
5. **Green as the only hue in data-viz** — the *Conception d'information* poster.
   Magnitude encodings run on the sage ramp; only categorical series leave the
   family, and `--status-*` is reserved strictly for good/warning/critical.

## Files

| File | What it shows |
|---|---|
| `moodboard-1-palette-and-rings.png` | The Soft Sage / Deep Olive swatch card, the Whoop ring dashboard, Fitbit Premium cards |
| `moodboard-2-dashboards.png` | Dashboard layouts, the desktop-sidebar spacing sheet |
| `moodboard-3-athletes-hub.png` | "The Athlete's Hub", the sage data-viz poster, dark green analytics dashboards |
