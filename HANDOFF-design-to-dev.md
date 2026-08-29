# eurorack.fi — design handoff

Confirmed by the user. Canvas: https://claude.ai/code/artifact/967d4c3a-e9de-41ee-b42d-059ce8ce8d1e

Eight artboards on two pages:

| Page | Artboard | Frame |
|---|---|---|
| Site | Home — the grid | 1280 |
| Site | Module page — Piston Honda MK III | 1280 |
| Site | Toiveet — wish list page | 1280 |
| Site | Phone — the grid | 390 |
| Site | Phone — module page | 390 |
| Admin & brand | Add a listing — admin | 1180 |
| Admin & brand | Logo | 1000 |
| Admin & brand | Logo — options | 1180 |

Source of truth for exact values is the working files in this directory:
`Main.dc.html`, `Module.dc.html`, `Mobile.dc.html`, `ModuleMobile.dc.html`,
`AddModule.dc.html`, `Logo.dc.html`, `LogoOptions.dc.html`, `Toiveet.dc.html`.
They are plain HTML/CSS/JS — read the CSS block rather than re-deriving
anything below.

**Read this first:** everything is split into DRAWN (observed in an artboard,
binding on you) and ASSUMED (inherited or inferred — your call to make it work
in real CSS). A third section lists what was never decided. Do not treat an
assumption as a spec.

---

# DRAWN — binding

## What the site is

Two people (growing to as many as ten) in one Helsinki neighbourhood listing
gear they are finished with, to a local community that already knows them.
Trust comes from being named and local, **not** from try-before-you-buy. The
site does not offer testing, auditioning, or "come and hear it" — that framing
was explicitly removed twice. Do not reintroduce it.

Everything is open to trade. Nothing is cash-only. What differs between sellers
is what each *wants* in return.

**One documented exception, added 2026-08-25:** products from spongefile's
webshop (`fmt:"acc"`, see the Accessories section) are Buy-only and link out.
That is the only non-tradeable content on the site; the two personal
collections still trade in full. This is not a revival of the removed
cash-only state — there is still no such state, and none should be built.

## Inventory

29 items: 16 eurorack (207 HP total) + 13 standalone. Two collections —
spongefile 9, Sampo 20. Module names, manufacturers, HP, depth, power draw,
categories and outbound links in the artboards are **real, verified** data from
ModularGrid and manufacturer sites. Keep them.

## Colour tokens

Two palettes, each light + dark. Applied as classes on a root element:
`.rt` (warm teal, light), `.rt.dark`, `.rt.blue`, `.rt.blue.dark`.
**Finnish blue is the only palette that ships.** There is no user-facing switcher —
a palette chip on a shop reads as an unfinished demo. Keep the warm-teal tokens
defined but unreachable; the user has changed colour direction once already.
Theme follows the OS by default, with an explicit light/dark choice winning in both
directions.

Finnish blue, light:
```
--bg:#E7EBF0  --bg2:#DCE2EA  --panel:#FAFBFD  --panel2:#EFF3F8
--ink:#0F1722 --ink2:#36435A --muted:#6A7789
--line:#CAD3DF --line2:#AFBACB
--accent:#0B4F9E --accent-hi:#083B77 --accent-soft:#D6E3F5
--signal:#A9660A --signal-soft:#F5E6C8
--rail:#B1B9C5 --rail-ink:#8891A0
--sold:#8A3E4E --sold-soft:#F0DAE0
--on:#FAFBFD
--shadow:0 1px 2px rgba(15,23,34,.07),0 8px 24px -12px rgba(15,23,34,.22)
```
Finnish blue, dark:
```
--bg:#0C1119  --bg2:#121924  --panel:#161E2A  --panel2:#1D2634
--ink:#E6ECF4 --ink2:#BEC9D8 --muted:#8590A1
--line:#252F3C --line2:#364253
--accent:#5AA9F0 --accent-hi:#93C8FB --accent-soft:#0D2A47
--signal:#E0AC53 --signal-soft:#2C2314
--rail:#323A46 --rail-ink:#47515F
--sold:#D98A93 --sold-soft:#331F24
--on:#08111A
--shadow:0 1px 2px rgba(0,0,0,.45),0 10px 28px -14px rgba(0,0,0,.75)
```
The warm-teal palette is in `Main.dc.html` under `.rt` / `.rt.dark`. Keep it
built; it is one class away and the user may still switch.

`--signal` (amber) is **not** a trade marker any more. It means "attention /
placeholder / caveat": the mockup notice bar, the machine-translation warning,
the missing-translation banner, the disabled-publish warning.

## Type

- **Archivo** — UI and headings. Weight 800 for headings and the wordmark,
  `letter-spacing:-.035em` on h1, `font-stretch:96%`.
- **IBM Plex Mono** — every label, chip, price, spec, stat, caption, nav.
  This is the workhorse; when in doubt, mono.
- **Newsreader** — body prose only (card blurbs, ledes, seller notes, quotes).

Three fonts, no others. Google Fonts link is in each artboard's head.

## Logo

The `o` in eurorack is a 3.5 mm jack. SVG, 100×100 viewBox:
```html
<svg class="jack" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="18"/>
  <circle cx="50" cy="50" r="14" fill="currentColor"/>
</svg>
```
```css
.jack{ width:.58em; height:.58em; display:inline-block; vertical-align:-.015em;
       margin-left:.07em; margin-right:0;
       transform:translate(var(--jack-nudge, -.016em), var(--jack-nudge-y, .015em)); }
```
- Sized in `em` so it tracks the type at every size. Do not re-fit per size.
- Side bearings are asymmetric **on purpose** — the preceding `r` throws its arm
  toward the ring. This was set optically by the user, not by measurement.
  `--jack-nudge:-.016em` is the confirmed horizontal value.
- **Vertical nudge, `--jack-nudge-y:.015em`.** The user hand-set the primary
  lockup (4.2rem) to `top:1px` in the WYSIWYG editor — 1px at 67.2px is ~1.5%
  of the type size, converted here to `.015em` so it holds at every size rather
  than needing a per-instance fix. The primary lockup on the Logo artboard keeps
  its own hand-set inline style (`width:40px; height:40px; top:1px`) as the
  pixel-exact reference; every other instance site-wide reads the generalized
  em value. If the two ever look different at the same rendered size, the
  inline value on the primary lockup is the one to trust — recompute the
  em constant from it, don't average them.
- Only the full stop before `fi` takes `--accent`. The jack stays ink.
- Favicon may be a **simplified derivative** — it is not a constraint on the mark.
- Wordmark markup: `eur` + svg + `rack` + `<span class="dot">.</span>` + `fi`.

## Page structure — Home (1280)

Top to bottom: mockup notice bar (delete in production) → rail → header →
hero → sticky filter bar → wish band → count line → card grid → rail → footer.

- Content width: `min(1160px, 100% - 3rem)`.
- **Rail motif**: 9px bar, `--rail` background, 1px `--line2` top and bottom,
  repeating dot via `radial-gradient(circle at 5px 4px, var(--rail-ink) 0 1.6px,
  transparent 1.7px)` at `background-size:25.4px 100%` — 25.4px is one HP.
  Used as a section divider and inside the hero rack figure.
- **Hero**: two columns `minmax(0,.85fr) minmax(0,1.15fr)`, gap 3rem. Left is
  eyebrow / h1 / lede / three stats. Right is the rack figure.
- **Rack figure**: all eurorack modules drawn at true relative HP width, split
  across two rows by cumulative HP, rails between. Each module is a hover
  target that tints `--accent` at .22 opacity.
  **Formula confirmed 2026-08-25 — amends the flat `hp * 4.3px` this doc
  originally specified.** The build unifies the rack figure onto the same
  formula as the faceplate/card art everywhere else: `width = hp * 5.08 *
  (H/128.5)`, parameterized by whatever pixel height `H` that call site is
  drawing at. At the rack figure's own `H=109`, that resolves to `hp *
  4.309px` — the same scale as before to within rounding, just derived from
  one shared formula instead of a second hardcoded constant. This is the
  correct version to build against; `hp * 4.3px` was this canvas's own
  shorthand for the same ratio, not a second, independent value.
- **Stats**: 29 items · 207 HP · 2 shelves. Numbers derive from data, not hard-coded.

## Card anatomy (grid)

`.card` is a button, `--panel` background, 1px `--line`, no radius anywhere on
this site. Square corners are deliberate — it is rack hardware.

1. **`.shot`** — 210px tall, `--bg2`, holds the faceplate drawing, `overflow:hidden`.
2. **`.cbody`** — mono manufacturer (uppercase, .1em tracking), Archivo h3 name,
   Newsreader blurb, tag row.
3. **`.cardfoot`** — `--panel2`, price (mono 600, `white-space:nowrap`,
   `flex:0 0 auto`), HP stamp with a left rule, then the quiet CTA chip.

Card hover: `translateY(-2px)`, border to `--line2`, `--shadow`.
Respect `prefers-reduced-motion`.

## Faceplates

Procedurally drawn from real specs, as absolutely-positioned divs (not SVG) —
panel tone, screws, knobs (conic-gradient pointer), jacks (radial-gradient),
sliders, LEDs, screens. Width is `hp * 5.08 * (H/128.5)` — **true eurorack
scale**, so a 4 HP module really is that much narrower than a 34 HP one. Panel
tones match the real hardware: black, aluminium, white (Modor), cream (TINRS),
plywood (Bastl).

These are honest placeholders for real photos. The module page has photo slots
ready. Do not swap in press shots.

## Interactive states — all drawn

| State | Behaviour |
|---|---|
| Chip default | `--panel` bg, `--line2` border, `--ink2` text |
| Chip hover | border + text `--accent` |
| Chip pressed (`aria-pressed="true"`) | `--accent` bg, `--on` text |
| Chip pressed + hover | `--accent-hi` bg, `--on` text — **must not** fall back to the generic hover, which made text invisible |
| Chip empty category (`.faint`) | dashed border, `--muted`, count shows `–` |
| Chip empty **and selected** | needs an explicit `.chip.faint[aria-pressed="true"]` rule — `.faint` and `[aria-pressed]` are both 0,2,0 and source order decides, which silently put muted text on the accent fill |
| Card CTA at rest | transparent, `--line2` border, `--ink2` |
| Card CTA on card hover | `--accent` border + text, `--accent-soft` fill |
| Card CTA sold | `--muted` on `--line`, no hover change |
| In negotiation — card | **corner ribbon over the photo — see below; SUPERSEDES the footer chip** |
| In negotiation — module page | full-width bar above the buy button, `--accent-soft` fill, `--accent` text and border |
| Primary button | `--accent` fill, `--on` text, `0 2px 0 --accent-hi` hard bottom edge |
| Primary button active | `translateY(2px)`, shadow collapses — reads as a key press |
| Owner popover | hover **and** tap-toggle, keyed per card |
| Empty — no matches | "Nothing matches that. Clear a filter." |
| Empty — Tools & parts | "Nothing here yet. Tools, kits, sensors and parts land here when we have them." |
| Photo switcher | round chevron buttons overlaid on the bench edges, dot row below (active dot = accent pill) — replaced four labeled thumbnails |
| Form mode | Buying / Trading / Either; "what you would trade" field hides on Buying |
| Form sent | form swaps for a confirmation panel |
| Publish (admin) | **disabled** while Swedish copy is missing |

**There is no cash-only state.** That went when the inventory was corrected.

**SOLD IS NOW A HIDDEN STATE, NOT A DELETION — reversed by the user 2026-08-29.**
This supersedes the previous rule, which deleted the record outright and
forbade building either state. Ignore that; it is quoted below only so the
change is legible.

> *Previously:* "an item no longer for sale is deleted from the data outright…
> There is no record to key on — the stale-link page is generic ('that one's
> gone') and cannot name the module. Do not build either state."

A hidden item keeps its record and disappears from everything a buyer sees.

**In negotiation** replaced it: someone has messaged, the item is still for sale.
A hand-tagged id map. Never amber — amber means caution sitewide — and never red,
which would say *gone* about something still available. Copy, all three languages:
`fi "Neuvottelussa"` / `sv "Under förhandling"` / `en "In negotiation"`, and on the
module page bar the still-available clause is **required**:
`fi "Neuvottelussa — voit silti kysyä"` / `sv "Under förhandling — du kan ändå fråga"` /
`en "In negotiation — you can still ask"`. Without it the state reads as a soft sold
and nobody messages.

## CSS trap — do not repeat

The base reset `button { background:none; color:inherit; border:none }` scoped
as `.rt button` has specificity 0,1,1 and silently beat every `.btn`, `.chip`,
`.card` class (0,1,0). Buttons rendered as bare text with a shadow. Fix shipped:
wrap the reset in `:where()` so it has zero specificity. Keep it that way.

## Owner model — built for ten

Adding a seller is one entry in the `SELLERS` array; the filter, wish band, card
pills and every count follow from it.

- **The name is the identifier.** Colour is not — ten hues are not tellable apart.
- Each seller gets a dot colour from a ten-entry palette, for recall only:
  `#2E77C9 #C98A2E #3E9E82 #9068C8 #C4657A #3E93AD #B08A3A #6D9440 #B75E96 #5A7FD4`
