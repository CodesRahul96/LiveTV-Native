import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Channel } from '../types';
import ChannelLogo from './ChannelLogo';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_ITEM_WIDTH = (width - 48) / GRID_COLUMNS;

// TV Specific Sizing
const IS_TV = Platform.isTV;
const GRID_ITEM_WIDTH_TV = GRID_ITEM_WIDTH * 1.25; // 25% wider for TV
const LIST_ITEM_WIDTH_TV = 180; // Bigger list items

interface GradientCardProps {
  item: Channel;
  isFocused: boolean;
  onPress: (channel: Channel) => void;
  onFocus?: (id: string) => void;
  mode: 'list' | 'grid';
}

const GradientCard: React.FC<GradientCardProps> = ({ 
  item, 
  isFocused, 
  onPress, 
  onFocus,
  mode 
}) => {
  const isGrid = mode === 'grid';
  
  // Dynamic Styles based on TV
  const containerStyle = isGrid
    ? (IS_TV ? { width: GRID_ITEM_WIDTH_TV, height: GRID_ITEM_WIDTH_TV * 0.8, marginBottom: 24 } : styles.gridContainer)
    : (IS_TV ? { width: LIST_ITEM_WIDTH_TV, height: 130 } : styles.listContainer);

  const getGradientColors = () => {
    if (IS_TV && isFocused) {
      // Light Red background for TV Focus
      return ['rgba(255, 80, 80, 0.6)', 'rgba(100, 0, 0, 0.9)'];
    }
    if (isFocused) {
      // Original Gold Focus for Touch
      return ['rgba(255, 215, 0, 0.3)', 'rgba(0,0,0,0.8)'];
    }
    // Default State
    return ['rgba(255, 255, 255, 0.05)', 'rgba(0,0,0,0.4)'];
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        containerStyle,
        { transform: [{ scale: pressed || isFocused ? (IS_TV ? 1.1 : 0.96) : 1 }] } // Scale UP on TV, DOWN on Touch
      ]}
      onPress={() => onPress(item)}
      onFocus={() => onFocus?.(item.id)}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.cardContent,
          isFocused && (IS_TV ? styles.focusedBorderTV : styles.focusedBorder)
        ]}
      >
        <View style={styles.logoContainer}>
          <ChannelLogo 
            uri={item.logo} 
            name={item.name} 
            style={isGrid ? styles.gridLogo : styles.listLogo} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text 
            style={[
              styles.nameText, 
              (isFocused && !IS_TV) && { color: '#FFD700' }, // Gold text only on Touch focus
              (isFocused && IS_TV) && { color: '#FFF', fontWeight: 'bold' } // White bold on TV Red
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#1a1a1a',
  },
  listContainer: {
    width: 140,
    height: 100,
  },
  gridContainer: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH * 0.8,
    marginBottom: 0, 
  },
  cardContent: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
    borderColor: 'transparent',
    borderWidth: 1.5,
    borderRadius: 12,
  },
  focusedBorder: {
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  focusedBorderTV: {
    borderColor: '#FF4444', 
    borderWidth: 2,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLogo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  gridLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  textContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E0E0E0',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  }
});

export default memo(GradientCard);
