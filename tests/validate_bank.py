#!/usr/bin/env python3
"""Validate the Matthew data. Run: python3 tests/validate_bank.py
- every verse of Matthew (1:1-28:20) is covered by at least one inventory passage
- every ref parses and is in range; ids unique
- questions.json is in sync: one question per passage, quote and fill-in verse"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from matthew import VERSES, verses

D = os.path.join(os.path.dirname(__file__), '..', 'data')
inv = json.load(open(os.path.join(D, 'inventory.json')))
nb = json.load(open(os.path.join(D, 'notables.json')))
bank = json.load(open(os.path.join(D, 'questions.json')))
errs = []

covered = set()
for p in inv:
    try: covered |= set(verses(p['ref']))
    except ValueError as e: errs.append(f"{p['id']}: {e}")
    if p['type'] not in ('story', 'parable', 'teaching'): errs.append(f"{p['id']}: bad type")
missing = [(c, v) for c in range(1, 29) for v in range(1, VERSES[c - 1] + 1) if (c, v) not in covered]
if missing: errs.append('uncovered verses: ' + ', '.join(f'{c}:{v}' for c, v in missing))

for kind, items, ref in (('quote', nb['quotes'], 'ref'), ('verse', nb['verses'], 'ref'), ('event', nb['events'], 'ref')):
    for x in items:
        for r in x[ref].split(';'):
            try: verses(r)
            except ValueError as e: errs.append(f'{kind} {x.get("id", x.get("event"))}: {e}')

for name, items in (('inventory', inv), ('quotes', nb['quotes']), ('verses', nb['verses']), ('questions', bank)):
    ids = [x['id'] for x in items]
    if len(ids) != len(set(ids)): errs.append(f'duplicate ids in {name}')

sources = {q['source'] for q in bank}
for x in inv + nb['quotes'] + nb['verses']:
    if x['id'] not in sources: errs.append(f"no question for {x['id']} (rerun tools/build_bank.py)")
for q in bank:
    if not q['question'].strip() or not q['answer'].strip(): errs.append(f"empty question/answer {q['id']}")

total = sum(VERSES)
print(f"{len(inv)} passages covering {len(covered)}/{total} verses; {len(nb['quotes'])} quotes, "
      f"{len(nb['verses'])} fill-in verses, {len(nb['names'])} names, {len(nb['events'])} events; {len(bank)} questions")
print('\n'.join(errs) or 'OK'); sys.exit(1 if errs else 0)
