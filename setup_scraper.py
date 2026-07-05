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
            
            # Compress browser_data into browser_data.zip for Render
            try:
                import os
                import zipfile
                import shutil

                project_root = Path(__file__).resolve().parent
                zip_path = project_root / "browser_data.zip"
                temp_dir = project_root / "temp_zip_data"
                shutil.rmtree(temp_dir, ignore_errors=True)

                print("\nCompressing browser profile into browser_data.zip for Render...")
                shutil.copytree(BROWSER_DATA_DIR, temp_dir)

                # Remove non-essential cache folders to keep the ZIP file small
                shutil.rmtree(temp_dir / "Default" / "Cache", ignore_errors=True)
                shutil.rmtree(temp_dir / "Default" / "Code Cache", ignore_errors=True)
                shutil.rmtree(temp_dir / "Default" / "GPUCache", ignore_errors=True)
                shutil.rmtree(temp_dir / "ShaderCache", ignore_errors=True)
                shutil.rmtree(temp_dir / "GrShaderCache", ignore_errors=True)
                shutil.rmtree(temp_dir / "GraphiteDawnCache", ignore_errors=True)
                shutil.rmtree(temp_dir / "Crashpad", ignore_errors=True)

                # Create the zip archive
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, dirs, files in os.walk(temp_dir):
                        for file in files:
                            file_path = Path(root) / file
                            arcname = file_path.relative_to(temp_dir)
                            zipf.write(file_path, arcname)

                # Clean up temporary directory
                shutil.rmtree(temp_dir, ignore_errors=True)
                print(f"Success! Created optimized ZIP: {zip_path} ({os.path.getsize(zip_path) // (1024*1024)} MB)")
                print("👉 Now push browser_data.zip to GitHub to update the Render session!")
            except Exception as e:
                print(f"\nWarning: Failed to create browser_data.zip: {e}")

            print("================================================================")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    run()
