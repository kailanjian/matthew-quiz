# Matthew Quiz
10 random questions per quiz from a bank of ~400 on the Gospel of Matthew (ESV), modeled on the Bible Quiz app.

Question types: **which chapter** (every story, parable and teaching), **who said / what was the context** (notable quotes), **fill in the blank** (notable verses).
Shortcuts: Cmd/Ctrl+Enter shows the answer; G / P / M grade Got it / Partly / Missed.

## Data
- `data/inventory.json` – 159 stories, parables and teachings. Together they cover every verse of Matthew (1:1–28:20).
- `data/notables.json` – notable quotes (speaker + context), fill-in verses (`[[blank]]` marks the blank), people and places, key events.
- `data/questions.json` – generated; don't edit by hand.

The Index tab in the app lets you browse all of it.

## Commands
- Run locally: `python3 -m http.server`, then open http://localhost:8000
- Rebuild the bank after editing the data: `python3 tools/build_bank.py`
- Validate (verse coverage, refs, bank in sync): `python3 tests/validate_bank.py`

Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.
