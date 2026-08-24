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

## Adding or removing an item

Append a row to `RAW`, field order given by `FIELDS`:

```js
["id","Maker","Name",price,hp,"eu"|"desk","t"|"f","PrimaryCat",["Cat","Cat"],
 "One-line blurb.","modulargrid-slug","maker.com","black"|"alu"|"white"|"cream"|"wood",
 {k:knobs,j:jacks,sl:sliders,led:leds,sc:screen}]
```

`hp:0` means standalone — the panel is drawn in landscape and no HP stamp shows.
**There is no sold state.** An item no longer for sale is deleted from `RAW`; a stale link
gets a generic "that one's gone" page, since no record survives.

Adding a seller is one entry in `SELLERS`. The filter, wish band, card pills and every
count follow from it, up to ten. The name is the identifier; the dot is recall only.

## Photos

```js
var PHOTOS = { ph3: "https://ime-assets.s3.amazonaws.com/uploads/image/image/39/piston_honda_3.jpg" };
```

One URL per id, hotlinked — not downloaded into the repo. There's no image-hosting
pipeline, so this is the reversible option; if a link ever dies, `onerror` swaps it live
for the drawn faceplate via `photoFail()`, the same fallback an item with no entry gets by
default.

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

On the detail page, the photo lives in thumb slot 2 ("Panel drawing" is slot 1, always
available). Slots 3/4 ("back" / "in rack") stay visually present but disabled — there's
only ever one manufacturer photo per item, not real front/back/rack shots, so nothing to
put there yet. `neotrellis` is a special case: it's a DIY build, so its photo is of the
Adafruit component it's built from, not the finished instrument — `PHOTO_IS_COMPONENT`
swaps in a credit line that says so rather than implying it's a shot of the actual build.

## Admin composer (`#/admin`)

A hidden route, not linked from the nav — open `index.html#/admin` directly. It's a form
matching the fields above, and it generates a paste-ready `RAW` row and `BLURB` entry as
you fill it in. Nothing more:

- **No auto-fetch.** It doesn't read any other site. If you want real specs and sources
  for a new module, ask Claude to research the maker + model first, then type the answer
  in — same as how the 29 real listings got their data.
- **No live publish.** There's no backend and no auth, so "Publish" isn't a button here —
  the output is code you copy, paste into `index.html`, then commit and push like any
  other change.
- **No upload for photos.** There's nowhere to store them yet; faceplates stay the
  placeholder until real photos and a hosting plan exist.

Safe to leave unlinked and unauthenticated: since it never writes anywhere, a stranger
finding the URL can at most generate some text in their own browser.

## In negotiation

```js
var NEGOTIATING = { ph3:true };   // set by hand after reading the Tally inbox
```

Tag an id only when someone submits Reason = **Buying** or **Trading** on the
message form. Reason = **Other** is a generic question, not interest in that
specific item — it must not set this, even though it arrives through the same
form. There is currently nothing connecting a Tally submission to this map;
you read the inbox and edit `NEGOTIATING` yourself. If that ever becomes
automated (a webhook, an admin panel), this is the rule to preserve.

Solid accent chip replacing the CTA on the card, quiet accent-soft bar above the buy
button on the module page, both with a pulsing dot behind `prefers-reduced-motion`.
Accent blue on purpose: amber means caution sitewide, red would say "gone" about
something still for sale.

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
