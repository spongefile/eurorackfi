/* Guards the one failure design flagged as silent: wantKey() exists in BOTH
 * index.html and oauth-proxy/worker.js, and if the two ever disagree a want
 * hidden on the seller page stays visible on the public site — with nothing
 * to announce it. There is no build step between the two documents, so they
 * cannot share the function; this proves they still agree instead.
 *
 * Extracts both implementations from source, runs them over every want in
 * content/sellers/*.json plus a set of adversarial shapes, and fails on any
 * disagreement. Also fails on a key collision within one seller, which would
 * make two wants toggle as one.
 *
 *   node scripts/check-wantkey.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = (msg) => { console.error("FAIL: " + msg); process.exitCode = 1; };

/* Extracts EVERY definition in a file, not the first. The first version of
   this script took only indexOf(...) and so tested worker.js's module-level
   copy while the seller page ran a second, separate one — it passed a
   deliberately injected divergence. If a file ever grows another copy, this
   picks it up rather than quietly ignoring it. */
function extractAll(file) {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  const out = [];
  const re = /function wantKey\s*\(\s*w\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 0, i = src.indexOf("{", m.index);
    const from = i;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) { i++; break; }
    }
    const body = src.slice(from, i).replace(/^\{/, "").replace(/\}$/, "");
    out.push({ file, line: src.slice(0, m.index).split("\n").length, fn: new Function("w", body) });
  }
  return out;
}

const impls = [...extractAll("index.html"), ...extractAll("oauth-proxy/worker.js")];
if (impls.length < 2) fail(`expected at least 2 wantKey implementations, found ${impls.length}`);
if (process.exitCode) process.exit(1);
const [a, b] = [impls[0].fn, impls[1].fn];

const cases = [];
const dir = path.join(root, "content/sellers");
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".json"))) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const keys = new Map();
  for (const w of d.wants || []) {
    cases.push(w);
    const k = a(w);
    if (!String(k).trim()) fail(`${f}: a want produced an empty key: ${JSON.stringify(w)}`);
    if (keys.has(k)) fail(`${f}: key collision "${k}" — these two wants would toggle together`);
    keys.set(k, w);
  }
}

/* Shapes the live data doesn't currently contain but the code must survive:
   Decap's typed variants, hand-authored plain objects, and junk. */
cases.push(
  "a bare string",
  { type: "placeholder", text: "quad VCA" },
  { type: "product", mfr: "Make Noise", name: "Maths", hp: 20 },
  { mfr: "Instruo", name: "øchd" },
  { text: "" }, { mfr: "", name: "" }, {}, null, undefined, 42,
);

/* THE RECONCILE JOB HAS A FOURTH COPY, in Python, inside a YAML heredoc.
   It decides what gets written to git, so a divergence there is the most
   durable of all — it would persist a wrong hidden flag into the repo.
   Extracted and run through python3 over the same cases. Skipped, loudly,
   if python3 is unavailable rather than silently passing. */
{
  const yml = fs.readFileSync(path.join(root, ".github/workflows/seller-state.yml"), "utf8");
  const m = yml.match(/^([ \t]*)def want_key\(w\):\n([\s\S]*?)\n\n/m);
  if (!m) {
    fail("want_key not found in .github/workflows/seller-state.yml");
  } else {
    // dedent by the def line's own indentation, so the body keeps its
    // relative structure and python sees a top-level function
    const indent = m[1].length;
    const fn = ("def want_key(w):\n" + m[2]).split("\n")
      .map((l, i) => (i === 0 ? l : l.slice(indent))).join("\n");
    const prog = fn + "\nimport json,sys\n" +
      "print(json.dumps([want_key(c) for c in json.loads(sys.argv[1])]))\n";
    const { spawnSync } = await import("node:child_process");
    /* null/undefined are excluded from the CROSS-LANGUAGE comparison only.
       They disagree for a reason that isn't a divergence — str(None) is
       "None" where String(null) is "null" — and they cannot occur here: the
       reconcile job iterates real want entries and skips anything that
       isn't a dict before this is called. The JS implementations are still
       compared on them below, where they share a runtime and it means
       something. */
    const pyCases = cases.filter((c) => c !== null && c !== undefined);
    const r = spawnSync("python3", ["-c", prog, JSON.stringify(pyCases)], { encoding: "utf8" });
    if (r.status !== 0) {
      fail("could not run the reconcile job's want_key: " + (r.stderr || "").slice(0, 300));
    } else {
      const pyKeys = JSON.parse(r.stdout);
      pyCases.forEach((w, i) => {
        const ref = impls[0].fn(w);
        if (pyKeys[i] !== ref) {
          fail(`want_key in seller-state.yml disagrees on ${JSON.stringify(w)}: ` +
            `JS gave ${JSON.stringify(ref)}, Python gave ${JSON.stringify(pyKeys[i])}`);
        }
      });
      if (!process.exitCode) console.log("     .github/workflows/seller-state.yml (python) agrees too");
    }
  }
}

/* Every implementation against every other, not just the first pair. */
for (const w of cases) {
  const ref = impls[0].fn(w);
  for (const impl of impls.slice(1)) {
    const got = impl.fn(w);
    if (got !== ref) {
      fail(`wantKey disagrees on ${JSON.stringify(w)}: ` +
        `${impls[0].file}:${impls[0].line} gave ${JSON.stringify(ref)}, ` +
        `${impl.file}:${impl.line} gave ${JSON.stringify(got)}`);
    }
  }
}

if (!process.exitCode) {
  console.log(`ok — ${impls.length} wantKey implementations agree across ${cases.length} shapes ` +
    `(${cases.length - 10} live wants, 10 adversarial), no collisions`);
  for (const i of impls) console.log(`     ${i.file}:${i.line}`);
}
