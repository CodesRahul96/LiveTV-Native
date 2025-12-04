const fs = require("fs");

try {
  const data = fs.readFileSync("assets/playlist.m3u", "utf8");
  const lines = data.split("\n");
  const groups = new Set();

  lines.forEach((line) => {
    const match = line.match(/group-title="(.*?)"/);
    if (match) {
      groups.add(match[1]);
    }
  });

  console.log("Unique Groups:");
  Array.from(groups)
    .sort()
    .forEach((group) => console.log(group));
} catch (err) {
  console.error("Error:", err);
}
