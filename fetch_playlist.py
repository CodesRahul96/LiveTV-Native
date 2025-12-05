import urllib.request
import json
import re

PLAYLIST_URL = "https://jiotv-playlist.pages.dev/freetvindia.m3u"
OUTPUT_FILE = "temp_channels.json"

def parse_m3u(content):
    channels = []
    lines = content.splitlines()
    
    current_channel = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith("#EXTINF"):
            # Parse EXTINF line
            # Example: #EXTINF:-1 tvg-id="id" group-title="Category",Channel Name
            
            # Extract Category (group-title)
            group_match = re.search(r'group-title="([^"]*)"', line)
            category = group_match.group(1) if group_match else "Uncategorized"
            
            # Extract Logo (tvg-logo)
            logo_match = re.search(r'tvg-logo="([^"]*)"', line)
            logo = logo_match.group(1) if logo_match else ""
            
            # Extract Name (after the last comma)
            name_match = re.search(r',([^,]*)$', line)
            name = name_match.group(1).strip() if name_match else "Unknown Channel"
            
            current_channel = {
                "name": name,
                "category": category,
                "logo": logo
            }
            
        elif not line.startswith("#"):
            # This is the URL line
            url = line
            
            # Remove User-Agent or other params appended with |
            if "|" in url:
                url = url.split("|")[0]
            
            # Clean up whitespace
            url = url.strip()
            
            if current_channel and url:
                # Create a simple ID based on name
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

def main():
    print(f"Downloading playlist from {PLAYLIST_URL}...")
    try:
        with urllib.request.urlopen(PLAYLIST_URL) as response:
            content = response.read().decode('utf-8')
        
        print("Parsing content...")
        channels = parse_m3u(content)
        
        print(f"Found {len(channels)} channels.")
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(channels, f, indent=2, ensure_ascii=False)
            
        print(f"Saved to {OUTPUT_FILE}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
