# eurorack.fi

One self-contained file: `index.html`. No build step, no dependencies, no backend.
Open it in a browser or drop it on any static host. See `DEPLOY.md` for going live.

Built from design's handoff (`HANDOFF-design-to-dev.md`) and canvas. The `.dc.html`
artboards and `canvas.json` belong to the design session — read them, don't edit them.

## What's real

29 items — 16 eurorack (207 HP) + 13 standalone. Specs, HP, categories, prices and all
outbound links are verified against ModularGrid and manufacturer sites. Three languages
at full key parity, opening in Finnish.

One thing is not real yet: Sampo's wish list (`SELLERS[1].wants`). 24 of 29 items have a
real manufacturer photo now — see **Photos** below. Faceplates are drawn from each item's
real part counts and stay the honest fallback for the 5 that don't.

## Structure

| Block | What it holds |
|---|---|
| Script 2 | `TONE`, `RAW`, `T`, `CATKEYS`, `SELLER_DOTS`, `SELLERS` — ported verbatim from design |
| Script 3 | `ITEMS`, `buildPanel`, i18n setup, `TX` (strings I authored) |
| Script 4 | Home renderers — chrome, rack, filters, wish band, grid |
| Script 5 | `EXTRA`/`RELATED` (real review data), module page, message form |
| Script 6 | Fit rule, routing, events, init |

## Data architecture

