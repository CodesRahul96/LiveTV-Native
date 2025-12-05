const fs = require("fs");
const path = require("path");

const PLAYLIST_URL =
  "https://raw.githubusercontent.com/alex8875/m3u/main/waves.m3u";
const OUTPUT_PATH = path.join(__dirname, "../assets/channels.json");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchAndParse() {
  try {
    console.log(`Fetching playlist from ${PLAYLIST_URL}...`);
    const response = await fetch(PLAYLIST_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch playlist: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.text();

    console.log("Parsing channels...");
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
        if (groupMatch) {
          let category = groupMatch[1].trim();
          // Capitalize first letter
          category =
            category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
          currentChannel.category = category;
        } else {
          currentChannel.category = "Uncategorized";
        }

        // Extract name (everything after the last comma)
        const nameParts = line.split(",");
        currentChannel.name = nameParts[nameParts.length - 1].trim();

        // Generate ID
        let baseId = currentChannel.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_");
        let uniqueId = baseId;
        let counter = 1;
        while (channels.find((c) => c.id === uniqueId)) {
          counter++;
          uniqueId = `${baseId}_${counter}`;
        }
        currentChannel.id = uniqueId;

        // Set User-Agent (standard Chrome UA is usually safe)
        currentChannel.userAgent = USER_AGENT;
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
    console.error("Error:", err);
  }
}

fetchAndParse();
