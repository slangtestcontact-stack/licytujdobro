#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Użycie: $0 /sciezka/do/projektu" >&2
  exit 1
fi

PATCH_ROOT="$(cd "$(dirname "$0")" && pwd)"
node "$PATCH_ROOT/apply-targeted-patch.cjs" "$1"
echo "Uruchom ponownie: npm run dev"
