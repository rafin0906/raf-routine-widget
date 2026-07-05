import os
import shutil
import zipfile
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright

def rebuild():
    print("================================================================")
    print("          WhatsApp Session Login & ZIP Creator")
    print("================================================================")
    
    cwd = os.getcwd()
    browser_data_dir = os.path.join(cwd, "browser_data")
    zip_path = os.path.join(cwd, "browser_data.zip")
    session_json_path = os.path.join(cwd, "session_state.json")
    
    print("Step 1: Launching Chromium in HEADFUL mode...")
    print("Please scan the QR code in the browser window to link WhatsApp Web.")
    print("----------------------------------------------------------------")
    
    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                browser_data_dir,
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
            input("\n👉 Press [ENTER] in this terminal AFTER your chats load to save and compress the session...")
            
            # Save storage state json just in case
            context.storage_state(path=session_json_path)
            print(f"Session state JSON saved to: {session_json_path}")
            context.close()
            
        print("\nStep 2: Cleaning up browser caches to optimize ZIP size...")
        # Clean up non-essential caches
        cache_dirs = [
            os.path.join(browser_data_dir, "Default", "Cache"),
            os.path.join(browser_data_dir, "Default", "Code Cache"),
            os.path.join(browser_data_dir, "Default", "GPUCache"),
            os.path.join(browser_data_dir, "ShaderCache"),
            os.path.join(browser_data_dir, "GrShaderCache"),
            os.path.join(browser_data_dir, "GraphiteDawnCache"),
            os.path.join(browser_data_dir, "Crashpad"),
        ]
        for d in cache_dirs:
            if os.path.exists(d):
                shutil.rmtree(d, ignore_errors=True)
                
        print("Step 3: Compressing browser profile into browser_data.zip...")
        temp_dir = os.path.join(cwd, "temp_zip_data")
        shutil.rmtree(temp_dir, ignore_errors=True)
        os.makedirs(temp_dir, exist_ok=True)
        
        # Copy browser profile files
        shutil.copytree(browser_data_dir, os.path.join(temp_dir, "browser_data"))
        
        # Ensure cache dirs are removed from temp too
        for d in cache_dirs:
            rel = os.path.relpath(d, browser_data_dir)
            temp_d = os.path.join(temp_dir, "browser_data", rel)
            if os.path.exists(temp_d):
                shutil.rmtree(temp_d, ignore_errors=True)
                
        # Zip contents of temp_dir
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_ref:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    filepath = os.path.join(root, file)
                    relpath = os.path.relpath(filepath, temp_dir)
                    zip_ref.write(filepath, relpath)
                    
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"\nSUCCESS: Zip created at: {zip_path}")
        print(f"Zip size: {round(os.path.getsize(zip_path) / 1024 / 1024, 2)} MB")
        print("\nNext step: Commit and push browser_data.zip and session_state.json to GitHub!")
        print("================================================================")
        
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    rebuild()
