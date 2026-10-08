# Historical section-parser corpus, v1

This is the complete historical characterization input for plan 187. It preserves
the coverage introduced by plan 130 while allowing clean live work-record additions
and status-aligned closures without changing historical goldens.

The qualified source is commit `6140a7bb1d40ecd226e7dcce07bbd6a49c613f16`,
tree `192509906ee59789d534f6ec8deaa8a0d8d5ed9d`. Commit `46e2169` has the same
tree. The corpus contains all 356 Markdown documents selected by the original
recursive `.osc/plans` and `.osc/releases` walkers, including support files,
templates and amendments. Document order is sorted plan paths followed by sorted
release paths, with `/` separators. Its raw document content totals 1,369,930 bytes.

`corpus.json` stores each original path, raw UTF-8 Markdown, byte SHA-256 and the
complete ordered `[heading, body]` entries from the qualified canonical parser:
2,505 sections, with no section-body sampling. JSON escaping does not normalize
the Markdown; every decoded input was checked for exact UTF-8 byte round-trip and
against `git show <commit>:<path>`. `MISSION.md` and `ROADMAP.md` are separate
fixed context inputs so scaffold validation sees the same mission and references.
Tests materialize those inputs and all document paths in a disposable root and
remove that root afterward. Active-plan mtime warnings remain outside the original
release-only outcome scope.

The full outcomes preserve the original selection and order: 184 plan rows
(excluding support filenames and `-amendment-` files), 133 release rows (excluding
`README.md`) and zero scaffold failures. Empty diagnostic arrays remain in these
historical rows. The original hashes are unchanged:

- Plans: `28947bb75314e49864005b6e2e1cae558a3ececf4d0d3b50ac2a771379a4fdef`.
- Failures and releases: `7674094b90e6b7f39e09036331fa03c7304d383b4f275fce0a1b44b851aa24a6`.

Generation was a reviewed, one-time collection from a clean `git archive` of the
qualified commit, using that archive's `splitSections`, `validatePlanFile` and
`validateScaffold`. The collector walked every selected file, checked bytes against
Git, recorded the complete maps and outcomes, and checked both existing hashes
before the test assertion routing changed. A second collection from only the
materialized fixture reproduced the complete outcomes. A separate read-only peer
independently checked membership, bytes, source digests, maps and outcomes.
The `provenance` object records source identities and SHA-256 values of JSON-encoded
membership, input manifests, ordered maps and outcomes. Independent constants in
the test pin that metadata and recompute the digests.

To inspect the qualified source without moving the working checkout:

```sh
git archive 6140a7bb1d40ecd226e7dcce07bbd6a49c613f16 --output=/tmp/osc-parser-v1.tar
mkdir -p /tmp/osc-parser-v1-source
tar -xf /tmp/osc-parser-v1.tar -C /tmp/osc-parser-v1-source
```

To independently verify complete membership and input bytes from the repository
root, then exercise maps, outcomes, integrity and live mutation controls:

```sh
python3 - <<'PY'
import hashlib, json, pathlib, subprocess
fixture = json.loads(pathlib.Path('tests/fixtures/section-parser-corpus/v1/corpus.json').read_text())
commit = fixture['provenance']['commit']
tree = subprocess.check_output(['git', 'rev-parse', commit + '^{tree}'], text=True).strip()
assert tree == '192509906ee59789d534f6ec8deaa8a0d8d5ed9d'
paths = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', commit], text=True).splitlines()
expected = [path for prefix in ['.osc/plans/', '.osc/releases/']
            for path in sorted(paths) if path.startswith(prefix) and path.endswith('.md')]
assert [doc['path'] for doc in fixture['documents']] == expected
assert len(expected) == 356
assert sum(len(doc['markdown'].encode('utf-8')) for doc in fixture['documents']) == 1369930
for doc in fixture['context'] + fixture['documents']:
    raw = subprocess.check_output(['git', 'show', commit + ':' + doc['path']])
    assert doc['markdown'].encode('utf-8') == raw, doc['path']
    assert hashlib.sha256(raw).hexdigest() == doc['sha256'], doc['path']
print('All 356 historical documents and fixed context match the qualified Git tree.')
PY
npm test -- tests/section-parser.test.ts
```

This fixture is immutable expected data. Tests never regenerate it or consult Git
to refresh it. Omission, byte edits, changed expected bodies/order or historical
diagnostics must fail. An intentional parser or validator contract change needs
explicit review of the affected historical expectations and independent pins.
New canonical syntax belongs in focused tests, not an automatic corpus refresh.

`../live-diagnostics.json` is a separate reviewed baseline of complete nonempty
live plan issue and release warning rows. Every current plan is validated and
scaffold failures are rejected; only rows with empty diagnostic arrays are omitted
from live equality. Severity, line, rule, suggestion, level, code, message and
paths are preserved wherever present. New, changed or removed diagnostics require
review. In particular, note 184's missing-publication warning stays present until
real publication evidence warrants a deliberate live-baseline update.