- Owner pill chrome is neutral (`--ink2` text, `--line2` border) with the dot filled.
- Wish band is `repeat(auto-fill, minmax(260px,1fr))` — two cards now, wraps at ten.
- Hovering or tapping any owner name opens that seller's wish list (short text,
  used in the popover — unrelated to the image grid below).

**Wish content lives on its own page — went through two shapes before landing
here, worth knowing so it doesn't flip a third time.** First pass put an image
grid inline in Home's wish band. The user corrected that immediately: *"the
grid is for the toiveet page itself. revert the main page toiveet section back
to the way it was."* So the split is deliberate and final:

- **Home keeps the light teaser** — the original text-chip list, unchanged from
  the first handoff: `.wishcard .wants` / `.want` chips, `p.wants` a flat
  string array. Each `.wishcard` is now `<a href="#" class="wishcard">` (was a
  `<div>`) with a hover lift matching the module cards, plus a small "See full
  list →" line — the whole card is a click target, not just that line, because
  the user's ask was "click on anything in that section."
- **A new dedicated page, `Toiveet.dc.html`, carries the actual image grid** —
  small drawn faceplate + manufacturer/name label per item, no price, no spec
  row, no CTA, exactly the "not as deep as the product pages… quickly visually
  scannable, like a grid of images with labels" spec. This is nav item 2's
  real destination now — the reason "What we want" beat "About" in the earlier
  ruling is that it needed to be a genuine, working jump, and now it is one.

**The click-through flow, both hops specified by the user directly:**
`Home wish band → click anything → Toiveet` (unfiltered, just navigates), then
`Toiveet, click a seller's whole grid card → Home, owner filter pre-set to
that seller`. Neither hop is a real cross-page navigation in this mockup —
every `.dc.html` is its own sandboxed artboard with no shared router between
them, so both are drawn as real `<a href="#">` link cards with the correct
hover/visual affordance, and the intended destination is documented here for
you to wire for real: Toiveet's `goHome` handler on each seller card is a
no-op placeholder (`e.preventDefault()`) marking exactly where your router's
"navigate to Home with `who=<key>`" call belongs.

spongefile's real wish list, drawn to true HP scale the same way the inventory
is (same `buildPanel` engine, called at 78px on Home's popover data and 86px
on Toiveet):
| Item | HP | Panel |
|---|---|---|
| ALM MCO | 6 | black |
| ALM AXON-1 | 4 | black |
| Mannequins Mangrove | 10 | white |
| Mannequins W/ | 2 | white |
| Dnipro Dot | 6 | black |

Sampo's four slots are still placeholders (`[e.g. quad VCA]` etc.) — no name
exists to draw, so those render as a **dashed empty outline**, no panel inside,
rather than an invented module. That distinction (solid card + real drawing vs.
dashed outline + bracketed text) is the whole signal for "known" vs. "not yet
specified" — don't add a label explaining it, the visual difference is the point.
This applies on both Home's hover popover and the Toiveet grid; keep it in sync
if either changes.

## Languages

Three: **fi (default on open), sv, en.** Switcher is a segmented mono control in
the header on every screen; selected segment is `--accent` fill.

- Finnish is written **as Finnish**, not translated from English. "Other stuff"
  is **"Muut"**, not "Työkalut ja osat". Written that way it is no longer than
  English and nothing overflows. Hold any future copy to that standard.
- Module names, manufacturers, HP, power, categories: **never translated.**
- Seller prose (pitch, notes, blurbs): per-language, authored.
- When prose has no translation, show the honest banner rather than
  machine-translating silently — see the module page in FI/SV.
- Full fi/sv/en string tables are in `Main.dc.html` (`var T`) and
  `AddModule.dc.html`. Lift them; they are reviewed copy, not drafts.

## Module page (1280 and 390)

Order: notice → rail → header → breadcrumb → buy area → pitch → pull quote +
quote cards → reviews → video → outbound links → "You may also like" → footer.

- **Buy area — SUPERSEDES an earlier version of this handoff.** An earlier pass
  had the image column `align-items:stretch` with the bench on `flex:1 1 auto`,
  capped `max-height:620px`, sticky on `.bench` itself. That version had two real
  bugs, both found by rendering the actual page in Chrome rather than re-reading
  the CSS, and both reported independently — the second by the user watching it
  live: (1) the "~665px / ~592px" figures did not hold for this canvas's actual
  content (Overview + Specs stacked genuinely renders ~945px on Piston Honda),
  so the cap bound even in the default closed-form state and stranded a visible
  gap under the thumbnails; (2) because only `.bench` was sticky and the
  thumbnail row below it stayed in normal flow, scrolling could make the two
  drift apart and visibly overlap.

  The fix is structural, not a bigger cap. **The image column no longer
  stretches to match the buy column's height at all:**
  ```css
  .detail .wrap{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,440px);
                 gap:2.5rem; align-items:start; }   /* was: stretch */
  .shots{ display:flex; flex-direction:column; }   /* sticky lived here; REMOVED 2026-08-25, see the specs bullet below */
  .bench{ ...; flex:0 0 auto; min-height:470px; position:relative; ... }     /* no max-height, not sticky */
  ```
  `.shots` (bench + the photo switcher below it, see next point) is now ONE
  small sticky unit with a fixed natural height — it never stretches to match
  `.buy`, never grows into a grey slab, and its two children can never drift
  apart while scrolling because they move as a single rigid box. No cap, no
  `:has()` special-case, no per-state numbers to keep in sync — this is correct
  by construction, for a description of any length and a form open or closed.
  Verify by rendering: at rest, `bench.getBoundingClientRect().bottom + margin`
  should equal `dots.getBoundingClientRect().top` at every scroll position.
  Both stacked breakpoints reset `.shots` to `position:static` — sticky in a
  single-column layout would pin the image over the form as you scroll past it.
  **Superseded 2026-08-25:** sticky is gone from this column entirely, so both
  resets are dead too. The rigid-single-unit principle above still stands and
  is why the specs block goes inside `.imgcol`; only the pinning is gone.

- **Specs move under the image (decided 2026-08-25).** The specs block leaves
  the bottom of the buy column and goes into the image column, below the photo
  credit. Rendered spec: `specs-placement-mockup.html`, option B.

  Reason: specs and photo both describe *the object*; price, seller, CTA and
  wishlist all describe *the transaction*. Splitting them that way also closes
  the scroll gap the user reported — measured live on Piston Honda at 1280px,
  `.imgcol` was 443px against `.buycol`'s 744px, a 301px hole beside the CTA.

  **The specs go INSIDE `.imgcol`, as its last child — never a sibling below
  it.** A sibling below would put a normal-flow element under what used to be
  a sticky one, which is exactly the drift-and-overlap bug documented two
  points above. Keep everything in one rigid unit.

  **`position:sticky` is GONE from `.imgcol` as of 2026-08-25 — built and
  verified, not merely proposed.** Base rule and both media-query resets
  removed. Once the specs joined it, `.imgcol` became the *taller* of the two
  columns on every real item, and a sticky element that is also the tallest
  grid item has no slack to pin against — it was contributing nothing. Dev
  confirmed empirically rather than by reasoning: sampled `.imgcol`'s `top`
  across the full 0–600px scroll range on `kastledrum` before and after
  removal and got identical numbers both times. So this deleted a bug class
  at zero behavioural cost. **Do not reintroduce it**, and ignore any text
  elsewhere in this doc that still describes the image column as sticky.

  **On my earlier objection — the user overruled it and was right.** I flagged
  that B would flip the imbalance (left ≈700, right ≈490). That was measured
  against the mockup's stub wishlist panel. The user's correction: the wishlist
  section is usually taller than that, so the right column carries more height
  in practice and the columns land closer than my figures suggested. Verify
  against an item with a real wishlist, not against the mockup.

