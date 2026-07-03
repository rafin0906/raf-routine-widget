import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent))

# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright
from app.config import BROWSER_DATA_DIR

def run():
    print("================================================================")
    print("          NeuraRUET 2.0 Scraper Authentication Setup")
    print("================================================================")
    print("Launching Chromium in HEADFUL mode...")
    print(f"Saving browser state to: {BROWSER_DATA_DIR}")
    print("Please scan the QR code in the browser window to link WhatsApp Web.")
    print("----------------------------------------------------------------")
    
    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                str(BROWSER_DATA_DIR),
                headless=False,
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/126.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                args=["--disable-blink-features=AutomationControlled"],
            )
            page = context.pages[0] if context.pages else context.new_page()
            page.goto("https://web.whatsapp.com")
            
            print("\n👉 Keep the browser window open, wait for the QR code to load, and scan it with your phone.")
            print("👉 Once your chats load and you are fully logged in, come back here.")
            input("\n👉 Press [ENTER] in this terminal AFTER your chats load to save the session and close the browser...")
            
            context.close()
            print("\nSession saved successfully! You can now run the scraper in headless mode.")
            print("================================================================")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    run()
