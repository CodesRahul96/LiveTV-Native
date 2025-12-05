const https = require("https");

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

const main = async () => {
  try {
    console.log("Fetching...");
    const data = await fetchM3U(M3U_URL);
    const lines = data.split("\n");

    console.log("Searching...");
    lines.forEach((line, index) => {
      // Strict simple search for string '24' to find ANY variation
      if (
        line.toLowerCase().includes("24") &&
        line.toLowerCase().includes("zee")
      ) {
        if (line.startsWith("#EXTINF")) {
          console.log(`\nMATCH FOUND:`);
          console.log(`Line: ${line}`);
          if (lines[index + 1]) console.log(`URL: ${lines[index + 1]}`);
          if (lines[index - 1] && lines[index - 1].includes("KODIPROP"))
            console.log(`License: ${lines[index - 1]}`);
        }
      }
      // Also try just '24 taas' in case it lacks 'zee'
      if (line.toLowerCase().includes("24 taas")) {
        if (line.startsWith("#EXTINF")) {
          console.log(`\nMATCH FOUND (Taas):`);
          console.log(`Line: ${line}`);
          if (lines[index + 1]) console.log(`URL: ${lines[index + 1]}`);
          if (lines[index - 1] && lines[index - 1].includes("KODIPROP"))
            console.log(`License: ${lines[index - 1]}`);
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
};

main();
