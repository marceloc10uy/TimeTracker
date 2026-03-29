#!/bin/bash
cd "$(dirname "$0")"

set -e

if [ "$(uname)" != "Darwin" ]; then
  echo "This packaging update script is intended to run on macOS."
  exit 1
fi

echo "Rebuilding packaged TimeTracker app from current source..."
"$(dirname "$0")/build_macos_app.command"

echo
echo "Updated app bundle:"
echo "  dist/TimeTracker.app"
echo
echo "Replace the previous app bundle with this one on the target Mac."
