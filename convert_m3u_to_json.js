const fs = require("fs");
const https = require("https");

const M3U_URL = "https://jiotv-playlist.pages.dev/mx.m3u";
const OUTPUT_FILE = "assets/channels.json";

const parseM3U = (content) => {
  const lines = content.split("\n");
  const channels = [];
  let currentChannel = {};
  const usedIds = new Set();

  lines.forEach((line) => {
    line = line.trim();
    if (line.startsWith("#EXTINF")) {
      // Extract the part after the last comma as the channel name
      const lastCommaIndex = line.lastIndexOf(",");
      let name = "Unknown";
      let meta = line;

      if (lastCommaIndex !== -1) {
        name = line.substring(lastCommaIndex + 1).trim();
        meta = line.substring(0, lastCommaIndex);
      }

      // Helper to extract attributes safely
      const getAttribute = (source, key) => {
        const regex = new RegExp(`${key}="(.*?)"`);
        const match = source.match(regex);
        return match ? match[1] : null;
      };

      const tvgId = getAttribute(meta, "tvg-id");
      const tvgLogo = getAttribute(meta, "tvg-logo");
      let groupTitle = getAttribute(meta, "group-title");

      // Filter: Only include TataPlay channels
      if (!groupTitle || !groupTitle.toLowerCase().includes("tataplay")) {
        return;
      }

      // Clean up category: "Tataplay🎭Action" -> "Action"
      if (groupTitle) {
        // Remove "Tataplay" and any following non-alphanumeric characters (including emojis)
        groupTitle = groupTitle
          .replace(/^Tataplay/i, "")
          .replace(/^[^\w\s]+/u, "")
          .trim();

        if (groupTitle.includes("|")) {
          const parts = groupTitle.split("|");
          groupTitle = parts[parts.length - 1].trim();
        }

        // If empty after cleanup (e.g. just "Tataplay"), default to General
        if (!groupTitle) {
          groupTitle = "General";
        } else {
          // Capitalize first letter, lowercase rest
          groupTitle =
            groupTitle.charAt(0).toUpperCase() +
            groupTitle.slice(1).toLowerCase();
        }
      } else {
        groupTitle = "General";
      }

      // Clean up name
      // Remove "IN | ", "IND: ", "IN: " prefixes
      name = name.replace(/^(IN\s*[:|]\s*|IND\s*[:|]\s*)/i, "").trim();

      let id = tvgId ? tvgId : Date.now().toString() + Math.random().toString();

      // Ensure ID is unique
      if (usedIds.has(id)) {
        let counter = 1;
        while (usedIds.has(`${id}_${counter}`)) {
          counter++;
        }
        id = `${id}_${counter}`;
      }
      usedIds.add(id);

      currentChannel = {
        id,
        name,
        logo: tvgLogo || "",
        category: groupTitle,
      };
    } else if (line.startsWith("http")) {
      // Only add if we have a valid currentChannel (meaning it passed the filter)
      if (currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = {};
      }
    }
  });

  return channels;
};

// Read from local file instead of URL
try {
  const data = fs.readFileSync("assets/playlist.m3u", "utf8");
  const channels = parseM3U(data);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(channels, null, 2));
  console.log(
    `Successfully converted ${channels.length} channels to ${OUTPUT_FILE}`
  );
} catch (err) {
  console.error("Error reading playlist.m3u:", err);
}
