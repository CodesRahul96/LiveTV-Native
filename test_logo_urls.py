
import requests

base_url = "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/in/"

test_cases = [
    "Zee TV",
    "Star Sports 1",
    "Sony Max",
    "Colors",
    "Sun TV"
]

patterns = [
    lambda x: x.replace(" ", "-").lower() + ".png", # zee-tv.png
    lambda x: x.replace(" ", "") + ".png", # ZeeTV.png
    lambda x: x.replace(" ", "").upper() + ".png", # ZEETV.png
    lambda x: x.replace(" ", "-") + ".png", # Zee-TV.png
    lambda x: x.title().replace(" ", "") + ".png", # Zeetv.png (Title case then join)
]

for name in test_cases:
    print(f"Testing for: {name}")
    found = False
    for pat in patterns:
        filename = pat(name)
        url = base_url + filename
        try:
            r = requests.head(url, timeout=2)
            if r.status_code == 200:
                print(f"  [SUCCESS] Found: {url}")
                found = True
                break
            else:
                pass
                # print(f"  [404] {url}")
        except Exception as e:
            print(f"  [ERROR] {e}")
    
    if not found:
        print("  [FAILED] No match found")
