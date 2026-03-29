#!/bin/bash
cd "$(dirname "$0")"

set -e

VENV_PY=".venv/bin/python3"

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
