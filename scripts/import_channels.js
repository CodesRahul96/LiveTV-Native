const fs = require("fs");
const https = require("https");
const path = require("path");

const CHANNELS_PATH = path.join(__dirname, "../assets/channels.json");
const M3U_URL =
  "https://raw.githubusercontent.com/alex8875/m3u/refs/heads/main/dishtv.m3u";

const fetchM3U = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      })
      .on("error", reject);
  });
};

const parseM3U = (data) => {
  const lines = data.split("\n");
  const channels = [];
  let currentChannel = {};
  let nextLicenseKey = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
      nextLicenseKey = line.split("=")[1];
    } else if (line.startsWith("#EXTINF:")) {
      // Parse attributes
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);

      // Parse name (after last comma)
      const nameParts = line.split(",");
      const name = nameParts[nameParts.length - 1].trim();

      currentChannel = {
        id: tvgIdMatch ? tvgIdMatch[1] : null,
        name: name,
        logo: tvgLogoMatch ? tvgLogoMatch[1] : null,
        category: groupTitleMatch ? groupTitleMatch[1] : "Uncategorized",
        licenseKey: nextLicenseKey,
      };
      nextLicenseKey = null;
    } else if (line.startsWith("http")) {
      if (currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = {};
      }
    }
  }
  return channels;
};

const isExcluded = (channel) => {
  const name = (channel.name || "").toLowerCase();
  const category = (channel.category || "").toLowerCase();

  const forbiddenKeywords = [
    "music",
    "punjabi",
    "hungama kids",
    "al jazeera",
    "cna",
    "cgtn",
    "arirang",
    "nhk",
    "rt ",
    "russia today",
    "france 24",
    "dw ",
    "deutsche welle",
    "voa ",
    "voice of america",
    "bbc world",
    "cnn international",
    "afrobeat",
    "action hollywood",
    "korean",
    "chinese",
    "nepal",
    "pakistan",
    "sri lanka",
    "bangladesh",
    "euronews",
    "trrt",
    "african",
  ];

  return forbiddenKeywords.some(
    (keyword) => name.includes(keyword) || category.includes(keyword)
  );
};

const main = async () => {
  try {
    console.log("Reading existing channels...");
    let existingChannels = [];
    if (fs.existsSync(CHANNELS_PATH)) {
      existingChannels = JSON.parse(fs.readFileSync(CHANNELS_PATH, "utf8"));
    }

    // Filter existing channels
    const initialCount = existingChannels.length;
    existingChannels = existingChannels.filter((c) => !isExcluded(c));
    console.log(
      `Removed ${initialCount - existingChannels.length} existing channels.`
    );

    console.log("Fetching new playlist...");
    const m3uData = await fetchM3U(M3U_URL);

    console.log("Parsing new playlist...");
    const newChannels = parseM3U(m3uData);

    // Update existing channels with missing license keys from new data
    let updatedCount = 0;
    existingChannels = existingChannels.map((ec) => {
      const match = newChannels.find((nc) => nc.url === ec.url);
      if (match && match.licenseKey && !ec.licenseKey) {
        updatedCount++;
        return { ...ec, licenseKey: match.licenseKey };
      }
      return ec;
    });
    console.log(`Updated ${updatedCount} existing channels with license keys.`);

    // Filter new channels
    const filteredNewChannels = newChannels.filter((c) => {
      const isDuplicate = existingChannels.some(
        (ec) => (c.id && ec.id === c.id) || ec.url === c.url
      );
      return !isDuplicate && !isExcluded(c);
    });

    // Formatting new channels
    const finalNewChannels = filteredNewChannels.map((c) => ({
      id: c.id || `gen-${Math.random().toString(36).substr(2, 9)}`,
      name: c.name,
      url: c.url,
      logo: c.logo || "",
      category: c.category,
      licenseKey: c.licenseKey,
    }));

    console.log(`Adding ${finalNewChannels.length} new channels.`);

    const allChannels = [...existingChannels, ...finalNewChannels];

    fs.writeFileSync(CHANNELS_PATH, JSON.stringify(allChannels, null, 2));
    console.log(`Total channels: ${allChannels.length}`);
    console.log("Done.");
  } catch (error) {
    console.error("Error:", error);
  }
};

main();
