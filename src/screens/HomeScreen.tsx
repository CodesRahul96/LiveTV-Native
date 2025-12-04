import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Image,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChannels } from "../data/channels";
import { Channel } from "../types";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getLastChannel } from "../utils/storage";

const HomeScreen = () => {
  const { categories, loading } = useChannels();
  const navigation = useNavigation();
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);
  const [lastPlayedChannelId, setLastPlayedChannelId] = useState<string | null>(
    null
  );

  const categoryListRef = React.useRef<FlatList>(null);
  const channelListRefs = React.useRef<{ [key: string]: FlatList | null }>({});

  useFocusEffect(
    useCallback(() => {
      const loadLastChannel = async () => {
        const lastId = await getLastChannel();
        if (lastId) {
          setLastPlayedChannelId(lastId);
          setFocusedChannelId(lastId);

          // Find category and channel index to scroll to
          let categoryIndex = -1;
          let channelIndex = -1;
          let targetCategory: any = null;

          for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const cIndex = cat.channels.findIndex(
              (c: Channel) => c.id === lastId
            );
            if (cIndex !== -1) {
              categoryIndex = i;
              channelIndex = cIndex;
              targetCategory = cat;
              break;
            }
          }

          if (categoryIndex !== -1 && targetCategory) {
            // Scroll vertical list to category
            setTimeout(() => {
              categoryListRef.current?.scrollToIndex({
                index: categoryIndex,
                animated: false,
                viewPosition: 0.2,
              });

              // Scroll horizontal list to channel
              setTimeout(() => {
                const horizontalList =
                  channelListRefs.current[targetCategory.id];
                horizontalList?.scrollToIndex({
                  index: channelIndex,
                  animated: false,
                  viewPosition: 0.5,
                });
              }, 100);
            }, 100);
          }
        }
      };
      if (!loading && categories.length > 0) {
        loadLastChannel();
      }
    }, [categories, loading])
  );

  const handleChannelPress = (channel: Channel) => {
    setFocusedChannelId(channel.id);
    setLastPlayedChannelId(channel.id);
    // @ts-ignore
    navigation.navigate("Player", { channel });
  };

  const renderChannel = useCallback(
    ({ item, index }: { item: Channel; index: number }) => {
      // Determine if this item should have preferred focus
      // It should have focus if it matches the last played channel ID
      const isLastPlayed = lastPlayedChannelId === item.id;
      const isFocused = focusedChannelId === item.id;

      return (
        <Pressable
          hasTVPreferredFocus={isLastPlayed}
          style={({ pressed, hovered, focused }: any) => [
            styles.channelCard,
            (focused || hovered || isFocused) && styles.channelCardFocused,
            pressed && { opacity: 0.7 },
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
                  (focused || hovered || isFocused) &&
                    styles.channelNameFocused,
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </>
          )}
        </Pressable>
      );
    },
    [focusedChannelId, lastPlayedChannelId]
  );

  const renderCategory = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{item.name}</Text>
        <FlatList
          ref={(ref) => {
            if (ref) {
              channelListRefs.current[item.id] = ref;
            }
          }}
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
          getItemLayout={(data, index) => ({
            length: 156,
            offset: 156 * index,
            index,
          }) // width + margin
          }
        />
      </View>
    ),
    [renderChannel]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ff6b6b" />
        <Text style={styles.loadingText}>Loading Channels...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TVwala</Text>
      </View>
      <FlatList
        ref={categoryListRef}
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
    backgroundColor: "#0f0f0f",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  listContent: {
    paddingBottom: 20,
  },
  categoryContainer: {
    marginTop: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#eee",
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
    borderColor: "transparent",
  },
  channelCardFocused: {
    borderColor: "#ff6b6b",
    transform: [{ scale: 1.15 }],
    backgroundColor: "#1a1a1a",
  },
  channelLogo: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    backgroundColor: "#222",
    marginBottom: 8,
  },
  channelName: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  channelNameFocused: {
    color: "#fff",
    fontWeight: "bold",
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});

export default HomeScreen;
