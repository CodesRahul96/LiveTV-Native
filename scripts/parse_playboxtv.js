const fs = require("fs");
const path = require("path");

const PLAYLIST_PATH = path.join(__dirname, "../assets/playboxtv.m3u");
const OUTPUT_PATH = path.join(__dirname, "../assets/channels.json");

function parsePlaylist() {
  try {
    const data = fs.readFileSync(PLAYLIST_PATH, "utf8");
    const lines = data.split("\n");
    const channels = [];
    let currentChannel = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith("#EXTINF:")) {
        currentChannel = {};

        // Extract logo
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) currentChannel.logo = logoMatch[1];

        // Extract group
        const groupMatch = line.match(/group-title="([^"]*)"/);
        if (groupMatch) currentChannel.category = groupMatch[1];

        // Extract name (everything after the last comma)
        const nameParts = line.split(",");
        currentChannel.name = nameParts[nameParts.length - 1].trim();

        // Generate ID from name if not present
        let baseId = currentChannel.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_");
        let uniqueId = baseId;
        let counter = 1;

        // Check if ID already exists
        while (channels.find((c) => c.id === uniqueId)) {
          counter++;
          uniqueId = `${baseId}_${counter}`;
        }
        currentChannel.id = uniqueId;
      } else if (line.startsWith("#EXTVLCOPT:")) {
        if (currentChannel) {
          const opt = line.substring(11);
          if (opt.startsWith("http-user-agent=")) {
            currentChannel.userAgent = opt.substring(16);
          }
        }
      } else if (line.startsWith("http")) {
        if (currentChannel) {
          currentChannel.url = line;
          channels.push(currentChannel);
          currentChannel = null;
        }
      }
    }

    console.log(`Found ${channels.length} channels.`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(channels, null, 2));
    console.log(`Wrote channels to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("Error parsing playlist:", err);
  }
}

parsePlaylist();
