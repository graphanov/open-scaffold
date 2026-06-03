# Adoption proof index

This index is for honest external adoption evidence. It is not a marketing claim list. Every proof entry should include reproduction commands, caveats, friction, and the boundary of what was actually verified.

## Labels

- `owner-created` — created by the project owner or core maintainer.
- `third-party` — created by someone outside the core maintainer/operator loop.
- `production` — used in a real production workflow with meaningful stakes.
- `demo` — illustrative or canned example.
- `reproducible` — clone/install/test/trace commands were run and recorded.
- `partial` — adoption covered only part of the Open Scaffold loop.
- `local-only` — proof used local files/commands only; no network/runtime side effects.
- `no-spawn` — proof did not launch provider agents or runtime harnesses.

## Proof entries

| Date | Project | Labels | Reproduction | Evidence | Caveats |
|---|---|---|---|---|---|
| TBD | TBD | `demo`, `local-only`, `no-spawn` | See [`docs/ADOPTION_PROOF_TEMPLATE.md`](ADOPTION_PROOF_TEMPLATE.md). | TBD | Placeholder only; not an adoption claim. |

## Minimum reproduction fields

Each entry must provide:

1. Clone/install command.
2. Verification command.
3. Trace or PR-check command.
4. Evidence path or public PR link.
5. Friction/caveats.
6. Boundary statement: what this proof does and does not prove.

Do not add third-party or production labels without evidence that supports those labels.
