#!/bin/bash
cd "$(dirname "$0")"

set -e

PORT=8000
LOG_FILE="/tmp/timetracker.log"

VENV_PY=".venv/bin/python3"
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but was not found."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found."
  exit 1
fi

if [ ! -x "$VENV_PY" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

echo "Checking backend dependencies..."
if ! "$VENV_PY" -m pip --version >/dev/null 2>&1; then
  echo "Bootstrapping pip in virtual environment..."
  "$VENV_PY" -m ensurepip --upgrade >/dev/null 2>&1 || true
fi

if ! "$VENV_PY" -m pip --version >/dev/null 2>&1; then
  echo "Existing virtual environment is broken. Recreating..."
  rm -rf .venv
  python3 -m venv .venv
fi

if ! "$VENV_PY" -m pip --version >/dev/null 2>&1; then
  echo "Virtual environment pip is still unavailable after recreation."
  echo "Please install pip for this Python or check your Python installation."
  exit 1
fi

"$VENV_PY" -m pip install --quiet --upgrade pip
if ! "$VENV_PY" -c "import fastapi, uvicorn, psycopg2, dotenv" >/dev/null 2>&1; then
  echo "Installing missing backend dependencies..."
  "$VENV_PY" -m pip install fastapi uvicorn psycopg2-binary python-dotenv
fi

echo "Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm --prefix frontend install
fi

PIDS="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  kill $PIDS 2>/dev/null || true
  sleep 1
  kill -9 $PIDS 2>/dev/null || true
fi

echo "Building frontend..."
npm --prefix frontend run build || exit 1

echo "Starting backend..."
"$VENV_PY" -m uvicorn backend.main:app --host 127.0.0.1 --port $PORT >"$LOG_FILE" 2>&1 &
APP_PID=$!

for i in {1..40}; do
  if curl -fs "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    open "http://127.0.0.1:$PORT/"
    exit 0
  fi
  sleep 0.5
done

echo "Startup failed. Log:"
cat "$LOG_FILE"
exit 1
