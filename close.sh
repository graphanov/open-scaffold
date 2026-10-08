#!/usr/bin/env bash
# open-scaffold plan closer
# Moves a plan (and its amendments) to done/ and stamps MISSION.md changelog.
#
# Usage: ./close.sh <plan-slug> [--stage] [--message "<text>"]
# Exit 0 = success, 1 = precondition/usage failure, 2 = unknown flag.
# Tested on macOS system bash (3.2). No GNU-only flags. No external dependencies.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PLANS_DIR="$ROOT/.osc/plans"
DONE_DIR="$PLANS_DIR/done"
MISSION="$ROOT/MISSION.md"
TODAY="$(date +%Y-%m-%d)"
STATUS_TMP=""
trap 'if [ -n "$STATUS_TMP" ]; then rm -f "$STATUS_TMP"; fi' EXIT

# Update only the genuine Status stage token; fenced examples stay untouched.
# Exit 2 means unchanged (including legacy plans without a Status section).
closed_plan_status() {
  awk '
    function fence_run(line,    marker, n) {
      marker = substr(line, 1, 1)
      if (marker != "`" && marker != "~") return 0
      for (n = 1; substr(line, n, 1) == marker; n += 1) {}
      return n - 1
    }
    {
      raw = $0
      line = raw
      sub(/\r$/, "", line)
      run = fence_run(line)
      if (in_fence) {
        print raw
        if (substr(line, 1, 1) == fence_marker && run >= fence_count && substr(line, run + 1) ~ /^[ \t]*$/) in_fence = 0
        next
      }
      if (run >= 3) {
        if (in_status && !status_seen) invalid = 1
        in_fence = 1
        fence_marker = substr(line, 1, 1)
        fence_count = run
      } else if (line ~ /^##[ \t]+/) {
        if (in_status && !status_seen) invalid = 1
        heading = line
        sub(/^##[ \t]+/, "", heading)
        sub(/[ \t]+#+[ \t]*$/, "", heading)
        sub(/^[ \t]+/, "", heading)
        sub(/[ \t]+$/, "", heading)
        gsub(/[ \t]+/, " ", heading)
        in_status = heading == "Status"
        if (in_status) { status_count += 1; status_seen = 0 }
      } else if (in_status && !status_seen && line !~ /^[ \t]*$/) {
        status_seen = 1
        value = line
        sub(/^[ \t]+/, "", value)
        value = tolower(value)
        if (value !~ /^(active|backlog|blocked|done)($|[ \t:-]|—|–)/) invalid = 1
        else if (value !~ /^done($|[ \t:-]|—|–)/) {
          match(value, /^(active|backlog|blocked)/)
          token_length = RLENGTH
          match(line, /^[ \t]*/)
          raw = substr(raw, 1, RLENGTH) "done" substr(raw, RLENGTH + token_length + 1)
          changed = 1
        }
      }
      print raw
    }
    END {
      if (invalid || status_count > 1 || (in_status && !status_seen)) exit 1
      if (!changed) exit 2
    }
  ' "$1"
}

# ──────────────────────────────────────────
# Argument parsing
# ──────────────────────────────────────────

usage() {
  printf 'Usage: ./close.sh <plan-slug> [--stage] [--message "<text>"]\n' >&2
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

SLUG=""
STAGE=false
MESSAGE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --stage)
      STAGE=true
      shift
      ;;
    --message)
      if [ $# -lt 2 ]; then
        printf 'Error: --message requires a value\n' >&2
        exit 1
      fi
      MESSAGE="$2"
      shift 2
      ;;
    --*)
      printf 'Unknown flag: %s\n' "$1" >&2
      exit 2
      ;;
    *)
      if [ -z "$SLUG" ]; then
        SLUG="$1"
      else
        printf 'Error: unexpected argument: %s\n' "$1" >&2
        usage
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$SLUG" ]; then
  usage
  exit 1
fi

# Be friendly: strip an accidental .md extension or path prefix
SLUG="$(basename "$SLUG" .md)"

# ──────────────────────────────────────────
# Find the plan in a stage folder
# ──────────────────────────────────────────

