# Plan templates

Open Scaffold templates are optional starting points for common plan shapes.

Use a core template:

```bash
osc plan new 123-fix-login --stage active --from-template bug-fix
```

List templates:

```bash
osc plan new --from-template list
```

Add project-local templates by writing `.osc/plans/templates/custom-<name>.md` with the standard plan headings. Template files may use `REPLACE_ME:` prefixes and angle-bracket placeholders; `osc plan new --from-template` strips the `REPLACE_ME:` prefix when it creates the real plan.

Templates are not mandatory. `osc plan new <slug> --stage active` still creates the blank generic skeleton.
