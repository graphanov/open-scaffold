# Auditability boundary

Open Scaffold makes AI-assisted work easier to inspect because the work record lives with the project files. For code, that can mean beside the implementation; for other AI-developed work, it means beside the source materials, outputs, decisions, and evidence.

It is an **evidence substrate**: a structured place for goals, plans, handoffs, receipts, verification notes, amendments, approvals, and lessons. It is not a compliance program, a legal assurance product, or a replacement for review by qualified humans.

## What Open Scaffold can prove structurally

Open Scaffold can help a reviewer answer these questions from the repository:

- What goal or mission was this work supposed to serve?
- Which plan defined the scope, constraints, files, and acceptance criteria?
- Which handoff package was given to an agent, runtime, teammate, or future session?
- Which evidence note records checks, outputs, approvals, and remaining gates?
- Which amendments explain scope changes after the plan was committed?
- Which comparison or frontier rationale explains why one attempt was kept over another?

That record is useful because it is version-controlled, reviewable, and close to the project materials, outputs, and decisions it describes.

## What Open Scaffold does not prove by itself

Open Scaffold **does not prove the work is correct**. A plan can be weak, a test can miss the bug, a human can approve the wrong thing, and an agent can produce bad output with a tidy receipt.

Open Scaffold also does not provide:

- access control;
- encryption or secret management;
- legal sign-off;
- SOC 2, ISO 27001, HIPAA, GDPR, or other compliance program controls;
- auditor relationships;
- automatic security review;
- runtime certification;
- guaranteed model quality.

Those responsibilities remain with the team, its tools, its reviewers, and its formal governance process.

## The useful boundary

The practical promise is narrower and stronger:

```text
Open Scaffold records the chain.
Humans and verification tools judge the chain.
Formal programs govern the organization around the chain.
```

For example, a good Open Scaffold record can show:

```text
mission -> plan -> handoff -> receipt -> evidence -> human approval -> release note
```

That chain can support an audit, client review, postmortem, or handoff because it reduces reconstruction work. It does not replace the audit, client review, postmortem, or approval process.

## How to use it responsibly

- Keep plans specific enough that acceptance criteria can be checked.
- Record real verification commands and outputs, not vibes.
- Treat human approval as a visible gate, not a hidden assumption.
- Write amendments when scope changes instead of rewriting committed plans.
- Keep private credentials, raw transcripts, and unrelated chat history out of public repo truth.
- Escalate security, legal, regulatory, and production-risk decisions to the responsible humans.

The repo record is valuable because it is boring, inspectable, and repeatable. That is the foundation; the surrounding assurance program is still your responsibility.