PARENT=""
PARENT_DIR=""
for dir in "$PLANS_DIR/active" "$PLANS_DIR/backlog" "$PLANS_DIR/blocked" "$PLANS_DIR" "$DONE_DIR"; do
  if [ -f "$dir/$SLUG.md" ]; then
    PARENT="$dir/$SLUG.md"
    PARENT_DIR="$dir"
    break
  fi
done

if [ -z "$PARENT" ]; then
  printf 'Error: plan %s.md not found in any stage folder.\n' "$SLUG" >&2
  exit 1
fi

# Render and validate before changing any plan or mission file.
STATUS_TMP=$(mktemp "$PLANS_DIR/.${SLUG}.status.XXXXXX") || exit 1
cp -p "$PARENT" "$STATUS_TMP" || exit 1
if closed_plan_status "$PARENT" > "$STATUS_TMP"; then
  :
else
  status_result=$?
  if [ "$status_result" -eq 2 ]; then
    cp -p "$PARENT" "$STATUS_TMP" || exit 1
  else
    printf 'Error: plan %s.md has an empty, invalid, or duplicate ## Status section.\n' "$SLUG" >&2
    exit 1
  fi
fi

# Repeated close may repair old stage metadata without stamping the mission again.
if [ "$PARENT_DIR" = "$DONE_DIR" ]; then
  if ! cmp -s "$PARENT" "$STATUS_TMP"; then
    mv "$STATUS_TMP" "$PARENT" || exit 1
    STATUS_TMP=""
  fi
  if [ "$STAGE" = true ] && command -v git > /dev/null 2>&1 && git -C "$ROOT" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    git -C "$ROOT" add "$PARENT" || exit 1
  fi
  printf 'Plan %s.md is already in done/.\n' "$SLUG"
  exit 0
fi

if [ ! -f "$MISSION" ] || grep -Eq 'mission:unset|TODO: define mission' "$MISSION"; then
  printf 'Error: MISSION.md must exist and define the mission before closing a plan.\n' >&2
  exit 1
fi

MOVED_FILES=("$SLUG.md")
for f in "$PARENT_DIR/$SLUG"-amendment-*.md; do
  [ -f "$f" ] || continue
  MOVED_FILES+=("$(basename "$f")")
done
for f in "${MOVED_FILES[@]}"; do
  if [ -e "$DONE_DIR/$f" ] || [ -L "$DONE_DIR/$f" ]; then
    printf 'Error: refusing to overwrite existing done plan file: %s\n' "$f" >&2
    exit 1
  fi
done

# ──────────────────────────────────────────
# Ensure done/ exists
# ──────────────────────────────────────────

mkdir -p "$DONE_DIR" || exit 1

# ──────────────────────────────────────────
# Move plan and all its amendments to done/
# ──────────────────────────────────────────

for f in "${MOVED_FILES[@]}"; do
  mv "$PARENT_DIR/$f" "$DONE_DIR/" || exit 1
done
mv "$STATUS_TMP" "$DONE_DIR/$SLUG.md" || exit 1
STATUS_TMP=""

# ──────────────────────────────────────────
# Stamp MISSION.md changelog
# ──────────────────────────────────────────

if [ -n "$MESSAGE" ]; then
  CHANGELOG_LINE="${TODAY}: closed ${SLUG} — ${MESSAGE}"
else
  CHANGELOG_LINE="${TODAY}: closed ${SLUG}"
fi

CHANGELOG_STAMPED=false
ANCHOR='<!-- append YYYY-MM-DD entries below this line -->'
HAS_ANCHOR=false
if grep -Fq "$ANCHOR" "$MISSION"; then
  HAS_ANCHOR=true
