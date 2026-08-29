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

if (!live.includes("en")) {
  failed = true;
  console.error(`\nFAIL: "en" is not in live. English is the fallback every other language`);
  console.error(`      relies on, so removing it leaves the page with nothing to fall back to.`);
}

process.exit(failed ? 1 : 0);