- **Photo switcher — replaced the four labeled thumbnails entirely**, per the
  user: "get less specific about the photo types and simply have the standard
  arrow/swipe option." Two round chevron buttons (SVG, stroke-based per the
  icon rule — never emoji) absolutely positioned over the left/right edges of
  the bench (`position:absolute` needs `.bench{position:relative}`, already
  set above), plus a compact dot row below it — inactive dots 8px circles,
  the active one an 8×20px accent pill. State model is unchanged (still a
  `shot` string cycling through the same four values); only the control
  changed, from four labeled buttons to prev/next cyclers (wrap-around both
  directions, skipping unavailable slots) plus direct dot selection. Each dot
  still carries the old label as `aria-label` (screen-reader only) — "Panel
  drawing", "[PHOTO — front]", etc. — so nothing was lost for accessibility,
  only removed from the visual layout, which is the part that was crowding
  the column and colliding with scroll.
  **Naming, confirmed built 2026-08-25 — shipped identifiers differ from
  this doc's, functionally identical:** `.shots` here is `.imgcol` in the
  build; `prevShot()`/`nextShot()` are a shared click handler keyed off
  `data-shotdir="prev"`/`"next"` on `.benchnav.prev`/`.benchnav.next`
  buttons, gated so the switcher only renders when a module has more than
  one shot available. Noting the mapping here so a future audit greps the
  right names instead of false-positiving "not built."
- **One CTA only**: "Buy or trade for this", 62px, full width, opens the inline
  message form. Do not add competing buttons.
- **Message form** goes to **one shared inbox**, not the owner. Copy says so.
- **Reviews and video are real URLs** (Waveform Magazine, MOD WIGGLER, Perfect
  Circuit, ModularGrid, three YouTube demos). Quotes are **verbatim** from the
  Waveform review and attributed. Never fabricate quotes for other modules.
  **Reversed 2026-08-25 — SUPERSEDES the dashed-amber criticism card below.**
  Critical/caveat quotes (the ones with a `crit` flag) are **not shown at all**
  any more, not just de-emphasized — spongefile's call: a sell page shouldn't
  surface the negative, however honestly sourced. The remaining positive
  quote cards now use the amber/signal treatment that dashed-amber used to be
  reserved for. If a module's data has nothing but a crit quote, that module
  simply gets no quote cards.
- **"You may also like"** is picked by function, not owner, and each card states
  its reason. It crosses collections, so each carries an owner pill.

## In-negotiation ribbon (added 2026-08-25)

**SUPERSEDES the in-negotiation footer chip on grid cards.** Rendered spec:
`ribbon-mockup.html` in the repo root — standalone, reads nothing from the
canvas, and includes a 3× corner crop for the overhang. Build from that
file, not from this paragraph.

An old-school corner banner across the top-right of the card photo:

```css
.card{ position:relative }               /* the ribbon anchors here, NOT .shot */
.negribbon{position:absolute; top:-2px; right:-2px; width:168px; height:168px;
  overflow:hidden; pointer-events:none; z-index:3}
.negribbon span{position:absolute; right:-56px; top:30px; width:230px; transform:rotate(30deg);
  background:var(--accent); color:var(--on); text-align:center; padding:.4rem 0;
  font-family:"IBM Plex Mono",monospace; font-size:.62rem; letter-spacing:.14em;
  text-transform:uppercase; box-shadow:0 1px 5px rgba(0,0,0,.3)}
```

Three things are load-bearing and were each arrived at by rendering, not by
reasoning — don't "tidy" them:
- **Anchored on `.card`, clip box inset `-2px`.** That is one pixel past the
  card's own 1px border, so the band overhangs the edge. Anchored on `.shot`
  or inset `-1px` it lands *on* the border and reads as printed on the card
  rather than wrapped around it.
- **30°, not 45°.** At 45° on a narrower band the word is crammed into a
  corner triangle.
- **It is the ONLY marker.** The footer chip that used to carry this state
  is removed, and a negotiating card shows **no CTA at all** — not a
  disabled one. The item cannot be bought, so offering the action is wrong.

**Scales down at `max-width:640px`,** where `.shot` drops 210px → 180px.
The card is *wider* on mobile but the photo is shorter, so the unscaled
band cut much further down the image and read as a sash rather than a
corner accent. Scaled by that ratio (~0.85) to hold the same optical
weight:

```css
@media(max-width:640px){
  .negribbon{width:143px; height:143px}
  .negribbon span{right:-48px; top:26px; width:196px; padding:.34rem 0; font-size:.58rem}
}
```

Copy is a one-word form, `negRibbon`: **fi Neuvottelussa / sv Förhandlas /
en Negotiating**. The full phrase stays on `negBar` for the module page,
where the still-available clause ("— voit silti kysyä") is required.

## Hero rack — the case (added 2026-08-25)

Wood cheeks, dark interior, unbranded dark blanking panels. Rendered spec:
`rack-mockup.html` in the repo root. Wood is the palette's existing `wood`
faceplate tone, already on the site via the Bastl panels — not a new colour.

- `.rackbox` is the scroll container: `overflow-x:auto`, `display:flex`,
  `align-items:stretch`, dark body, wood-toned border.
- `.rackinner` wraps the rails and rows so the two share a width:
  `width:max-content; min-width:100%;` **and `flex:0 0 auto`.**
- `.cheek` 16px, wood gradient, mirrored right, screws top and bottom.
- `.blank` fills the remainder of a part-full row. It must be **darker than
  the module photos** — a lighter filler reads as sitting in front of them.
  **No logo or mark on it**; a blank panel is just a panel.

### Cheek endcaps (added 2026-08-25, after lip removal)

The cheeks run **2px proud of the rails** top and bottom. A real case's sides
are slightly longer than the rails they carry, and the endcap is what makes
the wood read as a solid piece rather than a stripe painted on the ends.

**The lighting is the point, not the overhang.** The rails already declare a
light source — `inset 0 1px 0 rgba(255,255,255,.16)` on top, `inset 0 -1px 0
rgba(0,0,0,.22)` underneath — so the cheeks use the same 1px weights in the
same directions. A matched dark line at both ends (the first attempt, `#4a3418`
top and bottom) reads as an outline, not as a lit object. The top outer corner
takes a single brighter pixel: it is the one point catching light across two
surfaces, and without it the corner reads as a cut.

```css
.rackbox{background:transparent; border:none; box-shadow:none; padding:2px 0;
  display:flex; align-items:stretch; overflow-x:auto}
.rackinner{ /* …existing, incl. flex:0 0 auto… */ box-shadow:var(--shadow);
  background:linear-gradient(176deg,#31363c,#1c2025)}
.cheek{ /* …existing… */ margin:-2px 0; border:none; box-shadow:var(--shadow);
  --wood:linear-gradient(90deg,#dcb98d,#b98f5c);
  --outer:left top; --inner:right top; --corner:left top;
  background-image:
    linear-gradient(rgba(255,255,255,.62) 0 0),   /* lit outer corner, 1px */
    linear-gradient(rgba(255,255,255,.34) 0 0),   /* top — faces the light */
    linear-gradient(rgba(0,0,0,.26) 0 0),         /* underside — in shadow */
    linear-gradient(#8a6538 0 0),                 /* outer edge */
    linear-gradient(rgba(0,0,0,.35) 0 0),         /* inner seam */
    var(--wood);
  background-size:1px 1px,100% 1px,100% 1px,1px 100%,1px 100%,auto;
  background-position:var(--corner),left top,left bottom,var(--outer),var(--inner),left top;
  background-repeat:no-repeat,no-repeat,no-repeat,no-repeat,no-repeat,repeat}
.cheek.r{--wood:linear-gradient(90deg,#b98f5c,#dcb98d);
  --outer:right top; --inner:left top; --corner:right top}
.cheek::before{top:11px} .cheek::after{bottom:11px}
```

**Three things here are load-bearing, and each one broke something first:**

1. **The case body lives on `.rackinner`, not `.rackbox`.** `padding:2px 0` is
   the headroom the cheek's negative margin expands into. Left on `.rackbox`,
   the dark gradient fills that headroom and puts a dark band straight back
   across the full width — exactly what removing the top/bottom lip was for.
   `overflow-x:auto` clips vertically too, so the cheek cannot simply overhang
   the box; the padding is the only way to give it room.
2. **The shadow moves off `.rackbox` too.** Same cause, opposite symptom: with
   `--shadow` still drawn round the now-taller box, the transparent strip is
   fenced off from the page and reads as a **pale line under the rack**. The
   shadow belongs on the solid parts, `.rackinner` and `.cheek`.
3. **Edges are background layers, not borders.** A border paints *on top of*
   the background, so an outer-edge border buries the corner pixel. Layers
   stack in source order, so the corner is listed first and sits above.

Screws move `9px → 11px` to stay level with the first and last rail instead
of riding up into the endcap.

Rendered spec: `rack-endcap-mockup.html` — shipped-dark-cap vs lit, at 8×.

**`flex:0 0 auto` on `.rackinner` is load-bearing and cost two attempts.**
The original bug: rails were sized to the container and rows to their
content, so rows overflowed while rails stopped at the box edge and modules
floated outside the rack when scrolled. The first fix used `flex:1 1 auto`,
which let the outer flex row shrink `.rackinner` back to the box width under
real viewport pressure — rails and rows agreed with each other but both got
clamped, while a `flex:0 0 auto` module button ignored the clamp and
overflowed anyway. Same bug one layer down.

**Verify by scrolling, not by looking.** Scroll the rack fully right at a
width where rows exceed the box, then confirm the last module's right edge
is inside the rail's, which is inside the cheek's. Live measurement after the
fix: module 1148, rail 1203, cheek 1219.

