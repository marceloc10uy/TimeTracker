import os
import socket
import threading
import time
import webbrowser

import uvicorn

from backend.main import app


HOST = os.getenv("TIMETRACKER_HOST", "127.0.0.1")
PORT = int(os.getenv("TIMETRACKER_PORT", "8000"))


def _wait_for_server_and_open_browser() -> None:
    url = f"http://{HOST}:{PORT}/"
    for _ in range(60):
        try:
            with socket.create_connection((HOST, PORT), timeout=0.5):
                webbrowser.open(url)
                return
        except OSError:
            time.sleep(0.5)


if __name__ == "__main__":
    threading.Thread(target=_wait_for_server_and_open_browser, daemon=True).start()
    uvicorn.run(app, host=HOST, port=PORT)
