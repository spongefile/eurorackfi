# Seller control page — en and sv

All 34 keys. **Mine and unreviewed** except where marked. Finnish column is the
reference and is not mine to change.

`keep`, `ack` and `haggle` are **reused verbatim** from surfaces where the
wording is already settled — do not re-translate them here.

| key | en | sv |
|---|---|---|
| `keep` *(verbatim from the seller-link mail)* | Only you can see this page, as long as you don't give the link to anyone else. Keep it secret! | Bara du ser den här sidan, så länge du inte ger länken till någon annan. Håll den hemlig! |
| `ack` *(user's en, mine sv, both already agreed)* | I understand | Jag förstår |
| `haggle` *(the sticker's own words, user-approved)* | Make offer | Prutbart |
| `gloss` | Hiding an item marks it sold. You can bring it back any time. | Genom att dölja markerar du objektet som sålt. Du får tillbaka det när som helst. |
| `forsale` | For sale | Till salu |
| `neg` | In negotiation | Under förhandling |
| `hide` | Hide | Dölj |
| `save` | Save | Spara |
| `priceLabel` | Price in euros | Pris i euro |
| `badPrice` | Check the price. Nothing changed on the site. | Kontrollera priset. Ingenting ändrades på sajten. |
| `items` | items | objekt |
| `hiddenCount` | hidden | dolda |
| `failed` | Not saved. The item still shows on the site as it was. Try again. | Sparades inte. Objektet visas på sajten som förut. Försök igen. |
| `loadFailed` | Your items could not be loaded. Nothing changed on the site. Reload the page. | Objekten kunde inte hämtas. Ingenting ändrades på sajten. Ladda om sidan. |
| `saved` | Saved. The site updates in about a minute. Reload eurorack.fi to see the change. | Sparat. Sajten uppdateras om ungefär en minut. Ladda om eurorack.fi för att se ändringen. |
| `savedPrice` | Saved: {old} € → {new} €. The site updates in about a minute. Reload eurorack.fi to see the change. | Sparat: {old} € → {new} €. Sajten uppdateras om ungefär en minut. Ladda om eurorack.fi för att se ändringen. |
| `askH` | Request an addition | Be om ett tillägg |
| `askItem` | New item for sale | Nytt objekt till salu |
| `askWish` | Addition to the wishlist | Tillägg till önskelistan |
| `askPriceLab` | Price | Pris |
| `askSend` | Send request | Skicka förfrågan |
| `askHow` | Tell us what to add and what condition it is in. | Berätta vad som ska läggas till och i vilket skick det är. |
| `wishH` | Your wishlist | Din önskelista |
| `wishLead` | You can ask for new wishes to be added below. | Nya önskningar kan du be om att få tillagda nedan. |
| `wishShown` | Shown | Visas |
| `askNote` | We do not add items straight away: we fill in the details by hand and go through requests. | Vi lägger inte till objekt direkt: vi fyller i uppgifterna för hand och går igenom förfrågningarna. |
| `askPlaceholderItem` | E.g. Make Noise Maths, good condition, original box | T.ex. Make Noise Maths, bra skick, originalkartong |
| `askPlaceholderWish` | E.g. Intellijel Quad VCA | T.ex. Intellijel Quad VCA |
| `askSent` | Request sent. We will get back to you. | Förfrågan skickad. Vi återkommer. |
| `askEmpty` | Write what you want added. | Skriv vad du vill få tillagt. |
| `askFailed` | The request did not send. Try again. | Förfrågan skickades inte. Försök igen. |
| `askFull` | You already have several open requests. Wait until we have dealt with them. | Du har redan flera öppna förfrågningar. Vänta tills vi har hanterat dem. |
| `tipT` | Has this site been useful to you? | Har den här sajten varit till nytta för dig? |
| `tipA` | Tip the admins → | Ge dricks till adminerna → |

## Patterns carried, not accidents

**State of the world first, then what to do.** `failed`, `loadFailed`, `saved`
and `savedPrice` all say what is true of the public site before saying what to
do about it. A seller hits these seconds after selling something, on a phone,
and their real question is *is the site wrong because of me*.

**Two deliberate exceptions.** `badPrice` inverts it — it is a rejection of
input, so the correction leads. `askFailed` carries no reassurance at all,
because a request that did not send changed nothing and there is nothing to
reassure about.

**You for the seller, we for the admins.** `askNote` and `askSent` are plural
in every language: *we* fill in the details, *we* get back to you. Never "I".

**`gloss` keeps both sentences in en and sv.** The second one — you can bring it
back any time — is the reversibility the person needs at the moment they are
removing their own listing from a public site. It is the reason the first
sentence is not frightening.

## Where I am least sure

- **`hiddenCount`** — Finnish is deliberately "piilotettu" not "piilotettua",
  the user's own correction for this telegraphic count line. English "hidden"
  and Swedish "dolda" both read fine after a number, but Swedish agreement is
  the kind of thing a native eye should confirm.
- **`tipA` sv** — "Ge dricks till adminerna" is colloquial. Correct but
  informal; "administratörerna" is the safe formal alternative and is longer.
- **`askH` en** — "Request an addition" is stiffer than the Finnish. "Ask us to
  add something" is warmer and truer to the page, but longer as a heading.
