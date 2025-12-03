import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  FlatList,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Channel } from '../types';
import { TEST_CHANNEL, useChannels } from '../data/channels';
import { ArrowLeft, Volume2 } from 'lucide-react-native';
import { saveLastChannel } from '../utils/storage';

const PlayerScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  // @ts-ignore
  const { channel } = route.params;
  const { channels } = useChannels();
  
  const [currentChannel, setCurrentChannel] = useState<Channel>(channel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showChannelList, setShowChannelList] = useState(false);
  const [showAudioToast, setShowAudioToast] = useState(false);
  
  // Animation for toast
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Initialize Video Player
  const player = useVideoPlayer(currentChannel.url, player => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    // Lock to landscape on mount
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    
    return () => {
      // Unlock on unmount
      ScreenOrientation.unlockAsync();
    };
  }, []);

  useEffect(() => {
    // Reset state when channel changes
    setLoading(true);
    setError(false);
    // Save the channel ID
    saveLastChannel(currentChannel.id);
    
    // Update player source
    player.replace(currentChannel.url);
    player.play();
  }, [currentChannel, player]);

  // Handle Player Events
  useEffect(() => {
    const statusSubscription = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        setLoading(false);
        setError(false);
      }
      if (error) {
        handleError(error);
      }
    });

    return () => {
      statusSubscription.remove();
    };
  }, [player]);

  // TV/Keyboard Event Handler
  useEffect(() => {
    // Fallback for remote control events using Keyboard module
    // This works for Android TV / Fire TV D-pad events
    const onKeyDown = (e: any) => {
      // Map keys to actions
      // Note: Key names might vary by device/platform
      const keyName = e.nativeEvent?.key;
      
      if (keyName === 'ArrowUp' || keyName === 'DPadUp') {
        changeChannel('next');
      } else if (keyName === 'ArrowDown' || keyName === 'DPadDown') {
        changeChannel('prev');
      } else if (keyName === 'ArrowLeft' || keyName === 'DPadLeft') {
        if (!showChannelList) setShowChannelList(true);
      } else if (keyName === 'ArrowRight' || keyName === 'DPadRight') {
        if (showChannelList) {
          setShowChannelList(false);
        } else {
          showAudioToastMessage();
        }
      }
    };

    // @ts-ignore - 'keydown' is valid for React Native Android TV / Web
    const subscription = Keyboard.addListener('keydown', onKeyDown);

    return () => {
      subscription.remove();
    };
  }, [showChannelList, currentChannel]); 

  const changeChannel = (direction: 'next' | 'prev') => {
    const currentIndex = channels.findIndex(c => c.id === currentChannel.id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % channels.length;
    } else {
      newIndex = (currentIndex - 1 + channels.length) % channels.length;
    }
    
    setCurrentChannel(channels[newIndex]);
  };

  const showAudioToastMessage = () => {
    setShowAudioToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowAudioToast(false));
  };

  const handleError = (e: any) => {
    setError(true);
    setLoading(false);
    
    // Fallback to test channel if not already playing it
    if (currentChannel.id !== TEST_CHANNEL.id) {
      setCurrentChannel(TEST_CHANNEL);
    }
  };

  const renderChannelItem = ({ item }: { item: Channel }) => (
    <Pressable
      style={({ focused }) => [
        styles.channelListItem,
        focused && styles.channelListItemFocused,
        item.id === currentChannel.id && styles.channelListItemActive
      ]}
      onPress={() => {
        setCurrentChannel(item);
        setShowChannelList(false); // Close list on selection
      }}
    >
      <Image source={{ uri: item.logo }} style={styles.channelListLogo} />
      <Text style={styles.channelListText} numberOfLines={1}>{item.name}</Text>
    </Pressable>
  );

  const channelList = useMemo(() => channels, [channels]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={!showChannelList}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Playback Error. Retrying...</Text>
        </View>
      )}

      {/* Channel List Overlay (Left Drawer) */}
      {showChannelList && (
        <View style={styles.channelListOverlay}>
          <Text style={styles.overlayTitle}>Channels</Text>
          <FlatList
            data={channelList}
            renderItem={renderChannelItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.channelListContent}
            initialScrollIndex={channels.findIndex(c => c.id === currentChannel.id)}
            getItemLayout={(data, index) => (
              {length: 60, offset: 60 * index, index}
            )}
          />
        </View>
      )}

      {/* Audio Toast (Right) */}
      {showAudioToast && (
        <Animated.View style={[styles.audioToast, { opacity: toastOpacity }]}>
          <Volume2 color="#fff" size={32} />
          <Text style={styles.audioToastText}>Audio Track: Default</Text>
        </Animated.View>
      )}

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        focusable={true}
      >
        <ArrowLeft color="#fff" size={24} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    zIndex: 10,
  },
  // Channel List Overlay
  channelListOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 20,
    paddingTop: 20,
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 10,
  },
  channelListContent: {
    paddingHorizontal: 10,
  },
  channelListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  channelListItemFocused: {
    backgroundColor: '#3498db',
  },
  channelListItemActive: {
    backgroundColor: '#222',
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  channelListLogo: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: '#333',
  },
  channelListText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  // Audio Toast
  audioToast: {
    position: 'absolute',
    right: 40,
    top: '50%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  audioToastText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlayerScreen;
