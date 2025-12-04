import { useState, useEffect } from 'react';
import { Channel, Category } from '../types';

const CHANNELS_JSON_URL = "https://raw.githubusercontent.com/CodesRahul96/LiveTV-Native/refs/heads/main/assets/channels.json";

export const TEST_CHANNEL: Channel = {
  id: 'test-fallback',
  name: 'TEST CHANNEL (Big Buck Bunny)',
  url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg',
  category: 'Hidden',
};

// Module-level cache
let cachedChannels: Channel[] = [];
let cachedCategories: Category[] = [];
let fetchPromise: Promise<void> | null = null;

export const useChannels = () => {
  const [channels, setChannels] = useState<Channel[]>(cachedChannels);
  const [categories, setCategories] = useState<Category[]>(cachedCategories);
  const [loading, setLoading] = useState(cachedChannels.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedChannels.length > 0) {
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = (async () => {
        try {
          // Append timestamp to prevent caching
          const urlWithTimestamp = `${CHANNELS_JSON_URL}?t=${Date.now()}`;
          console.log('Fetching channels from:', urlWithTimestamp);
          
          const response = await fetch(urlWithTimestamp);
          if (!response.ok) {
            throw new Error(`Failed to fetch channels: ${response.statusText}`);
          }
          const parsedChannels: Channel[] = await response.json();
          
          console.log(`Loaded ${parsedChannels.length} channels`);

          // Group channels by category
          const groupedCategories: Category[] = parsedChannels.reduce((acc, channel) => {
            // Explicitly exclude the test channel from the list
            if (channel.id === TEST_CHANNEL.id) return acc;

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

          cachedChannels = parsedChannels;
          cachedCategories = groupedCategories;
        } catch (err: any) {
          console.error('Error fetching channels:', err);
          throw err;
        } finally {
          fetchPromise = null;
        }
      })();
    }

    fetchPromise
      .then(() => {
        setChannels(cachedChannels);
        setCategories(cachedCategories);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load channels');
        setLoading(false);
      });

  }, []);

  return {
    channels,
    categories,
    loading,
    error,
  };
};
