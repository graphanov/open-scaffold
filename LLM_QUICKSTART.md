# LLM Quickstart — open-scaffold

You are an LLM helping a human add Open Scaffold to a project. Keep the product boundary simple: Open Scaffold is a repo-native work record for AI-assisted work. It records mission, plans, handoffs, evidence, review/gate state, and close decisions as files. It does not run the agent, replace a coordinator, or approve merge/publish/release.

## Capability check

Before anything else, determine whether you can execute shell commands in this session.

- **If yes** (coding agent: Claude Code, Cursor, Codex CLI, Aider, etc.) — run the commands yourself and report output.
- **If no** (chat LLM: ChatGPT, Claude.ai, Gemini web, etc.) — print each command in a fenced block and wait for the user to paste results back before continuing.

State which mode you're in before step 1.

## Step 1 — Start from the target repo

Ask which repository should receive the work record. If the user is already inside the right repository, use it. If not, help them navigate to or clone their own project repository first. Do **not** clone `graphanov/open-scaffold` unless the user explicitly wants the Open Scaffold source checkout.

## Step 2 — Create the first work record

Run the guided first action in the target repo:

```bash
npx open-scaffold@latest first-run
```

The command asks three questions and creates the minimum record: `MISSION.md`, one active plan with acceptance criteria, and an evidence skeleton. The skeleton is not proof of readiness; it is a place to put real command output before closing the slice.

## Step 3 — Verify the structural floor

Run:

```bash
./verify.sh --quick
```

Report the exact output. If it fails, fix only the missing structural item it names: mission, plan, or required scaffold files. Do not pretend the scaffold proves implementation quality.

## Step 4 — Hand off the next session

For the next agent, model, teammate, or future self, run:

```bash
npx open-scaffold@latest handoff
```

`osc handoff` works after a global or local install. `osc resume` is the original alias and may appear in older agent entrypoints; it compiles the same read-only packet. The packet states the mission, current plan, acceptance criteria, evidence state, and next bounded action.

## Optional source-checkout path

Use this only when developing Open Scaffold itself or when npm is unavailable. Build the source checkout, then run its CLI from the target repo so the scaffold files land in the project selected in Step 1:

```bash
TARGET_REPO=/path/to/your/project
OSC_SOURCE=/tmp/open-scaffold-source
git clone https://github.com/graphanov/open-scaffold "$OSC_SOURCE"
cd "$OSC_SOURCE"
npm install
npm run build
cd "$TARGET_REPO"
node "$OSC_SOURCE/dist/cli.js" first-run
```

## Stop condition

Stop when the target repo has a mission, one active plan, a structural verification result, and a handoff packet for the next reader. Do not promise that Open Scaffold has executed the work, certified compliance, or made the project production-ready.
