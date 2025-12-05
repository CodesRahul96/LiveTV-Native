import { Channel } from '../types';

export const parseM3U = (content: string): Channel[] => {
  const lines = content.split('\n');
  const channels: Channel[] = [];
  let currentChannel: Partial<Channel> = {};

  const usedIds = new Set<string>();

  lines.forEach((line) => {
    line = line.trim();
    if (line.startsWith('#EXTINF')) {
      const tvgIdMatch = line.match(/tvg-id="(.*?)"/);
      const tvgLogoMatch = line.match(/tvg-logo="(.*?)"/);
      const groupTitleMatch = line.match(/group-title="(.*?)"/);
      const nameMatch = line.match(/,(.*)$/);

      let id = tvgIdMatch ? tvgIdMatch[1] : Date.now().toString() + Math.random().toString();
      
      // Ensure ID is unique
      if (usedIds.has(id)) {
        let counter = 1;
        while (usedIds.has(`${id}_${counter}`)) {
          counter++;
        }
        id = `${id}_${counter}`;
      }
      usedIds.add(id);

      currentChannel = {
        id,
        name: nameMatch ? nameMatch[1].trim() : 'Unknown',
        logo: tvgLogoMatch ? tvgLogoMatch[1] : '',
        category: groupTitleMatch ? groupTitleMatch[1] : 'Uncategorized',
      };
    } else if (line.startsWith('http')) {
      if (currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel as Channel);
        currentChannel = {};
      }
    }
  });



  if (channels.length > 0) {
    console.log('First parsed channel:', JSON.stringify(channels[0], null, 2));
  }

  return channels;
};
