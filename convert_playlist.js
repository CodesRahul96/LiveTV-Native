const fs = require("fs");

const playlist = fs.readFileSync("playlist.txt", "utf8");
const lines = playlist.split("\n");
const channels = [];

let currentChannel = {};

lines.forEach((line) => {
  if (line.startsWith("#EXTINF")) {
    const tvgIdMatch = line.match(/tvg-id="(.*?)"/);
    const tvgLogoMatch = line.match(/tvg-logo="(.*?)"/);
    const groupTitleMatch = line.match(/group-title="(.*?)"/);
    const nameMatch = line.match(/,(.*)$/);

    currentChannel = {
      id: tvgIdMatch ? tvgIdMatch[1] : Date.now().toString(),
      name: nameMatch ? nameMatch[1].trim() : "Unknown",
      url: "",
      logo: tvgLogoMatch ? tvgLogoMatch[1] : "",
      category: groupTitleMatch ? groupTitleMatch[1] : "Uncategorized",
    };
  } else if (line.startsWith("http")) {
    currentChannel.url = line.trim();
    channels.push(currentChannel);
    currentChannel = {};
  }
});

const fileContent = `import { Channel, Category } from '../types';

const MOCK_CHANNELS: Channel[] = ${JSON.stringify(channels, null, 2)};

export const TEST_CHANNEL: Channel = {
  id: 'test-fallback',
  name: 'TEST CHANNEL (Big Buck Bunny)',
  url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg',
  category: 'Hidden',
};

export const useChannels = () => {
  // Group channels by category
  const categories: Category[] = MOCK_CHANNELS.reduce((acc, channel) => {
    const existingCategory = acc.find((c) => c.name === channel.category);
    if (existingCategory) {
      existingCategory.channels.push(channel);
    } else {
      acc.push({
        id: channel.category,
        name: channel.category,
        channels: [channel],
      });
    }
    return acc;
  }, [] as Category[]);

  return {
    channels: MOCK_CHANNELS,
    categories,
    loading: false,
    error: null,
  };
};
`;

fs.writeFileSync("src/data/channels.ts", fileContent);
console.log("src/data/channels.ts updated successfully");
