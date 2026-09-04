/* eurorack.fi Cloudflare Worker.
 *
 * Two jobs, sharing one GitHub OAuth app:
 *
 * 1. OAuth proxy for Decap CMS. Decap's admin UI is static, so it can't
 *    hold a client secret; this worker holds it and implements the
 *    two-endpoint handshake Decap expects.
 *      /auth, /callback
 *
 * 2. Per-seller controls. Sellers set their own items hidden, in
 *    negotiation or open to offers, AND EDIT THEIR PRICES, without a
 *    GitHub account or admin access. Their credential is a secret link;
 *    there is no login.
 *      /token/<sellerKey>  the user's page to copy or regenerate a link
 *                          (gated on being a repo COLLABORATOR)
 *      /requests           the admin queue of seller requests
 *                          (gated on being a repo COLLABORATOR)
 *      /s/<token>          the seller's own page
 *      /api/request        a seller asking the admins to add something
 *      /api/set            the write, ownership-checked server-side
 *      /state              public read of the live overrides
 *
 * THIS WORKER HOLDS NO GITHUB WRITE CREDENTIAL, deliberately. It only
 * ever writes to KV. A scheduled GitHub Action reconciles KV back into
 * content/items/*.json using the repo access Actions already has. So the
 * worst a compromise of this worker can do is set wrong toggle values or
 * prices on EXISTING items, all of which revert from git — rather than
 * rewriting the repository.
 *
 * TOKENS LIVE IN KV ONLY, NEVER IN THE REPO: spongefile/eurorackfi is
 * public, so a token committed to content/sellers/*.json would be
 * world-readable and anyone could hide anyone's listings. The admin field
 * holds only the /token/<key> URL, which is useless without the
 * collaborator check behind it.
 *
 * Secrets (never committed): GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 * Binding: SELLER_STATE (KV)
 */

const REPO = "spongefile/eurorackfi";
const RAW = `https://raw.githubusercontent.com/${REPO}/main/`;
const SITE = "https://eurorack.fi";

/* The hostname seller links are BUILT with, always — never url.origin,
   which would mint a link on whichever host the admin happened to be
   browsing. Pinning it means the address in a mail doesn't depend on
   where the sender was standing.

   A linkki.eurorack.fi subdomain was investigated and DROPPED — it needs
   the zone and the worker in one Cloudflare account, the zone is Sampo's,
   and closing that gap would have changed the workers.dev hostname and
   killed every link already sent. wrangler.toml has the detail. This
   constant still earns its place: preview URLs and any future hostname
   would otherwise mint links that are wrong or ephemeral. */
const PUBLIC_ORIGIN = "https://eurorackfi-cms-auth.aspiala.workers.dev";

/* OAuth is HOST-SENSITIVE: the GitHub OAuth app has exactly one
   registered callback URL, and GitHub rejects a login started from any
   other hostname. The admin routes therefore refuse to serve anywhere but
   here, rather than failing later at GitHub with an error the user could
   not act on. Currently the same value as PUBLIC_ORIGIN, so the guard
   never fires — it is kept because preview URLs (disabled in
   wrangler.toml, but a Cloudflare default) and any future domain would
   both bring a second hostname back, and it fails safe. */
const ADMIN_ORIGIN = "https://eurorackfi-cms-auth.aspiala.workers.dev";

/* one KV key holds the whole override map, so a page load is one read.
   Writes are read-modify-write: with three sellers toggling occasionally
   the lost-update window is not worth a locking scheme, and the next
   toggle corrects it. Revisit if the seller count grows a lot. */
const STATE_KEY = "state:v1";

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(), ...extra },
  });

/* the site fetches /state from eurorack.fi, so that origin needs to be
   allowed; the write endpoint is called from this worker's own pages. */
const cors = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

/* Session ids are opaque; they never leave the cookie. */
function newSessionId() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/* Seller links are WORDS, because a person has to send one to another
   person over WhatsApp, or read it down a phone.
   "ostrich-hair-cookie-lamp" survives that; 48 hex characters does not.
   FOUR words rather than three: this list of 375 gives 19.8 billion
   combinations at four (about 2^34), against 52 million at three — and
   52 million is genuinely reachable by guessing over HTTP. Four stays
   readable and stops being worth attacking.
   Rejection-sampled rather than a bare modulo, which would quietly bias
   the early words in the list.
   A leaked link is bounded but NO LONGER TRIVIAL: on that seller's own
   items it can hide, un-hide, flag negotiation or offers, and CHANGE
   PRICES. All of it is reversible and regenerating kills the link, but a
   silently altered price is the one change nobody may notice quickly, so
   this is a stronger reason to regenerate on any doubt than it was when
   the link only moved toggles. */
const WORDS = `
  amber anchor ankle apple apron arbor arrow aspen attic autumn awning bacon badge bagel
  balcony bamboo banjo barley basil basket batch beacon beetle bellow berry birch
  biscuit bishop bison blanket blossom bobbin bonnet boulder bracket bramble branch
  brass bread brick bridge bristle bronze brook broom bucket buckle buffalo bundle
  burrow butter button cabin cable cactus candle canoe canvas canyon cargo carpet carrot
  cedar cellar chalk chapel cheese cherry chimney chisel cider cinder circus cliff
  clover cobble cocoa coffee collar comet compass copper coral cotton cousin cradle
  crater cricket crimson crystal cushion cymbal daisy damson dapple dawn denim desert
  diamond ditch dolphin domino donkey drawer drift drizzle dune dusk eagle ember emerald
  engine falcon fennel fern ferry fiddle finch flannel flask flint flour flute forest
  fossil fountain fox fresco frost garden garlic gazebo ginger glacier glade glass gnome
  granite grape gravel grotto guitar hammer harbor harvest hazel heather hedge helmet
  heron hickory hollow honey hornet hostel hotel iceberg indigo ivory ivy jacket jasmine
  jigsaw juniper kettle keystone kitten lace ladder lagoon lantern larch lattice
  lavender ledge lemon lentil lettuce lichen lilac linen lobster locket lotus lumber
  lupine lyric magnet magpie mahogany mallet mango maple marble marsh meadow melon
  meteor mineral mint mirror mitten moss mulberry mushroom mustard nectar needle nickel
  noodle nutmeg oatmeal ocean olive onion opal orchard orchid osprey ostrich otter
  oyster paddle pantry papaya paprika parcel parsley pasture peach pebble pelican pepper
  petal pewter pigeon pillow pine pistol plum pocket pollen pomelo poppy porch potato
  prairie pretzel puddle pumpkin quarry quartz quilt rabbit radish rafter raisin ranch
  raven ribbon ridge rifle river robin rocket rosemary rubble ruby saddle saffron sage
  salmon sapphire sardine satchel scallop scarlet seagull sesame shadow shale shallot
  shamrock shingle shovel shrimp silo silver sixpence slate sleigh slipper smoke
  snapdragon sorrel spade sparrow spinach spiral spruce squash stable starling steeple
  stencil stirrup stone stork stream sugar sulfur summit sunset swallow sycamore syrup
  tabby tackle talon tangerine tapestry tavern teapot temple tender thicket thimble
  thistle thorn thread thunder timber tinder toffee tomato topaz torch tortoise trellis
  trickle trout truffle trumpet tulip tundra tunnel turnip turquoise turtle valley
  vanilla velvet vessel village vinegar violet wagon walnut walrus wander watercress
  waterfall weasel whistle willow window winter wisteria wombat wren yarrow yellow
  yonder zephyr zinnia
`.trim().split(/\s+/);

function newToken() {
  const n = WORDS.length;
  const limit = Math.floor(4294967296 / n) * n;
  const out = [];
  const buf = new Uint32Array(1);
  while (out.length < 4) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) out.push(WORDS[buf[0] % n]);
  }
  return out.join("-");
}

/* SELLER EMAIL ADDRESSES LIVE HERE, IN KV, FOR THE SAME REASON THE TOKENS
   DO. spongefile/eurorackfi is public and content/sellers/*.json is fetched
   by every visitor's browser, so an address written there would be
   world-readable, permanent in git history even if later removed, and
   harvestable. admin/config.yml already carries that rule on the `form`
   field; this is the same rule. Addresses are entered on /token/<key>,
   which is gated on being a repo collaborator, and never leave KV. */
const emailKey = (sellerKey) => "email:" + sellerKey;

/* Deliberately loose. This is a sanity check against a slip of the
   keyboard, not an attempt to decide what a valid address is — the real
   verdict comes from whether the mail is delivered, and over-strict
   patterns reject legitimate addresses. */
const looksLikeEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(s.trim());

/* Sending goes through Resend. The API key is a worker SECRET and is never
   committed:  wrangler secret put RESEND_API_KEY
   MAIL_FROM must be an address on a domain verified in that Resend
   account, or every send is rejected — set it with:
      wrangler secret put MAIL_FROM
   Returns a result rather than throwing: a failed send must leave the page
   usable and say what happened, since the link itself is still right there
   to copy by hand. */
async function sendSellerLink(env, { to, sellerKey, link }) {
  if (!env.RESEND_API_KEY) {
    return { ok: false, error: "No RESEND_API_KEY set on the worker — run: wrangler secret put RESEND_API_KEY" };
  }
  /* MAIL_FROM's display name is worth setting to something a seller
     recognises. It is NOT a person's name, deliberately: several people
     may send these, so a singular name would be wrong for whoever didn't,
     and it would need configuring to stay right. The plural signature
     below matches the site's own voice ("Muutama meistä…") and needs no
     configuration. The trust work is done by the opening sentence, which
     states a fact only a real sender knows — the signature never carried
     it. */
  const from = env.MAIL_FROM || "eurorack.fi <noreply@eurorack.fi>";

  /* THIS MAIL IS SHAPED AGAINST BEING MISTAKEN FOR PHISHING, which the
     first draft was: it opened "here is your link", presented a URL on an
     unrelated host, and told the reader to keep it secret. A stranger can
     do all three. Not clicking it was the correct response.

     So, in order:
     - The FIRST CLAUSE is a fact only a real sender knows — that this
       person's gear is listed on eurorack.fi — and one the reader can
       check without clicking anything. That is the whole difference.
     - The SUBJECT is about their gear, not about a link. A subject about
       a link is what phishing leads with.
     - The LEAK REMEDY is here and not only on the page. The page can rely
       on being reopened; this mail will still be in an inbox in a year and
       is where a worried reader will look. It also turns the secrecy line
       from a warning with no remedy into something that reads as care.

     TRILINGUAL, AND THE ORDER IS WHAT KEEPS IT SAFE. Stacking three
     complete letters — Finnish with the link inside it, then English, then
     Swedish — would break the first rule above for two audiences out of
     three: a Swedish reader would meet Finnish they cannot read and then a
     bare URL, having verified nothing. So ALL THREE INTROS COME FIRST, the
     link appears ONCE after them, and the three reassurance blocks follow.
     Whichever language a reader has, they meet a checkable fact before a
     URL. Do not regroup this by language.

     Finnish is design's and UNREVIEWED, except the secrecy sentence, which
     is the user's own approved wording — unchanged and unreflowed, shared
     verbatim with the seller page. Reword one, reword both. The English and
     Swedish are the secretary's and also unreviewed; their versions of the
     secrecy sentence deliberately keep its shape (condition first, then the
     ask) rather than flattening to "only you can see this page", which was
     the false claim the whole line was rewritten to remove.

     THE SUBJECT STAYS FINNISH pending the user's ruling. All three at once
     runs to about 78 characters and truncates on a phone, quite possibly
     mid-Finnish — which would cost exactly the property the subject was
     designed for, that it is about their gear rather than about a link.

     Paragraphs are single lines with no hard wrapping: mail clients
     reflow to the reader's width, and a hand-wrapped plain-text body
     breaks raggedly on a phone. The LINK STAYS A BARE URL ON ITS OWN
     LINE — clients linkify that reliably and mangle anything cleverer. */
  const subject = "Tavarasi eurorack.fi:ssä";
  const text =
    `Moi,\n\n` +
    `sinun tavaroitasi on myynnissä eurorack.fi:ssä. Alla oma linkkisi, jolla voit merkitä kohteesi myydyiksi tai neuvottelussa oleviksi.\n\n` +
    `Hi,\n\n` +
    `your gear is listed for sale on eurorack.fi. Below is your own link, for marking your items sold or in negotiation.\n\n` +
    `Hej,\n\n` +
    `dina prylar ligger till salu på eurorack.fi. Nedan är din egen länk, där du kan markera dina objekt som sålda eller under förhandling.\n\n` +
    `${link}\n\n` +
    `Vain sinä näet tämän sivun, jos et anna linkkiä muille. Pidä se salassa!\n` +
    `Jos linkki karkaa vääriin käsiin, kerro meille niin teemme uuden.\n\n` +
    `Only you can see this page, as long as you don't give the link to anyone else. Keep it secret!\n` +
    `If the link ends up in the wrong hands, tell us and we'll make a new one.\n\n` +
    `Bara du ser den här sidan, så länge du inte ger länken till någon annan. Håll den hemlig!\n` +
    `Om länken hamnar i fel händer, säg till så gör vi en ny.\n\n` +
    /* "adminit", not a bare "— eurorack.fi": the collective sign-off is the
       user's own decision, taken together with pluralising the recovery
       line to "kerro meille niin teemme uuden". The trilingual draft came
       back with it flattened, which would have undone half a choice while
       keeping the other half. It stays Finnish in an otherwise trilingual
       mail on purpose — it is a signature, not a sentence to translate. */
    `— eurorack.fi adminit\n`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return { ok: false, error: `Resend refused it (${r.status}). ${detail.slice(0, 300)}` };
    }
    await env.SELLER_STATE.put("emailsent:" + sellerKey, new Date().toISOString());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Could not reach Resend: ${e}` };
  }
}

/* Requests a seller sends the admins: "add this module at this price", or
   "add this to my wishlist". One KV key per request rather than an array
   under one key, so deleting one is a delete rather than a
   read-modify-write of everybody's queue — the admin triages these by
   throwing most of them away, so deletion is the common operation.
   Key sorts newest-last within a seller and is listed by prefix. */
const REQ_PREFIX = "req:";

/* Caps exist because the seller page's credential is a LINK. Anyone
   holding a leaked one could otherwise fill KV with junk, and the person
   who pays for that is the user, reading the queue. A cap per seller is
   the right shape rather than a global one: it bounds the damage to the
   seller whose link leaked and leaves everyone else's queue usable. */
const REQ_MAX_PER_SELLER = 20;
const REQ_MAX_TEXT = 500;

async function listRequests(env, sellerKey) {
  const prefix = REQ_PREFIX + (sellerKey ? sellerKey + ":" : "");
  const out = [];
  let cursor;
  /* Paginated deliberately: list() returns at most 1000 keys and sets
     list_complete=false when there are more. Reading only the first page
     would silently under-report a long queue, which for a triage screen
     means requests that quietly never get seen. */
  do {
    const page = await env.SELLER_STATE.list({ prefix, cursor });
    for (const k of page.keys) out.push(k.name);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}

/* THE WISHLIST CONTENT KEY. This exact function also exists in
   index.html, and the two MUST agree: a want hidden here but keyed
   differently there stays visible on the public site, which fails silently
   and looks like the toggle simply not working. Kept identical rather than
   shared because the two run in different documents with no build step
   between them; scripts/check-wantkey.mjs runs both over the live data and
   fails if they ever diverge.

   Keyed on CONTENT, not array position, and that is the whole point. The
   CMS invites the user to drag wishlist entries into priority order — an
   index-keyed flag would silently follow the position and hide a different
   entry after any reorder.

   Handles every shape a want takes: a bare string, Decap's typed
   {type:"placeholder",text}, and a product object, whether raw from the
   repo or normalised by the site. Verified across the live data: 21 wants,
   21 unique keys, no collisions.

   Two edges, both benign and both chosen. Renaming an entry changes its
   key, so a hidden one reappears — fails SHOWN rather than silently
   missing, and a renamed want is arguably a different want. A collision
   would need a seller to want two identical things, which is meaningless;
   both rows would then toggle together, which is tolerable rather than
   corrupt. */
function wantKey(w) {
  if (typeof w === "string") return w;
  if (!w || typeof w !== "object") return String(w);
  if (w.text != null && w.text !== "") return String(w.text);
  return String(w.mfr || "") + "|" + String(w.name || "");
}

const WANTSTATE_KEY = "wantstate:v1";

async function readWantState(env) {
  const raw = await env.SELLER_STATE.get(WANTSTATE_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function readState(env) {
  const raw = await env.SELLER_STATE.get(STATE_KEY);
  return raw ? JSON.parse(raw) : {};
}

/* Cookie session. The GitHub token itself never goes to the browser —
   the cookie is a random id and KV holds what we learned at login. */
function cookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  const m = h.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

async function session(request, env) {
  const sid = cookie(request, "erfi_sess");
  if (!sid) return null;
  const raw = await env.SELLER_STATE.get("sess:" + sid);
  return raw ? JSON.parse(raw) : null;
}

async function isCollaborator(login, token) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/collaborators/${login}`, {
    headers: { Authorization: `token ${token}`, "User-Agent": "eurorackfi-worker", Accept: "application/vnd.github+json" },
  });
  return r.status === 204;
}

