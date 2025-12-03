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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChannels } from '../data/channels';
import { Channel } from '../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getLastChannel } from '../utils/storage';

const HomeScreen = () => {
  const { categories } = useChannels();
  const navigation = useNavigation();
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);

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
            <Image 
              source={{ uri: item.logo }} 
              style={styles.channelLogo} 
              resizeMode="contain"
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live TV</Text>
      </View>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={2}
        removeClippedSubviews={true}
      />
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    paddingBottom: 20,
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
  channelCardFocused: {
    borderColor: '#ff6b6b',
    transform: [{ scale: 1.15 }],
    backgroundColor: '#1a1a1a',
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
