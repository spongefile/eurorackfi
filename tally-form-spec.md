# eurorack.fi contact form — Tally build spec

Tally has no generic file-import for forms (it only imports from Google Forms or
Typeform, or duplicates an existing public Tally link) — so this is a build script,
not an upload. Each row is one "Add block" in the Tally editor, in order.

## Visible blocks

| # | Block type | Label | Required | Notes |
|---|---|---|---|---|
| 1 | Short text | Name | Yes | |
| 2 | Email | Email | Yes | |
| 3 | Multiple choice | Reason | Yes | Options: **Buying**, **Trading**, **Other** — "Other" over "Either", more open-ended and covers a plain question |
| 4 | Short text | What you'd trade | No | Optional regardless of Reason — no conditional logic needed |

**Reason decides whether an item gets tagged "in negotiation" on the site.**
Buying or Trading → real interest, tag the item's id in `NEGOTIATING` in
`index.html` once you've read the message. Other → a general question, not
interest in that specific item — do not tag it. This is manual; nothing
currently connects a Tally submission to the site automatically.
| 5 | Long text | Message | Yes | |

## Hidden fields

Add these under Settings → Hidden fields. Tally auto-generates a field ID for
each (shown next to the field once created) — send me those exact IDs, I can't
guess them.

| Hidden field name | Populated by the site with |
|---|---|
| `module` | e.g. "Industrial Music Electronics — Piston Honda MK III" |
| `seller` | spongefile or Sampo |
| `price` | e.g. "€420" |
| `lang` | fi / sv / en |

The site opens Tally as `https://tally.so/r/XXXXXX?module=...&seller=...&price=...&lang=...`
— Tally fills the hidden fields from the URL automatically once the field IDs match.

## After creating it

Send me:
1. The form URL (`tally.so/r/XXXXXX`)
2. The four hidden-field IDs Tally generated

That's everything needed to wire the site's "Buy or trade" button to it.
