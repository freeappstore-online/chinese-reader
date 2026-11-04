"""Pack the pinned Hanzi Writer dataset into small, independently loadable gzip shards.
Usage: python3 scripts/prepare-strokes.py /path/to/hanzi-writer-data-2.0.1.tgz
Source: https://registry.npmjs.org/hanzi-writer-data/-/hanzi-writer-data-2.0.1.tgz
"""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import tarfile

archive = Path(sys.argv[1])
assert hashlib.sha256(archive.read_bytes()).hexdigest() == '72baf3d82b114e60d6e40ea05f24d2262a05cd39d544e2f322ba2fceb7beff15'
packs = [{} for _ in range(32)]
with tarfile.open(archive) as source:
    for member in source:
        name = Path(member.name)
        if name.suffix == '.json' and len(name.stem) == 1:
            data = json.load(source.extractfile(member))
            assert data['strokes'] and len(data['strokes']) == len(data['medians'])
            packs[ord(name.stem) % 32][name.stem] = data
out = Path('web/public/strokes/v2')
out.mkdir(parents=True, exist_ok=True)
for i, pack in enumerate(packs):
    raw = json.dumps(pack, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode()
    (out / f'{i:02x}.bin').write_bytes(gzip.compress(raw, mtime=0))
print(f'{sum(map(len, packs))} characters; {sum(p.stat().st_size for p in out.glob("*.bin")):,} bytes')
