import React, { memo } from 'react';
import { Pressable, Text, StyleSheet, Dimensions } from 'react-native';
import { Channel } from '../types';
import ChannelLogo from './ChannelLogo';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_ITEM_WIDTH = (width - 48) / GRID_COLUMNS;

interface ChannelItemProps {
  item: Channel;
  isFocused: boolean;
  onPress: (channel: Channel) => void;
  onFocus: (channelId: string) => void;
  mode: 'list' | 'grid';
}

const ChannelItem = memo(({ item, isFocused, onPress, onFocus, mode }: ChannelItemProps) => {
  return (
    <Pressable
      style={({ pressed, hovered, focused }: any) => [
        mode === 'grid' ? styles.gridCard : styles.channelCard,
        (focused || hovered || isFocused) && styles.channelCardFocused,
        pressed && { opacity: 0.7 }
      ]}
      onPress={() => onPress(item)}
      onFocus={() => onFocus(item.id)}
    >
      {({ focused, hovered }: any) => (
        <>
          <ChannelLogo 
            uri={item.logo} 
            name={item.name}
            style={styles.channelLogo} 
          />
          <Text
            style={[
              styles.channelName,
              (focused || hovered || isFocused) && styles.channelNameFocused
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </>
      )}
    </Pressable>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.item.id === nextProps.item.id &&
    prevProps.mode === nextProps.mode
  );
});

const styles = StyleSheet.create({
  channelCard: {
    marginRight: 16,
    width: 140,
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridCard: {
    width: GRID_ITEM_WIDTH,
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  channelCardFocused: {
    borderColor: '#ff6b6b',
    transform: [{ scale: 1.05 }],
    backgroundColor: '#1a1a1a',
    zIndex: 1,
  },
  channelLogo: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: '#222',
    marginBottom: 8,
  },
  channelName: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  channelNameFocused: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChannelItem;
