
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright
import os

def save_session():
    with sync_playwright() as p:
        # 1. Launch persistent context (Saves IndexedDB, Cookies, LocalStorage, etc.)
        user_data_dir = os.path.join(os.getcwd(), "browser_data")
        context = p.chromium.launch_persistent_context(user_data_dir, headless=False)
        
        # The persistent context automatically creates one page
        page = context.pages[0] if len(context.pages) > 0 else context.new_page()

        print("Navigating to the website...")


        page.goto("https://web.whatsapp.com/") 

        print("Please log in manually.")
        print("Waiting for 60 seconds to allow manual login (e.g., scanning a QR code)...")
        
        # 2. We wait for a sufficient amount of time to allow manual login.
        # For a more robust script, you could use page.wait_for_selector() to wait 
        # for a specific element that only appears after a successful login.
        page.wait_for_timeout(60000) 

        # 3. Session state is saved automatically in the browser_data directory
        print("Session saved successfully to the browser_data directory!")

        context.close()

if __name__ == "__main__":
    save_session()