Listings are **not** inline in `index.html` any more — each is its own file at
`content/items/<id>.json`. On page load, `index.html` fetches the folder listing from the
GitHub API (`GET /repos/spongefile/eurorackfi/contents/content/items` — one call, counts
against GitHub's unauthenticated rate limit) and then fetches each file's own
`download_url`, which is served from `raw.githubusercontent.com` and does **not** count
against that limit. Chrome shows a brief "Loading…" state for this round trip; everything
else in the header renders instantly since it doesn't depend on listing data.

This is deliberate: `index.html` stays a single self-contained file with no build step,
while listings become individually-editable files — which is what a git-backed CMS
(Decap) needs to manage them, and what makes delete a native operation instead of a
special case.

One JSON file per listing, e.g. `content/items/ph3.json`:

```json
{
  "id": "ph3", "mfr": "Industrial Music Electronics", "name": "Piston Honda MK III",
  "price": 420, "hp": 17, "fmt": "eu", "who": "t",
  "cat": "Oscillator", "cats": ["Oscillator", "Wavetable", "Digital"],
  "blurb": { "en": "…", "fi": "…", "sv": "…" },
  "mgSlug": "industrial-music-electronics-piston-honda-mk-iii",
  "site": "industrialmusicelectronics.com", "tone": "black",
  "parts": { "k": 4, "j": 10, "sl": 8, "led": 4, "sc": 0 },
  "img": "https://ime-assets.s3.amazonaws.com/uploads/image/image/39/piston_honda_3.jpg",
  "negotiating": false
}
```

`hp:0` means standalone — the panel draws in landscape, no HP stamp shows. `blurb.fi`/`sv`
empty strings are fine; the site shows its honest missing-translation banner rather than
guessing. `img` is optional — omit it and the item falls back to the drawn faceplate, same
as a hotlinked photo that goes dead at runtime (`onerror` swaps it live via `photoFail()`).
`extra` (rich per-item content: spec rows, pull quotes, review quotes, reviews, videos) and
`related` (cross-links for "you may also like") are both optional, only `ph3` has them —
see its file for the shape.

**Delete = delete the file.** There is no sold state and no separate "gone" record — an
unknown id just gets a generic "that one's gone" page, since nothing survives to be
specific about. **Negotiating = a boolean on the file itself**, `"negotiating": true`,
toggled by hand after reading the Tally inbox. Tag it only for Reason = **Buying** or
**Trading** — Reason = **Other** is a generic question, not interest in that specific
item, and must not set this even though it arrives through the same form.

Adding a seller is still one entry in `SELLERS` inside `index.html` (site-wide structure,
not per-listing data, so it stays inline). The filter, wish band, card pills and every
count follow from it, up to ten. The name is the identifier; the dot is recall only.

## Photos

`img` on each item's file, hotlinked — not downloaded into the repo. There's no
image-hosting pipeline, so this stays the reversible option.

**Sourced from the manufacturer's own site only, never ModularGrid** — that's the one
source explicitly off-limits (they've asked not to be scraped; this is a different act
from linking out to them, which the site still does). 24 of 29 confirmed. The 5 without:

| id | why |
|---|---|
| `nucleus` | riversynths.com — DNS itself is down (lame delegation), not just the page |
| `hydrus` | serpensmodular.com — 404 on everything, confirmed via Wayback since ~Jan 2025 |
| `mpc500` | delisted from Akai's current catalog, legacy downloads page has no photos |
| `therapkid` | same — discontinued, manual/firmware only, no product photo left on site |
| `quadraverb` | not on alesis.com at all — checked Mixers, the ~180-item legacy archive, and search |

Don't substitute a third-party source (a retailer, a forum photo, a YouTube thumbnail) for
these — the drawn faceplate is the honest state until the manufacturer's own site has
something again, matching how the site already treats a missing translation.

On the detail page, a real photo is the **default view** when one exists (matches the grid
card, which already shows it first) — "Panel drawing" becomes the alternate, reachable via
thumb slot 1. Slots 3/4 ("back" / "in rack") stay visually present but disabled — there's
only ever one manufacturer photo per item, not real front/back/rack shots, so nothing to
put there yet. `neotrellis` is a special case: it's a DIY build, so its photo is of the
Adafruit component it's built from, not the finished instrument — `"imgIsComponent": true`
swaps in a credit line that says so rather than implying it's a shot of the actual build.

## Admin composer (`#/admin`)

A hidden route, not linked from the nav — open `index.html#/admin` directly. It's a form
matching the schema above, and it generates a JSON file in the exact shape a listing is
actually stored in — same output whether it comes from this form, from asking Claude to
research a module in chat, or from Sampo's own AI doing the same. One format, three ways
to produce it:

- **No auto-fetch.** It doesn't read any other site. If you want real specs and sources
  for a new module, ask Claude to research the maker + model first, then type the answer
  in — same as how the 29 real listings got their data.
- **No live publish.** There's no backend and no auth, so "Publish" isn't a button here —
  copy the JSON, save it as `content/items/<id>.json`, commit and push. The chosen
  AI-assisted path is even simpler: describe the module in chat and the file gets
  committed directly, no copy-paste step at all.
- **Fallback, not the primary path.** Once Decap CMS is wired up, editing the same fields
  there is the expected day-to-day route — this page exists for when that's unavailable
  or overkill for one quick add.

Safe to leave unlinked and unauthenticated: since it never writes anywhere itself, a
stranger finding the URL can at most generate some JSON text in their own browser.

## In negotiation

Solid accent chip replacing the CTA on the card, quiet accent-soft bar above the buy
button on the module page, both with a pulsing dot behind `prefers-reduced-motion`.
Accent blue on purpose: amber means caution sitewide, red would say "gone" about
something still for sale. The rule for *when* to set it lives above, in Data architecture.

## Languages

`T` is design's reviewed copy — lift, don't paraphrase. `TX` directly below it is copy I
authored (section headings, spec labels, form) and is pending a register check.

Finnish is written **as Finnish**, not translated: "Other stuff" is "Muut", and
"placeholder" is "puuttuu vielä" (is still missing), not "paikanpitäjä". Hold new copy to
"would a native writer reach for this", not just "is this accurate".

Per-listing prose is English-only, so the missing-translation banner is the **normal**
state on module pages in fi/sv, not an edge case. Drafting the 29 fi/sv blurbs is
outstanding; design checks register when they exist.

## Two traps worth keeping

1. The base reset is `:where(.rt button)` so it has zero specificity. Unwrapped, it beats
   every `.btn`/`.chip`/`.card` class and buttons render as bare text.
2. `.chip.faint` and `.chip[aria-pressed]` sit at equal specificity, so an empty-but-selected
   category needs its own combined rule or it renders dim on the accent fill.

## Verified

390 / 700 / 900 / 1280 — no horizontal body scroll at any width. The rack and the category
chips scroll inside their own containers by design. Faceplates are fixed-pixel art, so
`fitPanel()` measures the bench and picks the tallest height whose true-scale width still
fits; the widest item (34 HP) clears a 390 viewport.

## Still needed

Tally form ID and hidden-field names · Sampo's wish list · photos · fi/sv listing prose ·
posting rates · confirm the 29 prices · who watches the shared inbox · domain and DNS.
