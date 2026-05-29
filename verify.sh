#!/usr/bin/env bash
# open-scaffold compliance checker
# Configurable tiers: --quick, --standard (default), --strict
# Exit 0 = all pass, exit 1 = any fail
# Tested on macOS system bash (3.2). No GNU-only flags. No external dependencies.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TIER="--standard"
QUIET=false
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

print_help() {
  printf '%s\n' \
    'Usage: ./verify.sh [--quick|--standard|--strict] [--quiet] [--help]' \
    '' \
    'Tiers:' \
    '  --quick      Mission and plan presence checks.' \
    '  --standard   Quick checks plus amendment and changelog checks. Default.' \
    '  --strict     Standard checks plus schema, drift, immutability, evidence, and stale-state checks.' \
    '' \
    'Options:' \
    '  --quiet      Suppress pass/warn output; failures still print.' \
    '  -h, --help   Print this usage text and exit 0.' \
    '' \
    'Exit codes:' \
    '  0  All checks passed.' \
    '  1  One or more checks failed.' \
    '  2  Invalid option.'
}

# Parse flags (order-independent, bash 3.2 compatible)
for arg in "$@"; do
  case "$arg" in
    -h|--help|help) print_help; exit 0 ;;
    --quick|--standard|--strict) TIER="$arg" ;;
    --quiet) QUIET=true ;;
    *) printf 'Unknown flag: %s\n' "$arg" >&2; print_help >&2; exit 2 ;;
  esac
done

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  if [ "$QUIET" = false ]; then
    printf '  \033[32mPASS\033[0m  %s\n' "$1"
  fi
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf '  \033[31mFAIL\033[0m  %s\n' "$1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  if [ "$QUIET" = false ]; then
    printf '  \033[33mWARN\033[0m  %s\n' "$1"
  fi
}