const page = (title, body, { noindex = false } = {}) => `<!doctype html>
<html lang="fi"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ""}
<title>${esc(title)}</title>
<!-- The AMBER variant of the site's jack mark — every page this worker
     serves through page() is an editing surface (a seller's own page, the
     token pages, the /requests queue), and the user wanted those tabs
     tellable from the public site's at a glance. Same geometry as the
     public favicon; amber #E8A33C is the SOLE differentiator, picked
     mid-luminance (3.2:1 light / 4.9:1 dark) so one colour reads on both
     tab strips with no theme block — the public mark keeps its mono
     theme-flip to itself. Absolute URLs deliberately: these pages live on
     the worker's origin, so a relative /favicon/ would 404 there. -->
<link rel="icon" href="https://eurorack.fi/favicon/favicon-owner.svg" type="image/svg+xml">
<link rel="icon" href="https://eurorack.fi/favicon/favicon-owner-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="https://eurorack.fi/favicon/favicon-owner-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="https://eurorack.fi/favicon/favicon-owner-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@85..112,400..800&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
:root{--bg:#E7EBF0;--panel:#FAFBFD;--panel2:#EFF3F8;--ink:#0F1722;--ink2:#36435A;
 --muted:#6A7789;--line:#CAD3DF;--line2:#AFBACB;--accent:#0B4F9E;--accent-soft:#D6E3F5;
 --signal:#A9660A;--signal-soft:#F5E6C8;--sold:#8A3E4E;--sold-soft:#F0DAE0;--on:#FAFBFD;
 /* --haggle is the sticker red, the same in both themes because on the
    site it sits on a photograph rather than on a theme background.
    --haggle-ink is that same fact as TEXT, which needs per-theme values:
    #D22B2B fails 4.5:1 as text in both. Mirrors index.html's tokens. */
 --haggle:#D22B2B;--haggle-ink:#B73D1F;--haggle-soft:#FBE9E9}
@media(prefers-color-scheme:dark){:root{--bg:#0C1119;--panel:#161E2A;--panel2:#1D2634;
 --ink:#E6ECF4;--ink2:#BEC9D8;--muted:#8590A1;--line:#252F3C;--line2:#364253;
 --accent:#5AA9F0;--accent-soft:#0D2A47;--signal:#E0AC53;--signal-soft:#2C2314;
 --sold:#D98A93;--sold-soft:#331F24;--on:#08111A;
 --haggle-ink:#F76945;--haggle-soft:#33191A}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font-family:"Archivo","Helvetica Neue",Arial,sans-serif;line-height:1.5}
.wrap{width:min(720px,100% - 2rem);margin:0 auto;padding:2rem 0 4rem}
h1{font-size:1.6rem;letter-spacing:-.03em;margin:0 0 .35rem}
.sub{font-family:"IBM Plex Mono",monospace;font-size:.78rem;color:var(--muted);margin:0 0 1.6rem}
.mono{font-family:"IBM Plex Mono",monospace}
.card{background:var(--panel);border:1px solid var(--line);padding:1rem 1.1rem;margin-bottom:.6rem}
.link{font-family:"IBM Plex Mono",monospace;font-size:.8rem;word-break:break-all;
 background:var(--panel2);border:1px solid var(--line);padding:.7rem .8rem;display:block;margin:.6rem 0}
button{font:inherit;cursor:pointer}
.btn{font-family:"IBM Plex Mono",monospace;font-size:.78rem;background:var(--accent);
 color:var(--on);border:none;padding:.6rem 1rem}
.btn.ghost{background:none;color:var(--accent);border:1px solid var(--line2)}
.note{font-family:"IBM Plex Mono",monospace;font-size:.72rem;color:var(--muted);margin:.5rem 0 0}
${body.css || ""}
</style></head><body><div class="wrap">${body.html || body}</div></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (request.method === "OPTIONS") {
      /* The login exchange answers only the site's own origin, so its
         PREFLIGHT has to say so too. With the blanket wildcard below, a
         cross-origin POST passed preflight, reached the worker and SPENT
         the one-time code — the browser then refused to show the caller
         the answer, so nobody could use the token, but the real login was
         broken by then. Confirmed by watching a code disappear from KV
         after a fetch the browser had blocked. */
      if (p === "/api/login-exchange") {
        return new Response(null, { headers: {
          "Access-Control-Allow-Origin": SITE,
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }});
      }
      return new Response(null, { headers: cors() });
    }

    /* Admin and OAuth only exist on the workers.dev host — see
       ADMIN_ORIGIN. A GET that wandered onto the seller domain is sent
       there rather than served, so the user lands somewhere that works
       instead of hitting a GitHub error page. A POST is NOT redirected:
       303 would drop the form body and silently do nothing, so it is
       refused with an explanation instead. */
    if (url.hostname !== new URL(ADMIN_ORIGIN).hostname &&
        (p === "/auth" || p === "/callback" || p === "/requests" || p.startsWith("/token/"))) {
      if (request.method !== "GET") {
        return new Response("Admin actions live on " + ADMIN_ORIGIN + p + " — open that host and retry.", {
          status: 421, headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      return Response.redirect(ADMIN_ORIGIN + p + url.search, 302);
    }

    /* ---------- Decap OAuth (unchanged behaviour) ---------- */
    if (p === "/auth") {
      if (!env.GITHUB_CLIENT_ID) {
        return new Response("Worker is missing GITHUB_CLIENT_ID — set it with `wrangler secret put GITHUB_CLIENT_ID`.", { status: 500 });
      }
      const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
      authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authorizeUrl.searchParams.set("scope", "repo,user");
      /* ?next= means "this is the seller-admin login, come back to a page"
         rather than Decap's popup handshake. Decap never sends it, so its
         flow below is untouched. */
      const next = url.searchParams.get("next");
      if (next) authorizeUrl.searchParams.set("state", next);
      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (p === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing ?code from GitHub.", { status: 400 });
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return new Response("Worker is missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET.", { status: 500 });
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
      });
      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        return new Response(
          "GitHub OAuth error: " + (tokenData.error_description || tokenData.error || "no access_token in response"),
          { status: 400 }
        );
      }

      const next = url.searchParams.get("state");
      if (next && (next.startsWith("/token/") || next === "/requests")) {
        /* seller-admin login: verify collaborator once, keep only the
           answer, and hand the browser a random session id. The GitHub
           token stays here and is discarded. */
        const who = await fetch("https://api.github.com/user", {
          headers: { Authorization: `token ${tokenData.access_token}`, "User-Agent": "eurorackfi-worker" },
        }).then((r) => r.json());
        const ok = who && who.login && (await isCollaborator(who.login, tokenData.access_token));
        if (!ok) return new Response("Not a collaborator on " + REPO + ".", { status: 403 });
        const sid = newSessionId();
        await env.SELLER_STATE.put("sess:" + sid, JSON.stringify({ login: who.login }), { expirationTtl: 60 * 60 * 8 });
        return new Response(null, {
          status: 302,
          headers: {
            Location: next,
            "Set-Cookie": `erfi_sess=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 8}`,
          },
        });
      }

      /* Decap's handshake is a POPUP handshake: this page talks to the tab
         that opened it. ON MOBILE THERE OFTEN ISN'T ONE — the browser opens
         a tab rather than a popup, and GitHub's own pages send
         Cross-Origin-Opener-Policy, either of which leaves window.opener
         null. The old version called window.opener.postMessage
         unconditionally, so it threw immediately and the page sat there
         reading "Login complete — this window should close automatically",
         which was both untrue and unactionable. Reproduced exactly with a
         null opener before changing it.
         So: opener present, behave exactly as before. Opener absent, hand
         the browser a ONE-TIME CODE and send it back to /admin/ in the same
         tab, where a short script trades it for the token.
         THE TOKEN ITSELF NEVER GOES IN THE URL. A code in a fragment lands
         in browser history; a GitHub token with repo scope must not. The
         code is single-use, expires in two minutes, and is worthless once
         redeemed. */
      const loginCode = newSessionId();
      await env.SELLER_STATE.put("login:" + loginCode, tokenData.access_token, { expirationTtl: 120 });

      const message = "authorization:github:success:" + JSON.stringify({ token: tokenData.access_token, provider: "github" });
      const html = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;padding:2rem 1.25rem;font-family:system-ui,sans-serif;line-height:1.5}</style>
</head><body>
<p id="msg">Signing you in…</p>
<script>
(function () {
  var message = ${JSON.stringify(message)};
  var code = ${JSON.stringify(loginCode)};
  var adminUrl = ${JSON.stringify(SITE + "/admin/")};
  try {
    if (window.opener && window.opener !== window) {
      /* desktop popup: unchanged */
      window.addEventListener("message", function receiveMessage(e) {
        window.opener.postMessage(message, e.origin);
        window.removeEventListener("message", receiveMessage, false);
      }, false);
      window.opener.postMessage("authorizing:github", "*");
      document.getElementById("msg").textContent = "Login complete — this window should close automatically.";
      return;
    }
    location.replace(adminUrl + "#erfi_login=" + encodeURIComponent(code));
  } catch (err) {
    document.getElementById("msg").textContent =
      "Signed in, but this window could not hand the session back automatically. Open " + adminUrl + " again.";
  }
})();
</script>
<noscript>This page needs JavaScript to finish signing you in.</noscript>
</body></html>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    /* Trades a one-time login code for the GitHub token, once. Used only
       by /admin/ when the popup handshake was unavailable — see /callback.
       DELETED BEFORE IT IS RETURNED, so a replayed code gets nothing even
       if the same request is sent twice. Answers only to the site's own
       origin rather than the usual wildcard: everything else here is public
       data, and this is a credential. */
    if (p === "/api/login-exchange" && request.method === "POST") {
      const cors2 = {
        "Access-Control-Allow-Origin": SITE,
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };
      let body;
      try { body = await request.json(); } catch { body = null; }
      const code = body && typeof body.code === "string" ? body.code : "";
      if (!code) return new Response(JSON.stringify({ error: "no code" }), { status: 400,
        headers: { "Content-Type": "application/json", ...cors2 } });
      const key = "login:" + code;
      const token = await env.SELLER_STATE.get(key);
      await env.SELLER_STATE.delete(key);
      if (!token) return new Response(JSON.stringify({ error: "expired" }), { status: 404,
        headers: { "Content-Type": "application/json", ...cors2 } });
      return new Response(JSON.stringify({ token }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors2 } });
    }

    /* ---------- public: live override state ---------- */
    if (p === "/state") {
      const state = await readState(env);
      /* NO CACHE, deliberately. A 20s max-age here bought almost nothing —
         this response is tiny and the fetch runs in parallel with the item
         loads — while adding up to 20 seconds during which a seller who
         has just hidden something reloads the site and still sees it.
         That is precisely the moment they conclude it did not work and
         message the user, which is the admin load this feature exists to
         remove. Freshness is worth more than the request. */
      return json(state, 200, { "Cache-Control": "no-store" });
    }

    /* ---------- the user's page for one seller's link ---------- */
    /* The admin queue. Gated on the SAME collaborator check as the token
       pages — see the session lookup below, which is copied deliberately
       rather than shared, because it is the one thing here that must not
       be refactored into something clever. */
    if (p === "/requests") {
      const sess = await session(request, env);
      if (!sess) return Response.redirect(`${url.origin}/auth?next=${encodeURIComponent(p)}`, 302);

      if (request.method === "POST") {
        const form = await request.formData();
        const act = form.get("action");
        if (act === "delete") {
          const k = String(form.get("key") || "");
          /* Prefix-checked, so a crafted form can't delete sel:, tok: or
             the state key through this endpoint. */
          if (k.startsWith(REQ_PREFIX)) await env.SELLER_STATE.delete(k);
        } else if (act === "deletemany") {
          for (const k of form.getAll("key")) {
            if (String(k).startsWith(REQ_PREFIX)) await env.SELLER_STATE.delete(String(k));
          }
        }
        return new Response(null, { status: 303, headers: { Location: p } });
      }

      const keys = await listRequests(env, null);
      const rows = (await Promise.all(keys.map(async (k) => {
        const raw = await env.SELLER_STATE.get(k);
        if (!raw) return null;
        try { return { key: k, ...JSON.parse(raw) }; } catch { return null; }
      }))).filter(Boolean).sort((a, b) => String(a.at).localeCompare(String(b.at)));

      /* GROUPED BY KIND, NOT BY SELLER, because the two are different
         work: an item needs research, photos, a price and panel data; a
         wishlist entry needs a panel drawing and nothing else. The user
         triages by what the job IS. Grouping by seller would scatter one
         kind of work across four groups and make every batch mixed.
         Seller stays a label on each row. Oldest first within a group. */
      const groups = [
        { kind: "item", label: "New listings", tag: "ADD ITEM" },
        /* becomes a listing with hidden:true and no price — the might-sell
           list; the tag tells the secretary both facts */
        { kind: "own", label: "Not for sale yet (add hidden)", tag: "ADD HIDDEN, NO PRICE" },
        { kind: "wish", label: "Wishlist additions", tag: "WISHLIST" },
      ];

      /* Each group gets its own copy block, and there is one combined
         "Copy all" after them. Both exist on purpose: a single kind
         waiting wants the small copy, a triaged mixed queue wants one
         paste — and the secretary confirmed a mixed paste needs no
         re-sorting at their end, because the [TAG] on every row already
         says what each entry is. The tag is the sort. */
      const blockFor = (kind, tag) => rows.filter((r) => r.kind === kind).map((r) =>
        `- [${tag}] ${r.seller}: ${r.text}` +
        (typeof r.price === "number" ? ` (asking ${r.price} €)` : "")
      ).join("\n");

      const rowHTML = (r) => `
            <div class="q">
              <div>
                <div class="who">${esc(r.seller)}</div>
                <div class="what">${esc(r.text)}</div>
                <div class="meta">${esc(String(r.at).slice(0, 16).replace("T", " "))} UTC${
                  typeof r.price === "number" ? ` &middot; asking ${r.price} &euro;` : ""}</div>
              </div>
              <form method="POST">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="key" value="${esc(r.key)}">
                <button class="del" type="submit">Trash</button>
              </form>
            </div>`;

      return new Response(page("Requests", {
        css: `