fi
TMPFILE=$(mktemp) || exit 1
IN_CHANGELOG=false
RETARGETED=false
FENCE_MARKER=""
FENCE_COUNT=0
FENCE_OPEN='^(`{3,}|~{3,})'
FENCE_CLOSE='^(`{3,}|~{3,})[[:blank:]]*$'
HEADING='^##[[:blank:]]+[^[:blank:]]'
CHANGELOG_HEADING='^##[[:blank:]]+Changelog([[:blank:]]+#+[[:blank:]]*|[[:blank:]]*)$'
TARGET='^(- [0-9]{4}-[0-9]{2}-[0-9]{2}: .* — see )(\.osc/plans/((active|backlog|blocked)/)?([^/[:space:]]+\.md))([[:blank:]]*)$'
while true; do
  if IFS= read -r line; then
    ENDING=$'\n'
  elif [ -n "$line" ]; then
    ENDING=""
  else
    break
  fi
  CR_SUFFIX=""
  if [[ "$line" == *$'\r' ]]; then
    CR_SUFFIX=$'\r'
  fi
  LOGICAL_LINE=${line%$'\r'}
  if [ -n "$FENCE_MARKER" ]; then
    if [[ "$LOGICAL_LINE" =~ $FENCE_CLOSE ]]; then
      RUN=${BASH_REMATCH[1]}
      if [ "${RUN:0:1}" = "$FENCE_MARKER" ] && [ "${#RUN}" -ge "$FENCE_COUNT" ]; then
        FENCE_MARKER=""
      fi
    fi
  elif [[ "$LOGICAL_LINE" =~ $FENCE_OPEN ]]; then
    RUN=${BASH_REMATCH[1]}
    FENCE_MARKER=${RUN:0:1}
    FENCE_COUNT=${#RUN}
  elif [[ "$LOGICAL_LINE" =~ $HEADING ]]; then
    IN_CHANGELOG=false
    if [[ "$LOGICAL_LINE" =~ $CHANGELOG_HEADING ]]; then
      IN_CHANGELOG=true
    fi
  elif [ "$IN_CHANGELOG" = true ] && [[ "$LOGICAL_LINE" =~ $TARGET ]]; then
    PREFIX=${BASH_REMATCH[1]}
    OLD_PATH=${BASH_REMATCH[2]}
    FILENAME=${BASH_REMATCH[5]}
    SUFFIX=${BASH_REMATCH[6]}
    for f in "${MOVED_FILES[@]}"; do
      if [ "$FILENAME" = "$f" ] && [ ! -e "$ROOT/$OLD_PATH" ] && [ ! -L "$ROOT/$OLD_PATH" ] && [ -f "$DONE_DIR/$f" ] && [ ! -L "$DONE_DIR/$f" ]; then
        line="${PREFIX}.osc/plans/done/${f}${SUFFIX}"
        line="${line}${CR_SUFFIX}"
        RETARGETED=true
        break
      fi
    done
  fi
  printf '%s%s' "$line" "$ENDING" || exit 1
  if [ "$HAS_ANCHOR" = true ] && [[ "$line" == *"$ANCHOR"* ]]; then
    if [ -z "$ENDING" ]; then
      printf '\n' || exit 1
    fi
    printf -- '- %s\n' "$CHANGELOG_LINE" || exit 1
  fi
done < "$MISSION" > "$TMPFILE" || exit 1
if [ "$HAS_ANCHOR" = true ]; then
  mv "$TMPFILE" "$MISSION" || exit 1
else
  if [ "$RETARGETED" = true ]; then
    cat "$TMPFILE" > "$MISSION" || exit 1
  fi
  printf '\n- %s\n' "$CHANGELOG_LINE" >> "$MISSION"
  rm -f "$TMPFILE" || exit 1
fi
CHANGELOG_STAMPED=true

# ──────────────────────────────────────────
# Optional git staging
# ──────────────────────────────────────────

STAGED=false
if [ "$STAGE" = true ]; then
  if command -v git > /dev/null 2>&1 && git -C "$ROOT" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    for f in "${MOVED_FILES[@]}"; do
      git -C "$ROOT" add "$DONE_DIR/$f"
    done
    # Stage the removal from the old location and the changelog update
    git -C "$ROOT" add "$PARENT_DIR/" "$MISSION"
    STAGED=true
  fi
fi

# ──────────────────────────────────────────
# Report
# ──────────────────────────────────────────

printf 'Closed: %s\n' "$SLUG"
printf 'Moved to done/: %s\n' "${MOVED_FILES[*]}"
if [ "$CHANGELOG_STAMPED" = true ]; then
  printf 'Stamped: MISSION.md changelog\n'
fi
if [ "$STAGED" = true ]; then
  printf 'Staged: all changes added to git index.\n'
fi
