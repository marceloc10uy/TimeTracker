#!/bin/bash
cd "$(dirname "$0")"

set -e

VENV_PY=".venv/bin/python3"
BUILD_INFO_RUNTIME="runtime_assets/build_info.json"
BUILD_INFO_FRONTEND="frontend/public/build-info.json"

if [ "$(uname)" != "Darwin" ]; then
  echo "This build script is intended to run on macOS."
  exit 1
fi

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
  echo "Virtual environment pip is unavailable."
  exit 1
fi

echo "Installing Python build dependencies..."
"$VENV_PY" -m pip install --upgrade pip
"$VENV_PY" -m pip install -r requirements-packaging.txt

echo "Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
  npm --prefix frontend install
fi

echo "Generating build metadata..."
mkdir -p runtime_assets frontend/public
BUILD_VERSION="$(node -p "require('./frontend/package.json').version")"
BUILD_COMMIT="$(git rev-parse --short=12 HEAD 2>/dev/null || echo unknown)"
BUILD_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
printf '{\n  "version": "%s",\n  "commit": "%s",\n  "built_at": "%s"\n}\n' \
  "$BUILD_VERSION" "$BUILD_COMMIT" "$BUILD_TIMESTAMP" > "$BUILD_INFO_RUNTIME"
cp "$BUILD_INFO_RUNTIME" "$BUILD_INFO_FRONTEND"

echo "Building frontend assets..."
npm --prefix frontend run build

echo "Packaging macOS app..."
rm -rf build dist
"$VENV_PY" -m PyInstaller --clean --noconfirm TimeTracker.spec

echo "Build complete:"
echo "  dist/TimeTracker.app"
echo
echo "Runtime notes:"
echo "  - Place your .env next to the app, or in ~/Library/Application Support/TimeTracker/.env"
echo "  - Open the app bundle to start the local server and browser"
