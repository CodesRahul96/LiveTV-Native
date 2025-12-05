const fs = require("fs");
const path = require("path");

const CHANNELS_PATH = path.join(__dirname, "../assets/channels.json");

const main = () => {
  try {
    console.log("Reading channels.json...");
    const channels = JSON.parse(fs.readFileSync(CHANNELS_PATH, "utf8"));

    const seenIds = new Set();
    let fixedCount = 0;

    const fixedChannels = channels.map((channel, index) => {
      let newId = channel.id;

      // If no ID or already seen, find a unique one
      if (!newId || seenIds.has(newId)) {
        // Try appending index or random string
        const baseId = newId || "gen-id";
        let suffix = 1;
        while (seenIds.has(`${baseId}_${suffix}`)) {
          suffix++;
        }
        newId = `${baseId}_${suffix}`;
        fixedCount++;
      }

      seenIds.add(newId);
      return { ...channel, id: newId };
    });

    console.log(`Fixed ${fixedCount} duplicate/missing IDs.`);

    fs.writeFileSync(CHANNELS_PATH, JSON.stringify(fixedChannels, null, 2));
    console.log("Successfully updated channels.json");
  } catch (error) {
    console.error("Error fixing duplicates:", error);
  }
};

main();
