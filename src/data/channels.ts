import { useState, useEffect } from 'react';
import { Channel, Category } from '../types';
import localChannels from '../../assets/channels.json';

// REPLACE THIS WITH YOUR GITHUB RAW JSON URL
const CHANNELS_JSON_URL = "https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME/main/assets/channels.json";

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

export const useChannels = () => {
  const [channels, setChannels] = useState<Channel[]>(cachedChannels);
  const [categories, setCategories] = useState<Category[]>(cachedCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocalChannels = async () => {
      try {
        if (cachedChannels.length > 0) {
          setLoading(false);
          return;
        }

        console.log('Loading local channels from JSON...');
        // Simulate async load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const parsedChannels: Channel[] = localChannels as Channel[];
        console.log(`Loaded ${parsedChannels.length} channels locally`);

        // Group channels by category
        const groupedCategories: Category[] = parsedChannels.reduce((acc, channel) => {
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

        setChannels(parsedChannels);
        setCategories(groupedCategories);
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading local channels:', err);
        setError(err.message || 'Failed to load channels');
        setLoading(false);
      }
    };

    loadLocalChannels();
  }, []);

  return {
    channels,
    categories,
    loading,
    error,
  };
};
