import { Channel, Category } from '../types';

// Import channels from JSON file
import channelsData from '../../assets/channels.json';

const MOCK_CHANNELS: Channel[] = channelsData as Channel[];

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
