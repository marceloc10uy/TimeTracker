#!/bin/bash
cd "$(dirname "$0")"

PORT=8000
PIDS="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "Killing process(es) on port $PORT: $PIDS"
  kill $PIDS 2>/dev/null || true
  sleep 1
  kill -9 $PIDS 2>/dev/null || true
fi

npm --prefix frontend run build || exit 1
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port $PORT >/tmp/timetracker.log 2>&1 &
until curl -fsS "http://127.0.0.1:$PORT/" >/dev/null; do sleep 0.5; done
open "http://127.0.0.1:$PORT/"
