const fs = require("fs");
const path = require("path");

const M3U_PATH = path.join(__dirname, "../assets/playboxtv.m3u8");
const CHANNELS_PATH = path.join(__dirname, "../assets/channels.json");
const BACKUP_PATH = path.join(__dirname, "../assets/channels.json.backup");

const parseM3U = (data) => {
  const lines = data.split("\n");
  const channels = [];
  let currentChannel = {};

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("#EXTINF:")) {
      // Parse attributes
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/); // Prefer tvg-name if available
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);

      // Parse name (after last comma)
      const nameParts = line.split(",");
      let name = nameParts[nameParts.length - 1].trim();

      // Prefer tvg-name if explicitly set
      if (tvgNameMatch && tvgNameMatch[1]) {
        // Sometimes tvg-name is better formatted
        // But let's stick to the display name after comma if valid, or tvg-name
      }

      // Extract category from group-title (remove "PlayboxTV⭕" prefix if present)
      let category = groupTitleMatch ? groupTitleMatch[1] : "Uncategorized";
      category = category.replace("PlayboxTV⭕", "");

      currentChannel = {
        id: tvgIdMatch
          ? tvgIdMatch[1]
          : `gen-${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        logo: tvgLogoMatch ? tvgLogoMatch[1] : "",
        category: category,
      };
    } else if (line.startsWith("http")) {
      if (currentChannel.name) {
        // Remove pipe | and everything after it (User-Agent headers etc)
        const cleanUrl = line.split("|")[0].trim();
        currentChannel.url = cleanUrl;
        channels.push(currentChannel);
        currentChannel = {};
      }
    }
  }
  return channels;
};

const main = () => {
  try {
    if (!fs.existsSync(M3U_PATH)) {
      console.error("M3U file not found:", M3U_PATH);
      return;
    }

    // Backup existing
    if (fs.existsSync(CHANNELS_PATH)) {
      console.log("Backing up existing channels...");
      fs.copyFileSync(CHANNELS_PATH, BACKUP_PATH);
    }

    console.log("Reading M3U file...");
    const m3uData = fs.readFileSync(M3U_PATH, "utf8");

    console.log("Parsing channels...");
    const channels = parseM3U(m3uData);

    console.log(`Parsed ${channels.length} channels.`);

    console.log("Saving to channels.json...");
    fs.writeFileSync(CHANNELS_PATH, JSON.stringify(channels, null, 2));
    console.log("Done.");
  } catch (error) {
    console.error("Error:", error);
  }
};

main();
