#!/bin/bash
cd "$(dirname "$0")"

set -e

if [ "$(uname)" != "Darwin" ]; then
  echo "This pkg build script is intended to run on macOS."
  exit 1
fi

./build_macos_app.command

APP_PATH="dist/TimeTracker.app"
PKG_PATH="dist/TimeTracker.pkg"
SCRIPTS_DIR="packaging/macos/scripts"

if [ ! -d "$APP_PATH" ]; then
  echo "App bundle not found at:"
  echo "  $APP_PATH"
  exit 1
fi

if ! command -v pkgbuild >/dev/null 2>&1; then
  echo "pkgbuild is required but was not found."
  exit 1
fi

echo "Creating macOS installer package..."
rm -f "$PKG_PATH"
chmod +x "$SCRIPTS_DIR/postinstall"
pkgbuild \
  --component "$APP_PATH" \
  --install-location "/Applications" \
  --scripts "$SCRIPTS_DIR" \
  "$PKG_PATH"

echo "Installer build complete:"
echo "  $PKG_PATH"
echo
echo "Install result:"
echo "  /Applications/TimeTracker.app"
echo
echo "Runtime notes:"
echo "  - Installer creates ~/Library/Application Support/TimeTracker/"
echo "  - A starter .env.example is placed there on first install"
echo "  - Create ~/Library/Application Support/TimeTracker/.env with your real values"
