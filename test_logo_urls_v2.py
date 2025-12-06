
import urllib.request
import urllib.error

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
    lambda x: x.title().replace(" ", "") + ".png", # Zeetv.png
]

for name in test_cases:
    print(f"Testing for: {name}")
    found = False
    for pat in patterns:
        filename = pat(name)
        url = base_url + filename
        try:
            req = urllib.request.Request(url, method='HEAD')
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status == 200:
                    print(f"  [SUCCESS] Found: {url}")
                    found = True
                    break
        except urllib.error.HTTPError:
            pass
        except Exception as e:
            print(f"  [ERROR] {e}")
    
    if not found:
        print("  [FAILED] No match found")
