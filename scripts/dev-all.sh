#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

find_backend_dir() {
  if [[ -f "$ROOT_DIR/backend/package.json" ]]; then
    echo "$ROOT_DIR/backend"
    return 0
  fi

  local backend_worktree
  backend_worktree="$(
    git -C "$ROOT_DIR" worktree list --porcelain | awk '
      /^worktree / { path=$2 }
      /^branch refs\/heads\/backend$/ { print path; exit }
    '
  )"

  if [[ -n "${backend_worktree:-}" && -f "$backend_worktree/backend/package.json" ]]; then
    echo "$backend_worktree/backend"
    return 0
  fi

  return 1
}

is_port_busy() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_backend() {
  local timeout_seconds=25
  local elapsed=0
  while (( elapsed < timeout_seconds )); do
    if curl -fsS "http://127.0.0.1:4000/api/v1/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

BACKEND_DIR="$(find_backend_dir || true)"
if [[ -z "$BACKEND_DIR" ]]; then
  echo "Could not find backend source. Ensure backend worktree branch exists or backend/package.json is present."
  exit 1
fi

echo "Using backend directory: $BACKEND_DIR"

FRONTEND_RUNNING=0
BACKEND_RUNNING=0
if is_port_busy 3000; then FRONTEND_RUNNING=1; fi
if is_port_busy 4000; then BACKEND_RUNNING=1; fi

BACKEND_PID=""

cleanup() {
  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

if (( BACKEND_RUNNING == 0 )); then
  echo "Starting backend on http://localhost:4000 ..."
  npm --prefix "$BACKEND_DIR" run dev &
  BACKEND_PID=$!

  if wait_for_backend; then
    echo "Backend is ready."
  else
    echo "Backend did not become ready in time."
    exit 1
  fi
else
  echo "Backend already running on port 4000."
fi

if (( FRONTEND_RUNNING == 1 )); then
  echo "Frontend already running on port 3000."
  echo "Open: http://localhost:3000/admin.html"
  if [[ -n "$BACKEND_PID" ]]; then
    echo "Press Ctrl+C to stop the backend started by this command."
    wait "$BACKEND_PID"
  fi
  exit 0
fi

echo "Starting frontend on http://localhost:3000 ..."
cd "$ROOT_DIR"
npm run dev
