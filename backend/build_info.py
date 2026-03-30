import json
import os
import sys


def _candidate_paths() -> list[str]:
    candidates: list[str] = []

    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        if hasattr(sys, "_MEIPASS"):
            candidates.append(os.path.join(sys._MEIPASS, "runtime_assets", "build_info.json"))
        candidates.append(os.path.join(exe_dir, "build_info.json"))
        candidates.append(os.path.join(exe_dir, "runtime_assets", "build_info.json"))

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates.append(os.path.join(project_root, "runtime_assets", "build_info.json"))

    return candidates


def get_build_info() -> dict[str, str]:
    for path in _candidate_paths():
        if not os.path.isfile(path):
            continue

        try:
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except Exception:
            continue

        return {
            "version": str(data.get("version") or "dev"),
            "commit": str(data.get("commit") or "unknown"),
            "built_at": str(data.get("built_at") or "unknown"),
        }

    return {
        "version": "dev",
        "commit": "unknown",
        "built_at": "unknown",
    }
