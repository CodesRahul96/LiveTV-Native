import json
import urllib.request
import re
import concurrent.futures
import time

EXISTING_FILE = "assets/channels.json"
TEMP_FILE = "temp_channels.json"
OUTPUT_FILE = "assets/channels.json"
MARATHI_PLAYLIST_URL = "https://iptv-org.github.io/iptv/languages/mar.m3u"

EXTRA_CHANNELS = [
    {
        "name": "DD Sahyadri",
        "url": "http://z5ams.akamaized.net/ddsahyadri/tracks-v1a1/index.m3u8",
        "category": "Marathi",
        "logo": "https://upload.wikimedia.org/wikipedia/en/2/2b/DD_Sahyadri_Logo.png"
    },
    {
        "name": "Fakt Marathi",
        "url": "https://cdn-1.pishow.tv/live/10002/master.m3u8",
        "category": "Marathi",
        "logo": ""
    }
]

def parse_m3u(content):
    channels = []
    lines = content.splitlines()
    current_channel = {}
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        if line.startswith("#EXTINF"):
            group_match = re.search(r'group-title="([^"]*)"', line)
            category = group_match.group(1) if group_match else "Uncategorized"
            logo_match = re.search(r'tvg-logo="([^"]*)"', line)
            logo = logo_match.group(1) if logo_match else ""
            name_match = re.search(r',([^,]*)$', line)
            name = name_match.group(1).strip() if name_match else "Unknown Channel"
            
            current_channel = {"name": name, "category": category, "logo": logo}
        elif not line.startswith("#"):
            url = line.split("|")[0].strip()
            if current_channel and url:
                channel_id = re.sub(r'[^a-zA-Z0-9]', '_', current_channel['name']).lower()
                channels.append({
                    "id": channel_id,
                    "name": current_channel['name'],
                    "url": url,
                    "logo": current_channel['logo'],
                    "category": current_channel['category']
                })
                current_channel = {}
    return channels

def fetch_marathi_playlist():
    print(f"Fetching extra Marathi playlist from {MARATHI_PLAYLIST_URL}...")
    try:
        with urllib.request.urlopen(MARATHI_PLAYLIST_URL) as response:
            content = response.read().decode('utf-8')
        return parse_m3u(content)
    except Exception as e:
        print(f"Failed to fetch Marathi playlist: {e}")
        return []

def check_link(channel):
    url = channel['url']
    try:
        req = urllib.request.Request(url, method='HEAD')
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        with urllib.request.urlopen(req, timeout=3) as response:
            return channel if response.status == 200 else None
    except:
        return None

def main():
    # 1. Load Existing
    try:
        with open(EXISTING_FILE, 'r', encoding='utf-8') as f:
            existing_channels = json.load(f)
    except FileNotFoundError:
        existing_channels = []
    print(f"Loaded {len(existing_channels)} existing channels.")

    # 2. Load Temp
    try:
        with open(TEMP_FILE, 'r', encoding='utf-8') as f:
            temp_channels = json.load(f)
    except FileNotFoundError:
        temp_channels = []
    print(f"Loaded {len(temp_channels)} temp channels.")

    # 3. Fetch Extra Marathi
    marathi_channels = fetch_marathi_playlist()
    print(f"Fetched {len(marathi_channels)} extra Marathi channels.")

    # 4. Merge All
    all_channels = existing_channels + temp_channels + marathi_channels + EXTRA_CHANNELS
    
    # 5. Deduplicate (by URL)
    unique_channels = {}
    for ch in all_channels:
        # Normalize URL for comparison
        url = ch['url'].strip()
        if url not in unique_channels:
            unique_channels[url] = ch
        else:
            # If we have a duplicate, prefer the one with a logo or better name?
            # For now, just keep the first one, but maybe update category if new one is Marathi
            if "Marathi" in ch.get('category', '') or "Marathi" in ch.get('name', ''):
                 unique_channels[url]['category'] = "Marathi"

    print(f"Total unique channels before filtering: {len(unique_channels)}")

    # 6. Filter Broken Links (Concurrent)
    print("Checking for broken links (this may take a moment)...")
    valid_channels = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(check_link, ch) for ch in unique_channels.values()]
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                valid_channels.append(result)
    
    print(f"Total valid channels after filtering: {len(valid_channels)}")

    # 7. Sort / Prioritize Marathi
    def sort_key(ch):
        is_marathi = "marathi" in ch['name'].lower() or "marathi" in ch['category'].lower()
        return (not is_marathi, ch['name']) # False comes before True, so Marathi (False for not_marathi) comes first

    valid_channels.sort(key=sort_key)

    # 8. Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(valid_channels, f, indent=2, ensure_ascii=False)
    
    print(f"Saved merged list to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
