import os
import socket
import subprocess
import sys
import threading
import time
import webbrowser

import uvicorn

HOST = os.getenv("TIMETRACKER_HOST", "127.0.0.1")
PORT = int(os.getenv("TIMETRACKER_PORT", "8000"))
RUNTIME_DIR = os.path.expanduser("~/Library/Application Support/TimeTracker")
ENV_PATH = os.path.join(RUNTIME_DIR, ".env")
ENV_EXAMPLE_PATH = os.path.join(RUNTIME_DIR, ".env.example")


def _wait_for_server_and_open_browser() -> None:
    url = f"http://{HOST}:{PORT}/"
    for _ in range(60):
        try:
            with socket.create_connection((HOST, PORT), timeout=0.5):
                webbrowser.open(url)
                return
        except OSError:
            time.sleep(0.5)


def _escape_applescript(value: str) -> str:
    return value.replace("\\", "\\\\").replace("\"", "\\\"")


def _show_startup_error(message: str) -> None:
    title = "TimeTracker Could Not Start"
    detail = message.strip()
    if "DATABASE_URL" in detail and ENV_EXAMPLE_PATH:
        detail += (
            f"\n\nCreate this file first:\n{ENV_PATH}"
            f"\n\nStarter example:\n{ENV_EXAMPLE_PATH}"
        )

    if sys.platform == "darwin":
        script = (
            f'display dialog "{_escape_applescript(detail)}" '
            f'with title "{_escape_applescript(title)}" '
            'buttons {"OK"} default button "OK" with icon stop'
        )
        try:
            subprocess.run(["osascript", "-e", script], check=False)
            return
        except Exception:
            pass

    print(f"{title}\n\n{detail}", file=sys.stderr)


if __name__ == "__main__":
    try:
        from backend.main import app

        threading.Thread(target=_wait_for_server_and_open_browser, daemon=True).start()
        uvicorn.run(app, host=HOST, port=PORT)
    except Exception as exc:
        _show_startup_error(str(exc))
        raise SystemExit(1) from exc
