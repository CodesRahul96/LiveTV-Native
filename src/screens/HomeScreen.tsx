import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useChannels } from '../data/channels';
import { Channel } from '../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getLastChannel } from '../utils/storage';
import GradientCard from '../components/GradientCard';
import ModernHeader from '../components/ModernHeader';
import SkeletonLoader from '../components/SkeletonLoader';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;

const HomeScreen = () => {
  const { categories, loading, channels } = useChannels();
  const navigation = useNavigation();
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useFocusEffect(
    useCallback(() => {
      const loadLastChannel = async () => {
        const lastId = await getLastChannel();
        if (lastId) {
          setFocusedChannelId(lastId);
        }
      };
      loadLastChannel();
    }, [])
  );

  const handleChannelPress = useCallback((channel: Channel) => {
    setFocusedChannelId(channel.id);
    // @ts-ignore
    navigation.navigate('Player', { channel });
  }, [navigation]);

  const renderChannel = useCallback(({ item }: { item: Channel }) => {
    return (
      <GradientCard
        item={item}
        isFocused={focusedChannelId === item.id}
        onPress={handleChannelPress}
        onFocus={(id) => setFocusedChannelId(id)}
        mode="list"
      />
    );
  }, [focusedChannelId, handleChannelPress]);

  const renderGridChannel = useCallback(({ item }: { item: Channel }) => {
    return (
      <GradientCard
        item={item}
        isFocused={focusedChannelId === item.id}
        onPress={handleChannelPress}
        onFocus={(id) => setFocusedChannelId(id)}
        mode="grid"
      />
    );
  }, [focusedChannelId, handleChannelPress]);

  const renderCategory = useCallback(({ item }: { item: any }) => (
    <View style={styles.categoryContainer}>
      <Text style={styles.categoryTitle}>{item.name}</Text>
      <FlatList
        data={item.channels}
        renderItem={renderChannel}
        keyExtractor={(channel) => channel.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews={true}
        extraData={focusedChannelId}
      />
    </View>
  ), [renderChannel, focusedChannelId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={['#0f0f0f', '#050505']}
          style={StyleSheet.absoluteFill}
        />
        <ModernHeader viewMode={viewMode} onToggleView={() => {}} />
        <View style={{ marginTop: 100 }}>
             <SkeletonLoader />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <ModernHeader 
        viewMode={viewMode} 
        onToggleView={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')} 
      />

      <FlatList
        data={viewMode === 'list' ? categories : channels}
        key={viewMode} // Force remount on mode switch
        renderItem={viewMode === 'list' ? renderCategory : renderGridChannel as any}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
            styles.scrollContent,
            viewMode === 'grid' && styles.gridContent
        ]}
        // Grid Props
        numColumns={viewMode === 'grid' ? GRID_COLUMNS : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        // Optimization Props
        initialNumToRender={viewMode === 'list' ? 3 : 12}
        maxToRenderPerBatch={viewMode === 'list' ? 2 : 6}
        windowSize={viewMode === 'list' ? 3 : 5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 100 : 100, // Space for header
    paddingBottom: 40,
  },
  gridContent: {
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F0F0F0',
    marginLeft: 16,
    marginBottom: 12,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
});

export default HomeScreen;
