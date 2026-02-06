#!/bin/bash

# Find all process IDs using TCP port 8000
PIDS=$(lsof -t -i tcp:8000)

if [ -z "$PIDS" ]; then
  echo "No processes found using port 8000."
else
  echo "Killing processes using port 8000: $PIDS"
  kill -9 $PIDS
fi
