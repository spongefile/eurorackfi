# eurorack.fi

One self-contained file: `index.html`. No build step, no dependencies, no backend.
Open it in a browser or drop it on any static host. See `DEPLOY.md` for going live.

Built from design's handoff (`HANDOFF-design-to-dev.md`) and canvas. The `.dc.html`
artboards and `canvas.json` belong to the design session — read them, don't edit them.

## What's real

29 items — 16 eurorack (207 HP) + 13 standalone. Specs, HP, categories, prices and all
outbound links are verified against ModularGrid and manufacturer sites. Three languages
at full key parity, opening in Finnish.

Two things are not real yet: Sampo's wish list (`SELLERS[1].wants`) and the photos.
Faceplates are drawn from each item's real part counts — honest placeholders, not press shots.

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
