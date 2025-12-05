const fs = require("fs");
const path = require("path");

const PLAYLIST_PATH = path.join(__dirname, "../assets/playlist.m3u");
const OUTPUT_PATH = path.join(__dirname, "../assets/channels.json");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (Math.random() < 0.1)
        console.log(
          `\nFailed: ${response.status} ${response.statusText} ${url}`
        );
    }
    return response.ok;
  } catch (error) {
    if (Math.random() < 0.1) console.log(`\nError: ${error.message} ${url}`);
    return false;
  }
}

async function parseAndValidate() {
  try {
    console.log("Reading playlist...");
    const data = fs.readFileSync(PLAYLIST_PATH, "utf8");
    const lines = data.split("\n");
    const channels = [];
    let currentChannel = null;

    console.log("Parsing channels...");
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith("#EXTINF:")) {
        currentChannel = {};

        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) currentChannel.logo = logoMatch[1];

        const groupMatch = line.match(/group-title="([^"]*)"/);
        if (groupMatch) {
          let category = groupMatch[1].replace(" - TV", "").trim();
          category =
            category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
          currentChannel.category = category;
        } else {
          currentChannel.category = "Uncategorized";
        }

        const nameParts = line.split(",");
        currentChannel.name = nameParts[nameParts.length - 1].trim();

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

        currentChannel.userAgent = USER_AGENT;
      } else if (line.startsWith("http")) {
        if (currentChannel) {
          currentChannel.url = line;
          channels.push(currentChannel);
          currentChannel = null;
        }
      }
    }

    console.log(`Found ${channels.length} total channels. Validating...`);

    const workingChannels = [];
    const CHUNK_SIZE = 10;
    for (let i = 0; i < channels.length; i += CHUNK_SIZE) {
      const chunk = channels.slice(i, i + CHUNK_SIZE);
      const promises = chunk.map(async (channel) => {
        const isWorking = await checkUrl(channel.url);
        if (isWorking) {
          process.stdout.write(".");
          return channel;
        } else {
          process.stdout.write("x");
          return null;
        }
      });

      const results = await Promise.all(promises);
      workingChannels.push(...results.filter((c) => c !== null));
    }

    console.log(`\nValidation complete.`);
    console.log(`Total: ${channels.length}`);
    console.log(`Working: ${workingChannels.length}`);
    console.log(`Broken: ${channels.length - workingChannels.length}`);

    if (workingChannels.length === 0) {
      console.log(
        "WARNING: No working channels found. Saving all channels anyway for manual testing."
      );
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(channels, null, 2));
    } else {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(workingChannels, null, 2));
    }
    console.log(`Wrote channels to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

parseAndValidate();
