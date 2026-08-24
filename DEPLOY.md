# Deploying eurorack.fi

The whole site is one file: `index.html`. No build step, no server, no
database — "deploying" just means putting that one file somewhere public.
Everything below assumes you have never done this before.

Two options. Pick one:

- **Drag-and-drop (Netlify)** — no terminal, no git, five minutes. Good for
  getting the site live today.
- **Git + GitHub Pages** — a few terminal commands, but every future update
  is `git push` instead of a manual re-upload. Worth it once you're updating
  the site regularly.

You can start with drag-and-drop and switch to git later. Nothing about the
site itself changes either way.

---

## Option A — Netlify, drag-and-drop (no terminal, no account required to try)

1. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)** in your
   browser.
2. Find `index.html` in Finder (`/Users/tina/eurorackfi/index.html`) and
   drag it — just that one file — onto the page.
3. Netlify uploads it and gives you a live URL immediately, something like
   `random-name-123.netlify.app`. That's it. The site is public.
4. To keep it and get a proper account (so you can update the site later
   without losing this one): click **"Sign up"** in Netlify's banner —
   you can sign up with the GitHub or Google account you already have. The
   site you just dropped is saved under that account.
5. To update the site later: go to the site's page in your Netlify
   dashboard → **Deploys** tab → drag the new `index.html` onto the same
   drop zone there. It replaces the old version, same URL.

No git, no command line, ever, with this option. The tradeoff is that
"updating the site" means manually dragging a file each time.

---

## Option B — GitHub Pages (git-based, free, custom domain works well)

`/Users/tina/eurorackfi` is **not currently a git repository** — none of
this project's history is tracked yet, so the first few steps set that up.
Run these one at a time in Terminal, from this folder.

### 1. Turn this folder into a git repository

```bash
cd /Users/tina/eurorackfi
git init
```

### 2. Choose what goes to GitHub

The design files (`*.dc.html`, `canvas.json`, `eurorack-fi-listings.html`,
`HANDOFF-design-to-dev.md`) don't need to be public — only `index.html` does.
Simplest approach: commit everything, since none of it is sensitive, it's
just noise on a public repo. If you'd rather keep the design working files
out of it, tell me and I'll set up a `.gitignore` instead.

```bash
git add index.html README.md DEPLOY.md tally-form-spec.md
git commit -m "Initial site"
```

### 3. Create the GitHub repository

1. Go to **[github.com/new](https://github.com/new)** (sign in or create a
   free account first if you don't have one).
2. Repository name: `eurorackfi` (or anything — it won't appear in your
   final URL once the custom domain is set up).
3. Leave it **Public**, don't check "Add a README" (you already have one).
4. Click **Create repository**.
5. GitHub shows you a page with commands. Copy the two lines under
   **"…or push an existing repository from the command line"** — they'll
   look like this (with your own username):

```bash
git remote add origin https://github.com/YOUR-USERNAME/eurorackfi.git
git branch -M main
git push -u origin main
```

Run those in Terminal, in the same folder.

### 4. Turn on GitHub Pages

1. On the repository's GitHub page, click **Settings** (top right of the
   repo, not your account settings).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose **main** and folder **/ (root)**, then **Save**.
5. Wait about a minute, then reload the Pages settings page — it will show
   your live URL: `https://YOUR-USERNAME.github.io/eurorackfi/`.

One catch: GitHub Pages serves `index.html` at that URL automatically, so
the site works as-is with no renaming.

### 5. Updating the site later

Any time you (or I) change `index.html`:

```bash
cd /Users/tina/eurorackfi
git add index.html
git commit -m "describe what changed"
git push
```

GitHub Pages rebuilds automatically, usually live within a minute.

---

## Pointing eurorack.fi at either option

If you already own the domain **eurorack.fi**, here's how to connect it.
This part happens with whoever you registered the domain through (e.g.
Louhi, Zoner, GoDaddy, Namecheap — wherever you bought it) — look for
**DNS settings** or **DNS records** in their dashboard.

### For Netlify

1. In your Netlify site dashboard: **Domain settings** → **Add a domain** →
   enter `eurorack.fi`.
2. Netlify shows you DNS records to add (usually an **A record** pointing
   to an IP address, or Netlify may offer to manage your DNS directly if
   you're willing to change your domain's nameservers to theirs — either
   works, Netlify's own instructions at that point are accurate and
   specific to your domain).
3. Add those records at your domain registrar's DNS settings page.
4. DNS changes take anywhere from a few minutes to 24 hours to take effect
   worldwide. Netlify auto-provisions HTTPS (the padlock) once it sees the
   domain pointing correctly — no extra step needed.

### For GitHub Pages

1. At your domain registrar's DNS settings, add these four **A records**
   for `eurorack.fi` (the apex domain, i.e. no `www`):
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
2. In the GitHub repo → **Settings → Pages → Custom domain**, type
   `eurorack.fi` and save. GitHub creates a `CNAME` file in the repo
   automatically.
3. Tick **Enforce HTTPS** once GitHub shows it as available (can take a
   few hours after the DNS change propagates).

Either path, once DNS has propagated, `eurorack.fi` shows the site
directly — no `.netlify.app` or `.github.io` in the address bar.

---

## Which should you pick?

Netlify drag-and-drop if you want it live in the next five minutes and
don't mind manually re-uploading when something changes. GitHub Pages if
you're going to be iterating on this with me over the following weeks —
every change becomes a couple of terminal commands instead of a re-upload,
and it's the more standard setup if you ever want someone else to
contribute.

Either is genuinely free, with no catch, for a static site like this one.
