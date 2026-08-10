#!/usr/bin/env bash
set -euo pipefail

# verify-clean-clone.sh
#
# Verifies that a fresh clone of the repository builds, passes all tests,
# and produces no unexpected errors. Run this before tagging a release.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

step() {
  echo ""
  echo -e "${YELLOW}==> $1${NC}"
}

pass() {
  echo -e "${GREEN}  PASS: $1${NC}"
  pass_count=$((pass_count + 1))
}

fail() {
  echo -e "${RED}  FAIL: $1${NC}"
  fail_count=$((fail_count + 1))
}

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------

step "Checking prerequisites"

if command -v node &> /dev/null; then
  node_version=$(node --version)
  pass "Node.js $node_version"
else
  fail "Node.js not found"
fi

if command -v pnpm &> /dev/null; then
  pnpm_version=$(pnpm --version)
  pass "pnpm $pnpm_version"
else
  fail "pnpm not found"
fi

if command -v python3 &> /dev/null || command -v python &> /dev/null; then
  py_cmd=$(command -v python3 || command -v python)
  py_version=$($py_cmd --version 2>&1)
  pass "$py_version"
else
  fail "Python not found"
fi

if command -v uv &> /dev/null; then
  uv_version=$(uv --version)
  pass "uv $uv_version"
else
  fail "uv not found"
fi

# ---------------------------------------------------------------------------
# TypeScript
# ---------------------------------------------------------------------------

step "Installing TypeScript dependencies"
cd "$REPO_ROOT"
if pnpm install --frozen-lockfile; then
  pass "pnpm install"
else
  fail "pnpm install"
fi

step "Checking TypeScript formatting"
if pnpm run format; then
  pass "pnpm run format"
else
  fail "pnpm run format"
fi

step "Linting TypeScript"
if pnpm run lint; then
  pass "pnpm run lint"
else
  fail "pnpm run lint"
fi

step "Type checking TypeScript"
if pnpm run typecheck; then
  pass "pnpm run typecheck"
else
  fail "pnpm run typecheck"
fi

step "Running TypeScript tests"
if pnpm run test; then
  pass "pnpm run test"
else
  fail "pnpm run test"
fi

step "Building TypeScript packages"
if pnpm run build; then
  pass "pnpm run build"
else
  fail "pnpm run build"
fi

step "Validating schemas"
if pnpm run validate:schemas; then
  pass "pnpm run validate:schemas"
else
  fail "pnpm run validate:schemas"
fi

# ---------------------------------------------------------------------------
# Python
# ---------------------------------------------------------------------------

step "Installing Python dependencies"
cd "$REPO_ROOT/backend"
if uv sync --all-packages; then
  pass "uv sync"
else
  fail "uv sync"
fi

step "Linting Python"
if uv run ruff check .; then
  pass "ruff check"
else
  fail "ruff check"
fi

step "Checking Python formatting"
if uv run ruff format --check .; then
  pass "ruff format"
else
  fail "ruff format"
fi

step "Type checking Python"
if uv run mypy .; then
  pass "mypy"
else
  fail "mypy"
fi

step "Running Python tests"
if uv run pytest -v; then
  pass "pytest"
else
  fail "pytest"
fi

# ---------------------------------------------------------------------------
# Evaluation harness
# ---------------------------------------------------------------------------

step "Running evaluation harness"
cd "$REPO_ROOT"
if uv run --directory backend pytest ../evals/ -v; then
  pass "evaluation harness"
else
  fail "evaluation harness"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "=========================================="
echo -e "  ${GREEN}Passed: $pass_count${NC}"
echo -e "  ${RED}Failed: $fail_count${NC}"
echo "=========================================="

if [ "$fail_count" -gt 0 ]; then
  echo -e "${RED}Verification failed.${NC}"
  exit 1
else
  echo -e "${GREEN}All checks passed. Ready for release.${NC}"
  exit 0
fi