**Lesson for the next static-mockup-to-live port** (dev's, worth keeping): an
isolated mockup file has no ambient width pressure, so a flex-shrink fault
can hide there completely and only appear once real content meets a real
viewport. A mockup proves the design, never the layout's behaviour under
constraint.

## Accessories — the shop category (added 2026-08-25)

A fourth `fmt` value, `acc`, for products from spongefile's webshop
(accessories and cheatsheets for Teenage Engineering and similar). Named
**fi Tarvikkeet / sv Tillbehör / en Accessories**, positioned **between
Standalone and Muut**. It is a genuine fourth chip, **not** a reuse of
`fmt:"tools"` / Muut — Muut stays reserved and empty for tools, kits,
sensors and parts.

- **Icon is a bow**, `.ic-acc` in `Main.dc.html`. Drawn on the same 100
  viewBox and heavy weight as the rest of the set. The loops must stay
  angled up and outward and the tails are load-bearing: drawn flat and
  tailless it reads as an infinity sign at 15px, which the first attempt
  did. It is deliberately the one mark in the set that is not hardware —
  these adorn a device rather than being one.
- **Owner is spongefile.** Not a third seller, not ownerless. Counts
  everywhere — hero items stat, grid count line, wishcard sub-line, shelf
  chip — include shop products like any other item. The HP stat is
  unaffected since it only ever summed eurorack.

**This category breaks the "everything is open to trade" invariant above.**
That line stays true of the two personal collections; shop products are
the documented exception. They are Buy-only, and the three things that
followed from tradeability are all suppressed for them: the "Collection
preferred, posting possible" line, the shared-inbox note, and the amber
trade panel. None survive an outbound checkout.

**Grid card is identical to a module card** — same shot, body, tags, owner
pill, price. Only the CTA word changes, to **fi Lisätietoja / sv Mer
information / en More info**, because the click still goes to a detail page
on this site. The outbound step happens one level deeper.

**Detail page** is a normal eurorack.fi page; only the Buy button leaves.
Full spec, rendered: `accessory-page-mockup.html` in the repo root.
- Buy CTA **fi Osta kaupasta / sv Köp i butiken / en Buy from the shop**,
  with a note beneath: **fi Avautuu kauppaan uuteen välilehteen.**
- **Spec table hides entirely when the shop data carries no key/values.**
  It must never render blank HP, depth or power rows.
- **Reviews come from the shop's own product pages** and reuse the
  existing quote-card component unchanged — same markup, same neutral
  panel. Attribution reads **kauppa / butiken / the shop** rather than a
  magazine. No pull-quote hero unless one is genuinely worth pulling.
  Section hides when a product has none.
- **Dropped**: video, external review links, ModularGrid outbound links.
  The one outbound link is the Buy button.
- **Kept**: notice, rail, header, breadcrumb, overview, quote cards,
  "You may also like", footer.
- **Hide, don't placeholder.** Every dropped section collapses completely
  — no empty headings, no "ei arvioita" stand-ins. A short page is correct
  for a cheatsheet; a page of empty scaffolding is not.

**Data model — decided by dev while building, confirmed, now binding:**
- Shop key/values live in `extra.specs`, reusing the `extra.overview`
  tuple shape (array of `[key, value]`). The table renders **only when
  `extra.specs` has at least one entry**; the Maker row rides along inside
  it rather than being able to summon the table by itself. A table whose
  only content is a manufacturer already shown in the breadcrumb above it
  is the exact scaffolding this section exists to prevent.
- Shop reviews reuse `extra.quotes` unchanged (`q.t` / `q.s`, same
  `.qcard` markup). Citation renders as `q.s · kauppa` when a reviewer
  name exists and bare `kauppa` when it does not, with the localised
  "kauppa / butiken / the shop" coming from the string table. The data
  never carries the suffix — hand-writing it per item in three languages
  is a translation bug waiting to happen.

## Admin — add a listing

Six steps: identify → what we found → photos → price → copy → owner/condition.

- Every fetched value carries a **source chip**: solid accent = ModularGrid,
  dashed amber = generated. Nothing arrives unattributed, and everything stays
  editable. Auto-filled data is wrong often enough that this is load-bearing.
- **Price shows its working** — suggested figure beside the used listings behind
  it, never a bare number.
- **Finnish and Swedish both required.** Tabs carry a status dot; Publish is
  disabled until both are filled; machine translation is offered but flagged for
  a read-through, never applied silently.

---

# ASSUMED — your latitude

These were inherited or inferred. Nothing here was drawn at 1280 or 390.

1. **Breakpoints: 900 / 720 / 640**, inherited from the existing `index.html`.
   At 900 the hero and the module buy area go single-column; at 720 the desktop
   nav drops; at 640 the wrap margin tightens to 1.75rem and type steps down.
2. **The card grid is fluid, not stepped.** `repeat(auto-fill, minmax(255px,1fr))`
   with 1.25rem gap — 4-up at 1160px of content, 3-up below ~1010, 2-up below
   ~740, 1-up below ~570. **Spec the rule, not the number 4.** My artboards
   hardcode 4 columns at 1280 purely because an artboard is a fixed width.
3. **Filter bar between 1280 and 390 is undrawn.** My assumption: category chips
   become a horizontal scroller below ~740, matching the phone pattern. Owner and
   format chips collapse before the categories do.
4. ~~Faceplate render size per breakpoint.~~ **RESOLVED — measured by dev.** The
   layout flag was not enough. Measure the bench and take the tallest height whose
   true-scale width still fits:
   `H = clamp(120, floor((benchWidth - 32) / (hp * 5.08 / 128.5)), 282)`, re-run on
   resize. Forcing case is PER|FORMER at 34 HP — at the full 282px height it draws
   383px wide and bursts a 390 viewport. Confirmed at a true 390: no overflow.
   Cards need no equivalent rule (widest is 245px against a 255px minimum column).
   Note for anyone re-measuring: headless Chrome clamps its viewport to 500px
   minimum — test in an iframe or you will get a false "mobile is broken" reading.
5. **Category vocabulary for "Muut".** The current chips (Oscillator, Filter,
   Sequencing…) are eurorack function tags and will not describe a soldering
   station or a sensor pack. My recommendation is a separate vocabulary that
   swaps in when that format is selected, rather than adding generic tags to the
   shared row. Not decided.
6. **Owner filter past ~5 sellers.** A wrapping chip row works for two. At ten it
   likely wants a dropdown like Sort. Not drawn.
7. **Logo at small sizes.** One nudge value is applied at every size. Optical
   spacing sometimes wants to loosen as type shrinks; if the header wordmark
   reads tighter than the primary lockup, add a size-specific value. Flagged to
   the user, not yet judged.
8. **Artboard heights** in `canvas.json` are hand-calculated, not rendered. They
   affect the canvas only, never the built site.

---

# SETTLED SINCE THE FIRST HANDOFF

- **Critical review quotes are cut entirely, not dashed-amber-flagged.** See
  the reversal note under Module page above — 2026-08-25, spongefile's call.
- Finnish blue ships; no palette switcher. Teal stays defined, unused.
- Per-module **ModularGrid outbound links stay** — linking out is attribution, not
  scraping, and it lets a buyer verify specs independently.
- **"Why not tori" is cut from the nav.** Do not build the page or point the link
  anywhere. Nothing on the site now argues why this exists rather than tori — that
  is the user's decision. Do **not** compensate by working the argument into the
  hero; they have cut that framing from the hero twice.
- **Nav copy went through two more rulings — this is the final one: Home / What
  we want / Contact.** History, so the next person does not re-open a closed
  loop: "Everything / What we want / Contact" → briefly "Home / About / Contact"
  → back to **"Home / What we want / Contact"**, because dev's build had item 2
  as a real working anchor to the wish section, and renaming a working link to
  "About" would have made it lie about its destination. The user chose to keep
  the real destination and deepen its content instead — see the wish-band
  section above for what that content became. fi: Etusivu / Toiveet / Yhteys.
  sv: Hem / Önskemål / Kontakt. "Home" and "Contact" have no built page/route
  yet, same status as always — every nav link in the mockup is a `#`
  placeholder except item 2, which is meant to actually jump to the wish band.
- **Mobile nav was a real bug, not a design choice: fixed.** The phone header had
  a hamburger icon that opened nothing — no drawer, no menu, decorative only, so
  mobile visitors had no nav at all. Fixed by dropping the hamburger and showing
  the three nav words directly in the header; at three short words per language
  (Finnish is the widest set) this fits at 390px with room to spare — confirmed
  by rendering, not assumed. If nav ever grows past three items, the direct-row
  approach may need revisiting; don't assume it scales indefinitely.
- Contact resolves to the form. No mailto, no ModularGrid profile link.
- Posting is possible, **collection preferred** — stated in that order everywhere.
- sv and en get authored prose, not specs-only. Per-listing prose is English-only
  today, so the missing-translation banner is the **normal** state on module pages.

# NOT DECIDED — needs the user, not you

- **Sampo's wish list.** Still `[e.g. quad VCA]` placeholders. The last
  fabricated content on the site.
- **Which used-listing sources** the AddModule price suggestion actually queries.
- **Auth model for the admin screen** — not designed at all.

(Two items dropped from this list since the first handoff, both since settled:
prose language — sv/en get authored prose, not specs-only, confirmed by the
user directly; and the palette — Finnish blue ships, no toggle, teal stays
defined but unreachable. Leaving resolved items in a "not decided" list is
exactly the kind of drift this doc exists to prevent — caught while auditing
for this answer, not from any new instruction.)

---

# Placeholder convention

Anything in `[SQUARE BRACKETS]` is a blank for the user, in every language.
Do not ship them, and do not invent values to fill them.

## Filter bar collapse — option C (decided 2026-08-25)

Reference implementation: `filter-collapse-C.html` (self-contained, scroll it).
Comparison of all four approaches: `filter-collapse-mockup.html`.

The user's report: it "turns white", it "feels like it appears and disappears"
rather than folding, and once scrolling it is "not very noticeable as
something you could click on." All three have distinct causes.

### Why it does not read as a fold — mechanical, not aesthetic

1. **Nothing ever animates height.** `.collbar` pairs `min-height:44px` with
   `max-height:0`. **`min-height` wins**, so the bar is permanently 44px and
   only its `opacity` changes. Neither half of the swap animates height, so
   there is nothing to read as folding.
2. **`max-height:300px` against a 225px panel.** Measured live. A quarter of
   the transition is dead travel where nothing moves, then it snaps.
3. **Opacity outruns height** (`.15s` vs `.2s`), so content is fully invisible
   with a quarter of the height animation still to run — a cross-dissolve
   between two elements, which is precisely "appears and disappears".

### The fix

- Animate a **measured pixel height** (`scrollHeight`), never `max-height`.
- **No `min-height` on `.collbar`.** Height goes 0 ↔ 44px and is the whole
  animation.
- **No opacity transition on either side.** Opacity is the bug.
- One easing, one duration, both directions: `.26s cubic-bezier(.4,0,.2,1)`.

### The collapsed bar

`--accent-soft` fill, `--accent-hi` text, `--accent` bottom border — reads as a
control rather than a strip of page, and fixes "turns white" (it was
`--panel`, #FAFBFD). Contents: chevron (rotates 180° on state), the **active
filters** rather than the word "Filters", and the count.

**No new copy is required.** The summary is composed from the existing chip
labels, already translated; with nothing selected it falls back to the
existing "everything" chip label. Generate it from filter STATE, not by
scraping the DOM — the reference scrapes only because it has no state.

### Three traps

1. **`overflow:hidden` on `.wrap` must not be permanent.** The owner wishlist
   popover opens *downward inside* these rows (`.crow .wishpop`). **This is
   already clipping on the live build — measured, 54px off a 150px popover.**
   Clamp overflow only while folding or collapsed:
   `.wrap.folding,.controls.collapsed .wrap{overflow:hidden}`.
2. **`visibility` cannot do the a11y job here.** Live transitions visibility
   with a delay to keep hidden content out of the tab order; that cannot work
   when the panel must stay visible for the whole fold. Use **`inert`** on
   `.wrap` when collapsed and on `.collbar` when expanded, plus `aria-expanded`
   and `aria-controls` on the button.
3. **Clear the inline height after expanding.** Leave it and the panel keeps a
   stale pixel height across resize, language switch, or chips rewrapping.
   Reset to `''` once the transition ends, and on `resize` while open.

A border draws even at `height:0`, so the collapsed bar's bottom border must
be applied in the collapsed state only — otherwise a 1px accent line sits
above the open panel. (Found by rendering; I had shipped it into my own first
reference.)

## FAQ page (copy approved 2026-08-25)

Rendered design: `faq-page-mockup.html`. Copy below is the user's own words,
revised by them across four passes — treat it as final English. **fi and sv do
not exist yet** and the user writes them personally; the page must render with
one language filled in.

### Route and the deep-link constraint

`#/faq` for the page. `#/faq/<id>` scrolls to one question.

**`#/faq#can-i-join` is impossible and this is the thing to get right.** The
site is hash-routed, and a URL has exactly one fragment — so the ordinary
"anchor inside a page" trick is unavailable here. The second segment has to be
part of the route, not a separate anchor. So `#/faq/can-i-join` is parsed by
`route()`, which renders the page and scrolls that question into view. Bare
`#/faq` renders the page unscrolled.

The four ids, stable and already in the markup — these are addresses, keep them
fixed even if the wording changes:
`what-is-this`, `why-not-tori`, `who-are-you`, `can-i-join`.

Each `h2` carries a `#` anchor link, hidden until the row is hovered or the
link is focused. It sets `#/faq/<id>` so a reader can copy a link to one
answer. `scroll-margin-top:1.5rem` on the `h2` keeps it off the sticky header.

### Nav

Label is **"FAQ" in all three languages** — the user's explicit decision, not
UKK, not Vanliga frågor. Order: Everything / What we want / FAQ / Contact, so
it inserts at index 2 of the `anchors` array, which becomes
`["#grid-top","#/wish","#/faq","#/msg/"]`.

**Measured, not assumed:** at a true 390px viewport a fourth nav item fits on
one line only while the label is short. "FAQ" puts the nav at 293px, no
overflow. "Vanliga frågor" or "Kysytyt kysymykset" takes it from 21px to 63px
and wraps to three lines, breaking the header. This is why the label is an
abbreviation in every language even though the page's own h1 could differ.

**While inserting, fix the positional `return false`.** The nav suppresses the
href on `i===0` because index 0 happens to be the neutral home destination.
Adding a fourth item is exactly the change that makes that assumption fragile —
key it off the destination instead, or the seller-URL bug returns silently the
next time anyone reorders the nav.

### Data

`content/faq.json`, shape already landed:
`{questions:[{id, q:{en,fi,sv}, a:{en,fi,sv}}]}`. Answers are multi-paragraph
plain text: split on blank lines into `<p>`, autolink URLs. No markdown parser.
Missing languages follow the same honest-missing pattern as item blurbs.

### Layout

- Two-column row per question: 64px mono gutter carrying a zero-padded index
  (`01`…), then the Q&A. Same gutter idiom as the filter bar labels and the
  module spec rows, so the page belongs to the site rather than reading as a
  generic article. Collapses to one column at 640px.
- Question: Archivo 1.32rem, `letter-spacing:-.02em`.
- Answer: Newsreader 1.06rem, `--ink2`, **`max-width:62ch`**. The page
  container is 1160px; do not let prose run its full width. These answers are
  the only sustained body prose on the site and full-bleed Newsreader at that
  measure is unreadable.
- 1px `--line` rule between rows, `--line2` above the first.
- Eyebrow `HELSINKI · NEIGHBOURS`, h1 `FAQ`, then the lede.
- Tail line linking to `#/msg/`.

### Approved English copy

**Lede:** What this is, who is behind it, and how to join in.

**01 · what-is-this — "What is this?"**
> A place to buy gear from people you can actually meet.
>
> Finland's modular scene is small. If you've been on the forums a while, you
> have probably already talked to whoever is selling — under some handle or
> other. This is the same people, with the gear they're finished with.
>
> Most of us are in Helsinki, which is small enough to count as one
> neighbourhood. We're also happy to arrange a handover with people passing
> through from Tampere or elsewhere. But in person is the key here. Postage is
> the exception. Community building matters too!

**02 · why-not-tori — "Why not Tori, Reverb, etc?"**
> Tori, Facebook marketplace and so on don't know what HP means, and often
> messages go unanswered, and sometimes people aren't trustworthy. Reverb works
> well but takes a large cut. Muusikoiden.net has the right people on it — you
> just can't browse it the way you actually shop for modules.
>
> Because with eurorack you often don't have an exact module in mind. You know
> the specs: something to fold a signal, something that fits the 6HP you have
> left. Therefore everything here is listed by what it does and how much room it
> takes, drawn to scale. And nobody takes a percentage.

**03 · who-are-you — "Who are you?"**
> Two of us, so far.
>
> We know each other from the Finnish Eurorack group on Facebook, which is where
> most of this scene actually lives. Sampo ran Acapulco Modular. Spongefile has
> posted various module cheatsheets on www.spongefile.com
>
> There's no company behind this — just people who ended up with spare modules
> and are up for a swap or cash to buy something else.

**04 · can-i-join — "Can I put my stuff here too?"**

> **SUPERSEDED — the user has since edited this directly in admin.** The
> threshold is now **more than eight modules**, not ten, and the
> vouch-from-the-forums clause has been **removed entirely**. Read
> `content/faq.json` for the current text; the version below is the original
> approved copy and is kept only as a record of what was first agreed.
>
> **Standing rule:** anything the user edits directly in admin IS the decision,
> including rewritten copy and deleted clauses. Do not flag those as possible
> oversights or offer to restore them. If an edit genuinely conflicts with a
> design decision, name the conflict and let them resolve it.

Two links inside the copy: "get in touch" in 04 and the tail line both go to
`#/msg/`. `www.spongefile.com` in 03 is external.

## Wishlist popovers (added 2026-08-27)

Hover popovers on owner chips and owner pills are **220px wide**. They take
`wantLabelShort` (model name only), the same label the home wishcards use —
never `wantLabel` (`mfr + name`), which overflows the box: "Noise Engineering
Mimetic Digitwolis" runs straight out of the panel's right edge.

The module page's trade panel is the exception and keeps the **full**
`wantLabel`. It is ~440px wide and being complete is the job there — same
reasoning already recorded for the Toiveet page.

**A seller with an empty wishlist still gets a popover**, showing
`T2.noWishes` ("Ei toiveita juuri nyt." / "Inga önskemål just nu." / "No
wishes at the moment.") in place of the chip list. The string already exists
and is already used by `.wishempty` on Toiveet — no new copy. An empty box
under a "X IS HUNTING FOR" heading reads as broken; an explicit "nothing right
now" is an answer.

Note this is separate from the **wish band**, where a seller with no wishes is
excluded from the grid entirely (`renderWish` filters on `wants.length > 0`).
The band is a teaser and an empty card wastes a slot; the popover is a direct
question about one named person and deserves a direct answer.

## Per-seller contact routing (specced 2026-08-27)

**Problem.** Item enquiries all land in one shared Tally inbox. That was right
for two people who read each other's mail; with Kalle it is already wrong, and
it gets worse with every seller. An enquiry about Sampo's module should reach
Sampo.

**Not email addresses.** The obvious fix — `mailto:` per seller — publishes
those addresses. `content/sellers/*.json` is fetched by every visitor's browser
at runtime, so it is public no matter what the repo's visibility is; making the
repo private would not hide it and *would* break the site, since content loads
via `raw.githubusercontent.com`, which requires auth for private repos.

**So: one Tally form per seller, all owned by spongefile's single account.**
Tally's self-notification recipient can be any address and is free (dynamic
answer-based routing is Pro; we do not need it — one form per seller gets the
same result). Sellers need an email address, not a Tally account, and their
address lives in Tally's settings, never in this repo.

### Data

Optional field on each seller: `form` — a Tally form URL. Absent means "use the
shared form", so nothing breaks and a new seller works from day one.

### Resolution

- `#/msg/<id>` → the **item owner's** form if that seller has one, else `TALLY_URL`.
- `#/msg/` (general contact) → **always** `TALLY_URL`. Unchanged.

### The trap: prefill silently dies on a duplicated form

`TALLY_FIELDS` currently holds four raw Tally **block UUIDs**, valid only for
form `rjMyQo`. Duplicate that form and Tally mints new ids, so those params match
nothing. Tally ignores unknown params — it does not error. The form just opens
blank, and it looks like the prefill was never wired up.

**Resolved 2026-08-27 — no authoring was needed and this is now shipped
(`3c87120`).** Dev read the form's own block definitions and found the four
UUIDs were the block ids *of already-named hidden fields*: `module`, `seller`,
`price`, `lang`. `TALLY_FIELDS` is now `{module:"module", …}` and duplicated
forms prefill correctly. Check the artefact before planning around it — I
specced a Tally-side prerequisite that did not exist.

Historic note on the ordering, since the reasoning still holds if fields are
ever renamed: names must exist in Tally *before* the code sends them, so the
order would be author → flip code → duplicate, never the reverse.

The four are **named hidden fields**.
Tally references hidden fields by a name the form author picks
(`?module=…&seller=…`), so one `TALLY_FIELDS` map works across every duplicate.
Name them `module`, `seller`, `price`, `lang` in the Tally dashboard.

**Correction, 2026-08-27 — I got this wrong and it misled a decision.** I
wrote that the prefilled blocks are currently visible to the sender. They are
not, and never have been. The live form renders Name, Email, Reason, What
you'd trade, Message — `module`/`seller`/`price` appear nowhere. The sender has
never seen which item they are asking about.

I asserted this from the code's use of prefill params without opening the form,
despite having screenshotted it earlier the same day. The user first chose
"keep them visible" believing that described the status quo.

**Re-decided once corrected, 2026-08-27: "item details don't need to be
visible."** So the fields stay hidden — which is what the form already does.
Nothing to author, nothing to build, and the editable-prefilled-price
trade-off never becomes live. Do not add visible item fields to a duplicated
form.

### Copy — needs the user, do not machine-translate

`T2.inbox` currently reads "Goes to one shared inbox — we both read it." /
"Menee yhteiseen postilaatikkoon — luemme sen molemmat." / "Går till en
gemensam inkorg — vi läser den båda."

**"We both" is already false** — there are three sellers. Two strings are needed
where there is now one:

**Superseded 2026-08-27 — the user removed the caption entirely.** Asked
directly, they said "delete that string", so `T2.inbox` and its `.inbox` rule
are gone in all three languages rather than trimmed. That is the more durable
call: *any* fixed claim about where a message lands goes stale again the moment
one seller has their own form.

If a seller-routed caption is ever wanted, it needs new copy from the user in
all three languages — do not reinstate the old string.

### Prerequisite, outside dev's control

spongefile must duplicate the form per seller in Tally, set that copy's
notification recipient to the seller's address, and paste the URL into the
seller's admin record. Until they do, every seller falls back to the shared
form — which is exactly today's behaviour, so this shipped before any per-seller
form existed. No field authoring is required: the names carry across a
duplicate.

## Wishlist tiles: wide modules overflow (2026-08-27)

Measured live on Toiveet at 1123px — grid resolves to six 166px columns:

| want | drawn | tile | over |
|---|---|---|---|
| Frap Tools Fumana (42HP) | 249px | 166px | **+83** |
| E-RM Polygogo | 190px | 166px | +24 |
| Hexinverter Mindphaser | 178px | 166px | +12 |

**Cause.** `wishTileHTML` sizes the faceplate from HP and a fixed tile height
and never consults the tile: `ww = hp * 5.08 * (WISH_TILE_H/128.5)`, i.e.
`hp * 5.93`. The tile's usable width is ~147px after padding, so **anything
above ~25HP overflows** at this column size. Not an edge case — Fumana is 42HP
and any wide want will do it.

All three offenders are **photos**, rendered with inline
`width:{ww}px; height:150px; object-fit:cover`.

### Fix — photos

Make the inline style responsive instead of fixed:

```
width:{ww}px; max-width:100%; aspect-ratio:{ww}/{WISH_TILE_H}; height:auto;
object-fit:cover
```

- Tile wider than the natural width → renders exactly as today, 150px tall.
- Tile narrower → shrinks to the tile and the height follows the ratio, so the
  crop stays true.

No JS measurement, correct at every column width, and it keeps `object-fit`.

### Fix — drawn panels

`panelHTML` builds absolutely-positioned px children, so CSS scaling would clip
rather than shrink. None overflow *today*, but a wide "real product" want would
hit it the moment a seller adds one. Clamp at render: if `ww` exceeds what the
narrowest column can hold (`minmax(140px,…)` minus ~19px padding ≈ 121px),
reduce the drawn height by the same ratio so the proportions hold.

Two mechanisms because the two things scale differently — a photo scales as a
unit, a drawn panel has to be re-drawn smaller. That is a real difference, not
an inconsistency.

Belt and braces: `.wishtile .wf{max-width:100%; min-width:0}` so nothing can
spill even if a future path sets a width some other way.

### Fixed 2026-08-27 (`a507ed0`) — and one accepted trade-off

Verified live at 380 / 520 / 760 / 1000 / 1280px: zero overflow at every width,
against three real overflows on the same measurement before. Fumana holds its
natural 1.66 ratio rather than cropping.

Dev found two further routes to the same bug, neither visible on screen:

- **`hp:0` wants.** `buildPanel` falls back to `W = H * 1.55` = 232px, so a
  drawn want with no HP overflows exactly like Fumana. No live example yet — the
  clamp covers it anyway.
- **`wishImgFail`.** The dead-photo fallback rebuilt a full-size panel, so a wide
  module whose photo 404s would overflow by that second route *after* the photo
  fix. CSS cannot reach it — by then the `img` is gone. Now shares the clamp.

**Accepted trade-off, do not "improve" it.** The drawn-panel clamp targets the
narrowest column the grid can produce (~121px), because at render time it has no
measurement to work from. So in a wider tile a drawn panel is smaller than it
strictly needs to be — safe everywhere, conservative at most widths. Photos do
not have this problem: CSS resolves them against the actual tile.

If the under-fill ever looks wrong, the fix is **measurement** (ResizeObserver or
a container query), **not raising the constant** — that would reintroduce the
overflow at narrow widths, which is the bug we started from.

## Filter bar: desktop closes on click, not on scroll (2026-08-27)

Reference: `filter-collapse-manual.html` — scroll it, and narrow below 900px
for the mobile behaviour.

**Reverses an earlier decision, deliberately.** Auto-collapse-on-scroll was the
user's own call and was applied at every width. A tester pushed back on
desktop: *"I would prefer for the dropdown menu would stay visible until I
decide to 'wrap' it. Now it is hidden the moment I scroll down and up again."*
The user confirmed: **desktop stays open until clicked closed, and can be
clicked open again.**

Mobile is unchanged — a 225px bar on a short viewport earns its removal, where
on desktop it only costs you your filters.

### Behaviour

- **≥900px:** the scroll handler returns early. Scrolling never collapses. The
  bar is a **persistent 44px header** in both states; clicking it toggles.
- **<900px:** exactly as today — auto-collapse on scroll down, click to expand.
  The header is only present when collapsed.
- Crossing the breakpoint while collapsed **re-expands**, or a desktop user
  lands with the bar shut and no scroll trigger left to reopen it.

### Why a persistent header rather than a floating close control

Put the close affordance anywhere else and it sits in one place when open and
another when closed — the control jumps out from under the cursor mid-use. As a
fixed header the chevron never moves, it only rotates. Costs 44px permanently on
desktop; the fallback if that reads as too much is a chevron at the bar's right
edge, which is cheaper and does move.

When open, the header shows chevron + count only — the chips below already say
what is filtered, so the summary would just repeat them. Collapsed, the summary
returns.

### The trap — `inert` blocks real clicks but not scripted ones

The collbar carries `inert` when it is not the active element, so hidden content
stays out of the tab order. That logic assumed the header **only existed while
collapsed**. Once it is permanent on desktop, `inert` while expanded makes it
unclickable — the one control that closes the bar takes no clicks.

    collbar.toggleAttribute("inert", !collapsed() && !DESKTOP.matches);

**`inert` removes an element from hit-testing, but `element.click()` still
fires on it.** So every scripted test passed while the prototype was unusable,
and the user found it immediately. **Verify this one with a real click at real
coordinates**, not `.click()` — and note screenshot coordinates are not page
coordinates (1290 vs 1078 here), so a page-derived point misses.

### Harness traps found verifying this (2026-08-27)

Three ways a check on this feature passes or fails for reasons that have
nothing to do with the code. All three cost real time.

1. **`inert` blocks real clicks but not `element.click()`.** The scripted test
   reported the bar closing and reopening while it was completely unclickable.
   Use **`elementsFromPoint`** at the control's own centre to prove it is the
   topmost element — it returns the parent section when `inert` is set, and the
   button when it is not. Cheap, and it answers "can a user reach this?", which
   is a different question from "does the handler run?".
2. **Screenshot coordinates are not page coordinates.** 1290 vs 1078 in one
   window here. A click at a point taken from `getBoundingClientRect` misses.
   Screenshot first, click what is in the picture.
3. **Programmatic `scrollTo` does not trigger the collapse on any build** —
   before or after this change. Dev nearly reported a regression, then ran the
   pre-change build in a second iframe as a control and got identical
   behaviour. Only a real mouse scroll collapses it. **Keep a known-good build
   alongside** when a scroll-driven result looks wrong.

**Breakpoint crossing cannot be tested in an iframe at all.** Resizing an
iframe element updates `innerWidth` and `mq.matches` but fires **neither** a
`matchMedia` change **nor** a window `resize` event — measured, both counters
stayed at zero with listeners attached. So the iframe trick that works for
width-dependent *layout* (the 390px nav measurement) is useless for
width-dependent *behaviour*. A fresh iframe loaded **at** a width does exercise
the right code path; only crossing is untestable that way.

Accepted consequence: an embedded copy can miss the crossing and stay
collapsed. Tolerable only because the header is persistent and never `inert` on
desktop, so the user can just click it. The re-expand is a convenience, not the
thing preventing a stuck UI.

## Toiveet moves above the filter bar (approved 2026-08-27)

Move `<section class="wishband" id="wish">` so it sits **above**
`<section class="controls" id="grid-top">` — currently at index.html:841 and
:808. New order: hero → Toiveet → filter bar → count line → grid.

**A straight swap. The grid starts at 988px either way**, so nothing gets
longer; only the relationships change.

### Why

- **The band ignores the filters.** Measured: filtering to Sampo changes the
  count line to "20 / 86" and leaves the band byte-identical, still showing all
  three sellers. It currently sits *inside* the filtered region while being
  immune to it — filter to one person and the other two people's wishes remain
  directly under the bar you just used.
- **It splits the filter bar from its own output.** The count line belongs to
  the filter bar and is pushed 224px below it by an unrelated section. After
  the move, filter → count → grid is contiguous.
- **The sticky bar eats it.** Sitting immediately under a sticky element makes
  it the first thing to slide underneath and vanish on scroll — the worst
  position on the page for something meant to be noticed.

Accepted cost: the filter bar drops from 485px to 709px, so on a laptop it
lands near the fold rather than above it. The bar is sticky and now stays open
on desktop, so one scroll pins it. The user accepted this on the trade that the
page opens with *who we are and what we want* before the controls.

### Watch the seam — this is the same bug class as the pale line

`.controls` carries `border-top:1px solid var(--line)` and `.wishband` has
`padding:1.75rem 0 .5rem` with no border. Putting them adjacent puts that
border directly under the wish cards, where previously it separated hero from
filter bar. Check it reads as one intentional divider, not a stray rule under
the cards, and that the `.5rem` bottom padding is still right when what follows
is a bordered sticky bar rather than a count line.

Also confirm the hero → Toiveet junction: `.hero` ends with `2.5rem` padding
and `.wishband` opens with `1.75rem`, so 4.25rem of combined space where there
used to be a border doing the separating.

Verify at desktop and at 390px, and confirm the sticky bar still pins correctly
now that more content precedes it.

### Mobile: Toiveet collapses to names (2026-08-27)

The move above the filter bar costs far more on a phone than on a desktop —
measured at 390px, the band is **546px tall** (three full-width cards stacked),
pushing the filter bar from ~797px to **1343px**, over a full screen further
down. Desktop is only +224px.

User's fix: **on mobile the cards shrink to just names.**

Below the mobile breakpoint each seller becomes **one compact row** — the
coloured left edge, the owner dot, the name, and the item count — with the row
itself linking to `#/wish`. Drop the wanted-module chips and the "Katso koko
lista →" line: the chips are the detail that costs the height, and the row is
already the link.

Roughly 160px instead of 546px, so the filter bar lands near ~960px rather than
1343px. Desktop keeps the full cards — the space is affordable there and the
chips are genuinely useful at that size.

Keep the coloured left edge at its `3px`: it is the seller's identity and the
same signal the filter bar's bottom edge uses.

## Open Graph: one card for the whole site (decided 2026-08-27)

**Not per-item.** The user chose the site-wide card, which avoids the routing
change entirely.

Worth recording *why* per-item was expensive, since it will come up again: the
site is a hash-routed SPA, so everything after `#` is never sent to the server,
and Facebook does not execute JS. `eurorack.fi/#/m/kastledrum` reaches their
scraper as plain `eurorack.fi`. Real per-item previews would need real paths and
a generated HTML file per item — a routing change, not a meta-tag change.

Also: **item photos cannot be used as OG images.** Measured across the library,
aspect ratios run **0.16 to 2.37** against OG's 1.91:1 — most are tall
faceplates, and a 312×1998 module cropped to 1.91:1 is a horizontal sliver.

### The card

`share/og-card.png`, 1200×630, generated from `share/og-card.html` (headless
Chrome, `--window-size=1200,630`). Regenerate from the HTML rather than editing
the PNG. It reuses the site's **own approved Finnish** — the `HELSINKI ·
NAAPUREITA` eyebrow and the `Tavaraa naapurista.` hero line — so no new copy
needed sign-off.

### Tags to add to `index.html`

Absolute URLs only — scrapers do not resolve relative paths.

```html
<meta property="og:type"        content="website">
<meta property="og:url"         content="https://eurorack.fi/">
<meta property="og:title"       content="eurorack.fi">
<meta property="og:description" content="…">
<meta property="og:image"       content="https://eurorack.fi/share/og-card.png">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale"      content="fi_FI">
<meta name="twitter:card"       content="summary_large_image">
<meta name="description"        content="…">
```

**`og:description` — supplied by the user 2026-08-27, their own Finnish:**

> Eurorackia, erillislaitteita, joskus muuta. Tiedät keneltä ostat.

Use verbatim, for both `og:description` and `<meta name="description">` so the
share card and search results agree. Do not translate it for the sv/en cases:
one card serves every share, `og:locale` is `fi_FI`, and the audience is the
Finnish scene.

`og:url` is the canonical `https://eurorack.fi/` **with the trailing slash** —
www and the github.io host both still resolve, and a scraper landing on a
redirect can attribute the card to the wrong origin.

## Toiveet becomes one flowing row (approved 2026-08-27)

Reference: `toiveet-flow-final.html`. Replaces the wishcard grid entirely — no
cards, no borders, no coloured left edges.

**The brief, in the user's words:** show *the fact that wishlists exist*, *what
kind of things are on them*, and *that people are important here*. Not
completeness — a taste.

### The shape

One flowing inline row. Per seller: coloured circle, name in bold, then their
wants as plain mono text, then the next circle. It wraps naturally, so an extra
seller costs a fraction of a line rather than a whole card.

- **No rectangles around the wants.** This sits directly above a bar full of
  filter chips; a bordered pill here reads as another control instead of as
  something someone wants. The user called this out and it is the point of the
  change.
- **Wants truncate at 4, then `+N`.** A sample, not a list.
- **Separator is `·` in `--line2`, `padding:0 .26rem`, with NO literal spaces
  in the join.** Measured 16px between names against a **34px** gap between
  people — roughly 2:1, which is what makes each person read as one phrase.
- **`Katso koko lista →` appears once**, beside the heading. Every card
  previously carried it and every one pointed at the same `#/wish`; at eight
  sellers that is eight identical calls to action competing with the names.
- **Dot and name must be one `white-space:nowrap` unit.** Without it a line can
  end on a bare coloured circle with its name starting the next line, which
  reads as a stray mark. Verified fixed across 33 units.

### Name colour — `--ink2`, no computation

Names are bold in **`--ink2`**, the site's existing softer ink. Not `--ink`:
the user asked for something gentler than full black.

It clears 4.5 in **both** themes without any per-seller work — 8.32 on the
light background, 11.29 on the dark. That matters more than it sounds: sellers
choose their own colour through admin, and an earlier version of this spec tied
the name to a contrast-adjusted version of that colour, which would have needed
computing against the resolved background and recomputing on theme change. A
fixed token removes the whole class of failure.

**The wants use `--ink2` as well.** They do not need a colour difference — bold
16px Archivo against regular 12px mono is already two distinct voices. `--muted`
was the obvious alternative and **fails** in the light theme at 3.80.

The circle keeps the **raw** seller colour at every theme. 9px of saturated
colour is identity, not text — the same division the filter bar's owner edge
uses, where colour marks whose view you are in and never carries a word.

### Spacing and the removed note (2026-08-27)

Three changes from the user, measured live before and after.

**1. Delete `.wishnote`** — "Partial trade + cash also works". Gone entirely,
not hidden.

**2. The people row belongs to its heading, not to the filters.** It sat 15px
below the heading and 25px above the filter bar — nearly equidistant, so it
read as floating between two things. Now **9px above, 30px below**, a ratio of
3.3:1. Same principle as the horizontal spacing inside the row, where 34px
between people against 16px between module names is what makes the grouping
legible.

**3. The block moves up to sit with the hero.** It was 68px below the hero's
content (40px hero padding-bottom + 28px band padding-top), which read as a
separate section. Now **28px total**.

```
.hero      padding-bottom  40px -> 24px
.wishband  padding-top     28px -> 4px
.wishband  padding-bottom   8px -> 30px
.wishhead  margin-bottom   14.4px -> 9px
```

Measured result at desktop: hero → heading 4px, heading → people 9px, people →
filter bar 30px, and the filter bar rises from 605px to **565px**.

**Check this at 390px before calling it done.** These are absolute pixel
values on elements that also govern the mobile layout, and the hero is far
taller there — 4px of band padding-top may read as cramped against a stacked
hero even though it is right on desktop. If it does, the mobile breakpoint
should carry its own padding rather than these numbers being softened for both.

## Toiveet: per-seller deep link (2026-08-28)

**The trade panel lands people in the wrong place.** `index.html:1746` renders
the module page's "X is hunting for" panel with a flat `href="#/wish"`, and no
per-seller wish route exists. So tapping *"Sampo is hunting for"* opens the top
of the Toiveet page — Kalle's section — and leaves the reader to find Sampo
among everyone else. The user's words: *"you end up seeing everyone else's
wishes mixed in."*

**Add `#/wish/<sellerKey>`**, parsed the same way `#/faq/<id>` already is: it
renders the page and scrolls that seller's section into view. Bare `#/wish`
stays as it is.

Scroll-to rather than filter-to, for consistency with the FAQ precedent and
because the other sellers staying visible is the point of the page — you arrive
at Sampo and can still see who else wants things. What made it read as "mixed
in" is that the sections are weakly marked, which the layout change fixes
directly; hiding the others would be treating the symptom.

Note the same hash-routing constraint as the FAQ: `#/wish#sampo` is impossible,
a URL has one fragment, so the seller has to be a route segment.

Link it from:
- the module page trade panel → the item owner's section (`index.html:1746`)
- anywhere else naming one seller. The home band's "Katso koko lista" is
  section-level and correctly stays on bare `#/wish`.

`scroll-margin-top` on the section heading, as the FAQ questions have, so a
deep-linked section does not land under the sticky header.

## Toiveet page on mobile — option D (approved 2026-08-28)

Rendered spec: `wishpage-mobile-mockup.html`, option D. Pairs with the
per-seller deep link above; neither is sufficient alone — the link puts you in
the right place, the layout stops you drifting out of it.

**Measured problem at 390px:** tiles go one per row at 362×198, spongefile's
section runs **2400px — 2.7 screens**, and the owner's name appears once at
16px **regular** weight. One swipe in, nothing on screen says whose list it is.
On the page where names matter most, the name was less emphasised than on the
home band.

### Three changes

1. **Two columns on mobile.** Halves the scroll — spongefile drops from ~2.7
   screens to ~1.4. Tiles and their art shrink to suit. Acceptable here in a
   way it would not be on the grid: these are *wants*, a taste of what someone
   is after, not merchandise being sold.
2. **The owner's name pins.** `position:sticky; top:0` on the section's `.nm`,
   **bold**, keeping its dot. It holds for exactly as long as that person's
   tiles are on screen, then the next name pushes it out. Needs an opaque
   `--bg` background or tiles show through it.
3. **The section carries the owner's colour** — `border-left:3px solid` in
   their dot colour, with matching `padding-left`. The pinned name answers the
   question when you look up; the coloured edge answers it without looking up.
   Same 3px the wish cards used and the filter bar's owner edge uses, so the
   colour already means "this belongs to this person" everywhere else.

### Checked so you do not have to

`.controls` **is in the DOM on `#/wish` but renders at height 0**, and nothing
else on that page is sticky. So the pinned name can sit at `top:0` with no
offset and no collision. If a sticky element is ever added to this page, that
`top` becomes load-bearing.

`scroll-margin-top` still needed on the section for the deep link, so an
arriving reader does not land with the heading flush against the viewport edge.

### Watch

The pinned name must not be `inert` or otherwise unreachable — it is not
interactive here, but the same class of mistake as the collbar. And check two
columns at 320px, not just 390: the narrowest common phone is where a
two-column tile gets too tight for a manufacturer name to wrap sanely.

## Seller controls and the hidden state (approved 2026-08-29)

Rendered spec: `seller-controls-mockup.html`. Two new surfaces. Mechanism is
dev's; the states and the look are here.

### 1. What "hidden" does to counts — state it, do not infer it

A hidden item **drops out of everything a buyer sees**: the grid, the rack
figure, the HP total, the hero stats, every category count, and the seller's
own item count.

**This is deliberately the OPPOSITE of the accessories rule**, where shop items
count everywhere. The two are not inconsistent: those counts answer *what can I
buy*, and an accessory can be bought while a hidden item cannot. Do not
generalise either rule from the other — that is exactly why this paragraph
exists.

The record survives, so `#/m/<id>` still resolves. That is the whole point.

### 2. The hidden-item page stays GENERIC

I proposed naming the module and showing its dimmed photo, since a record now
survives and the old constraint had gone. **The user declined.** The page says
what happened and nothing more — no name, no photo.

Copy is theirs, English as given: **"Owner has removed this module from sale."**
Finnish and Swedish still to be written by them; do not machine-translate.

Marker and dressing stay `--sold` / `--sold-soft`, reserved for exactly this
and used nowhere else on the site.

### 3. The seller's control page

The only part of this site whose audience is a **seller**, not a buyer. Usually
reached on a phone, one-handed, the minute something sells. The visual language
was built to sell things to strangers; this is a control panel and should be
plainer.

- **One three-state choice per item, not two toggles.** For sale / In
  negotiation / Hide cannot overlap and run in that order, so it is a single
  decision rather than two that interact. It also removes the question "what
  does in-negotiation mean once it is sold".
- **The third control is labelled "Hide", the user's word**, with their gloss —
  *"this is a way to mark the item as sold"* — shown **once at the top of the
  page, not on every row**. "Hide" is an action where the other two are states,
  so the sentence does the work the label cannot; twenty copies of it would be
  noise. fi/sv for both still to be written by the user.
- **Every target is a full-width third of the row, minimum 44px.**
- **A sold row recedes but never moves.** No reordering, no vanishing. The undo
  must be exactly where the seller last saw the item — and something jumping
  away under the thumb is alarming when it was tapped by mistake.
- **Hidden items are listed**, recessed, with their control fully legible. If
  they were filtered out the undo would be unreachable by the one person who
  needs it.
- **No prices, no editing, no adding.** The state is the whole job.
- Header names the seller with their dot, and says plainly that only they can
  see the page.

Needs `<meta name="robots" content="noindex">` — the URL is secret and should
not end up in an index. Dev's call how, but it is a design requirement that
this page never appears in search.

### 4. In negotiation, now seller-set

Unchanged in meaning and copy, but it stops being a hand-tagged id map. **The
required still-available clause matters more, not less** — sellers set this
themselves now, so more items will carry it, and without the clause the state
reads as a soft sold and nobody messages:
`fi "Neuvottelussa — voit silti kysyä"` / `sv "Under förhandling — du kan ändå fråga"` /
`en "In negotiation — you can still ask"`.

Still never amber (amber means caution sitewide) and never red (which would say
*gone* about something still for sale).

### 5. Settled alongside it (2026-08-29)

- **Hidden means hidden on eurorack.fi only.** Shop accessories *can* be
  hidden; the item stays live on the webshop, which the user treats as a
  separate interface. So a hidden accessory still exists to buy — just not
  here. This does not soften the counts rule: hidden is hidden everywhere on
  this site.
- The token is **permanent until regenerated**, and toggling sends the user **no
  notification**. Nothing to design for either.
- A hidden listing **keeps all its research** — specs, photo, pull quotes,
  video, trilingual copy. The user notes it could serve as a template if
  someone later sells the same module. Not built and not specced, but it argues
  against hidden items vanishing completely from the admin, and is worth
  remembering before anyone "tidies" hidden records away.

### 6. Seller-page copy — DRAFTED BY ME, UNREVIEWED

The user said go ahead rather than wait, so these are drafts to build against.
**They are mine, not approved.** spongefile reads both languages and will
correct; treat any of their edits as final without asking (see the
admin-edits-are-decisions rule).

**Reused, already approved — do not redraft:**

| | fi | sv |
|---|---|---|
| In negotiation (segment) | `Neuvottelussa` | `Förhandlas` |
| items (count) | `kohdetta` | `objekt` |

Note the Swedish segment reuses `negRibbon` (`Förhandlas`), not `negotiating`
(`Under förhandling`) — the segment is a third of a 390px row and the longer
form does not fit.

**New, mine, unreviewed:**

| | en (user's, fixed) | fi | sv |
|---|---|---|---|
| For sale (segment) | For sale | `Myynnissä` | `Till salu` |
| Hide (segment) | Hide | `Piilota` | `Dölj` |
| Gloss | this is a way to mark the item as sold | `Piilottamalla merkitset kohteen myydyksi. Saat sen takaisin milloin vaan.` | `Genom att dölja markerar du varan som såld. Du kan ångra det när som helst.` |
| Private-page note | only you can see this page | `Vain sinä näet tämän sivun.` | `Bara du ser den här sidan.` |
| Hidden count | hidden | `piilotettu` *(user-corrected)* | `dolda` |
| Gone page | Owner has removed this module from sale. | `Omistaja on poistanut tämän moduulin myynnistä.` | `Ägaren har tagit bort den här modulen från försäljning.` |

**The gloss's first sentence is the USER'S OWN, given 2026-08-29:**
`Piilottamalla merkitset kohteen myydyksi` — "by hiding, you mark the item as
sold". It replaces my `Näin merkitset…`. Theirs is better: it names the action
and its consequence in one move, where mine pointed vaguely at "this".

`piilottamalla` is spelled correctly — third infinitive adessive of
`piilottaa`, which keeps the strong grade (as `ottaa → ottamalla`). The
single-`t` forms are the weak-grade ones, `piilotan` / `piilotettu`.

Swedish reworked to match the construction rather than my old one:
`Genom att dölja markerar du varan som såld.`

**The second sentence — APPROVED by the user 2026-08-29.** It was mine and is
not in their English. They kept it, and wrote it back as `milloin vaan`, the
colloquial form, rather than my `milloin vain`. I have adopted their spelling:
it is their language and it sits closer to the site's own voice, which is
already conversational (`Vaihtokaupatkin käyvät!`, `Tavaraa naapurista.`).
If `vaan` was a slip rather than a preference, revert it — but do not
"correct" it on grammatical grounds.

It earns its place: the person tapping this is about to pull their own listing
off a public site, and reversibility is what they want to know at that moment.

**`piilotettu` is the user's correction, 2026-08-29.** I had written
`piilotettua`, reasoning partitive after a number. They read Finnish and I do
not — `2 piilotettu` is right in this telegraphic count line. Do not "fix" it
back.

### 7. Seller-page error and marker copy — MINE, UNREVIEWED (2026-08-29)

Four strings the earlier table missed. Same rules: written as Finnish and
Swedish rather than translated, and **none of these are approved.**

#### The two error messages

These are the only strings a seller sees when something has gone wrong — on a
phone, probably seconds after selling something, wanting it off the site. The
job is not to report an error. It is to answer the two questions they will
actually have: **did my change stick, and is the public site now wrong?**

That second question is the one a generic "an error occurred" leaves hanging,
and it is the frightening one — a seller who thinks they may have broken a
public page will not just try again, they will message the user.

So both strings state the state of the world before saying what to do.

| | en | fi | sv |
|---|---|---|---|
| Save failed | Didn't save. The item still shows as before. Try again. | `Ei tallentunut. Kohde näkyy sivustolla ennallaan. Yritä uudelleen.` | `Sparades inte. Varan visas som förut. Försök igen.` |
| Load failed | Couldn't load your items. Nothing on the site has changed. Reload. | `Kohteita ei saatu haettua. Sivustolla ei muuttunut mitään. Lataa sivu uudelleen.` | `Kunde inte hämta dina varor. Inget har ändrats på sajten. Ladda om sidan.` |

Neither uses the word *virhe* / *error*. The seller does not need the category,
they need the consequence.

#### The sold marker

The tag on the hidden-item page. Buyer-facing, so it says **sold** — the
hide/sold distinction is the seller's vocabulary and means nothing here.

| en | fi | sv |
|---|---|---|
| Sold | `Myyty` | `Såld` |

#### The admin field for the token link

On the Sellers collection, holding `/token/<key>`.

- **Label:** `Seller link`
- **Hint:** `Private link that lets this seller mark their own items sold.
  Anyone who has it can change that seller's listings — send it to them
  directly, do not post it anywhere.`

Admin copy stays English, as the rest of the admin does. The hint is not
decoration: the token is permanent until regenerated, so the cost of it leaking
is ongoing, and the person pasting it needs to know that at the moment they
paste it.

### 8. "When does it go live" — MINE, UNREVIEWED (2026-08-29)

Shown on the seller page after a toggle saves.

| en | fi | sv |
|---|---|---|
| Saved. The change shows on the site within a minute. If the site is open somewhere else, reload it. | `Tallennettu. Muutos näkyy sivustolla minuutin sisällä. Jos sivusto on auki jossain muualla, lataa se uudelleen.` | `Sparat. Ändringen syns på sajten inom en minut. Om sajten är öppen någon annanstans, ladda om den.` |

**The measured facts this is written against** (dev, 2026-08-29):

- Their own page updates **instantly** — local state re-renders before the
  request goes out, rolling back only on a real failure.
- A **fresh load** of the site shows the change in **under a second** measured,
  but Cloudflare KV is documented as eventually consistent up to ~60s across
  regions. Sub-second is the realistic case here; **"within a minute" is the
  one that is always true**, so that is what we promise.
- **A stale tab NEVER updates.** Not slowly — never. The site reads state once
  at load and does not poll.

**That last fact rewrote this string.** My first draft said *"the site updates
in a moment"*, which is actively harmful: a seller reads it, switches to a
eurorack.fi tab they already had open, and waits for something that will never
happen. The sentence would have manufactured the exact failure the string
exists to prevent.

**Three sentences, one job each:**

1. **`Tallennettu.`** — what they want to know, first, one word.
2. **A bounded promise that is always true.** "Within a minute" beats a vague
   "shortly" *and* beats an accurate "under a second": it sets a ceiling, so
   any real wait feels early rather than late.
3. **The reload instruction** — the only ask, and the one that matters, since
   an open tab is otherwise permanently wrong.

**Deliberately not mentioned:** that their own page is instant (they can see
that — it is the row they just tapped), and the 5-minute git reconcile, which
dev confirmed is bookkeeping invisible to visitors. Both would add words
without adding certainty, against a brief that said do not overwhelm.

**No jargon.** "If the site is open somewhere else" covers another tab, another
phone, or a laptop left open in the kitchen, and asks no technical vocabulary
of the reader.
