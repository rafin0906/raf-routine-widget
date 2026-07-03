/**
 * App configuration.
 *
 * API_BASE_URL points at the NeuraRUET FastAPI backend. `10.0.2.2` is the
 * special alias the Android emulator uses to reach the host machine's
 * `localhost`, where the backend runs (`uvicorn app.main:app --port 8000`).
 *
 * On a physical device, replace this with the host's LAN IP, e.g.
 * `http://192.168.1.5:8000` (device and PC on the same Wi-Fi).
 */

export const API_BASE_URL = 'http://10.0.2.2:8000';

/** Abort a routine fetch after this many milliseconds. */
export const API_TIMEOUT_MS = 8000;
