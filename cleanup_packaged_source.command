#!/bin/bash
cd "$(dirname "$0")"

set -e

if [ "$(uname)" != "Darwin" ]; then
  echo "This cleanup script is intended to run on macOS."
  exit 1
fi

PROJECT_DIR="$(pwd)"
APP_SOURCE="$PROJECT_DIR/dist/TimeTracker.app"
APP_DIR="$HOME/Applications"
APP_TARGET="$APP_DIR/TimeTracker.app"
RUNTIME_DIR="$HOME/Library/Application Support/TimeTracker"

if [ ! -d "$APP_SOURCE" ]; then
  echo "Packaged app not found at:"
  echo "  $APP_SOURCE"
  echo "Run ./build_macos_app.command first."
  exit 1
fi

mkdir -p "$APP_DIR"
mkdir -p "$RUNTIME_DIR"

echo "Installing app bundle to:"
echo "  $APP_TARGET"
rm -rf "$APP_TARGET"
cp -R "$APP_SOURCE" "$APP_TARGET"

if [ -f "$PROJECT_DIR/.env" ] && [ ! -f "$RUNTIME_DIR/.env" ]; then
  echo "Copying .env to runtime config directory:"
  echo "  $RUNTIME_DIR/.env"
  cp "$PROJECT_DIR/.env" "$RUNTIME_DIR/.env"
fi

cat <<EOF

Cleanup target:
  $PROJECT_DIR

The packaged app has been copied to:
  $APP_TARGET

Runtime data/config directory:
  $RUNTIME_DIR

This script will now remove the downloaded source tree.
EOF

read -r -p "Type DELETE to continue: " CONFIRM
if [ "$CONFIRM" != "DELETE" ]; then
  echo "Cleanup cancelled. Source tree was not removed."
  exit 0
fi

cd "$HOME"
rm -rf "$PROJECT_DIR"

echo
echo "Source tree removed."
echo "Launch the app from:"
echo "  $APP_TARGET"
