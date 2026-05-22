# Attempt B prompt-rewrite proof

Attempt B tried a different handoff prompt. It kept quoted-field parsing, still returned a generic malformed-row error, and regressed BOM handling by leaving `﻿name` in the first field.
