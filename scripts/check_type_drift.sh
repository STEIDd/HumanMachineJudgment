#!/usr/bin/env bash
set -euo pipefail

echo "Checking type drift..."
python scripts/generate_types.py
if ! git diff --exit-code backend/judgment_core/src/judgment_core/_generated/ packages/judgment-schemas/src/generated/; then
    echo "ERROR: Generated types are stale. Run 'python scripts/generate_types.py' and commit the changes."
    exit 1
fi
echo "Types are up to date."
