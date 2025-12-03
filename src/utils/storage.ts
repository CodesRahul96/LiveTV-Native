import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_CHANNEL_KEY = '@last_channel_id';

export const saveLastChannel = async (channelId: string) => {
  try {
    await AsyncStorage.setItem(LAST_CHANNEL_KEY, channelId);
  } catch (e) {
    console.error('Failed to save last channel', e);
  }
};

export const getLastChannel = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_CHANNEL_KEY);
  } catch (e) {
    console.error('Failed to get last channel', e);
    return null;
  }
};
