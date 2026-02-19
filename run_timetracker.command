#!/bin/bash
cd "$(dirname "$0")"

PORT=8000
LOG_FILE="/tmp/timetracker.log"

PIDS="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "Killing process(es) on port $PORT: $PIDS"
  kill $PIDS 2>/dev/null || true
  sleep 1
  kill -9 $PIDS 2>/dev/null || true
fi

npm --prefix frontend run build || exit 1

python3 -m uvicorn backend.main:app --host 127.0.0.1 --port $PORT >"$LOG_FILE" 2>&1 &
APP_PID=$!

sleep 1
if ! kill -0 "$APP_PID" 2>/dev/null; then
  echo "Uvicorn failed to start. Log:"
  cat "$LOG_FILE"
  exit 1
fi

for i in {1..40}; do
  if curl -fs "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    open "http://127.0.0.1:$PORT/"
    exit 0
  fi
  sleep 0.5
done

echo "App did not become ready. Log:"
cat "$LOG_FILE"
exit 1