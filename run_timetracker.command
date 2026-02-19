#!/bin/bash
cd "$(dirname "$0")"

PORT=8000
LOG_FILE="/tmp/timetracker.log"

VENV_PY=".venv/bin/python3"
if [ ! -x "$VENV_PY" ]; then
  echo "Missing venv python at $VENV_PY"
  echo "Create it with: python3 -m venv .venv"
  exit 1
fi

PIDS="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  kill $PIDS 2>/dev/null || true
  sleep 1
  kill -9 $PIDS 2>/dev/null || true
fi

npm --prefix frontend run build || exit 1

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
