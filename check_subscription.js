const https = require("https");
const url = require("url");

const PLAYLIST_URL =
  "https://joker-verse.vercel.app/jokertv/playlist.m3u?uid=951260257&pass=e07fc7ec&vod=true";

const checkSubscription = (playlistUrl) => {
  const parsedUrl = url.parse(playlistUrl, true);
  const query = parsedUrl.query;

  console.log("--- Subscription Details ---");
  console.log(`UID (Username): ${query.uid || "Not found"}`);
  console.log(`Pass (Password): ${query.pass || "Not found"}`);

  console.log("\nFetching playlist to check expiry...");

  const options = {
    headers: {
      "User-Agent": "TiviMate/4.7.0",
    },
  };

  https
    .get(playlistUrl, options, (res) => {
      let data = "";

      // Read only the first chunk to get the header
      res.on("data", (chunk) => {
        data += chunk;
        // We only need the first few lines
        if (data.length > 1000) {
          res.destroy();
        }
      });

      res.on("end", () => {
        processPlaylistHeader(data);
      });

      res.on("error", (err) => {
        // Handle error if destroyed
        processPlaylistHeader(data);
      });
    })
    .on("error", (err) => {
      console.error("Error fetching playlist:", err.message);
    });
};

const processPlaylistHeader = (data) => {
  // Look for billed-till="1765165297"
  const billedTillMatch = data.match(/billed-till="(\d+)"/);

  if (billedTillMatch) {
    const timestamp = parseInt(billedTillMatch[1], 10);
    const date = new Date(timestamp * 1000);
    console.log(`Expiry Date: ${date.toString()}`);

    const now = new Date();
    const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    console.log(`Days Remaining: ${daysLeft}`);
  } else {
    console.log("Expiry date not found in playlist header.");
  }

  console.log("\n--- Note ---");
  console.log(
    "To increase the expiry time, you must contact the IPTV provider."
  );
  console.log(
    "Changing the URL parameters locally will NOT extend the actual subscription on the server."
  );
};

checkSubscription(PLAYLIST_URL);
