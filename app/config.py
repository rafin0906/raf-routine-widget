import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# ─── Base directories ────────────────────────────────────────────────
APP_DIR = Path(__file__).resolve().parent
BASE_DIR = APP_DIR.parent
DB_DIR = APP_DIR / "db"

# ─── Adaptive scraping schedule ─────────────────────────────────────
CLASS_ACTIVE_START = "07:00"        # Start of active class window
CLASS_ACTIVE_END = "17:00"          # End of active class window
ACTIVE_INTERVAL_MINUTES = 10       # Scrape interval during class hours
TRANSITION_INTERVAL_MINUTES = 5    # Scrape interval near class transitions
TRANSITION_WINDOW_MINUTES = 10     # ±minutes around class start/end to use transition interval
OFF_HOUR_INTERVAL_MINUTES = 30     # Scrape interval 17:00–23:00
NIGHT_INTERVAL_MINUTES = 120       # Scrape interval 23:00–07:00
NIGHT_START = "23:00"
NIGHT_END = "07:00"
SCHEDULER_TICK_SECONDS = 60        # Scheduler checks every 1 minute
TIMEZONE = "Asia/Dhaka"

# ─── Database file names ────────────────────────────────────────────
MESSAGE_HISTORY_FILE = "message_history.json"
PROCESSED_MESSAGES_FILE = "processed_messages.json"
COURSES_FILE = "courses.json"
CLASS_EVENTS_FILE = "class_events.json"
HIGHLIGHTS_FILE = "highlights.json"
IMPORTANT_NOTICES_FILE = "important_notices.json"
TIMESLOTS_FILE = "timeslots.json"

# ─── LLM configuration ──────────────────────────────────────────────
LLM_MODEL = "llama-3.3-70b-versatile"
LLM_TEMPERATURE = 0.1
MAX_HIGHLIGHTS = 4                 # Keep only the latest N highlights

# ─── WhatsApp groups to scrape ───────────────────────────────────────
WHATSAPP_GROUPS = [
    "CSE'23 ANNOUNCEMENT",
    "CSE 23 Section-C(দুঃসংবাদ)",
]

# ─── Browser data directory (Playwright persistent context) ──────────
BROWSER_DATA_DIR = BASE_DIR / "browser_data"
