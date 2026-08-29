/* Guards the how-it-works page's publication gate.
 *
 * The gate in index.html asks two things — is this language listed in
 * `live`, and is its lede written. That is right for deciding whether to
 * publish, but it only inspects ONE string. A language could be published
 * with its lede translated and sixty other strings still empty, and every
 * one of those would silently fall back to English mid-page. Same shape as
 * every other near-miss on this project: a check that answered a narrower
 * question than it appeared to.
 *
 * So this fails the build for any language in `live` that is not COMPLETE,
 * and otherwise just reports how far along each translation is.
 *
 *   node scripts/check-how.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "content/how.json");
const how = JSON.parse(fs.readFileSync(file, "utf8"));
const LANGS = ["en", "fi", "sv"];

/* Every {en,fi,sv} cell in the document, wherever it is nested, with a path
   that names it — so a report says which string rather than just how many. */
function* cells(node, where = "") {
  if (Array.isArray(node)) {
    for (const [i, v] of node.entries()) yield* cells(v, `${where}[${i}]`);
  } else if (node && typeof node === "object") {
    if (LANGS.every((l) => typeof node[l] === "string")) yield [where || "(root)", node];
    else for (const [k, v] of Object.entries(node)) yield* cells(v, where ? `${where}.${k}` : k);
  }
}

const all = [...cells(how)];
const live = Array.isArray(how.live) && how.live.length ? how.live : ["en"];
let failed = false;

console.log(`content/how.json — ${all.length} translatable strings`);
for (const l of LANGS) {
  const missing = all.filter(([, c]) => !c[l].trim());
  const published = live.includes(l);
  const state = published ? "PUBLISHED" : "not published";
  console.log(`  ${l}: ${all.length - missing.length}/${all.length} written, ${state}`);
  if (published && missing.length) {
    failed = true;
    console.error(`\nFAIL: "${l}" is in live but ${missing.length} string(s) are empty.`);
    console.error(`      Every one would fall back to English mid-page. Either translate them`);
    console.error(`      or remove "${l}" from live.`);
    for (const [p, c] of missing.slice(0, 12)) console.error(`        ${p} — en: ${JSON.stringify(c.en.slice(0, 60))}`);
    if (missing.length > 12) console.error(`        …and ${missing.length - 12} more`);
  }
  /* Not a failure — an untranslated string in an unpublished language is
     just work outstanding. Named so it can be finished before publishing. */
  if (!published && missing.length && missing.length <= 12) {
    for (const [p] of missing) console.log(`      still to translate: ${p}`);
  }
}

/* THE CMS CONFIG MUST COVER EVERY KEY. Decap writes back only the fields
   it is configured with, so a key present in how.json but absent from
   admin/config.yml is DELETED the first time the user publishes this file
   from admin — including the _comment keys, which is why those are carried
   as hidden widgets rather than left out. Nothing about that failure is
   visible until the content is already gone from the commit.
   Parsed with python3's yaml rather than a regex over the file: a pattern
   matching `name:` lines would also match the en/fi/sv children and the
   other collections, which is the same too-narrow-scope mistake this whole
   script exists to prevent. */
{
  const { spawnSync } = await import("node:child_process");
  const prog = [
    "import yaml, json, sys",
    "d = yaml.safe_load(open('admin/config.yml'))",
    "hows = [c for c in d['collections'] if c['name'] == 'how']",
    "if not hows: print(json.dumps(None)); sys.exit(0)",
    "f = hows[0]['files'][0]",
    "print(json.dumps([x['name'] for x in f['fields']]))",
  ].join("\n");
  const r = spawnSync("python3", ["-c", prog], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) {
    console.error("\nFAIL: could not read admin/config.yml — " + (r.stderr || "").slice(0, 200));
    failed = true;
  } else {
    const cfg = JSON.parse(r.stdout);
    if (cfg === null) {
      console.error("\nFAIL: admin/config.yml has no \"how\" collection, so content/how.json");
      console.error("      cannot be edited in admin at all.");
      failed = true;
    } else {
      const inCfg = new Set(cfg);
      const missing = Object.keys(how).filter((k) => !inCfg.has(k));
      const extra = cfg.filter((k) => !(k in how));
      if (missing.length) {
        failed = true;
        console.error(`\nFAIL: ${missing.length} key(s) in content/how.json are missing from the`);
        console.error(`      "how" collection in admin/config.yml. Publishing that file from admin`);
        console.error(`      would DELETE them: ${missing.join(", ")}`);
      }
      if (extra.length) {
        failed = true;
        console.error(`\nFAIL: admin/config.yml configures key(s) that do not exist in`);
        console.error(`      content/how.json: ${extra.join(", ")}`);
      }
      if (!missing.length && !extra.length) {
        console.log(`  admin/config.yml covers all ${cfg.length} keys`);
      }
    }
  }
}

if (!live.includes("en")) {
  failed = true;
  console.error(`\nFAIL: "en" is not in live. English is the fallback every other language`);
  console.error(`      relies on, so removing it leaves the page with nothing to fall back to.`);
}

process.exit(failed ? 1 : 0);