.q{border:1px solid var(--line);background:var(--panel);padding:.8rem .9rem;margin-bottom:.5rem;
 display:flex;gap:.75rem;align-items:flex-start}
.q .who{font-family:"IBM Plex Mono",monospace;font-size:.68rem;letter-spacing:.08em;
 text-transform:uppercase;color:var(--muted)}
.q .what{font-size:.98rem;line-height:1.4;margin-top:.15rem;overflow-wrap:anywhere}
.q .meta{font-family:"IBM Plex Mono",monospace;font-size:.68rem;color:var(--muted);margin-top:.3rem}
.q form{margin-left:auto;flex:0 0 auto}
.q .del{font-family:"IBM Plex Mono",monospace;font-size:.7rem;background:none;color:var(--sold);
 border:1px solid var(--line2);padding:.4rem .6rem;min-height:38px}
.q .del:hover{border-color:var(--sold);background:var(--sold-soft)}
h2.grp{font-family:"IBM Plex Mono",monospace;font-size:.68rem;letter-spacing:.13em;
 text-transform:uppercase;color:var(--muted);font-weight:500;margin:1.8rem 0 .6rem}
.copybox{width:100%;min-height:7rem;font-family:"IBM Plex Mono",monospace;font-size:.74rem;
 line-height:1.6;padding:.7rem .8rem;background:var(--panel2);border:1px solid var(--line);
 color:var(--ink);white-space:pre;overflow:auto}
