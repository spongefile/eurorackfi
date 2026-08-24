/* GitHub OAuth proxy for Decap CMS, deployed as a Cloudflare Worker.
 *
 * Decap's admin UI (served from /admin/ on the main site) can't hold a
 * GitHub OAuth client secret itself — it's static, client-side code, so
 * anything in it is public. This worker holds the secret instead, and
 * implements the two-endpoint handshake Decap expects from a custom
 * OAuth backend: https://decapcms.org/docs/external-oauth-clients/
 *
 * /auth      -> redirects the user to GitHub to approve access
 * /callback  -> GitHub sends them back here with a code; this exchanges
 *               it for a real access token and hands that token back to
 *               the Decap popup window via postMessage.
 *
 * Needs two secrets set on the deployed worker (never committed here):
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 * from a GitHub OAuth App whose callback URL is <this worker's URL>/callback.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      if (!env.GITHUB_CLIENT_ID) {
        return new Response("Worker is missing GITHUB_CLIENT_ID — set it with `wrangler secret put GITHUB_CLIENT_ID`.", { status: 500 });
      }
      const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
      authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authorizeUrl.searchParams.set("scope", "repo,user");
      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing ?code from GitHub.", { status: 400 });
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return new Response("Worker is missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET.", { status: 500 });
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        return new Response(
          "GitHub OAuth error: " + (tokenData.error_description || tokenData.error || "no access_token in response"),
          { status: 400 }
        );
      }

      // Decap's handshake: the popup waits for the opener to say
      // "authorizing:github" first, then replies with the token. This is
      // Decap's own documented protocol, not something invented here.
      const message = "authorization:github:success:" + JSON.stringify({
        token: tokenData.access_token,
        provider: "github",
      });

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

    if (url.pathname === "/") {
      return new Response("eurorack.fi Decap CMS OAuth proxy — see /auth to start a login.", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