has_exact_markdown_heading() {
  file="$1"
  expected="$2"
  awk -v expected="$expected" '
    function trim(s) {
      sub(/^[ \t]+/, "", s)
      sub(/[ \t]+$/, "", s)
      return s
    }
    function normalize(s) {
      s = trim(s)
      sub(/[ \t]+#+[ \t]*$/, "", s)
      s = trim(s)
      gsub(/[ \t]+/, " ", s)
      return s
    }
    function marker_run(line, marker,    i, count) {
      count = 0
      for (i = 1; i <= length(line); i += 1) {
        if (substr(line, i, 1) == marker) count += 1
        else break
      }
      return count
    }
    function only_trailing_space(line, start,    i, ch) {
      for (i = start; i <= length(line); i += 1) {
        ch = substr(line, i, 1)
        if (ch != " " && ch != "\t") return 0
      }
      return 1
    }
    function open_fence(line,    marker, count) {
      marker = substr(line, 1, 1)
      if (marker != "`" && marker != "~") return 0
      count = marker_run(line, marker)
      if (count < 3) return 0
      fence_marker = marker
      fence_count = count
      return 1
    }
    function close_fence(line,    marker, count) {
      marker = substr(line, 1, 1)
      if (marker != fence_marker) return 0
      count = marker_run(line, marker)
      return count >= fence_count && only_trailing_space(line, count + 1)
    }
    function section_heading(line,    heading) {
      if (line !~ /^##[ \t]+/) return ""
      heading = line
      sub(/^##[ \t]+/, "", heading)
      heading = normalize(heading)
      return heading
    }
    {
      line = $0
      sub(/\r$/, "", line)
      if (in_fence) {
        if (close_fence(line)) in_fence = 0
        next
      }
      if (open_fence(line)) {
        in_fence = 1
        next
      }
      heading = section_heading(line)
      if (heading == expected) found = 1
    }
    END { exit found ? 0 : 1 }
  ' "$file"
}

# ──────────────────────────────────────────
# QUICK tier: mission + plan (2 checks)
# ──────────────────────────────────────────

if [ "$QUIET" = false ]; then
  printf '\n  open-scaffold compliance check (%s)\n\n' "$TIER"
fi

# Check 1: Mission defined
MISSION_DEFINED=false
if [ -f "$ROOT/MISSION.md" ]; then
  if grep -Fq 'mission:unset' "$ROOT/MISSION.md"; then
    fail "Mission not defined (MISSION.md contains <!-- mission:unset --> marker)"
  else
    pass "Mission defined"
    MISSION_DEFINED=true
  fi
else
  fail "MISSION.md not found"
fi

# Check 2: At least one plan file exists (beyond template and README)
# Gated on mission: skip plan check until mission is defined (progressive disclosure)
if [ "$MISSION_DEFINED" = true ]; then
  PLAN_COUNT=0
  if [ -d "$ROOT/.osc/plans" ]; then
    for dir in "$ROOT/.osc/plans/active" "$ROOT/.osc/plans/backlog" "$ROOT/.osc/plans/blocked" "$ROOT/.osc/plans/done" "$ROOT/.osc/plans"; do
      [ -d "$dir" ] || continue
      for f in "$dir"/*.md; do
        [ -f "$f" ] || continue
        basename=$(basename "$f")
        if [ "$basename" != "README.md" ] && [ "$basename" != "handoff-template.md" ] && [ "$basename" != "WORKFLOW.md" ]; then
          PLAN_COUNT=$((PLAN_COUNT + 1))
        fi
      done
    done
  fi

  if [ "$PLAN_COUNT" -gt 0 ]; then
    pass "Plan file(s) found ($PLAN_COUNT in .osc/plans/)"
  else
    fail "No plan files found in .osc/plans/ (only template and README)"
  fi
fi

# ──────────────────────────────────────────
# STANDARD tier: + amendments + changelog (2 checks)
# ──────────────────────────────────────────

if [ "$TIER" = "--standard" ] || [ "$TIER" = "--strict" ]; then

  # Check 3: Amendment numbering is sequential per plan slug
  AMEND_OK=true
  for dir in "$ROOT/.osc/plans/active" "$ROOT/.osc/plans/backlog" "$ROOT/.osc/plans/blocked" "$ROOT/.osc/plans/done" "$ROOT/.osc/plans"; do
    [ -d "$dir" ] || continue
    for f in "$dir"/*-amendment-*.md; do
      [ -f "$f" ] || continue
      basename=$(basename "$f" .md)
      num=$(printf '%s' "$basename" | sed 's/.*-amendment-//')
      slug=$(printf '%s' "$basename" | sed 's/-amendment-.*//')
      if [ "$num" -gt 1 ]; then
        prev=$((num - 1))
        if [ ! -f "$dir/${slug}-amendment-${prev}.md" ]; then
          warn "Amendment gap: ${slug}-amendment-${num}.md exists but ${slug}-amendment-${prev}.md is missing"
          AMEND_OK=false
        fi
      fi
    done
  done
  if $AMEND_OK; then
    pass "Amendment numbering is sequential (no gaps)"
  fi

  # Check 4: Changelog entry for each amendment
  CHANGELOG_OK=true
  for dir in "$ROOT/.osc/plans/active" "$ROOT/.osc/plans/backlog" "$ROOT/.osc/plans/blocked" "$ROOT/.osc/plans/done" "$ROOT/.osc/plans"; do
    [ -d "$dir" ] || continue
    for f in "$dir"/*-amendment-*.md; do
      [ -f "$f" ] || continue
      basename=$(basename "$f")
      if [ -f "$ROOT/MISSION.md" ]; then
        if ! grep -Fq "$basename" "$ROOT/MISSION.md"; then
          warn "No changelog entry in MISSION.md for $basename"
          CHANGELOG_OK=false
        fi
      fi
    done
  done
  if $CHANGELOG_OK; then
    pass "Changelog entries match amendment files"
  fi
fi

# ──────────────────────────────────────────
# STRICT tier: + schema + drift + immutability (3 checks)
# ──────────────────────────────────────────

if [ "$TIER" = "--strict" ]; then

  # Check 5: Plan files contain all 8 required sections from handoff template
  SCHEMA_OK=true
  for dir in "$ROOT/.osc/plans/active" "$ROOT/.osc/plans/backlog" "$ROOT/.osc/plans/blocked" "$ROOT/.osc/plans/done" "$ROOT/.osc/plans"; do
    [ -d "$dir" ] || continue
    for f in "$dir"/*.md; do
      [ -f "$f" ] || continue
      basename=$(basename "$f")
      # Skip template, README, WORKFLOW, and amendment files
      if [ "$basename" = "README.md" ] || [ "$basename" = "handoff-template.md" ] || [ "$basename" = "WORKFLOW.md" ]; then
        continue
      fi
      case "$basename" in
        *-amendment-*) continue ;;
      esac
      # Presence-only pre-flight: exact canonical H2 section names, case-sensitive,
      # fence-aware. Order, emptiness, and content authority stay in validatePlanFile.
      for section in "Status" "Context" "Goal" "Constraints / Out of scope" "Files to touch" "Acceptance criteria" "Verification steps" "Open questions"; do
        if ! has_exact_markdown_heading "$f" "$section"; then
          warn "Plan $basename missing section: $section"
          SCHEMA_OK=false
        fi
      done
    done
  done
  if $SCHEMA_OK; then
    pass "Plan files contain all 8 required sections"
  fi

  # Check 6: CLAUDE.md and AGENTS.md both contain "Layered architecture" section
  DRIFT_OK=true
  if [ -f "$ROOT/CLAUDE.md" ]; then
    if ! grep -q '## Layered architecture' "$ROOT/CLAUDE.md"; then
      warn "CLAUDE.md missing 'Layered architecture' section (paired view drift)"
      DRIFT_OK=false
    fi
  fi
  if [ -f "$ROOT/AGENTS.md" ]; then
    if ! grep -q '## Layered architecture' "$ROOT/AGENTS.md"; then
      warn "AGENTS.md missing 'Layered architecture' section (paired view drift)"
      DRIFT_OK=false
    fi
  fi
  if $DRIFT_OK; then
    pass "CLAUDE.md and AGENTS.md paired view sync (Layered architecture)"
  fi

  # Check 7: Plan immutability — plan files (non-amendment, non-template) not modified after initial commit
  if command -v git > /dev/null 2>&1 && [ -d "$ROOT/.git" ]; then
    IMMUTABLE_OK=true
    for dir in "$ROOT/.osc/plans/active" "$ROOT/.osc/plans/backlog" "$ROOT/.osc/plans/blocked" "$ROOT/.osc/plans/done" "$ROOT/.osc/plans"; do
      [ -d "$dir" ] || continue
      for f in "$dir"/*.md; do
        [ -f "$f" ] || continue
        basename=$(basename "$f")
        if [ "$basename" = "README.md" ] || [ "$basename" = "handoff-template.md" ] || [ "$basename" = "WORKFLOW.md" ]; then
          continue
        fi
        case "$basename" in
          *-amendment-*) continue ;;
        esac
        relpath=$(python3 -c 'import os, sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))' "$f" "$ROOT" 2>/dev/null || printf '%s' "${f#"$ROOT"/}")
        # Count commits that modified this file's content (renames/moves during close are allowed)
        commit_count=$(git -C "$ROOT" log --oneline --diff-filter=M --follow -- "$relpath" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$commit_count" -gt 0 ]; then
          warn "Plan $basename was modified after initial commit ($commit_count content-modifying commit(s))"
          IMMUTABLE_OK=false
        fi
      done
    done
    if $IMMUTABLE_OK; then
      pass "Plan immutability intact (no post-commit edits)"
    fi
  else
    warn "Plan immutability check skipped (not a git repository or git not available)"
  fi

  # Check 8: Execution Strategy section structure (conditional — only if section is present)
  # This check validates internal structure, not presence. Plans without an Execution
  # Strategy section are valid (the section is optional).
  EXEC_STRATEGY_CHECKED=false
  EXEC_STRATEGY_OK=true
  for dir in "$ROOT/.osc/plans/active" "$ROOT/.osc/plans/backlog" "$ROOT/.osc/plans/blocked" "$ROOT/.osc/plans/done" "$ROOT/.osc/plans"; do
    [ -d "$dir" ] || continue
    for f in "$dir"/*.md; do
      [ -f "$f" ] || continue
      basename=$(basename "$f")
      # Skip template, README, WORKFLOW, and amendment files
      if [ "$basename" = "README.md" ] || [ "$basename" = "handoff-template.md" ] || [ "$basename" = "WORKFLOW.md" ]; then
        continue
      fi
      case "$basename" in
        *-amendment-*) continue ;;
      esac
      # Only check if the plan has an Execution Strategy section
      if grep -qi '^## Execution strategy' "$f"; then
        EXEC_STRATEGY_CHECKED=true
        if ! grep -qi '^### Parallel groups' "$f"; then
          warn "Plan $basename has Execution Strategy but missing sub-heading: ### Parallel groups"
          EXEC_STRATEGY_OK=false
        fi
        if ! grep -qi '^### Dependencies' "$f"; then
          warn "Plan $basename has Execution Strategy but missing sub-heading: ### Dependencies"
          EXEC_STRATEGY_OK=false
        fi
      fi
    done
  done
  if $EXEC_STRATEGY_CHECKED && $EXEC_STRATEGY_OK; then
    pass "Execution Strategy section structure valid (where present)"
  fi
fi

# STANDARD/STRICT shared checks: release/evidence notes + stale active-plan heuristics.
# Keep --quick focused on only the mission and plan-presence gates so first-run
# failures stay progressively disclosed.
if [ "$TIER" = "--standard" ] || [ "$TIER" = "--strict" ]; then

  # Check 9: Official release/evidence directory exists and release notes have core sections
  RELEASES_OK=true
  if [ ! -d "$ROOT/.osc/releases" ]; then
    warn ".osc/releases/ directory missing (official release/evidence note location)"
    RELEASES_OK=false
  elif [ ! -f "$ROOT/.osc/releases/README.md" ]; then
    warn ".osc/releases/README.md missing"
    RELEASES_OK=false
  else
    for f in "$ROOT/.osc/releases"/*.md; do
      [ -f "$f" ] || continue
      basename=$(basename "$f")
      [ "$basename" = "README.md" ] && continue
      for section in "Summary" "Traceability" "Verification" "Outcome"; do
        if [ "$section" = "Traceability" ]; then
          if ! has_exact_markdown_heading "$f" "Traceability" && ! has_exact_markdown_heading "$f" "Traceability chain"; then
            warn "Release note $basename missing section: $section"
            RELEASES_OK=false
          fi
        elif ! has_exact_markdown_heading "$f" "$section"; then
          warn "Release note $basename missing section: $section"
          RELEASES_OK=false
        fi
      done
      if grep -qi 'pending' "$f" && grep -Eqi '(PR #[0-9]+ merged|issue #[0-9]+ closed|Tag:[[:space:]]*v[0-9]|GitHub Release:[[:space:]]*https?://)' "$f"; then
        warn "Release note $basename still says pending while citing merged/closed/released evidence"
        RELEASES_OK=false
      fi
      if grep -Eq '[0-9]{8}T[0-9]{6}Z-[a-z0-9-]+' "$f" && ! grep -Eqi '(PR #[0-9]+|Pull Request|github.com/.*/pull/[0-9]+)' "$f"; then
        warn "Release note $basename cites a run id but no PR reference"
        RELEASES_OK=false
      fi
    done
  fi
  if $RELEASES_OK; then
    pass "Release/evidence notes have required local structure"
  fi

  # Check 10: Active plan stale-state heuristic (local-only, no network)
  STALE_OK=true
  STALE_DAYS="${OSC_STALE_DAYS:-30}"
  NOW_EPOCH=$(date +%s)
  for f in "$ROOT/.osc/plans/active"/*.md; do
    [ -f "$f" ] || continue
    basename=$(basename "$f")
    case "$basename" in
      README.md|WORKFLOW.md|handoff-template.md|*-amendment-*) continue ;;
    esac
    # GNU stat first, BSD/macOS stat fallback. GNU `stat -f %m` succeeds but returns filesystem text.
    MTIME=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || printf '%s' "$NOW_EPOCH")
    case "$MTIME" in
      ''|*[!0-9]*) MTIME="$NOW_EPOCH" ;;
    esac
    AGE_DAYS=$(( (NOW_EPOCH - MTIME) / 86400 ))
    if [ "$AGE_DAYS" -gt "$STALE_DAYS" ]; then
      warn "Active plan $basename has not changed for $AGE_DAYS days (threshold $STALE_DAYS)"
      STALE_OK=false
    fi
    if grep -Eqi '(PR #[0-9]+ (merged|closed)|merged PR #[0-9]+|issue #[0-9]+ closed)' "$f"; then
      warn "Active plan $basename appears to cite merged/closed evidence; consider moving it to done/"
      STALE_OK=false
    fi
  done
  if $STALE_OK; then
    pass "Active plan stale-state heuristic clean"
  fi
fi

# ──────────────────────────────────────────
# Summary
# ──────────────────────────────────────────

if [ "$QUIET" = false ] || [ "$FAIL_COUNT" -gt 0 ]; then
  printf '\n  ─────────────────────────────────\n'
  printf '  %s pass, %s fail, %s warn\n\n' "$PASS_COUNT" "$FAIL_COUNT" "$WARN_COUNT"
fi
if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
else
  exit 0
fi
