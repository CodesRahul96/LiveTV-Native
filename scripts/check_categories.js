const fs = require("fs");
const path = require("path");

const M3U_PATH = path.join(__dirname, "../assets/playboxtv.m3u8");

const main = () => {
  try {
    const data = fs.readFileSync(M3U_PATH, "utf8");
    const lines = data.split("\n");
    const categories = new Set();
    const movieChannels = [];
    const musicChannels = [];

    lines.forEach((line) => {
      const match = line.match(/group-title="([^"]*)"/);
      if (match) {
        categories.add(match[1]);
        if (match[1].toLowerCase().includes("movie")) {
          movieChannels.push(line);
        }
        if (match[1].toLowerCase().includes("music")) {
          musicChannels.push(line);
        }
      }
    });

    console.log("Categories:", Array.from(categories));
    console.log("Movie Channels found:", movieChannels.length);
    console.log("Music Channels found:", musicChannels.length);
  } catch (e) {
    console.error(e);
  }
};

main();
