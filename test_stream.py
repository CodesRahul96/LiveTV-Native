import urllib.request
import urllib.error

URLS = [
    "https://mumt05.tangotv.in/ABPMAJHA/index.m3u8",
    "https://mumt01.tangotv.in/DDSAHYADRI/index.m3u8"
]

USER_AGENTS = [
    None, # Default python
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "VLC/3.0.16 LibVLC/3.0.16",
    "ExoPlayer"
]

def test_url(url):
    print(f"Testing {url}...")
    for ua in USER_AGENTS:
        print(f"  UA: {ua}")
        try:
            req = urllib.request.Request(url)
            if ua:
                req.add_header('User-Agent', ua)
            
            with urllib.request.urlopen(req, timeout=5) as response:
                print(f"    Success! Status: {response.status}")
                # Read a bit to be sure
                content = response.read(100)
                print(f"    Content start: {content[:50]}")
                return # Stop if one works
        except urllib.error.HTTPError as e:
            print(f"    HTTP Error: {e.code} {e.reason}")
        except Exception as e:
            print(f"    Error: {e}")

for url in URLS:
    test_url(url)
