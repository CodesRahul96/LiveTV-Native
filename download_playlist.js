const https = require("https");
const fs = require("fs");
const path = require("path");

const PLAYLIST_URL =
  "https://joker-verse.vercel.app/jokertv/playlist.m3u?uid=951260257&pass=e07fc7ec&vod=true";
// Save to the directory where the script is executed
const OUTPUT_PATH = path.join(__dirname, "playlist.m3u");

const options = {
  headers: {
    "User-Agent": "TiviMate/4.7.0",
  },
};

console.log(`Downloading playlist from ${PLAYLIST_URL}...`);
console.log(`Saving to: ${OUTPUT_PATH}`);

const handleResponse = (response) => {
  if (response.statusCode !== 200) {
    // Handle redirects
    if (
      response.statusCode === 301 ||
      response.statusCode === 302 ||
      response.statusCode === 307
    ) {
      const location = response.headers.location;
      console.log(`Redirecting to ${location}...`);
      https.get(location, options, handleResponse).on("error", (err) => {
        console.error("Error on redirect:", err.message);
      });
      return;
    }
    console.error(`Failed to download: HTTP ${response.statusCode}`);
    return;
  }

  const file = fs.createWriteStream(OUTPUT_PATH);
  response.pipe(file);

  file.on("finish", () => {
    file.close();
    console.log(`Playlist saved successfully to ${OUTPUT_PATH}`);
  });

  file.on("error", (err) => {
    console.error("Error writing to file:", err.message);
  });
};

https.get(PLAYLIST_URL, options, handleResponse).on("error", (err) => {
  console.error("Error:", err.message);
});
