import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Image,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChannels } from '../data/channels';
import { Channel } from '../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getLastChannel } from '../utils/storage';
import ChannelLogo from '../components/ChannelLogo';
import SkeletonLoader from '../components/SkeletonLoader';
import { Grid, List as ListIcon } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_ITEM_WIDTH = (width - 48) / GRID_COLUMNS; // 48 = padding (16*2) + gap (16)

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

  const handleChannelPress = (channel: Channel) => {
    setFocusedChannelId(channel.id);
    // @ts-ignore
    navigation.navigate('Player', { channel });
  };

  const renderChannel = useCallback(({ item }: { item: Channel }) => {
    const isLastPlayed = focusedChannelId === item.id;

    return (
      <Pressable
        style={({ pressed, hovered, focused }: any) => [
          styles.channelCard,
          (focused || hovered || isLastPlayed) && styles.channelCardFocused,
          pressed && { opacity: 0.7 }
        ]}
        onPress={() => handleChannelPress(item)}
        onFocus={() => setFocusedChannelId(item.id)}
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
                (focused || hovered || isLastPlayed) && styles.channelNameFocused
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </>
        )}
      </Pressable>
    );
  }, [focusedChannelId]);

  const renderGridChannel = useCallback(({ item }: { item: Channel }) => {
    const isLastPlayed = focusedChannelId === item.id;

    return (
      <Pressable
        style={({ pressed, hovered, focused }: any) => [
          styles.gridCard,
          (focused || hovered || isLastPlayed) && styles.channelCardFocused,
          pressed && { opacity: 0.7 }
        ]}
        onPress={() => handleChannelPress(item)}
        onFocus={() => setFocusedChannelId(item.id)}
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
                (focused || hovered || isLastPlayed) && styles.channelNameFocused
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </>
        )}
      </Pressable>
    );
  }, [focusedChannelId]);

  const renderCategory = useCallback(({ item }: { item: any }) => (
    <View style={styles.categoryContainer}>
      <Text style={styles.categoryTitle}>{item.name}</Text>
      <FlatList
        data={item.channels}
        renderItem={renderChannel}
        keyExtractor={(channel) => channel.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.channelList}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
      />
    </View>
  ), [renderChannel]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TVwala</Text>
        </View>
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TVwala</Text>
        <TouchableOpacity 
          style={styles.viewToggle}
          onPress={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}
        >
          {viewMode === 'list' ? (
            <Grid color="#fff" size={24} />
          ) : (
            <ListIcon color="#fff" size={24} />
          )}
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <FlatList
          key="list"
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          windowSize={2}
          removeClippedSubviews={true}
        />
      ) : (
        <FlatList
          key="grid"
          data={channels}
          renderItem={renderGridChannel}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          initialNumToRender={12}
          maxToRenderPerBatch={6}
          windowSize={3}
          removeClippedSubviews={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewToggle: {
    padding: 8,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryContainer: {
    marginTop: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#eee',
    marginLeft: 16,
    marginBottom: 12,
  },
  channelList: {
    paddingHorizontal: 16,
  },
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

export default HomeScreen;
