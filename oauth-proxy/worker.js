/* eurorack.fi Cloudflare Worker.
 *
 * Two jobs, sharing one GitHub OAuth app:
 *
 * 1. OAuth proxy for Decap CMS. Decap's admin UI is static, so it can't
 *    hold a client secret; this worker holds it and implements the
 *    two-endpoint handshake Decap expects.
 *      /auth, /callback
 *
 * 2. Per-seller controls. Sellers mark their own items hidden or in
 *    negotiation without a GitHub account or admin access. Their
 *    credential is a secret link; there is no login.
 *      /token/<sellerKey>  the user's page to copy or regenerate a link
 *                          (gated on being a repo COLLABORATOR)
 *      /s/<token>          the seller's own page
 *      /api/set            the write, ownership-checked server-side
 *      /state              public read of the live overrides
 *
 * THIS WORKER HOLDS NO GITHUB WRITE CREDENTIAL, deliberately. It only
 * ever writes to KV. A scheduled GitHub Action reconciles KV back into
 * content/items/*.json using the repo access Actions already has. So the
 * worst a compromise of this worker can do is set wrong toggle values,
 * which revert from git — rather than rewriting the repository.
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
   A leaked link is bounded anyway: hide/un-hide on that seller's own
   items, reversible, and regenerating kills it. */
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
  const from = env.MAIL_FROM || "eurorack.fi <noreply@eurorack.fi>";

  /* FINNISH BELOW IS MINE AND UNREVIEWED — flagged to the user and to
     design rather than presented as settled copy. The secrecy sentence is
     the ONE exception: it is quoted verbatim from the seller page, where
     it is the user's own approved wording, so the warning a seller reads
     in the mail is word-for-word the one they meet on the page. If that
     line is ever reworded, reword it here too. */
  const subject = "Oma linkkisi eurorack.fi:hin";
  const text =
    `Hei,\n\n` +
    `tässä oma linkkisi eurorack.fi:hin. Sillä voit merkitä omat kohteesi myydyiksi tai neuvottelussa oleviksi:\n\n` +
    `${link}\n\n` +
    `Vain sinä näet tämän sivun, jos et anna linkkiä muille. Pidä se salassa!\n\n` +
    `— eurorack.fi\n`;

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

    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });

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
      if (next && next.startsWith("/token/")) {
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

      // Decap's own handshake: the popup waits for the opener to say
      // "authorizing:github" first, then replies with the token.
      const message = "authorization:github:success:" + JSON.stringify({ token: tokenData.access_token, provider: "github" });
      const html = `<!DOCTYPE html>
<html><body>
<script>
(function () {
  var message = ${JSON.stringify(message)};
  function receiveMessage(e) {
    window.opener.postMessage(message, e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
Login complete — this window should close automatically.
</body></html>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
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
          const res = await sendSellerLink(env, { to: addr, sellerKey, link: `${url.origin}/s/${tok}` });
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
      const link = `${url.origin}/s/${tok}`;
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
            <button class="btn" id="copy" type="button">Copy link</button>
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
            un-hide this seller's items and nothing else. It can't add, edit or price
            anything, and it can't touch another seller.</p>
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
    if (p === "/api/set" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const { token, id, hidden, negotiating, haggle } = body || {};
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
 font-variant-numeric:tabular-nums;margin-left:auto;flex:0 0 auto;padding-left:.5rem}
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
   gets its own full-width control underneath, in the same red as the
   sticker it produces, so the control and the badge read as one fact. */
.tk{display:flex;align-items:center;gap:.5rem;width:100%;min-height:44px;
 border:1px solid var(--line);background:var(--panel2);padding:0 .6rem;text-align:left}
.tk .box{width:18px;height:18px;flex:0 0 auto;border:1px solid var(--line2);background:var(--panel);
 display:flex;align-items:center;justify-content:center;font-size:.7rem;line-height:1}
.tk .lb{font-family:"IBM Plex Mono",monospace;font-size:.72rem;color:var(--ink2)}
.tk[aria-pressed="true"]{border-color:var(--haggle);background:var(--haggle-soft)}
.tk[aria-pressed="true"] .box{background:var(--haggle);border-color:var(--haggle);color:#fff}
.tk[aria-pressed="true"] .lb{color:var(--haggle-ink);font-weight:600}
/* Above the heading, deliberately: the seller came here to do one thing
   and leaves the moment it is done, so an ask below the list is an ask
   nobody reaches. Sized as an aside; if it ever starts looking like the
   primary action it has gone wrong.
   NEUTRAL, not --signal, and that was a correction. The security note
   below is the one thing on this page whose being ignored has a
   consequence, and it only reads as that while it is the only amber block
   on screen. This is a request we would LIKE read; that one is a warning.
   Two amber blocks stacked turned the warning into furniture. */
.sp-tip{display:flex;gap:.6rem;align-items:center;text-decoration:none;
 background:var(--panel2);border:1px solid var(--line2);padding:.6rem .7rem;margin-bottom:16px}
.sp-tip .jar{width:26px;height:26px;flex:0 0 auto;color:var(--accent)}
.sp-tip .txt{min-width:0}
.sp-tip .t{display:block;font-size:.95rem;color:var(--ink2);line-height:1.4}
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
.ok{background:var(--accent-soft);color:var(--accent);padding:.6rem .8rem;
 font-family:"IBM Plex Mono",monospace;font-size:.72rem;margin-bottom:1rem}
.err{background:var(--sold-soft);color:var(--sold);padding:.6rem .8rem;font-family:"IBM Plex Mono",monospace;
 font-size:.72rem;margin-bottom:1rem}
`,
    html: `
  <a class="sp-tip" href="https://www.spongefile.com/#/portal/support">
    <!-- A heart, and it STAYS --accent rather than going red. Red is spoken
         for twice on this site already — --haggle for "make offer",
         --sold for gone — and a third warm-red meaning would dilute both.
         This banner can sit on the same page as the red haggle toggle, so
         a red heart would be the third red in view. Blue reads as unusual
         for about a second and then reads as the site's own colour. -->
    <svg class="jar" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 82 C 22 62 10 47 10 33 C 10 20 20 12 31 12 C 39 12 46 16 50 23
               C 54 16 61 12 69 12 C 80 12 90 20 90 33 C 90 47 78 62 50 82 Z"
            fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/>
    </svg>
    <span class="txt"><span class="t">Onko tästä sivustosta ollut sinulle hyötyä?</span>
    <span class="a">Anna tippi ylläpidolle &rarr;</span></span></a>
  <h1 id="hd">…</h1>
  <p class="sub" id="sub"></p>
  <div class="keep" id="keep" hidden></div>
  <div class="gloss" id="gloss"></div>
  <div id="err"></div>
  <div id="list"></div>
  <script>
  var TOKEN=${JSON.stringify(tok)}, SELLER=${JSON.stringify(sellerKey)};
  var RAW=${JSON.stringify(RAW)}, API=location.origin+"/api/set";
  var ITEMS=[], STATE={};
  /* Scoped to the seller, not just the device: two people sharing a laptop
     are two different sellers with two different links, and the second one
     has not acknowledged anything. Not scoped to the TOKEN, though —
     regenerating a link doesn't unlearn the warning. */
  var ACK_KEY="eurorackfi:ack:keep:"+SELLER;

  /* Finnish supplied by design (a953694), UNREVIEWED by the user — they
     read both languages and their correction is final when it comes.
     "Neuvottelussa" and "kohdetta" are already-approved site strings, and
     the gloss's FIRST sentence is the user's own (4eb2118). Its second
     sentence is design's and still unreviewed — kept deliberately,
     because someone about to pull their own listing off a public site
     wants to know it is reversible at that moment.
     The gloss appears ONCE, not per row: twenty copies of an explanatory
     sentence is noise. Its second sentence ("you can get it back any
     time") is deliberately not in the English — the person tapping this
     is removing their own listing from a public site, and reversibility
     is what they want to know at that moment.
     NOT TRANSLATED, flagged to design rather than invented here: the
     save-failure message. It stays in English rather than have me put
     unreviewed Finnish on the page. */
  var TXT={
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
    /* the user's own Finnish, same string the site's sticker uses */
    haggle:"Saa tinkiä",
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
    saved:"Tallennettu. Sivusto päivittyy noin minuutissa. Lataa eurorack.fi uudelleen nähdäksesi muutoksen."
  };

  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  function stateOf(m){
    var s=STATE[m.id]||{};
    return {hidden: s.hidden!==undefined ? s.hidden : !!m.hidden,
            negotiating: s.negotiating!==undefined ? s.negotiating : !!m.negotiating,
            haggle: s.haggle!==undefined ? s.haggle : !!m.haggle};
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
         sees one decision, the data keeps both flags. Rows never reorder
         and hidden rows never vanish: the undo has to stay exactly where
         the item was when it was tapped. */
      var mode = st.hidden ? "sold" : (st.negotiating ? "neg" : "forsale");
      return '<div class="row'+(st.hidden?" isHidden":"")+'" data-id="'+esc(m.id)+'">'+
        '<div class="rowtop">'+
          '<div><div class="mk">'+esc(m.mfr)+'</div><div class="nm">'+esc(m.name)+'</div></div>'+
          /* guarded rather than assumed: this page renders whatever is in
             the repo, and an item with no price shouldn't print "€undefined" */
          (typeof m.price==="number"?'<div class="pr">€'+m.price+'</div>':'')+
        '</div>'+
        '<div class="seg">'+
          '<button data-mode="forsale" aria-pressed="'+(mode==="forsale")+'">'+esc(TXT.forsale)+'</button>'+
          '<button class="neg" data-mode="neg" aria-pressed="'+(mode==="neg")+'">'+esc(TXT.neg)+'</button>'+
          '<button class="sold" data-mode="sold" aria-pressed="'+(mode==="sold")+'">'+esc(TXT.hide)+'</button>'+
        '</div>'+
        '<button class="tk" data-haggle="'+(!st.haggle)+'" aria-pressed="'+(!!st.haggle)+'">'+
          '<span class="box">'+(st.haggle?"✓":"")+'</span><span class="lb">'+esc(TXT.haggle)+'</span>'+
        '</button></div>';
    }).join("");
  }

  /* One save path for both controls. It sends ONLY the fields in "next",
     and the worker likewise writes only the fields it receives — so
     toggling "saa tinkiä" cannot silently republish a stale hidden value
     read at page load, and vice versa. That matters because the two
     controls are independent axes: whichever one the seller didn't touch
     must come through untouched. */
  function save(id,next){
    var prev=STATE[id]?JSON.parse(JSON.stringify(STATE[id])):undefined;
    STATE[id]=Object.assign({},STATE[id],next); render();   /* optimistic */
    fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(Object.assign({token:TOKEN,id:id},next))})
      .then(function(r){ if(!r.ok) throw 0;
        document.getElementById("err").innerHTML='<div class="ok">'+esc(TXT.saved)+'</div>'; })
      .catch(function(){
        if(prev===undefined) delete STATE[id]; else STATE[id]=prev;
        render();
        document.getElementById("err").innerHTML='<div class="err">'+esc(TXT.failed)+'</div>';
      });
  }

  document.addEventListener("click",function(e){
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
    if(k) save(k.closest(".row").getAttribute("data-id"),{haggle:k.getAttribute("data-haggle")==="true"});
  });

  Promise.all([
    fetch(RAW+"content/items-index.json").then(function(r){return r.json();}),
    fetch(location.origin+"/state").then(function(r){return r.json();})
  ]).then(function(r){
    STATE=r[1]||{};
    return Promise.all(r[0].map(function(n){
      return fetch(RAW+"content/items/"+n).then(function(x){return x.ok?x.json():null;}).catch(function(){return null;});
    }));
  }).then(function(all){
    ITEMS=all.filter(Boolean).filter(function(m){return m.who===SELLER;})
             .sort(function(a,b){return (a.mfr+a.name).localeCompare(b.mfr+b.name);});
    render();
  }).catch(function(){
    document.getElementById("sub").textContent="";
    document.getElementById("err").innerHTML='<div class="err">'+esc(TXT.loadFailed)+'</div>';
  });
  </script>`
  }, { noindex: true });
}
