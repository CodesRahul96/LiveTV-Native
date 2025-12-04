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

      const tvgGenre = getAttribute(meta, "tvg-genre");

      // Prioritize tvg-genre for category
      if (tvgGenre) {
        groupTitle = tvgGenre;
      } else if (!groupTitle || groupTitle.toLowerCase() === "mxplay") {
        // Fallback if no genre and group is mxplay
        const nameAttr = getAttribute(meta, "name");
        if (nameAttr) groupTitle = nameAttr;
        else groupTitle = "General";
      }

      // Clean up category
      if (groupTitle && groupTitle.toLowerCase() === "mxplay") {
        groupTitle = "General";
      }

      // Clean up name (remove mxplay if present)
      name = name.replace(/mxplay/gi, "").trim();
      name = name.replace(/^-\s*/, "").trim(); // Remove leading dash if any

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
        category: groupTitle || "Uncategorized",
      };
    } else if (line.startsWith("http")) {
      if (currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = {};
      }
    }
  });

  return channels;
};

https
  .get(M3U_URL, (resp) => {
    let data = "";

    // A chunk of data has been received.
    resp.on("data", (chunk) => {
      data += chunk;
    });

    // The whole response has been received.
    resp.on("end", () => {
      const channels = parseM3U(data);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(channels, null, 2));
      console.log(
        `Successfully converted ${channels.length} channels to ${OUTPUT_FILE}`
      );
    });
  })
  .on("error", (err) => {
    console.log("Error: " + err.message);
  });
