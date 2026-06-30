"""
Thread-safe, atomic JSON file operations for the local JSON database.

All modules should use read_json / write_json instead of raw file I/O
to guarantee consistency and prevent corruption on crash.
"""

import json
import os
import threading
from pathlib import Path

from app.config import DB_DIR

# ── Per-file locks ───────────────────────────────────────────────────
_locks: dict[str, threading.Lock] = {}
_global_lock = threading.Lock()


def _get_lock(filename: str) -> threading.Lock:
    """Return (or create) a per-file lock for *filename*."""
    with _global_lock:
        if filename not in _locks:
            _locks[filename] = threading.Lock()
        return _locks[filename]


def read_json(filename: str) -> dict:
    """
    Read and parse a JSON file from ``DB_DIR / filename``.

    Returns an empty dict if the file does not exist or is empty / corrupt.
    """
    filepath = DB_DIR / filename
    lock = _get_lock(filename)
    with lock:
        if not filepath.exists():
            return {}
        try:
            size = filepath.stat().st_size
            if size == 0:
                return {}
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}


def write_json(filename: str, data: dict) -> None:
    """
    Atomically write *data* as JSON to ``DB_DIR / filename``.

    Strategy:
        1. Write to a ``.tmp`` sidecar file.
        2. ``os.replace`` the sidecar over the real file (atomic on most OS).
    """
    filepath = DB_DIR / filename
    tmp_filepath = filepath.with_suffix(".tmp")
    lock = _get_lock(filename)
    with lock:
        with open(tmp_filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        os.replace(str(tmp_filepath), str(filepath))
