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

**There is no cash-only state, and no sold state.** Cash-only went when the
inventory was corrected. Sold went later: an item no longer for sale is **deleted
from the data outright**, so it vanishes from grid, rack, counts and seller totals.
There is no record to key on — the stale-link page is generic ("that one's gone"),
dressed in `--sold` / `--sold-soft`, and cannot name the module. Do not build either state.

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
  .shots{ display:flex; flex-direction:column; position:sticky; top:24px; }  /* sticky moved HERE */
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

Copy is a one-word form, `negRibbon`: **fi Neuvottelussa / sv Förhandlas /
en Negotiating**. The full phrase stays on `negBar` for the module page,
where the still-available clause ("— voit silti kysyä") is required.

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
