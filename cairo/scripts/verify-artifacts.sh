#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

scarb --release build

SIERRA="target/release/strk20_invoke_helper_Nyalthe.contract_class.json"
CASM="target/release/strk20_invoke_helper_Nyalthe.compiled_contract_class.json"
test -s "$SIERRA"
test -s "$CASM"

python3 - "$SIERRA" "$CASM" <<'PY'
import json
import sys

for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as handle:
        json.load(handle)
    print(f"valid JSON artifact: {path}")
PY

echo "Nyalthe release artifacts verified."
