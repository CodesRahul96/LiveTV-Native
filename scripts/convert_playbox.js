const fs = require("fs");
const path = require("path");

const M3U_PATH = path.join(__dirname, "../assets/playboxtv.m3u8");
const CHANNELS_PATH = path.join(__dirname, "../assets/channels.json");
const BACKUP_PATH = path.join(__dirname, "../assets/channels.json.backup");

const parseM3U = (data) => {
  const lines = data.split("\n");
  const channels = [];
  let currentChannel = {};
  let nextLicenseKey = null;

  const isAllowed = (name, category, language) => {
    const lowerName = (name || "").toLowerCase();
    const lowerCat = (category || "").toLowerCase();
    const lowerLang = (language || "").toLowerCase();

    // 1. Language Check
    const allowedLangs = ["marathi", "hindi", "english", "mr", "hi", "en"];
    const hasAllowedLang =
      allowedLangs.includes(lowerLang) ||
      allowedLangs.some((l) => lowerName.includes(l) || lowerCat.includes(l));

    // 2. Category Check
    const allowedGenres = [
      "news",
      "sports",
      "music",
      "movies",
      "movie",
      "cinema",
      "kids",
      "kid",
      "cartoon",
      "animation",
      "documentary",
      "infotainment",
      "knowledge",
      "science",
      "history",
    ];
    const hasAllowedGenre = allowedGenres.some(
      (g) => lowerCat.includes(g) || lowerName.includes(g)
    );

    // Forbidden Languages (Strict remove)
    const forbiddenLangs = [
      "tamil",
      "telugu",
      "kannada",
      "malayalam",
      "bengali",
      "gujarati",
      "punjabi",
      "urdu",
      "nepali",
      "odia",
      "bhojpuri",
      "assamese",
    ];
    const hasForbiddenLang = forbiddenLangs.some(
      (l) => lowerName.includes(l) || lowerCat.includes(l) || lowerLang === l
    );

    if (hasForbiddenLang) return false;

    // Forbidden Keywords (Religious/Devotional)
    const forbiddenKeywords = [
      "devotional",
      "religious",
      "bhakti",
      "aastha",
      "sanskar",
      "spiritual",
      "darshan",
      "satsang",
      "ishwar",
      "vedic",
      "god",
      "bhajan",
      "aarti",
      "katha",
      "gurbani",
      "divya",
      "peace",
    ];
    const isReligious = forbiddenKeywords.some(
      (k) => lowerName.includes(k) || lowerCat.includes(k)
    );

    if (isReligious) return false;

    // If it matches genre, we lean towards keeping it unless it's a forbidden language
    return hasAllowedGenre;
  };

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
      nextLicenseKey = line.split("=")[1];
    } else if (line.startsWith("#EXTINF:")) {
      // Parse attributes
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      const tvgLanguageMatch = line.match(/tvg-language="([^"]*)"/);

      // Parse name (after last comma)
      const nameParts = line.split(",");
      let name = nameParts[nameParts.length - 1].trim();

      // Extract category from group-title (remove "PlayboxTV⭕" prefix if present)
      let category = groupTitleMatch ? groupTitleMatch[1] : "Uncategorized";
      category = category.replace("PlayboxTV⭕", "");

      // Check language
      const language = tvgLanguageMatch
        ? tvgLanguageMatch[1].toLowerCase()
        : "";

      // Normalization
      if (
        language === "mr" ||
        language === "marathi" ||
        (name + category).toLowerCase().includes("marathi")
      ) {
        if (!category.includes("Marathi")) category = `Marathi ${category}`;
      } else if (
        language === "hi" ||
        language === "hindi" ||
        (name + category).toLowerCase().includes("hindi")
      ) {
        if (category === "Music") category = "Hindi Music";
        if (category === "Movies") category = "Hindi Movies";
        if (category === "Kids") category = "Hindi Kids";
      }

      if (isAllowed(name, category, language)) {
        currentChannel = {
          id: tvgIdMatch
            ? tvgIdMatch[1]
            : `gen-${Math.random().toString(36).substr(2, 9)}`,
          name: name,
          logo: tvgLogoMatch ? tvgLogoMatch[1] : "",
          category: category,
          language: language,
          licenseKey: nextLicenseKey,
        };
      } else {
        currentChannel = {}; // Clear if excluded
      }
      nextLicenseKey = null; // Reset
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

  // Sort channels: Marathi first
  channels.sort((a, b) => {
    const isAMarathi = a.language === "mr" || a.category.includes("Marathi");
    const isBMarathi = b.language === "mr" || b.category.includes("Marathi");

    if (isAMarathi && !isBMarathi) return -1;
    if (!isAMarathi && isBMarathi) return 1;
    return 0;
  });

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
