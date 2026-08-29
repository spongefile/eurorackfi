/* Enforces couplings that are currently held together by a comment saying
 * "reword one, reword both". A comment is not a guard: it only works on
 * someone who reads it, editing the file it is in, at the moment they need
 * it — and this project has already had a link silently deleted by a copy
 * edit made in good faith one lane over.
 *
 * Each rule states a fact that must be true of the source, and fails loudly
 * when it stops being true. Deliberately not a style checker: only pairs
 * where divergence is SILENT and CONSEQUENTIAL belong here.
 *
 *   node scripts/check-shared-strings.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const worker = fs.readFileSync(path.join(root, "oauth-proxy/worker.js"), "utf8");
let failed = false;
const fail = (msg) => { failed = true; console.error("FAIL: " + msg); };

/* DOES IT PARSE AS A MODULE — which is what Cloudflare loads it as. This
   is first because everything below it reads the file as text and would
   happily report success on a worker that cannot start.
   `node --check worker.js` is NOT this check: it parses as a script, and
   it passed a file whose seller-page template literal had been terminated
   early by a backtick inside a comment. The worker was unloadable and the
   syntax gate said fine. */
try {
  await import("data:text/javascript;base64," + Buffer.from(worker).toString("base64"));
  console.log("  worker.js parses and loads as an ES module");
} catch (e) {
  fail("oauth-proxy/worker.js does not load as a module: " + e.message +
    "\n      Nothing below this is trustworthy until it does.");
  console.error("      (a backtick inside the seller page's template literal is the usual cause)");
  process.exit(1);
}

/* ALL THREE LANGUAGES, not just Finnish. When this was written Finnish was
   the only language both surfaces had, so one pair was all it could check —
   but the moment en and sv landed on the seller page it would have gone on
   reporting success while covering a third of what it claims. Widened in
   the same commit that landed them, so the window where that was true is
   zero commits long.

   Extraction is anchored, and JSON.parse'd rather than regex-unescaped: an
   earlier version used a loose /keep:"([^"]+)"/ and matched
   ACK_KEY="eurorackfi:ack:keep:" instead, then cheerfully reported two
   identical strings as different. Loose patterns over source are how this
   class of check lies. */
const PAIRS = [
  { lang: "fi", first: "Vain sinä näet" },
  { lang: "en", first: "Only you can see this page" },
  { lang: "sv", first: "Bara du ser den här sidan" },
];

function pageString(lang, key) {
  const start = worker.indexOf(`  TXT_ALL.${lang}={`);
  if (start < 0) return null;
  const end = worker.indexOf("\n  };", start);
  /* Not anchored to line start: several keys share a line (the tab labels
     are declared three to a line), and a ^-anchored pattern silently
     misses all but the first. Word-boundary before the key is enough —
     key names here never appear inside other identifiers. */
  const m = worker.slice(start, end).match(new RegExp(`\\b${key}:("(?:[^"\\\\]|\\\\.)*")`));
  return m ? JSON.parse(m[1]) : null;
}

for (const { lang, first } of PAIRS) {
  const page = pageString(lang, "keep");
  const mail = worker.match(new RegExp("`(" + first + "[^`\\\\]*)\\\\n`"));
  if (!page) { fail(`no "keep" string for ${lang} on the seller page`); continue; }
  if (!mail) { fail(`no ${lang} secrecy sentence in the seller-link email`); continue; }
  if (page !== mail[1]) {
    fail(
      `the ${lang} secrecy sentence differs between the seller page and the email.\n` +
      "      They are deliberately the same words, so a seller meets the identical\n" +
      "      warning in both places. Reword one, reword both.\n" +
      `        page:  ${JSON.stringify(page)}\n` +
      `        email: ${JSON.stringify(mail[1])}`
    );
  }
}
if (!failed) console.log(`  secrecy sentence: identical in page and email for ${PAIRS.map((p) => p.lang).join(", ")}`);

/* wishLead NAMES the Add tab ("Lisää-välilehdellä", "on the Add tab", "på
   fliken Lägg till") — a same-file pairing: rewording tabAsk without
   rewording wishLead leaves the wishlist pointing sellers at a tab that no
   longer exists by that name. Checked per language. */
for (const lang of ["fi", "en", "sv"]) {
  const tab = pageString(lang, "tabAsk");
  const lead = pageString(lang, "wishLead");
  if (!tab || !lead) { fail(`missing tabAsk or wishLead for ${lang}`); continue; }
  if (!lead.includes(tab)) {
    fail(
      `${lang}: wishLead does not contain the tabAsk label.\n` +
      `        tabAsk:   ${JSON.stringify(tab)}\n` +
      `        wishLead: ${JSON.stringify(lead)}\n` +
      "      The lead names that tab; reword one, reword both."
    );
  }
}
if (!failed) console.log("  wishLead names the Add tab in all three languages");

/* The email's structure is what stops it reading as phishing: every reader
   must meet a fact they can check BEFORE they meet a URL. With three
   languages stacked, that only holds while all three intros precede the
   single link. Regrouping into three complete per-language letters would
   put a bare URL in front of two audiences who had read nothing they could
   verify — and would look like a tidy-up. */
const body = worker.match(/const text =\n([\s\S]*?);\n/);
if (!body) {
  fail("could not find the seller-link email body");
} else {
  const src = body[1];
  const linkAt = src.indexOf("${link}");
  const intros = ["Moi,", "Hi,", "Hej,"];
  const missing = intros.filter((i) => !src.includes(i));
  if (missing.length) {
    fail(`the email is missing an opening for: ${missing.join(", ")} — every reader needs a checkable fact before the link`);
  } else {
    const late = intros.filter((i) => src.indexOf(i) > linkAt);
    if (late.length) {
      fail(
        `these openings come AFTER the link: ${late.join(", ")}.\n` +
        "      All three intros must precede it, or a reader of that language meets\n" +
        "      a bare URL having verified nothing. Do not regroup the mail by language."
      );
    } else {
      console.log("  email: all three openings precede the single link");
    }
  }
}

process.exit(failed ? 1 : 0);