.empty{font-family:"IBM Plex Mono",monospace;font-size:.78rem;color:var(--muted);padding:1.2rem 0}
`,
        html: `
          <h1>Requests</h1>
          <p class="sub">${rows.length} waiting. Sellers ask here; nothing is added automatically.</p>
          ${rows.length === 0 ? '<p class="empty">Nothing in the queue.</p>' : ""}
          ${groups.map((g) => {
            const mine = rows.filter((r) => r.kind === g.kind);
            if (!mine.length) return "";
            return `
            <h2 class="grp">${g.label} &middot; ${mine.length}</h2>
            ${mine.map(rowHTML).join("")}
            <div class="card">
              <textarea class="copybox" id="cb-${g.kind}" readonly>${esc(blockFor(g.kind, g.tag))}</textarea>
              <button class="btn copyall" data-for="cb-${g.kind}" type="button" style="margin-top:.6rem">Copy these ${mine.length}</button>
              <form method="POST" style="display:inline-block;margin-left:.4rem">
                <input type="hidden" name="action" value="deletemany">
                ${mine.map((r) => `<input type="hidden" name="key" value="${esc(r.key)}">`).join("")}
                <button class="btn ghost" type="submit">Trash these ${mine.length}</button>
              </form>
            </div>`;
          }).join("")}
          ${groups.filter((g) => rows.some((r) => r.kind === g.kind)).length > 1 ? `
            <h2 class="grp">Everything &middot; ${rows.length}</h2>
            <div class="card">
              <textarea class="copybox" id="cb-all" readonly>${esc(groups.map((g) => blockFor(g.kind, g.tag)).filter(Boolean).join("\n\n"))}</textarea>
              <button class="btn copyall" data-for="cb-all" type="button" style="margin-top:.6rem">Copy all ${rows.length}</button>
            </div>` : ""}
          ${rows.length ? `<p class="note">Copy a group, hand it to the secretary, then trash the ones that got
            done. Nothing here expires on its own.</p>` : ""}
          <script>
            document.addEventListener("click",function(e){
              var b=e.target.closest(".copyall"); if(!b) return;
              navigator.clipboard.writeText(document.getElementById(b.getAttribute("data-for")).value);
              b.textContent="Copied";
            });
          </script>`,
      }), { headers: { "Content-Type": "text/html; charset=utf-8" }, });
    }

    if (p.startsWith("/token/")) {
      const sellerKey = decodeURIComponent(p.slice("/token/".length)).replace(/\/$/, "");
      if (!sellerKey) return new Response("Missing seller key.", { status: 400 });

      const sess = await session(request, env);
      if (!sess) return Response.redirect(`${url.origin}/auth?next=${encodeURIComponent(p)}`, 302);

      if (request.method === "POST") {
        const form = await request.formData();
        if (form.get("action") === "regenerate") {
          const old = await env.SELLER_STATE.get("sel:" + sellerKey);
          if (old) await env.SELLER_STATE.delete("tok:" + old);
          const tok = newToken();
          await env.SELLER_STATE.put("sel:" + sellerKey, tok);
          await env.SELLER_STATE.put("tok:" + tok, sellerKey);
          return new Response(null, { status: 303, headers: { Location: p } });
        }
        if (form.get("action") === "sendlink") {
          const addr = String(form.get("email") || "").trim();
          if (!looksLikeEmail(addr)) {
            return new Response(null, { status: 303, headers: { Location: p + "?sent=bad" } });
          }
          /* Save first, send second. If the send fails the address is still
             stored, so retrying is one button rather than retyping it. */
          await env.SELLER_STATE.put(emailKey(sellerKey), addr);
          let tok = await env.SELLER_STATE.get("sel:" + sellerKey);
          if (!tok) {
            tok = newToken();
            await env.SELLER_STATE.put("sel:" + sellerKey, tok);
            await env.SELLER_STATE.put("tok:" + tok, sellerKey);
          }
          const res = await sendSellerLink(env, { to: addr, sellerKey, link: `${PUBLIC_ORIGIN}/s/${tok}` });
          const q = res.ok ? "?sent=ok" : "?sent=fail&why=" + encodeURIComponent(res.error || "");
          return new Response(null, { status: 303, headers: { Location: p + q } });
        }
      }

      let tok = await env.SELLER_STATE.get("sel:" + sellerKey);
      if (!tok) {
        tok = newToken();
        await env.SELLER_STATE.put("sel:" + sellerKey, tok);
        await env.SELLER_STATE.put("tok:" + tok, sellerKey);
      }
      const link = `${PUBLIC_ORIGIN}/s/${tok}`;
      const storedEmail = (await env.SELLER_STATE.get(emailKey(sellerKey))) || "";
      const lastSent = await env.SELLER_STATE.get("emailsent:" + sellerKey);
      const sent = url.searchParams.get("sent");
      const why = url.searchParams.get("why") || "";
      /* Says what happened to the WORLD, not just to the request: on a
         failure the link is still valid and still copyable above, and
         that is the thing the user needs to know before deciding whether
         to retry or just paste it into a message themselves. */
      const notice =
        sent === "ok" ? `<div class="okbox">Sent to ${esc(storedEmail)}.</div>`
        : sent === "bad" ? `<div class="errbox">That doesn't look like an email address — nothing was sent or saved.</div>`
        : sent === "fail" ? `<div class="errbox">Not sent. The address is saved and the link above is still valid, so you can retry or send it by hand.<br><span class="mono">${esc(why)}</span></div>`
        : "";
      return new Response(
        page(`${sellerKey} — link`, {
          css: `
.okbox{background:var(--accent-soft);color:var(--accent);border:1px solid var(--accent);
 padding:.6rem .8rem;margin-bottom:1rem;font-family:"IBM Plex Mono",monospace;font-size:.74rem}
.errbox{background:var(--sold-soft);color:var(--sold);border:1px solid var(--sold);
 padding:.6rem .8rem;margin-bottom:1rem;font-family:"IBM Plex Mono",monospace;font-size:.74rem;line-height:1.5}
/* .btn is an <a> here as well as a <button>, so it needs the bits a
   button gets for free: no underline, and matched line-height so the two
   sit on the same baseline rather than the link riding high. */
.btnrow{display:flex;gap:.5rem;flex-wrap:wrap;align-items:stretch}
.btnrow .btn{display:inline-flex;align-items:center;text-decoration:none}
.mailrow{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.2rem}
.mailrow input{flex:1 1 16rem;min-width:0;font-family:"IBM Plex Mono",monospace;font-size:.8rem;
 padding:.55rem .7rem;background:var(--panel2);border:1px solid var(--line2);color:var(--ink)}
`,
          html: `
          <h1>${esc(sellerKey)}</h1>
          <p class="sub">Their private link. Send it to them however you like.</p>
          ${notice}
          <div class="card">
            <code class="link" id="lnk">${esc(link)}</code>
            <div class="btnrow">
              <button class="btn" id="copy" type="button">Copy link</button>
              <!-- Opens the seller's own page, so the link can be checked
                   without copy-pasting it into a new tab. New tab rather
                   than same tab: this page is the only place the link
                   exists, and navigating away from it to look at the thing
                   it describes is the wrong trade. rel=noopener because
                   target=_blank otherwise hands the opened page a
                   window.opener handle back to this one. -->
              <a class="btn ghost" href="${esc(link)}" target="_blank" rel="noopener">Open their page</a>
            </div>
          </div>
          <div class="card">
            <form method="POST">
              <input type="hidden" name="action" value="sendlink">
              <div class="mailrow">
                <input type="email" name="email" placeholder="seller@example.com"
                  value="${esc(storedEmail)}" autocomplete="off" spellcheck="false">
                <button class="btn" type="submit">${storedEmail ? "Send link again" : "Save &amp; send link"}</button>
              </div>
            </form>
            <p class="note">Mails them this link in Finnish. The address is stored on the worker,
              NOT in the repo — the repo is public, so an address committed there would be
              world-readable and permanent.${lastSent ? ` Last sent ${esc(lastSent.slice(0, 16).replace("T", " "))} UTC.` : ""}</p>
          </div>
          <div class="card">
            <form method="POST">
              <input type="hidden" name="action" value="regenerate">
              <button class="btn ghost" type="submit">Regenerate</button>
            </form>
            <p class="note">Regenerating kills the old link immediately. Use it if a link
              leaks or someone leaves — there is no other way to revoke one.</p>
          </div>
          <p class="note">The link is the whole credential: anyone holding it can hide and
            un-hide this seller's items, mark them negotiating or open to offers, and
            change their prices. It can't add or delete a listing, edit any other
            field, or touch another seller.</p>
          <script>
            document.getElementById("copy").addEventListener("click", function(){
              navigator.clipboard.writeText(document.getElementById("lnk").textContent.trim());
              this.textContent="Copied";
            });
          </script>`,
        }),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    /* ---------- the seller's own page ---------- */
    if (p.startsWith("/s/")) {
      const tok = decodeURIComponent(p.slice("/s/".length)).replace(/\/$/, "");
      const sellerKey = tok && (await env.SELLER_STATE.get("tok:" + tok));
      if (!sellerKey) {
        return new Response(page("eurorack.fi", `<h1>Link not valid</h1>
          <p class="sub">This link has been replaced or never existed. Ask for a new one.</p>`,
          { noindex: true }), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      return new Response(sellerPage(sellerKey, tok), {
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    /* ---------- the write ---------- */
    /* A seller asking the admins to add something. Same credential as
       /api/set — the token proves which seller — but no ownership check,
       because a request names nothing that exists yet. It creates no
       listing and changes nothing on the site: it only puts a note in a
       queue a human reads. That is the whole safety argument for letting
       a link-authenticated page write free text at all. */
    if (p === "/api/request" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const { token, kind, text, price } = body || {};
      const sellerKey = token && (await env.SELLER_STATE.get("tok:" + token));
      if (!sellerKey) return json({ error: "bad token" }, 403);
      /* "own": a module the seller simply has — it becomes a HIDDEN listing,
         the might-sell list from the how page. No price by design. */
      if (kind !== "item" && kind !== "wish" && kind !== "own") return json({ error: "bad kind" }, 400);

      const t = typeof text === "string" ? text.trim() : "";
      if (!t) return json({ error: "empty" }, 400);
      if (t.length > REQ_MAX_TEXT) return json({ error: "too long" }, 400);

      /* Price is optional and only meaningful for an item. Same bounds as
         /api/set so a number refused there can't arrive by this door. */
      let p2;
      if (price !== undefined && price !== null && price !== "") {
        if (typeof price !== "number" || !Number.isInteger(price) || price < 0 || price > 100000) {
          return json({ error: "bad price" }, 400);
        }
        p2 = price;
      }

      const existing = await listRequests(env, sellerKey);
      if (existing.length >= REQ_MAX_PER_SELLER) return json({ error: "queue full" }, 429);

      const key = REQ_PREFIX + sellerKey + ":" + new Date().toISOString() + "-" + crypto.randomUUID().slice(0, 8);
      await env.SELLER_STATE.put(key, JSON.stringify({
        seller: sellerKey, kind, text: t, price: p2, at: new Date().toISOString(),
      }));
      return json({ ok: true });
    }

    /* Public read of which wants are hidden, mirroring /state for items.
       A SEPARATE ENDPOINT rather than a new field inside /state, because
       /state's shape is a flat item-id map that the live site already
       parses — nesting it would have been a breaking change to a document
       every visitor fetches. Two endpoints also fail independently. */
    if (p === "/wants") {
      return json(await readWantState(env), 200, { "Cache-Control": "no-store" });
    }

    if (p === "/api/setwant" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const { token, key, hidden } = body || {};
      const sellerKey = token && (await env.SELLER_STATE.get("tok:" + token));
      if (!sellerKey) return json({ error: "bad token" }, 403);
      if (typeof key !== "string" || !key || key.length > 200) return json({ error: "bad key" }, 400);
      if (typeof hidden !== "boolean") return json({ error: "bad hidden" }, 400);

      /* OWNERSHIP, SERVER-SIDE, same principle as /api/set: the token says
         which seller you are, and this proves the want is actually on that
         seller's list. Without it, a seller could hide another seller's
         wishlist entries by naming their key. */
      const seller = await fetch(RAW + "content/sellers/" + encodeURIComponent(sellerKey) + ".json",
        { cf: { cacheTtl: 60 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!seller) return json({ error: "unknown seller" }, 404);
      const owns = (seller.wants || []).some((w) => wantKey(w) === key);
      if (!owns) return json({ error: "not your want" }, 403);

      const state = await readWantState(env);
      const mine = state[sellerKey] || {};
      /* Deleted rather than stored as false, so the map only ever holds
         hidden entries and cannot grow without bound as a seller toggles
         things back and forth. */
      if (hidden) mine[key] = true; else delete mine[key];
      if (Object.keys(mine).length) state[sellerKey] = mine; else delete state[sellerKey];
      await env.SELLER_STATE.put(WANTSTATE_KEY, JSON.stringify(state));
      return json({ ok: true });
    }

    /* Personal notes: a seller's private jottings per item — "who is
       interested", "promised to X until Friday". PRIVATE is the design
       constraint that placed everything here: the repo is public and
       /state is a public endpoint, so notes live in KV under their own
       key and are served ONLY against the seller's token. They are also
       deliberately NOT reconciled to git — folding them into a public
       repo would defeat the point — so a KV loss loses notes. Accepted
       and stated, not overlooked. */
    if (p === "/api/notes" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const sellerKey = body && body.token && (await env.SELLER_STATE.get("tok:" + body.token));
      if (!sellerKey) return json({ error: "bad token" }, 403);
      const raw = await env.SELLER_STATE.get("notes:" + sellerKey);
      const loans = await env.SELLER_STATE.get("loans:" + sellerKey);
      /* one authenticated read serves both private maps — notes text and
         the lainassa flags share the same privacy contract */
      return json({ notes: raw ? JSON.parse(raw) : {}, loans: loans ? JSON.parse(loans) : {} },
        200, { "Cache-Control": "no-store" });
    }

    if (p === "/api/setnote" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const { token, id, text } = body || {};
      const sellerKey = token && (await env.SELLER_STATE.get("tok:" + token));
      if (!sellerKey) return json({ error: "bad token" }, 403);
      if (!id || typeof id !== "string") return json({ error: "bad id" }, 400);
      const t = typeof text === "string" ? text : "";
      if (t.length > 1000) return json({ error: "too long" }, 400);

      /* same ownership proof as /api/set: the token says who you are,
         this says the item is yours */
      const item = await fetch(RAW + "content/items/" + encodeURIComponent(id) + ".json", {
        cf: { cacheTtl: 60 },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!item) return json({ error: "unknown item" }, 404);
      if (item.who !== sellerKey) return json({ error: "not your item" }, 403);

      const key = "notes:" + sellerKey;
      const notes = JSON.parse((await env.SELLER_STATE.get(key)) || "{}");
      /* empty deletes, so the map only holds real notes */
      if (t.trim()) notes[id] = t; else delete notes[id];
      await env.SELLER_STATE.put(key, JSON.stringify(notes));
      return json({ ok: true });
    }

    /* Lainassa: a private on-loan reminder. Same contract as notes — KV
       only, token-gated, never in /state, never on the public site, not
       reconciled to git. The flag reminds the owner; it changes nothing
       for anyone else. */
    if (p === "/api/setloan" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const { token, id, loaned } = body || {};
      const sellerKey = token && (await env.SELLER_STATE.get("tok:" + token));
      if (!sellerKey) return json({ error: "bad token" }, 403);
      if (!id || typeof id !== "string") return json({ error: "bad id" }, 400);
      if (typeof loaned !== "boolean") return json({ error: "bad loaned" }, 400);
      const item = await fetch(RAW + "content/items/" + encodeURIComponent(id) + ".json", {
        cf: { cacheTtl: 60 },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!item) return json({ error: "unknown item" }, 404);
      if (item.who !== sellerKey) return json({ error: "not your item" }, 403);
      const key = "loans:" + sellerKey;
      const loans = JSON.parse((await env.SELLER_STATE.get(key)) || "{}");
      if (loaned) loans[id] = true; else delete loans[id];
      await env.SELLER_STATE.put(key, JSON.stringify(loans));
      return json({ ok: true });
    }

    if (p === "/api/set" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const { token, id, hidden, negotiating, haggle, price } = body || {};
      const sellerKey = token && (await env.SELLER_STATE.get("tok:" + token));
      if (!sellerKey) return json({ error: "bad token" }, 403);
      if (!id || typeof id !== "string") return json({ error: "bad id" }, 400);

      /* OWNERSHIP IS CHECKED HERE, SERVER-SIDE, not trusted from the page:
         the token proves which seller you are, and this proves the item is
         theirs. One fetch of the item the write names. */
      const item = await fetch(RAW + "content/items/" + encodeURIComponent(id) + ".json", {
        cf: { cacheTtl: 60 },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!item) return json({ error: "unknown item" }, 404);
      if (item.who !== sellerKey) return json({ error: "not your item" }, 403);

      const state = await readState(env);
      const cur = state[id] || {};
      if (typeof hidden === "boolean") cur.hidden = hidden;
      if (typeof negotiating === "boolean") cur.negotiating = negotiating;
      /* Independent of the other two on purpose — an item can be in
         negotiation and still open to offers — so this arrives on its own
         and each field is only written when the caller actually sent it. */
      if (typeof haggle === "boolean") cur.haggle = haggle;
      /* PRICE IS THE FIRST NON-BOOLEAN A SELLER CAN SET, so it is the
         first one that can be wrong rather than merely on or off. The
         booleans above are self-correcting — a wrong toggle is visibly
         wrong and one tap back — while a price is plausible at any value,
         so a fat-fingered 20 for 200 looks like a decision rather than a
         slip and stays live until someone notices.
         Validated as a whole integer in a sane range. The ceiling is not
         a price judgement, it is a typo net: it catches a stuck key
         without blocking anything anyone would really list. Rejected
         rather than clamped — silently storing a different number than
         the one that was typed is worse than refusing it. */
      if (price !== undefined) {
        if (typeof price !== "number" || !Number.isInteger(price) || price < 0 || price > 100000) {
          return json({ error: "bad price" }, 400);
        }
        cur.price = price;
      }
      cur.by = sellerKey;
      cur.at = new Date().toISOString();
      state[id] = cur;
      await env.SELLER_STATE.put(STATE_KEY, JSON.stringify(state));
      return json({ ok: true, id, state: cur });
    }

    if (p === "/") {
      return new Response("eurorack.fi worker — Decap OAuth at /auth, seller links at /token/<seller>.", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

/* The seller page loads the catalogue the same way the site does — from
   raw.githubusercontent — and filters to this seller. That keeps the
   worker out of the business of knowing the item list; it only has to
   answer "is this item yours" on write, which is one fetch. */
function sellerPage(sellerKey, tok) {
  return page("eurorack.fi", {
    css: `
.row{display:flex;flex-direction:column;gap:.55rem;background:var(--panel);
 border:1px solid var(--line);border-left:3px solid var(--line2);padding:.8rem .9rem;margin-bottom:.5rem;
 transition:opacity .15s}
.row.isHidden{opacity:.55}
/* LOAD-BEARING, not tidiness: applySearch() hides rows via the hidden
   attribute, and the UA's [hidden]{display:none} loses to our own
   .row{display:flex} — author styles beat UA styles at any specificity.
   Without this line the search marked rows hidden and every one of them
   stayed on screen: the filter "worked" in the DOM and did nothing
   visible, which is exactly how it shipped. Same trap as .th img[hidden]. */
.row[hidden]{display:none}
.row .nm{font-weight:700;font-size:1rem;line-height:1.25}
.row .mk{font-family:"IBM Plex Mono",monospace;font-size:.68rem;color:var(--muted);
 text-transform:uppercase;letter-spacing:.08em}
/* Prices ARE shown here, reversing the original "no prices, no editing,
   no adding" rule — at the user's request, because a seller scanning
   twenty rows for the right item recognises it by price faster than by
   model name. Still no editing and still no adding: showing a number is
   not the same as owning it, and the price stays a CMS field. */
.rowtop{display:flex;gap:.6rem;align-items:flex-start}
.rowtop .pr{font-family:"IBM Plex Mono",monospace;font-size:.82rem;font-weight:600;
 font-variant-numeric:tabular-nums;margin-left:auto;flex:0 0 auto;padding-left:.5rem;
 display:flex;align-items:center;gap:.25rem}
/* The € sits OUTSIDE the input — the field holds a bare number and the
   seller never has to think about whether the symbol is part of what they
   type — and AFTER it, per the user: Finnish writes 260 €, never €260,
   and the page's own saved-message already says so. The input row was the
   one place the € led.
   (Original note continues:) it stays outside so the
   are typing — and a paste of "€250" can be cleaned without fighting the
   caret. Sized to the digits it holds rather than stretched: a wide box
   for a three-digit price reads as a form, and this row is a control
   panel, not a form. */
.rowtop .pr input{width:5.2rem;font-family:inherit;font-size:.82rem;font-weight:600;
 font-variant-numeric:tabular-nums;text-align:right;padding:.3rem .4rem;
 background:var(--panel2);border:1px solid var(--line2);color:var(--ink);min-height:34px}
.rowtop .pr input:focus{outline:2px solid var(--accent);outline-offset:-1px}
.rowtop .pr button{font-family:"IBM Plex Mono",monospace;font-size:.68rem;min-height:34px;
 padding:0 .55rem;background:var(--accent);color:var(--on);border:1px solid var(--accent)}
/* ALWAYS PRESENT, disabled until the number actually changes. It used to
   be hidden at rest, on the reasoning that its appearance was itself the
   signal that something was unsaved. That was wrong in the way that only
   shows up when someone uses it: the user went looking for a save button,
   found nothing beside the price, and assumed the page had not finished
   loading. An affordance you cannot see until after you have already done
   the thing it enables does not teach anyone that the step exists — and
   not knowing it exists is exactly how a typed price gets abandoned.
   Disabled rather than hidden keeps the "nothing to save" state honest
   while still saying, at rest, that saving is how this works. */
.rowtop .pr button:disabled{background:var(--panel2); color:var(--muted);
 border-color:var(--line2); cursor:default}
.seg{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem}
.seg button{min-height:44px;font-family:"IBM Plex Mono",monospace;font-size:.72rem;
 background:var(--panel2);color:var(--ink2);border:1px solid var(--line);padding:.5rem .3rem}
.seg button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);
 color:var(--accent);font-weight:600}
.seg button.neg[aria-pressed="true"]{background:var(--signal-soft);border-color:var(--signal);color:var(--signal)}
.seg button.sold[aria-pressed="true"]{background:var(--sold-soft);border-color:var(--sold);color:var(--sold)}
/* A SEPARATE AXIS, not a fourth segment. The three buttons above are one
   decision with one answer; this is an independent yes/no that can be true
   alongside any of them — an item can be in negotiation and still open to
   offers. Putting it in the row would have forced a false choice, so it
   gets its own full-width control underneath.
   THE BOX keeps the sticker's red as a swatch of the badge this switches
   on; the control itself selects in ACCENT like every other selected thing
   on this page. It used to go fully red when on — red-soft ground, red
   border — which is exactly the .err strip's costume, so switching on
   "anna tarjous" painted an error-shaped band across the row. The user's
   words: "It looks like 'a mistake has been made'." The one-fact link to
   the public sticker survives in the swatch; it never needed the whole
   control to wear the red, only for the red to be present. */
.tkrow{display:flex;gap:.35rem}
.tkrow .tk{flex:1 1 0;min-width:0}
.tk.loan[aria-pressed="true"]{border-color:#E8D48A;background:#FBF3D0}
.tk.loan[aria-pressed="true"] .box{background:#B08A3A;border-color:#B08A3A;color:#fff}
.tk.loan[aria-pressed="true"] .lb{color:var(--ink);font-weight:600}
@media(prefers-color-scheme:dark){
 .tk.loan[aria-pressed="true"]{border-color:#4A4020;background:#2E2A18}
}
.tk{display:flex;align-items:center;gap:.5rem;width:100%;min-height:44px;
 border:1px solid var(--line);background:var(--panel2);padding:0 .6rem;text-align:left}
.tk .box{width:18px;height:18px;flex:0 0 auto;border:1px solid var(--line2);background:var(--panel);
 display:flex;align-items:center;justify-content:center;font-size:.7rem;line-height:1}
.tk .lb{font-family:"IBM Plex Mono",monospace;font-size:.72rem;color:var(--ink2)}
.tk[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}
.tk[aria-pressed="true"] .box{background:var(--haggle);border-color:var(--haggle);color:#fff}
/* --ink, not --haggle-ink: warm red text on the cool accent-soft ground
   would be the worst of both palettes */
.tk[aria-pressed="true"] .lb{color:var(--ink);font-weight:600}
/* Above the heading, deliberately: the seller came here to do one thing
   and leaves the moment it is done, so an ask below the list is an ask
   nobody reaches. Sized as an aside; if it ever starts looking like the
   primary action it has gone wrong.
   A BAND, not a panel. It was --panel2 on --line2, and panel grey on page
   grey read as chrome rather than as an ask — the user said it was too
   subtle and they were right. --accent-soft ground with an --accent border
   gives it weight without borrowing a meaning that is already taken.
   NOT AMBER, and that is now a decision rather than an accident. The
   secrecy warning above the list is amber, and two amber blocks on a first
   visit turn the warning into furniture. That constraint is TEMPORARY —
   the warning is dismissible, so from the second visit this would be the
   only amber block on the page — but the first visit is exactly when the
   warning has to land, so amber loses permanently.
   NOT RED either; see the heart's own note in the markup below. */
.sp-tip{display:flex;gap:.6rem;align-items:center;text-decoration:none;
 background:var(--accent-soft);border:1px solid var(--accent);
 padding:.75rem .85rem;margin-bottom:16px}
.sp-tip .jar{width:29px;height:29px;flex:0 0 auto;color:var(--accent)}
.sp-tip .txt{min-width:0}
/* --ink, not --ink2: on the tinted ground the softer ink lost too much
   contrast, and this is the line actually being read. */
.sp-tip .t{display:block;font-size:.95rem;color:var(--ink);line-height:1.4}
.sp-tip .a{display:block;font-family:"IBM Plex Mono",monospace;font-size:.72rem;
 font-weight:600;color:var(--accent);margin-top:.2rem}
/* Dismissible, because it is a warning and not furniture: it should stop
   you once and then stop occupying the top of the page forever after.
   A LABELLED BUTTON, NOT AN X — dismissing it asserts "I have understood
   the consequence", and that deserves a deliberate act rather than a
   stray tap near a corner. */
.keep .ack{display:block;margin-top:.55rem;min-height:38px;padding:0 .9rem;
 background:var(--signal);color:#fff;border:1px solid var(--signal);
 font-family:"IBM Plex Mono",monospace;font-size:.7rem;font-weight:600}
.keep{background:var(--signal-soft);color:var(--signal);border:1px solid var(--signal);
 padding:.7rem .85rem;margin:0 0 1rem;font-family:"IBM Plex Mono",monospace;font-size:.72rem}
.gloss{background:var(--panel2);border:1px solid var(--line);padding:.7rem .85rem;margin-bottom:1.2rem;
 font-family:"IBM Plex Mono",monospace;font-size:.72rem;color:var(--ink2)}
/* Same idiom as the main site's FI/SV/EN control, so a seller who has used
   eurorack.fi meets a thing they recognise. Quiet on purpose: nearly every
   seller arrives from a link in a mail already in their language and will
   never touch this, so it wants to be findable rather than prominent.
   ON THE HEADING LINE, not above the tip banner. Above the banner it was
   the topmost thing on a page that had no chrome at all, and it pushed the
   banner down; here it costs no vertical space and reads as belonging to
   the page. Measured before moving it, since the worry was a narrow phone:
   at 320px the longest seller name is 121px and the switcher 103px, so
   they share a line with room to spare. flex-wrap is the backstop if a
   longer name ever appears — the switcher drops to its own line rather
   than crushing the name. */
.hdrow{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap}
.hdrow h1{flex:0 1 auto}
.langs{display:flex;gap:.3rem;margin-left:auto}
.langs[hidden]{display:none}
.langs button{font-family:"IBM Plex Mono",monospace;font-size:.68rem;min-height:32px;
 padding:0 .5rem;background:var(--panel2);color:var(--ink2);border:1px solid var(--line)}
.langs button[aria-pressed="true"]{background:var(--accent);color:var(--on);border-color:var(--accent)}

/* Search filters the item rows as you type — for the seller whose list
   has outgrown a glance. Matches name, maker AND the private note text,
   so "find the module I promised to Ville" works. Notes themselves: a
   textarea per row, same disabled-until-dirty save as the price. */
.search{display:flex;align-items:center;gap:.5rem;width:100%;min-height:44px;
 padding:0 .7rem;background:var(--panel);border:1px solid var(--line2);
 margin-bottom:.7rem;cursor:text}
.search .mag{width:15px;height:15px;flex:0 0 auto;color:var(--muted)}
.search input{flex:1;min-width:0;border:none;background:none;outline:none;
 font-family:"IBM Plex Mono",monospace;font-size:1rem;color:var(--ink);min-height:42px}
.search input::placeholder{color:var(--muted)}
/* the box is the control: focus paints the wrapper, since the input's own
   outline is off */
.search:focus-within{outline:2px solid var(--accent);outline-offset:-1px}
.noteswrap{display:flex;flex-direction:column;gap:.3rem}
.noteswrap textarea{width:100%;min-height:2.4rem;font-family:inherit;font-size:1rem;line-height:1.4;
 padding:.45rem .6rem;background:var(--panel2);border:1px solid var(--line);color:var(--ink);resize:vertical}
.noteswrap .nrow{display:flex;align-items:center;gap:.5rem}
/* A FILLED note dresses as a sticky note — the user's pick, no tilt, the
   softer shadow. The yellow is deliberately softer than --signal-soft so
   a note and the secrecy warning don't rhyme. Empty stays the plain
   field; the class follows the text live, so the field turns sticky at
   the first character. */
.note.hasnote{border-color:#E8D48A;background:#FBF3D0;color:var(--ink2);
 box-shadow:0 2px 5px rgba(90,75,20,.10)}
@media(prefers-color-scheme:dark){
 /* checked, not guessed: ink2 dark #BEC9D8 on #2E2A18 is 8.6:1 */
 .note.hasnote{border-color:#4A4020;background:#2E2A18;box-shadow:none}
}
/* the item's own photo, square, crop-to-fill; the panel ground shows
   while loading and IS the no-photo state */
.th{width:48px;height:48px;flex:0 0 auto;background:var(--panel2);
 border:1px solid var(--line2);overflow:hidden}
.th img{width:100%;height:100%;object-fit:cover;display:block}
.th img[hidden]{display:none}   /* our display:block would beat the UA hidden rule */
@media(max-width:360px){ .th{width:44px;height:44px} }
.noteswrap .nok{font-family:"IBM Plex Mono",monospace;font-size:.7rem;color:var(--accent)}
.noteswrap .nok.bad{color:var(--sold)}
.noteswrap .nsave{margin-left:auto;font-family:"IBM Plex Mono",monospace;font-size:.68rem;min-height:34px;
 padding:0 .55rem;background:var(--accent);color:var(--on);border:1px solid var(--accent)}
.noteswrap .nsave:disabled{background:var(--panel2);color:var(--muted);border-color:var(--line2);cursor:default}

/* The tab bar: three equal columns, same idiom as the state segments and
   the language switcher, so it is the third instance of one control shape
   rather than a new thing to learn. Counts on the first two tabs are the
   actual fix for "sellers never noticed the rest of the page": a number
   says there is something here without scrolling. */
.tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;margin:0 0 1rem}
.tabs button{min-height:44px;font-family:"IBM Plex Mono",monospace;font-size:.74rem;
 background:var(--panel2);color:var(--ink2);border:1px solid var(--line);padding:.5rem .3rem}
.tabs button[aria-selected="true"]{background:var(--accent);border-color:var(--accent);
 color:var(--on);font-weight:600}
.tabs button .n{color:var(--muted);font-weight:400;margin-left:.35rem}
.tabs button[aria-selected="true"] .n{color:var(--on);opacity:.75}
[role="tabpanel"][hidden]{display:none}
/* as panels, the old stacked-page top margins would gap the second and
   third tabs below the bar while the first sat flush — the bar's own
   margin is the spacing now */
.wsec[role="tabpanel"]{margin-top:0}
.ask[role="tabpanel"]{margin-top:0}

/* Wishlist section, formerly STACKED under the items, now a tab panel.
   The item list is why this page exists; tabs would put it behind a state
   on a page whose whole virtue is having none, and half the time the
   seller would arrive on the wrong pane and have to correct before doing
   what they came for. Wishlists run 1-12 entries, so the section costs
   little height and scrolling is navigation enough. */
.wsec{margin-top:1.8rem}
.wsec h2{font-size:1rem;margin:0 0 .35rem}
.wsec .lead{font-family:"IBM Plex Mono",monospace;font-size:.7rem;color:var(--muted);margin:0 0 .7rem}
.wrow{display:flex;flex-direction:column;gap:.5rem;background:var(--panel);
 border:1px solid var(--line);border-left:3px solid var(--line2);padding:.7rem .8rem;margin-bottom:.45rem;
 transition:opacity .15s}
.wrow.isHidden{opacity:.55}
.wrow .nm{font-weight:700;font-size:.95rem;line-height:1.3}
.wrow .mk{font-family:"IBM Plex Mono",monospace;font-size:.66rem;color:var(--muted);
 text-transform:uppercase;letter-spacing:.08em}
/* The item rows' segmented control with ONE OPTION FEWER — a want is only
   ever shown or not, with no middle state for something you don't own.
   Same skeleton, same 44px targets, so there is one interaction to learn
   on this page rather than two. */
.wseg{display:grid;grid-template-columns:1fr 1fr;gap:.35rem}
.wseg button{min-height:44px;font-family:"IBM Plex Mono",monospace;font-size:.72rem;
 background:var(--panel2);color:var(--ink2);border:1px solid var(--line);padding:.5rem .3rem}
.wseg button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);
 color:var(--accent);font-weight:600}
.wseg button.hide[aria-pressed="true"]{background:var(--sold-soft);border-color:var(--sold);color:var(--sold)}

/* The request form sits BELOW the list, not above it. A seller opens this
   page to change something that already exists; asking for something new
   is the rarer errand, and putting it first would push the reason they
   came off the top of the screen. */
.ask{margin-top:1.6rem;border:1px solid var(--line);background:var(--panel);padding:.9rem 1rem}
.ask h2{font-size:1rem;margin:0 0 .5rem}
.ask .kinds{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;margin-bottom:.6rem}
@media(max-width:480px){ .ask .kinds{grid-template-columns:1fr} }
.ask .kinds button{min-height:44px;font-family:"IBM Plex Mono",monospace;font-size:.72rem;
 background:var(--panel2);color:var(--ink2);border:1px solid var(--line);padding:.5rem .3rem}
.ask .kinds button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);
 color:var(--accent);font-weight:600}
.ask textarea{width:100%;min-height:76px;font-family:inherit;font-size:.92rem;line-height:1.45;
 padding:.55rem .65rem;background:var(--panel2);border:1px solid var(--line2);color:var(--ink);resize:vertical}
.ask .askprice{display:flex;align-items:center;gap:.4rem;margin-top:.5rem;
 font-family:"IBM Plex Mono",monospace;font-size:.74rem;color:var(--ink2)}
.ask .askprice input{width:6rem;font-family:inherit;font-size:.8rem;text-align:right;
 padding:.4rem .5rem;background:var(--panel2);border:1px solid var(--line2);color:var(--ink);min-height:38px}
.ask .askprice[hidden]{display:none}
#askmsg .ok,#askmsg .err{margin:.6rem 0 0;margin-bottom:0}
.ask .send{margin-top:.7rem;min-height:44px;padding:0 1rem;font-family:"IBM Plex Mono",monospace;
 font-size:.74rem;font-weight:600;background:var(--accent);color:var(--on);border:1px solid var(--accent)}
/* Sets expectations BEFORE the send, not after. The user was explicit that
   adding a product is not instant: the details have to be filled in by
   hand and the request has to be checked for spam. A seller who does not
   know that reads the silence as it not having worked, and sends again. */
.ask .note2{font-family:"IBM Plex Mono",monospace;font-size:.7rem;color:var(--muted);
 line-height:1.6;margin-top:.55rem}
.ask .how{margin:0 0 .4rem}
.ok{background:var(--accent-soft);color:var(--accent);padding:.6rem .8rem;
 font-family:"IBM Plex Mono",monospace;font-size:.72rem;margin-bottom:1rem}
.err{background:var(--sold-soft);color:var(--sold);padding:.6rem .8rem;font-family:"IBM Plex Mono",monospace;
 font-size:.72rem;margin-bottom:1rem}
/* PHONE SIZES, per the user: the desktop mono sits at 10.5-12px, which is
   dense on the screen this page is mostly used on — the whole feature is
   "works on a phone with no login". Roughly one step up across the board;
   ratios between levels kept, so nothing reorders visually.
   THE INPUTS GO TO 1rem (16px) FOR A SECOND REASON: iOS zooms the page
   into any focused input whose font is under 16px, so a seller tapping
   the price field had the whole layout lurch. 16px is the documented
   threshold that disables that. */
@media(max-width:640px){
  .sub{font-size:.86rem}
  .keep{font-size:.8rem}
  .keep .ack{font-size:.78rem;min-height:44px}
  .gloss{font-size:.8rem}
  .ok,.err{font-size:.8rem}
  .tabs button{font-size:.82rem}
  .row .nm{font-size:1.08rem}
  .row .mk{font-size:.74rem}
  .rowtop .pr{font-size:.9rem}
  .rowtop .pr input{font-size:1rem;width:5.6rem;min-height:40px}
  .rowtop .pr button{font-size:.76rem;min-height:40px}
  .seg button{font-size:.8rem}
  .tk .lb{font-size:.8rem}
  .wsec h2,.ask h2{font-size:1.1rem}
  .wsec .lead{font-size:.78rem}
  .wrow .nm{font-size:1.02rem}
  .wrow .mk{font-size:.72rem}
  .wseg button{font-size:.8rem}
  .ask .kinds button{font-size:.8rem}
  .ask textarea{font-size:1rem}
  .ask .askprice{font-size:.8rem}
  .ask .askprice input{font-size:1rem;min-height:44px}
  .ask .send{font-size:.82rem}
  .ask .note2{font-size:.78rem}
  .sp-tip .t{font-size:1rem}
  .sp-tip .a{font-size:.78rem}
}
`,
    html: `
  <a class="sp-tip" href="https://www.spongefile.com/#/portal/support">
    <!-- A heart, and it STAYS --accent rather than going red. Red is spoken
         for twice on this site already — --haggle for "anna tarjous",
         --sold for gone — and a third warm-red meaning would dilute both.
         The haggle red still appears on this page as the toggle's swatch
         box (and on the public sticker), so a red heart would blur into
         that family. Blue reads as unusual for about a second and then
         reads as the site's own colour. -->
    <svg class="jar" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 82 C 22 62 10 47 10 33 C 10 20 20 12 31 12 C 39 12 46 16 50 23
               C 54 16 61 12 69 12 C 80 12 90 20 90 33 C 90 47 78 62 50 82 Z"
            fill="currentColor"/>
    </svg>
    <span class="txt"><span class="t" id="tipt"></span>
    <span class="a" id="tipa"></span></span></a>
  <div class="hdrow"><h1 id="hd">…</h1><div class="langs" id="langs" hidden></div></div>
  <p class="sub" id="sub"></p>
  <div class="keep" id="keep" hidden></div>
  <!-- Tabs, per the user: one long scroll meant most sellers never met the
       wishlist or the request form at the end of it. The tip banner and
       the secrecy warning stay ABOVE the tab bar — they apply to the whole
       page, not to a tab. The err strip does too: a save confirmation must
       stay visible wherever you tab next. The GLOSS moved inside the items
       panel — it explains the Piilota button, which only exists there. -->
  <div class="tabs" id="tabs" role="tablist">
    <button role="tab" data-tab="items" aria-selected="true" id="tabitems"></button>
    <button role="tab" data-tab="wish" aria-selected="false" id="tabwish"></button>
    <button role="tab" data-tab="ask" aria-selected="false" id="tabask"></button>
  </div>
  <div id="err"></div>
  <div id="panel-items" role="tabpanel">
    <div class="gloss" id="gloss"></div>
    <!-- the public site's own magnifier, verbatim, so the two search bars
         share one idiom -->
    <label class="search"><svg class="mag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6" stroke-linecap="round"/></svg><input type="search" id="q" autocomplete="off" spellcheck="false"></label>
    <div id="list"></div>
  </div>
  <div class="wsec" id="wsec" role="tabpanel" hidden>
    <h2 id="wsech"></h2>
    <p class="lead" id="wseclead"></p>
    <div id="wlist"></div>
  </div>
  <div class="ask" role="tabpanel" hidden>
    <h2 id="askh"></h2>
    <div class="kinds">
      <button type="button" data-kind="item" aria-pressed="true" id="kitem"></button>
      <button type="button" data-kind="own" aria-pressed="false" id="kown"></button>
      <button type="button" data-kind="wish" aria-pressed="false" id="kwish"></button>
    </div>
    <p class="note2 how" id="askhow"></p>
    <textarea id="asktext" maxlength="500"></textarea>
    <div class="askprice" id="askprice"><span id="askpricelab"></span>
      <span><input type="text" inputmode="numeric" id="askpriceval"> €</span></div>
    <button class="send" id="asksend" type="button"></button>
    <!-- confirmation lands HERE, beside the button the finger just left —
         it used to go only to the #err strip at the top of the page, which
         on a phone is off-screen at the moment of sending, so the send
         appeared to do nothing. -->
    <div id="askmsg" aria-live="polite"></div>
    <p class="note2" id="asknote"></p>
  </div>
  <script>
  var TOKEN=${JSON.stringify(tok)}, SELLER=${JSON.stringify(sellerKey)};
  var RAW=${JSON.stringify(RAW)}, API=location.origin+"/api/set";
  var ITEMS=[], STATE={};
  /* Scoped to the seller, not just the device: two people sharing a laptop
     are two different sellers with two different links, and the second one
     has not acknowledged anything. Not scoped to the TOKEN, though —
     regenerating a link doesn't unlearn the warning. */
  var ACK_KEY="eurorackfi:ack:keep:"+SELLER;
  /* Prices typed but not yet saved, by item id. Kept outside the DOM so a
     redraw cannot lose them — see the note in the price cell. */
  var PENDING={};
  /* notes: saved map from /api/notes (token-gated), pending edits beside
     it so a redraw cannot eat an unsaved note either */
  var NOTES={}, PENDING_NOTES={}, LOANS={};

  /* Finnish supplied by design (a953694), UNREVIEWED by the user — they
     read both languages and their correction is final when it comes.
     "Neuvottelussa" and "kohdetta" are already-approved site strings, and
     the gloss's FIRST sentence is the user's own (4eb2118).
     The gloss appears ONCE, not per row: twenty copies of an explanatory
     sentence is noise.
     Its SECOND sentence — that the item comes back any time — is in ALL
     THREE languages. An earlier version of this comment claimed the
     omission from English was deliberate while giving, as its reason, an
     argument for including it: someone pulling their own listing off a
     public site wants to know at that moment that it is reversible. The
     omission was an artefact of the page being Finnish-only, where "the
     English" meant nothing. That sentence is what stops the first one
     reading as final. */
  /* PER LANGUAGE, and every existing TXT.x reference keeps working: the
     active language's strings are assigned to TXT, so switching is one
     reassignment plus a re-render rather than rewriting sixty call sites.
     A language is OFFERED only when it is COMPLETE — same rule as the
     how-it-works page. A half-translated control panel is worse than a
     Finnish one: the seller cannot tell whether a Finnish word among
     English ones is an oversight or a term of art, and this page is where
     they change what the public sees.
     Finnish is the reference. Any language missing a key falls back to it
     rather than rendering blank, but that fallback is a backstop, not a
     licence to ship a partial language — LANGS_READY is what decides. */
  var TXT_ALL={};
  TXT_ALL.fi={
    /* NOT a flat "only you can see this page" — that was false, and it
       left a seller with no reason not to forward the link. Anyone
       holding it can change this seller's listings, and it stays valid
       until regenerated. So: state the condition, then ask for the
       behaviour, with something to DO rather than merely know.
       Pairs with the admin field hint, which tells the person sending the
       link not to post it. The protection needs both halves, so if either
       is reworded check the other. */
    keep:"Vain sinä näet tämän sivun, jos et anna linkkiä muille. Pidä se salassa!",
    /* The user's own. This page has no language switcher — it is Finnish
       only — so en/sv exist but are unused; recorded here so they aren't
       re-derived if that ever changes: "I understand" (the user's),
       "Jag förstår" (design's). */
    ack:"Ymmärrän",
    /* "milloin VAAN", not "vain" — the user wrote it back this way. The
       colloquial form, closer to the site's own voice ("Vaihtokaupatkin
       käyvät!"). A later pass will want to correct it to the textbook
       "vain" on grammatical grounds; that would undo their choice. */
    gloss:"Piilottamalla merkitset kohteen myydyksi. Saat sen takaisin milloin vaan.",
    forsale:"Myynnissä", neg:"Neuvottelussa", hide:"Piilota",
    /* SAME STRING THE SITE'S STICKER USES — that is this label's whole
       job, so it follows the sticker: "Anna tarjous" per the user's
       ruling, replacing their earlier "Saa tinkiä". The en and sv labels
       already quote their stickers. */
    haggle:"Anna tarjous",
    /* MINE AND UNREVIEWED, all three — flagged to design and to the user
       rather than passed off as settled. They are the only strings on this
       page nobody has read yet. */
    save:"Tallenna",
    priceLabel:"Hinta euroina",
    badPrice:"Tarkista hinta. Sivustolla ei muuttunut mitään.",
    items:"kohdetta",
    /* "2 piilotettu", NOT "piilotettua" — the user's correction, and they
       read Finnish. A later pass will want to "fix" this toward textbook
       partitive agreement after a number; that would undo a deliberate
       choice for this telegraphic count line. Leave it. */
    hiddenCount:"piilotettu",
    /* Both error strings state THE STATE OF THE WORLD before saying what
       to do. A seller hits these on a phone seconds after selling
       something, and their real question isn't "what went wrong" but "is
       the public site now wrong because of me" — left hanging, they
       don't retry, they message the user. Neither says virhe/error: the
       category is useless to them, the consequence isn't. */
    failed:"Ei tallentunut. Kohde näkyy sivustolla ennallaan. Yritä uudelleen.",
    loadFailed:"Kohteita ei saatu haettua. Sivustolla ei muuttunut mitään. Lataa sivu uudelleen.",
    /* Shown on SUCCESS, which the page previously said nothing about.
       Three jobs in one line, and the order matters: it confirms the save,
       bounds the wait, and then tells them to reload.
       "noin minuutissa" is a ceiling, not a measurement — the real
       propagation is sub-second, so this reads as early rather than late.
       It NAMES eurorack.fi rather than saying "the page": the seller is
       already looking at a page as they read it, so "reload the page"
       would be ambiguous exactly where it cannot afford to be.
       And the reload sentence is load-bearing rather than politeness — an
       already-open tab reads /state once and never again, so a seller
       watching one will wait forever for something that cannot happen. */
    saved:"Tallennettu. Sivusto päivittyy noin minuutissa. Lataa eurorack.fi uudelleen nähdäksesi muutoksen.",
    /* PRICE SAVES ONLY, and the old value in it is THE ONLY UNDO A PRICE
       HAS. The moment it saves, the previous number is gone from the
       screen and from the seller's memory of it — they typed 20, and they
       are no longer sure it was 200 rather than 250. This keeps it on
       screen long enough to retype, and puts the check where attention
       already is rather than demanding a separate act.
       Deliberately NOT a confirmation dialog: that would tax the
       ninety-nine correct edits to catch the one wrong one, and one that
       appears every time stops being read by the third use. If this ever
       proves insufficient, the escalation is confirmation SCALED TO
       MAGNITUDE — only when the new price is under half the old — never a
       flat confirm, which is the version that gets clicked through. */
    savedPrice:"Tallennettu: {old} € → {new} €. Sivusto päivittyy noin minuutissa. Lataa eurorack.fi uudelleen nähdäksesi muutoksen.",

    /* EVERY STRING BELOW IS MINE AND UNREVIEWED — the request form. Sent
       to design to correct rather than presented as settled. */
    askH:"Pyydä lisäystä",
    askItem:"Uusi kohde myyntiin",
    askOwn:"Ei vielä myyntiin",
    askWish:"Lisäys toivelistalle",
    askPriceLab:"Hinta",
    askSend:"Lähetä pyyntö",
    /* Says NOT INSTANT and says WHY, before the send rather than after.
       Both halves are the user's requirement: the details are filled in by
       hand, and the request is checked. A seller who doesn't know that
       reads the silence as failure and sends the same thing again. */
    /* BEFORE THE FIELD, WHAT TO TYPE. AFTER THE BUTTON, WHAT HAPPENS NEXT.
       These two started as one sentence below the button, which put the
       writing instruction after the send — an instruction for next time
       rather than this time. */
    askHow:"Kerro mitä lisätään ja missä kunnossa se on.",
    /* design's, unreviewed */
    /* Tab labels. "Kohteet" and NOT "Myynnissä" for the first tab: that
       word is already the per-item state button, and the tab also holds
       hidden items — the same word meaning two things on one screen. */
    tabItems:"Kohteet", tabWish:"Toiveet", tabAsk:"Lisää",
    /* search + notes: ALL THREE LANGUAGES MINE AND UNREVIEWED. notesOnly
       is a promise the architecture keeps: notes are KV-only, token-gated,
       never in the repo or /state. */
    search:"Hae omista kohteista",
    notesLabel:"Omat muistiinpanot",
    /* placeholder carries the privacy promise — visible exactly when
       someone is about to type their first note, gone once text exists
       and read by then. The user chose this over a permanent line. */
    notesPh:"Omat muistiinpanot — näkyy vain sinulle",
    loan:"Lainassa",
    notesSaved:"Tallennettu.",
    wishH:"Toivelistasi",
    /* NAMES the Lisää tab — if tabAsk is ever reworded, this follows in
       the same change; check-shared-strings enforces the pairing. */
    wishLead:"Uusia toiveita voit pyytää lisättäväksi Lisää-välilehdellä.",
    wishShown:"Näkyy",
    /* Plural on purpose, and NOT to be harmonised toward "sinä" later.
       This page says YOU about the seller's own actions and WE about the
       admins' — two parties, two pronouns. The sentence exists to say
       SOMEONE ELSE DOES THIS PART, which cannot be said in the second
       person. Same voice as the mail's "— eurorack.fi adminit". */
    askNote:"Emme lisää kohteita heti: täydennämme tiedot käsin ja tarkistamme pyynnöt.",
    askPlaceholderItem:"Esim. Make Noise Maths, hyväkuntoinen, alkuperäinen laatikko",
    askPlaceholderWish:"Esim. Intellijel Quad VCA",
    askSent:"Pyyntö lähetetty. Palaamme asiaan.",
    askEmpty:"Kirjoita mitä haluat lisättävän.",
    askFailed:"Pyyntö ei lähtenyt. Yritä uudelleen.",
    askFull:"Sinulla on jo useita avoimia pyyntöjä. Odota että käsittelemme ne."
  };
  /* The tip banner used to be hardcoded Finnish in the markup. Moved here
     so that everything a reader sees is in one place and a translator gets
     one list rather than a list plus "and also check the HTML". */
  TXT_ALL.fi.tipT="Onko tästä sivustosta ollut sinulle hyötyä?";
  TXT_ALL.fi.tipA="Anna tippi ylläpidolle →";

  /* English and Swedish are design's and UNREVIEWED by the user, same
     standing as the how-it-works page's copy. Three are reused verbatim
     rather than retranslated, and checks enforce the first of them:
     "keep" is character-for-character the seller-link mail's wording,
     "ack" is the user's English with design's Swedish, and "haggle" is the
     site sticker's own words.
     NO BACKTICKS ANYWHERE IN THIS COMMENT — it lives inside the seller
     page's template literal, so a backtick around a key name terminates
     the string and the whole worker stops parsing. Cost me a build. */
  TXT_ALL.en={
    keep:"Only you can see this page, as long as you don't give the link to anyone else. Keep it secret!",
    ack:"I understand",
    haggle:"Make offer",
    gloss:"Hiding an item marks it sold. You can bring it back any time.",
    forsale:"For sale",
    neg:"In negotiation",
    hide:"Hide",
    save:"Save",
    priceLabel:"Price in euros",
    badPrice:"Check the price. Nothing changed on the site.",
    items:"items",
    hiddenCount:"hidden",
    failed:"Not saved. The item still shows on the site as it was. Try again.",
    loadFailed:"Your items could not be loaded. Nothing changed on the site. Reload the page.",
    saved:"Saved. The site updates in about a minute. Reload eurorack.fi to see the change.",
    savedPrice:"Saved: {old} € → {new} €. The site updates in about a minute. Reload eurorack.fi to see the change.",
    /* THE USER'S OWN WORDING — the first of these 34 to be reviewed. They
       picked it over "Request an addition"; warmer, and it says who is
       being asked. The Swedish stays "Be om ett tillägg" BY THE USER'S
       DECISION — a warmer parallel was offered and declined, so don't
       "harmonise" it toward the English later. */
    askH:"Ask us to add something",
    askItem:"New item for sale",
    askOwn:"Not for sale yet",
    askWish:"Addition to the wishlist",
    askPriceLab:"Price",
    askSend:"Send request",
    askHow:"Tell us what to add and what condition it is in.",
    wishH:"Your wishlist",
    tabItems:"Items", tabWish:"Wishlist", tabAsk:"Add",
    search:"Search your items",
    notesLabel:"Personal notes",
    notesPh:"Personal notes — only you see this",
    loan:"On loan",
    notesSaved:"Saved.",
    wishLead:"You can ask for new wishes to be added on the Add tab.",
    wishShown:"Shown",
    askNote:"We do not add items straight away: we fill in the details by hand and go through requests.",
    askPlaceholderItem:"E.g. Make Noise Maths, good condition, original box",
    askPlaceholderWish:"E.g. Intellijel Quad VCA",
    askSent:"Request sent. We will get back to you.",
    askEmpty:"Write what you want added.",
    askFailed:"The request did not send. Try again.",
    askFull:"You already have several open requests. Wait until we have dealt with them.",
    tipT:"Has this site been useful to you?",
    tipA:"Tip the admins →",
  };
  TXT_ALL.sv={
    keep:"Bara du ser den här sidan, så länge du inte ger länken till någon annan. Håll den hemlig!",
    ack:"Jag förstår",
    haggle:"Ge bud",   /* quotes the sticker, follows the sticker */
    gloss:"Genom att dölja markerar du objektet som sålt. Du får tillbaka det när som helst.",
    forsale:"Till salu",
    neg:"Under förhandling",
    hide:"Dölj",
    save:"Spara",
    priceLabel:"Pris i euro",
    badPrice:"Kontrollera priset. Ingenting ändrades på sajten.",
    items:"objekt",
    hiddenCount:"dolda",
    failed:"Sparades inte. Objektet visas på sajten som förut. Försök igen.",
    loadFailed:"Objekten kunde inte hämtas. Ingenting ändrades på sajten. Ladda om sidan.",
    saved:"Sparat. Sajten uppdateras om ungefär en minut. Ladda om eurorack.fi för att se ändringen.",
    savedPrice:"Sparat: {old} € → {new} €. Sajten uppdateras om ungefär en minut. Ladda om eurorack.fi för att se ändringen.",
    askH:"Be om ett tillägg",
    askItem:"Nytt objekt till salu",
    askOwn:"Inte till salu ännu",
    askWish:"Tillägg till önskelistan",
    askPriceLab:"Pris",
    askSend:"Skicka förfrågan",
    askHow:"Berätta vad som ska läggas till och i vilket skick det är.",
    wishH:"Din önskelista",
    tabItems:"Objekt", tabWish:"Önskemål", tabAsk:"Lägg till",
    search:"Sök bland dina objekt",
    notesLabel:"Egna anteckningar",
    notesPh:"Egna anteckningar — bara du ser detta",
    loan:"Utlånad",
    notesSaved:"Sparat.",
    wishLead:"Nya önskningar kan du be om att få tillagda på fliken Lägg till.",
    wishShown:"Visas",
    askNote:"Vi lägger inte till objekt direkt: vi fyller i uppgifterna för hand och går igenom förfrågningarna.",
    askPlaceholderItem:"T.ex. Make Noise Maths, bra skick, originalkartong",
    askPlaceholderWish:"T.ex. Intellijel Quad VCA",
    askSent:"Förfrågan skickad. Vi återkommer.",
    askEmpty:"Skriv vad du vill få tillagt.",
    askFailed:"Förfrågan skickades inte. Försök igen.",
    askFull:"Du har redan flera öppna förfrågningar. Vänta tills vi har hanterat dem.",
    tipT:"Har den här sajten varit till nytta för dig?",
    tipA:"Ge dricks till adminerna →",
  };

  var LANG_NAMES={fi:"FI", sv:"SV", en:"EN"};
  var LANG_KEY="eurorackfi:seller-lang";
  /* Complete means EVERY key Finnish has. Not "has some strings" — see the
     note on TXT_ALL. */
  function langComplete(code){
    var t=TXT_ALL[code]; if(!t) return false;
    for(var k in TXT_ALL.fi){ if(!t[k] || !String(t[k]).trim()) return false; }
    return true;
  }
  var LANGS_READY=["fi","sv","en"].filter(langComplete);
  var LANG="fi";
  try{ var saved=localStorage.getItem(LANG_KEY);
       if(saved && LANGS_READY.indexOf(saved)>=0) LANG=saved; }catch(e){}
  /* Finnish underneath so a missing key can never render blank. */
  var TXT=Object.assign({}, TXT_ALL.fi, TXT_ALL[LANG]||{});

  function setLang(code){
    if(LANGS_READY.indexOf(code)<0) return;
    LANG=code;
    TXT=Object.assign({}, TXT_ALL.fi, TXT_ALL[LANG]||{});
    try{ localStorage.setItem(LANG_KEY, code); }catch(e){}
    document.documentElement.lang=code;
    paintChrome(); render(); renderWants(); paintAsk(); paintTabs();
  }

  /* ---------- tabs ---------- */
  var TAB="items";
  function paintTabs(){
    var t=document.getElementById('tabitems');
    if(!t) return;
    /* counts, not persistence: sellers land here rarely, Kohteet is the
       right landing every time, and the numbers are what tell them the
       other tabs are worth opening */
    t.innerHTML=esc(TXT.tabItems)+'<span class="n">'+ITEMS.length+'</span>';
    document.getElementById('tabwish').innerHTML=esc(TXT.tabWish)+'<span class="n">'+WANTS.length+'</span>';
    document.getElementById('tabask').textContent=TXT.tabAsk;
    ['items','wish','ask'].forEach(function(k){
      document.querySelector('.tabs [data-tab="'+k+'"]').setAttribute('aria-selected',String(k===TAB));
    });
    document.getElementById('panel-items').hidden = TAB!=='items';
    document.getElementById('wsec').hidden = TAB!=='wish';
    document.querySelector('.ask').hidden = TAB!=='ask';
  }
  function setTab(k){ TAB=k; paintTabs(); }

  /* Nothing at all while Finnish is the only complete language, rather than
     a single dead button. One option is not a choice. */
  function paintLangs(){
    var box=document.getElementById("langs"); if(!box) return;
    if(LANGS_READY.length<2){ box.hidden=true; return; }
    box.hidden=false;
    box.innerHTML=LANGS_READY.map(function(c){
      return '<button data-lang="'+c+'" aria-pressed="'+(c===LANG)+'">'+esc(LANG_NAMES[c]||c)+'</button>';
    }).join("");
  }
  /* Everything outside the item rows that carries copy. render() covers the
     rows themselves; these are the fixed parts around them. */
  function paintChrome(){
    paintLangs();
    var q=el("q"); if(q) q.placeholder=TXT.search;
    var tt=document.getElementById("tipt"), ta=document.getElementById("tipa");
    if(tt) tt.textContent=TXT.tipT;
    if(ta) ta.textContent=TXT.tipA;
  }


  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  function stateOf(m){
    var s=STATE[m.id]||{};
    return {hidden: s.hidden!==undefined ? s.hidden : !!m.hidden,
            negotiating: s.negotiating!==undefined ? s.negotiating : !!m.negotiating,
            haggle: s.haggle!==undefined ? s.haggle : !!m.haggle,
            /* typeof, not a truthiness check: a live override of 0 is a
               real price a seller may have set, and || would silently
               fall back to the committed one. */
            price: typeof s.price==="number" ? s.price : m.price};
  }

  function render(){
    var hid=ITEMS.filter(function(m){return stateOf(m).hidden;}).length;
    document.getElementById("hd").textContent=SELLER;
    document.getElementById("sub").textContent=
      ITEMS.length+" "+TXT.items+(hid?("  ·  "+hid+" "+TXT.hiddenCount):"");
    /* Dismissal is per device and persists. Wrapped because storage throws
       outright in some privacy modes rather than returning null — and the
       FAILURE MODE IS DELIBERATE: if we can't tell whether they've
       acknowledged it, the warning shows. Better a seller reads it twice
       than a seller who never read it at all. */
    var acked=false; try{ acked=localStorage.getItem(ACK_KEY)==="1"; }catch(e){}
    var keep=document.getElementById("keep");
    keep.hidden=acked;
    if(!acked) keep.innerHTML=esc(TXT.keep)+
      '<button class="ack" id="ack" type="button">'+esc(TXT.ack)+'</button>';
    document.getElementById("gloss").textContent=TXT.gloss;
    document.getElementById("list").innerHTML=ITEMS.map(function(m){
      var st=stateOf(m);
      /* three-state read of two booleans, with hidden winning — the seller
         sees one decision, the data keeps both flags. Hidden rows never
         vanish, and never move WITHIN a session: the undo has to stay
         exactly where the item was when it was tapped. They are grouped to
         the bottom once at load instead — see the sort in the loader. */
      var mode = st.hidden ? "sold" : (st.negotiating ? "neg" : "forsale");
      return '<div class="row'+(st.hidden?" isHidden":"")+'" data-id="'+esc(m.id)+'">'+
        '<div class="rowtop">'+
          /* recognition beats reading a 21-row list: the item's own photo,
             lazy so a phone doesn't front-load a megabyte of thumbnails.
             No img (3 items) or a failed load shows the plain panel
             square — onerror blanks the img rather than showing the
             broken-image glyph. onerror uses this.hidden=true PRECISELY
             to avoid quotes: this markup passes through the page template
             literal, which eats one escape level, and a quoted string in
             an inline handler arrives broken — it did, and took the whole
             seller page down in preview. No quotes, no trap. */
          '<span class="th">'+(m.img?'<img loading="lazy" src="'+esc(m.img)+'" alt="" onerror="this.hidden=true">':'')+'</span>'+
          '<div><div class="mk">'+esc(m.mfr)+'</div><div class="nm">'+esc(m.name)+'</div></div>'+
          /* guarded rather than assumed: this page renders whatever is in
             the repo, and an item with no price shouldn't print "€undefined".
             An item that has never had a price gets no editor either —
             adding one is a listing decision, and this page deliberately
             edits what exists rather than creating anything. */
          (typeof st.price==="number"
            ? (function(){
                /* A pending edit survives a redraw. render() rebuilds every
                   row from saved state, so toggling anything on ANOTHER row
                   used to silently discard a price the seller had typed but
                   not saved — the field snapped back with no message. The
                   typed value is kept in PENDING and re-applied here. */
                var pend=PENDING[m.id];
                var shown=(pend!==undefined)?pend:String(st.price);
                var dirty=shown!==String(st.price);
                return '<div class="pr"><input type="text" inputmode="numeric" value="'+esc(shown)+'" '+
                  'data-price="'+st.price+'" aria-label="'+esc(TXT.priceLabel)+'">'+
                  '<span aria-hidden="true">€</span>'+
                  '<button class="savep"'+(dirty?"":" disabled")+'>'+esc(TXT.save)+'</button></div>';
              })()
            : '')+
        '</div>'+
        '<div class="seg">'+
          '<button data-mode="forsale" aria-pressed="'+(mode==="forsale")+'">'+esc(TXT.forsale)+'</button>'+
          '<button class="neg" data-mode="neg" aria-pressed="'+(mode==="neg")+'">'+esc(TXT.neg)+'</button>'+
          '<button class="sold" data-mode="sold" aria-pressed="'+(mode==="sold")+'">'+esc(TXT.hide)+'</button>'+
        '</div>'+
        '<div class="tkrow">'+
        '<button class="tk" data-haggle="'+(!st.haggle)+'" aria-pressed="'+(!!st.haggle)+'">'+
          '<span class="box">'+(st.haggle?"✓":"")+'</span><span class="lb">'+esc(TXT.haggle)+'</span>'+
        '</button>'+
        /* Lainassa: a PRIVATE reminder, so its checked state wears the
           sticky-note yellow — the page's established colour for
           only-you-see-this — rather than the haggle red or a selected
           accent, both of which mark public facts. */
        '<button class="tk loan" data-loan="'+(!LOANS[m.id])+'" aria-pressed="'+(!!LOANS[m.id])+'">'+
          '<span class="box">'+(LOANS[m.id]?"✓":"")+'</span><span class="lb">'+esc(TXT.loan)+'</span>'+
        '</button>'+
        '</div>'+
        (function(){
          /* the note survives redraws the same way a pending price does */
          var saved=NOTES[m.id]||"";
          var pend=PENDING_NOTES[m.id];
          var shown=(pend!==undefined)?pend:saved;
          var dirty=shown!==saved;
          return '<div class="noteswrap">'+
            '<textarea class="note'+(shown.trim()?" hasnote":"")+'" data-saved="'+esc(saved)+'" aria-label="'+esc(TXT.notesLabel)+'" '+
              'placeholder="'+esc(TXT.notesPh)+'">'+esc(shown)+'</textarea>'+
            '<div class="nrow"><span class="nok" aria-live="polite"></span>'+
            '<button class="nsave"'+(dirty?"":" disabled")+'>'+esc(TXT.save)+'</button></div></div>';
        })()+
        '</div>';
    }).join("");
    if(el("q") && el("q").value) applySearch();
  }

  /* One save path for both controls. It sends ONLY the fields in "next",
     and the worker likewise writes only the fields it receives — so
     toggling "saa tinkiä" cannot silently republish a stale hidden value
     read at page load, and vice versa. That matters because the two
     controls are independent axes: whichever one the seller didn't touch
     must come through untouched. */
  function save(id,next,okMsg){
    var prev=STATE[id]?JSON.parse(JSON.stringify(STATE[id])):undefined;
    STATE[id]=Object.assign({},STATE[id],next); render();   /* optimistic */
    fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(Object.assign({token:TOKEN,id:id},next))})
      .then(function(r){ if(!r.ok) throw 0;
        document.getElementById("err").innerHTML='<div class="ok">'+esc(okMsg||TXT.saved)+'</div>'; })
      .catch(function(){
        if(prev===undefined) delete STATE[id]; else STATE[id]=prev;
        render();
        document.getElementById("err").innerHTML='<div class="err">'+esc(TXT.failed)+'</div>';
      });
  }

  document.addEventListener("click",function(e){
    var lb=e.target.closest(".langs button");
    if(lb){ setLang(lb.getAttribute("data-lang")); return; }
    var tb=e.target.closest(".tabs [data-tab]");
    if(tb){ setTab(tb.getAttribute("data-tab")); return; }
    if(e.target.closest("#ack")){
      /* hide first, persist second — if storage is unavailable the tap
         still works for this visit and the note simply returns next time */
      document.getElementById("keep").hidden=true;
      try{ localStorage.setItem(ACK_KEY,"1"); }catch(err){}
      return;
    }
    var b=e.target.closest(".seg button");
    if(b){
      var row=b.closest(".row"), mode=b.getAttribute("data-mode");
      save(row.getAttribute("data-id"),{hidden:mode==="sold", negotiating:mode==="neg"});
      return;
    }
    var k=e.target.closest(".tk");
    if(k && k.classList.contains("loan")){
      var rid=k.closest(".row").getAttribute("data-id");
      var want=k.getAttribute("data-loan")==="true";
      if(want) LOANS[rid]=true; else delete LOANS[rid];
      render();   /* optimistic, same as everything else */
      fetch(location.origin+"/api/setloan",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token:TOKEN,id:rid,loaned:want})})
        .then(function(r){ if(!r.ok) throw 0;
          el("err").innerHTML='<div class="ok">'+esc(TXT.saved)+'</div>'; })
        .catch(function(){
          if(want) delete LOANS[rid]; else LOANS[rid]=true;
          render();
          el("err").innerHTML='<div class="err">'+esc(TXT.failed)+'</div>';
        });
      return;
    }
    if(k){ save(k.closest(".row").getAttribute("data-id"),{haggle:k.getAttribute("data-haggle")==="true"}); return; }
    var sp=e.target.closest(".savep");
    if(sp){ savePrice(sp.closest(".row")); return; }
    var ns=e.target.closest(".nsave");
    if(ns) saveNote(ns.closest(".row"));
  });

  function saveNote(row){
    var id=row.getAttribute("data-id");
    var ta=row.querySelector(".note"), btn=row.querySelector(".nsave");
    var text=ta.value;
    btn.disabled=true;
    fetch(location.origin+"/api/setnote",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token:TOKEN,id:id,text:text})})
      .then(function(r){ if(!r.ok) throw 0;
        if(text.trim()) NOTES[id]=text; else delete NOTES[id];
        delete PENDING_NOTES[id];
        ta.setAttribute("data-saved",text);
        /* beside the button, like the request form — and the SHORT saved,
           not TXT.saved: that one tells you to reload eurorack.fi, which
           is true for prices and toggles and false for a private note
           that changes nothing public. */
        var ok=row.querySelector(".nok"); ok.classList.remove("bad"); ok.textContent=TXT.notesSaved; })
      .catch(function(){
        btn.disabled=false;
        var ok=row.querySelector(".nok"); ok.classList.add("bad"); ok.textContent=TXT.failed;
      });
  }

  /* Shows the save button only once the value actually differs from what
     is stored, so its presence means "you have an unsaved change" rather
     than being permanent furniture. Compared as trimmed strings against
     the rendered value, not as numbers, so leading zeroes or a stray
     space still count as different and still offer the save. */
  /* SEARCH: hides non-matching rows rather than re-rendering, so pending
     edits in hidden rows survive the filter. Matches maker, name and the
     note text — the note is where "promised to Ville" lives. */
  function applySearch(){
    var q=(el("q").value||"").trim().toLowerCase();
    ITEMS.forEach(function(m){
      var row=document.querySelector('.row[data-id="'+m.id+'"]'); if(!row) return;
      if(!q){ row.hidden=false; return; }
      var note=(PENDING_NOTES[m.id]!==undefined?PENDING_NOTES[m.id]:(NOTES[m.id]||""));
      row.hidden=(m.mfr+" "+m.name+" "+note).toLowerCase().indexOf(q)<0;
    });
  }

  document.addEventListener("input",function(e){
    var q=e.target.closest("#q");
    if(q){ applySearch(); return; }
    if(e.target.closest("#asktext")) el("askmsg").innerHTML="";
    var ta=e.target.closest(".note");
    if(ta){
      var row=ta.closest(".row"), id=row.getAttribute("data-id");
      var saved=NOTES[id]||"";
      if(ta.value===saved) delete PENDING_NOTES[id]; else PENDING_NOTES[id]=ta.value;
      row.querySelector(".nsave").disabled=(ta.value===saved);
      row.querySelector(".nok").textContent="";
      ta.classList.toggle("hasnote", !!ta.value.trim());
      return;
    }
    var inp=e.target.closest(".pr input"); if(!inp) return;
    var row=inp.closest(".row"), id=row.getAttribute("data-id");
    var clean=inp.value.trim(), saved=inp.getAttribute("data-price");
    if(clean===saved) delete PENDING[id]; else PENDING[id]=inp.value;
    inp.parentNode.querySelector(".savep").disabled = (clean===saved);
  });
  /* Enter saves, Escape abandons. A number field where Enter does nothing
     is a trap: it is the obvious way to commit a typed value, and the
     seller has no reason to expect a button is required. */
  document.addEventListener("keydown",function(e){
    var inp=e.target.closest(".pr input"); if(!inp) return;
    if(e.key==="Enter"){ e.preventDefault(); savePrice(inp.closest(".row")); }
    if(e.key==="Escape"){
      delete PENDING[inp.closest(".row").getAttribute("data-id")];
      inp.value=inp.getAttribute("data-price");
      inp.parentNode.querySelector(".savep").disabled=true; }
  });

  function savePrice(row){
    var inp=row.querySelector(".pr input");
    /* Tolerate what a person actually types: spaces, a pasted euro sign,
       a thousands separator, and the Finnish decimal comma. What survives
       must be only digits — "250,50" and "abc" both fail here rather than
       being silently rounded into a price nobody chose.
       THE DOUBLE BACKSLASHES ARE LOAD-BEARING. This whole script is inside
       a JS template literal, so the literal eats one level of escaping
       before the browser ever sees it: \\d written here arrives as \\d,
       while a single \\d would arrive as a bare "d". That shipped once —
       /^d+$/ matches only the letter d, so every price was rejected as
       invalid and the bug was invisible until a real value was typed. */
    var raw=inp.value.replace(/[\\s€]/g,"").replace(/[.,](?=\\d{3}\\b)/g,"");
    var n=/^\\d+$/.test(raw) ? parseInt(raw,10) : NaN;
    if(!isFinite(n) || n<0 || n>100000){
      document.getElementById("err").innerHTML='<div class="err">'+esc(TXT.badPrice)+'</div>';
      inp.focus(); inp.select();
      return;
    }
    var was=inp.getAttribute("data-price");
    delete PENDING[row.getAttribute("data-id")];   /* it is no longer pending */
    save(row.getAttribute("data-id"),{price:n},
      TXT.savedPrice.replace("{old}",was).replace("{new}",String(n)));
  }

  /* ---------- wishlist ---------- */
  var WANTS=[], WANTHIDDEN={};

  /* THE MODULE'S OWN wantKey, INJECTED AS SOURCE rather than retyped.
     There were briefly three copies of this function — one here, one at
     module scope for the ownership check, one in index.html — and a
     divergence between any two silently breaks hiding. Interpolating the
     real one removes a whole copy and makes the seller page and the write
     endpoint provably identical, because they are now the same function.
     Only index.html's copy remains separate, and scripts/check-wantkey.mjs
     exists to prove that one still agrees. */
  ${wantKey.toString()}
  function wantMaker(w){ return (w && typeof w==="object" && w.mfr) ? w.mfr : ""; }
  function wantName(w){
    if(typeof w==="string") return w;
    if(!w || typeof w!=="object") return String(w);
    if(w.text!=null && w.text!=="") return String(w.text);
    return String(w.name||"");
  }

  function renderWants(){
    var sec=el("wsec");
    /* VISIBILITY BELONGS TO THE TABS NOW — this used to hide the section
       when the wishlist was empty, which was right for a stacked page and
       wrong for a tab: a tab that shows nothing when opened reads as
       broken. An empty wishlist tab shows the heading and the lead, which
       points at the Add tab — exactly what an empty list should say. The
       count on the tab already said "0" before they opened it. */
    el("wsech").textContent=TXT.wishH;
    el("wseclead").textContent=TXT.wishLead;
    el("wlist").innerHTML=WANTS.map(function(w){
      var k=wantKey(w), hid=!!WANTHIDDEN[k], mk=wantMaker(w);
      return '<div class="wrow'+(hid?" isHidden":"")+'" data-wkey="'+esc(k)+'">'+
        '<div>'+(mk?'<div class="mk">'+esc(mk)+'</div>':'')+
          '<div class="nm">'+esc(wantName(w))+'</div></div>'+
        '<div class="wseg">'+
          '<button data-whide="false" aria-pressed="'+(!hid)+'">'+esc(TXT.wishShown)+'</button>'+
          '<button class="hide" data-whide="true" aria-pressed="'+hid+'">'+esc(TXT.hide)+'</button>'+
        '</div></div>';
    }).join("");
  }

  function saveWant(k,hidden){
    var prev=WANTHIDDEN[k];
    if(hidden) WANTHIDDEN[k]=true; else delete WANTHIDDEN[k];
    renderWants();   /* optimistic, same as the item rows */
    fetch(location.origin+"/api/setwant",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token:TOKEN,key:k,hidden:hidden})})
      .then(function(r){ if(!r.ok) throw 0;
        el("err").innerHTML='<div class="ok">'+esc(TXT.saved)+'</div>'; })
      .catch(function(){
        if(prev===undefined) delete WANTHIDDEN[k]; else WANTHIDDEN[k]=prev;
        renderWants();
        el("err").innerHTML='<div class="err">'+esc(TXT.failed)+'</div>';
      });
  }

  /* ---------- request form ---------- */
  var ASK_KIND="item";
  function paintAsk(){
    el("askh").textContent=TXT.askH;
    el("kitem").textContent=TXT.askItem;
    el("kown").textContent=TXT.askOwn;
    el("kwish").textContent=TXT.askWish;
    el("askpricelab").textContent=TXT.askPriceLab;
    el("asksend").textContent=TXT.askSend;
    el("askhow").textContent=TXT.askHow;
    el("asknote").textContent=TXT.askNote;
    el("kitem").setAttribute("aria-pressed", String(ASK_KIND==="item"));
    el("kown").setAttribute("aria-pressed", String(ASK_KIND==="own"));
    el("kwish").setAttribute("aria-pressed", String(ASK_KIND==="wish"));
    /* A price belongs to a thing being sold, not to a wish. Hiding it for
       a wishlist request keeps the form honest about what it is asking
       for rather than showing a field that would be meaningless. */
    /* price only for a sale item — an ei-vielä-myyntiin module has no
       price by design (the might-sell list), a wish never had one */
    el("askprice").hidden = ASK_KIND!=="item";
    el("asktext").placeholder = ASK_KIND==="wish" ? TXT.askPlaceholderWish : TXT.askPlaceholderItem;
  }
  function el(id){ return document.getElementById(id); }

  document.addEventListener("click",function(e){
    var wb=e.target.closest(".wseg button");
    if(wb){ saveWant(wb.closest(".wrow").getAttribute("data-wkey"),
                     wb.getAttribute("data-whide")==="true"); return; }
    var kb=e.target.closest(".kinds button");
    if(kb){ ASK_KIND=kb.getAttribute("data-kind"); el("askmsg").innerHTML=""; paintAsk(); return; }
    if(e.target.closest("#asksend")) sendAsk();
  });

  function sendAsk(){
    var box=el("askmsg");
    var text=el("asktext").value.trim();
    if(!text){ box.innerHTML='<div class="err">'+esc(TXT.askEmpty)+'</div>'; el("asktext").focus(); return; }
    var body={token:TOKEN, kind:ASK_KIND, text:text};
    if(ASK_KIND==="item"){
      /* Same cleaning as the price editor, and optional here: a seller may
         genuinely not know what to ask yet. Junk is dropped rather than
         rejected — this is a note to a human who can ask, not a field that
         sets anything, so refusing the whole request over a malformed
         price would cost more than it saves. */
      var raw=el("askpriceval").value.replace(/[\\s€]/g,"").replace(/[.,](?=\\d{3}\\b)/g,"");
      if(/^\\d+$/.test(raw)){ var n=parseInt(raw,10); if(n>=0 && n<=100000) body.price=n; }
    }
    var btn=el("asksend"); btn.disabled=true;
    fetch(location.origin+"/api/request",{method:"POST",
      headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)})
      .then(function(r){
        if(r.status===429) throw "full";
        if(!r.ok) throw 0;
        el("asktext").value=""; el("askpriceval").value="";
        box.innerHTML='<div class="ok">'+esc(TXT.askSent)+'</div>';
      })
      .catch(function(why){
        box.innerHTML='<div class="err">'+esc(why==="full"?TXT.askFull:TXT.askFailed)+'</div>';
      })
      .then(function(){ btn.disabled=false; });
  }

  Promise.all([
    fetch(RAW+"content/items-index.json").then(function(r){return r.json();}),
    fetch(location.origin+"/state").then(function(r){return r.json();}),
    /* degrades to {}: a notes failure must not take the controls down */
    fetch(location.origin+"/api/notes",{method:"POST",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({token:TOKEN})})
      .then(function(r){return r.ok?r.json():{};}).catch(function(){return {};})
  ]).then(function(r){
    NOTES=(r[2]&&r[2].notes)||{};
    LOANS=(r[2]&&r[2].loans)||{};
    STATE=r[1]||{};
    return Promise.all(r[0].map(function(n){
      return fetch(RAW+"content/items/"+n).then(function(x){return x.ok?x.json():null;}).catch(function(){return null;});
    }));
  }).then(function(all){
    ITEMS=all.filter(Boolean).filter(function(m){return m.who===SELLER;})
             .sort(function(a,b){return (a.mfr+a.name).localeCompare(b.mfr+b.name);});
    /* Hidden items sink to the bottom, ONCE, HERE — at load, never during
       the session. The two halves of that matter separately.
       Grouping them is worth it because hidden rows are done with: they
       are the ones the seller has finished dealing with, and leaving them
       interleaved makes the list of things still for sale something you
       have to pick out rather than read.
       Doing it only at load is the part that would be easy to "improve"
       into a live re-sort, and that would be wrong: the row must not move
       out from under the finger that just tapped it. A seller who hides
       something by mistake needs the undo exactly where they are looking,
       not relocated to the bottom of a list they now have to scroll. So
       the order is fixed from this snapshot and render() never touches it
       again — the regrouping is what they see NEXT time they open the
       page. */
    ITEMS.sort(function(a,b){ return (stateOf(a).hidden?1:0)-(stateOf(b).hidden?1:0); });
    render(); paintTabs();
  }).catch(function(){
    document.getElementById("sub").textContent="";
    document.getElementById("err").innerHTML='<div class="err">'+esc(TXT.loadFailed)+'</div>';
  });

  /* Painted OUTSIDE the item load, and that is deliberate: the form asks
     for something that does not exist yet, so it needs nothing from the
     catalogue. If the item fetch fails, the seller still has a working way
     to reach a human — which is exactly when they would most want one. */
  paintAsk();
  paintChrome();
  paintTabs();

  /* The wishlist loads on its own chain too, for the same reason: it needs
     the seller file and the want state, not the catalogue, so a failure in
     one list doesn't take out the other. */
  Promise.all([
    fetch(RAW+"content/sellers/"+encodeURIComponent(SELLER)+".json").then(function(r){return r.ok?r.json():null;}),
    fetch(location.origin+"/wants").then(function(r){return r.ok?r.json():{};}).catch(function(){return {};})
  ]).then(function(r){
    WANTS=(r[0]&&r[0].wants)||[];
    WANTHIDDEN=(r[1]||{})[SELLER]||{};
    renderWants(); paintTabs();
  }).catch(function(){ /* no wishlist section rather than a broken one */ });
  </script>`
  }, { noindex: true });
}
