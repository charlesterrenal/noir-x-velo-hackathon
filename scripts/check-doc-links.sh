#!/usr/bin/env bash
# Checks documentation links against the repo.
# Usage: bash scripts/check-doc-links.sh README.md docs/*.md
# - GitHub permalinks .../blob/<sha>/<path>#L<n> must point at a non-empty line in that commit.
# - Relative links (docs/..., apps/..., ./...) must point at an existing file.
set -u
fail=0
for file in "$@"; do
  while read -r sha path line; do
    text=$(git show "$sha:$path" 2>/dev/null | sed -n "${line}p")
    if [ -z "${text//[[:space:]]/}" ]; then echo "$file: $sha:$path#L$line is missing or blank"; fail=1; fi
  done < <(grep -oE 'blob/[0-9a-f]{7,40}/[^#)]+#L[0-9]+' "$file" | sed -E 's#blob/([0-9a-f]+)/([^#]+)\#L([0-9]+)#\1 \2 \3#')

  while read -r target; do
    target=${target%%#*}
    [ -z "$target" ] && continue
    resolved=$(dirname "$file")/$target
    if [ ! -e "$resolved" ]; then echo "$file: missing $target"; fail=1; fi
  done < <(grep -oE '\]\((\./)?(docs|apps|packages|scripts)/[^)]*\)|\]\(\./[^)]*\)' "$file" | sed -E 's/^\]\(//; s/\)$//')
done
exit $fail
