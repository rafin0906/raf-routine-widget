"""
WhatsApp Web scraper using Playwright persistent context.

Scrapes recent messages from configured WhatsApp groups and updates
``message_history.json`` via the atomic JSON store.  Returns a
structured result dict suitable for logging / status tracking.
"""

# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright
from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import WHATSAPP_GROUPS, BROWSER_DATA_DIR, TIMEZONE, BASE_DIR
from app.services.json_store import read_json, write_json
from app.config import MESSAGE_HISTORY_FILE

_tz = ZoneInfo(TIMEZONE)


def restore_browser_data() -> None:
    """
    If browser_data.zip exists at the root, extract it to populate the BROWSER_DATA_DIR.
    Handles both zipping of the directory contents and zipping of the directory itself.
    """
    import zipfile
    import shutil

    zip_path = BASE_DIR / "browser_data.zip"
    if zip_path.exists():
        # Only extract if BROWSER_DATA_DIR is empty or doesn't exist
        if not BROWSER_DATA_DIR.exists() or not any(BROWSER_DATA_DIR.iterdir()):
            print(f"[scraper] Extracting {zip_path.name} to {BROWSER_DATA_DIR}...")
            temp_extract_dir = BASE_DIR / "temp_browser_data"
            shutil.rmtree(temp_extract_dir, ignore_errors=True)
            temp_extract_dir.mkdir(exist_ok=True)

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_extract_dir)

            # Check if zip contains a nested 'browser_data' folder
            nested_dir = temp_extract_dir / "browser_data"
            shutil.rmtree(BROWSER_DATA_DIR, ignore_errors=True)
            if nested_dir.exists() and nested_dir.is_dir():
                shutil.move(str(nested_dir), str(BROWSER_DATA_DIR))
            else:
                shutil.move(str(temp_extract_dir), str(BROWSER_DATA_DIR))

            # Clean up temp directory
            shutil.rmtree(temp_extract_dir, ignore_errors=True)
            print("[scraper] Browser profile extraction complete!")


def _filter_new_messages(messages: list[str], group_name: str) -> list[str]:
    """
    Compare *messages* against what is already stored in
    ``message_history.json`` for *group_name*.  New texts are appended
    and the file is saved (keeping the last 500 per group).
    """
    history_data = read_json(MESSAGE_HISTORY_FILE)

    seen_list: list[str] = history_data.get(group_name, [])
    seen_set = set(seen_list)
    new_messages: list[str] = []

    for msg in messages:
        if msg not in seen_set:
            new_messages.append(msg)
            seen_list.append(msg)
            seen_set.add(msg)

    # Keep only the last 500 messages per group
    history_data[group_name] = seen_list[-500:]
    write_json(MESSAGE_HISTORY_FILE, history_data)
    return new_messages


def scrape_recent_messages() -> dict:
    """
    Launch a headless Playwright browser, navigate to WhatsApp Web,
    scrape the last 10 visible messages from each configured group,
    and update ``message_history.json``.

    Returns
    -------
    dict
        ``groups``  – mapping of group_name → list of *new* raw texts
        ``scrapedAt`` – ISO timestamp
        ``totalNewMessages`` – total new messages across all groups
        ``error`` – error string or ``None``
    """
    result: dict = {
        "groups": {},
        "scrapedAt": datetime.now(_tz).isoformat(),
        "totalNewMessages": 0,
        "error": None,
    }

    # Ensure browser profile is populated before launching Playwright
    try:
        restore_browser_data()
    except Exception as e:
        print(f"[scraper] Warning: Failed to extract browser_data.zip: {e}")

    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                str(BROWSER_DATA_DIR),
                headless=True,
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/126.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1920, "height": 1080},
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                ],
            )

            # Inject decrypted cookies from session_state.json to bypass Windows DPAPI encryption on Render
            try:
                session_state_path = BASE_DIR / "session_state.json"
                if session_state_path.exists():
                    import json
                    print(f"[scraper] Injecting decrypted cookies from {session_state_path.name}...")
                    with open(session_state_path, "r", encoding="utf-8") as f:
                        state_data = json.load(f)
                    cookies = state_data.get("cookies", [])
                    if cookies:
                        context.add_cookies(cookies)
                        print(f"[scraper] Successfully injected {len(cookies)} cookies.")
            except Exception as e:
                print(f"[scraper] Warning: Failed to inject decrypted cookies: {e}")

            page = context.pages[0] if context.pages else context.new_page()

            # Abort heavy and tracking requests to save memory and speed up load on Render
            try:
                def route_interceptor(route):
                    req_type = route.request.resource_type
                    url = route.request.url.lower()
                    if req_type in ["image", "media"] or "analytics" in url or "telemetry" in url or "facebook" in url:
                        route.abort()
                    else:
                        route.continue_()
                page.route("**/*", route_interceptor)
                print("[scraper] Network request interceptor active (blocking images/media/analytics).")
            except Exception as route_err:
                print(f"[scraper] Warning: Failed to setup route interceptor: {route_err}")

            page.goto("https://web.whatsapp.com")

            # Wait for WhatsApp Web main interface (search bar) to load
            try:
                search_box = page.get_by_role("textbox").first
                search_box.wait_for(state="visible", timeout=60000)
                print("[scraper] WhatsApp Web interface loaded successfully.")
            except Exception as e:
                try:
                    import os
                    ss_path = os.path.join(os.getcwd(), "error_screenshot.png")
                    page.screenshot(path=ss_path)
                    print(f"[scraper] Search box loading failed. Saved error screenshot to {ss_path}")
                except Exception as ss_err:
                    print(f"[scraper] Failed to save error screenshot: {ss_err}")
                raise e

            for group_name in WHATSAPP_GROUPS:
                try:
                    print(f"[scraper] Searching for group: {group_name}")
                    search_box.click()
                    search_box.fill("")
                    search_box.type(group_name)
                    page.wait_for_timeout(3000)  # Wait for search results to filter

                    # Select the group from the search results
                    target = page.locator(f'span[title="{group_name}"]').first
                    if not target.is_visible():
                        target = page.get_by_text(group_name).first
                        
                    target.wait_for(state="visible", timeout=15000)
                    target.click()
                    print(f"[scraper] Opened chat: {group_name}")

                    selector = 'div[role="row"]'
                    page.wait_for_selector(selector, timeout=10000)
                    page.wait_for_timeout(2000)

                    elements = page.locator(selector).all()
                    if elements:
                        recent = elements[-10:]
                        texts = [el.inner_text() for el in recent]
                        new = _filter_new_messages(texts, group_name)
                        result["groups"][group_name] = new
                        result["totalNewMessages"] += len(new)
                    else:
                        result["groups"][group_name] = []
                        
                    # Clear search box for the next search
                    search_box.click()
                    search_box.fill("")
                    page.wait_for_timeout(1000)

                except Exception as exc:  # noqa: BLE001
                    result["groups"][group_name] = []
                    print(f"[scraper] Error scraping '{group_name}': {exc}")
                    
                    # Capture screenshot to debug why it failed
                    try:
                        import os
                        ss_path = os.path.join(os.getcwd(), "error_screenshot.png")
                        page.screenshot(path=ss_path)
                        print(f"[scraper] Saved error screenshot to {ss_path}")
                    except Exception as ss_err:
                        print(f"[scraper] Failed to save screenshot: {ss_err}")
                        
                    # Clear search box in case of failure to be ready for next group
                    try:
                        search_box.click()
                        search_box.fill("")
                    except Exception:
                        pass

            page.wait_for_timeout(1000)
            context.close()

    except Exception as exc:  # noqa: BLE001
        result["error"] = str(exc)

    return result
