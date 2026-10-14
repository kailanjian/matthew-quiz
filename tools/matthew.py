"""Shared helpers: Matthew verse counts, reference parsing, chapter sections."""
import re

# Verses per chapter (ESV numbering, incl. 17:21, 18:11, 23:14 which the ESV footnotes). Total 1071.
VERSES = [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20]

SECTIONS = [  # (first chapter, last chapter, label)
    (1, 4, 'Birth & preparation (1-4)'),
    (5, 7, 'Sermon on the Mount (5-7)'),
    (8, 10, 'Miracles & mission (8-10)'),
    (11, 13, 'Opposition & parables (11-13)'),
    (14, 18, 'Feedings, confession & community (14-18)'),
    (19, 23, 'Journey & Jerusalem debates (19-23)'),
    (24, 25, 'End of the age (24-25)'),
    (26, 28, 'Passion & resurrection (26-28)'),
]

def section(ch):
    return next(label for a, b, label in SECTIONS if a <= ch <= b)

def verses(ref):
    """'5:1-7:29' / '13:33' / '26:1-5' -> list of (chapter, verse). Raises on invalid refs."""
    m = re.fullmatch(r'(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?', ref.strip())
    if not m: raise ValueError(f'bad ref {ref!r}')
    c1, v1 = int(m[1]), int(m[2])
    c2 = int(m[3]) if m[3] else c1
    v2 = int(m[4]) if m[4] else v1
    out, c, v = [], c1, v1
    while (c, v) <= (c2, v2):
        if not (1 <= c <= 28 and 1 <= v <= VERSES[c - 1]): raise ValueError(f'ref out of range {ref!r}')
        out.append((c, v))
        c, v = (c, v + 1) if v < VERSES[c - 1] else (c + 1, 1)
    return out
