# Lending library — concept notes

**Status: IDEA. Not approved, not designed, not for build.**
Nothing here is DRAWN. This deliberately lives outside
`HANDOFF-design-to-dev.md` so it cannot be mistaken for a spec. If it ever
gets built, it moves there first.

Gear that is **not for sale**, lent to the local community.

---

## The one thing that decides whether this works

The handoff says, as binding: *"The site does not offer testing, auditioning,
or 'come and hear it' — that framing was explicitly removed twice. Do not
reintroduce it."*

A lending library is only a different thing if the lent items are genuinely
not for sale. The moment a borrower can think *"I could borrow this and then
buy it"*, try-before-you-buy is back — not because anyone said it, but
because the adjacency implies it.

So the separation has to be **structural**, not a sentence:

- A lending item never appears in the sale grid, ever.
- It has no price and no Buy/trade CTA.
- An item is in exactly one mode at a time. It may move between them —
  spongefile might decide to sell a library piece — but never both at once,
  and moving it is an edit, not a state the UI offers.

Handled that way it *strengthens* the premise rather than diluting it.
Selling is transactional. Lending is the only part of the site that
**demonstrates** the "named local collective" claim instead of asserting it.

## The tension worth deciding early: side page or the point?

Framed as a fourth nav item, lending is a footnote to a shop.

Framed as the thing the site is *for*, the shop becomes the side business —
"we're a neighbourhood gear library that also sells what it's finished with."
That is a materially different site with a different homepage, and it may be
closer to what the project actually is.

**This is a positioning decision, not a design one, and it should be made
before any layout work.** Everything below assumes the modest version (own
page, fourth nav item) because that is reversible; the ambitious version is
not.

## Structure — own page, like Toiveet

Direct precedent: Toiveet is already a dedicated page for a *different
relationship to the gear*. Home = what we're selling. Toiveet = what we want.
Lending = what you can borrow. Three relationships, three pages.

Nav becomes `Etusivu / Toiveet / Lainasto / Yhteys`.

**Unverified constraint:** the handoff warns *"if nav ever grows past three
items, the direct-row approach may need revisiting"* — the mobile header
renders all nav words inline and was confirmed to fit at 390px **at three
items**. Four needs measuring before it is assumed, in Finnish and English
(English is the longer set: "Everything / What we want / Lending library /
Contact").

## State model

The real status of a lending item is not price, it is **is it out right
now** — which is the same shape as in-negotiation. So it reuses the corner
ribbon already built and specced: `Lainassa` / on loan, over the photo.

Availability becomes the thing the card leads with where a price would be.

Following the `negBar` precedent — *"In negotiation — you can still ask"* —
an out-on-loan item should still invite contact rather than dead-ending.
Something in the register of *"on loan — ask about the next slot"*.

**Explicitly out of scope for a first version:** queues, reservations,
calendars, due dates as data. "Ask and we'll tell you" is the whole
mechanism. Anything else is a booking system, which is a different project.

## Card anatomy

Same card shell as everywhere else. What changes is the bottom half.

1. **Availability state** — available now vs on loan. Ribbon when out.
2. **Who lends it** — owner dot and name, exactly as sale cards. The premise
   depends on lending being from a *person*, not from "the library".
3. **Loan terms** — how long, deposit or not, collection only. These are the
   questions that otherwise stop someone asking, so they belong on the card
   rather than a page deeper.
4. **Condition / care note** — what state it is in and what to be careful
   with. Sets expectations and quietly protects the lender.

No price. No Buy or trade. CTA is *ask to borrow*.

## Open questions — need real answers, not design

- **Whose items?** Only spongefile's and Sampo's, or can the wider community
  lend *into* the library? The second is a co-op and a much bigger idea —
  different trust model, different admin, probably different site.
- **What happens when something breaks?** The site's whole trust story is
  being named and local. Lending tests that harder than selling does. The
  copy needs an honest position — something closer to *"break it and tell us,
  we'd rather know"* than to terms and conditions — but the real-world
  answer has to exist first.
- **Do lending items count in the hero stats?** Accessories were ruled to
  count everywhere. But the hero counts read as "things for sale", and
  lending items are explicitly not. Either exclude them or relabel the stat.
  Same class of decision as excluding the case from the HP total.
- **Deposit or not?** Changes the tone completely — a deposit makes it a
  rental, no deposit makes it a favour.

## Why it might be worth doing

A sale ends a relationship. A loan starts one — the borrower comes back,
twice. For a site whose entire premise is a neighbourhood that already knows
each other, that is the feature most aligned with what it claims to be.
