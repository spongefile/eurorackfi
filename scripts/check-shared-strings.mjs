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

/* Anchored on the four-space indentation of the TXT block. An earlier
   version of this extraction used a loose /keep:"([^"]+)"/ and matched
   ACK_KEY="eurorackfi:ack:keep:" instead, then cheerfully reported the two
   strings as different. Loose patterns over source are how this class of
   check lies. */
const pageKeep = worker.match(/^ {4}keep:"([^"]+)",\s*$/m);
const mailKeep = worker.match(/`(Vain sinä näet[^`\\]*)\\n`/);

if (!pageKeep) fail("could not find the seller page's TXT.keep line");
if (!mailKeep) fail("could not find the Finnish secrecy sentence in the seller-link email");

if (pageKeep && mailKeep) {
  if (pageKeep[1] !== mailKeep[1]) {
    fail(
      "the Finnish secrecy sentence differs between the seller page and the email.\n" +
      "      They are deliberately the same words, so a seller meets the identical\n" +
      "      warning in both places. Reword one, reword both.\n" +
      `        page:  ${JSON.stringify(pageKeep[1])}\n` +
      `        email: ${JSON.stringify(mailKeep[1])}`
    );
  } else {
    console.log("  secrecy sentence: identical in the seller page and the email");
  }
}

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
