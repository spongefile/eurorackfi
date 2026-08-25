#!/usr/bin/env python3
"""Sync locally-edited .dc.html / canvas.json sources into the published
canvas artifact's embedded appifact-doc record, so republishing the page
carries the current design rather than the snapshot it was built from."""
import re, json, os, sys

REPO = '/Users/tina/eurorackfi'
PAGE = os.path.join(REPO, 'eurorack-fi-listings.html')

s = open(PAGE, encoding='utf-8').read()
m = re.search(r'<script[^>]*id="appifact-doc"[^>]*>', s)
if not m:
    sys.exit('appifact-doc block not found')
start, end = m.end(), s.find('</script>', m.end())
doc = json.loads(s[start:end])
files = doc['content']['files']

changed = []
for name in list(files.keys()):
    if not (name.endswith('.dc.html') or name == 'canvas.json'):
        continue  # leave embedded binary assets alone
    path = os.path.join(REPO, name)
    if not os.path.exists(path):
        print(f'  ! {name}: no local file, left as-is')
        continue
    local = open(path, encoding='utf-8').read()
    if local != files[name]:
        before = len(files[name])
        files[name] = local
        changed.append((name, before, len(local)))

# Drop embedded binary assets no artboard references any more. The canvas
# carries every photo inline as base64, so orphaned ones are pure weight —
# and weight is what makes the published page fail to render.
sources = '\n'.join(v for k, v in files.items()
                    if k.endswith('.dc.html') or k == 'canvas.json')
orphans = [k for k in files
           if not (k.endswith('.dc.html') or k == 'canvas.json')
           and k not in sources]
freed = sum(len(files[k]) for k in orphans)
for k in orphans:
    del files[k]
if orphans:
    print(f'  pruned {len(orphans)} unreferenced assets, {freed:,} chars: '
          + ', '.join(sorted(orphans)))
    changed.append(('<pruned assets>', freed, 0))

if not changed:
    print('No differences — canvas already matches local sources.')
    sys.exit(0)

new_json = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
# the block sits inside a <script>, so a literal </script> in content would
# close it early; the original encodes < as < for exactly this reason
new_json = new_json.replace('<', '\\u003c')
out = s[:start] + '\n' + new_json + '\n' + s[end:]
open(PAGE, 'w', encoding='utf-8').write(out)

for name, before, after in changed:
    print(f'  updated {name}: {before} -> {after} chars')
print(f'\nwrote {PAGE} ({len(out)} bytes)')
