import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  BackHandler,
  FlatList,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView, VideoContentFit } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Channel } from '../types';
import { TEST_CHANNEL, useChannels } from '../data/channels';
import { ArrowLeft, Volume2, Maximize, Monitor, Settings } from 'lucide-react-native';
import { saveLastChannel } from '../utils/storage';
import { useKeepAwake } from 'expo-keep-awake';
import ChannelLogo from '../components/ChannelLogo';

const PlayerScreen = () => {
  useKeepAwake();
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
  const [audioTrackName, setAudioTrackName] = useState('Default');
  const [showQualityToast, setShowQualityToast] = useState(false);
  const [qualityName, setQualityName] = useState('Auto');
  const [contentFit, setContentFit] = useState<VideoContentFit>('contain');
  
  // Animation for toast
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const qualityToastOpacity = useRef(new Animated.Value(0)).current;

  // Initialize Video Player
  const videoSource = useMemo(() => ({
    uri: currentChannel.url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  }), [currentChannel.url]);

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    // Lock to landscape on mount
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    
    return () => {
      // Unlock on unmount
      ScreenOrientation.unlockAsync();
      // Cleanup retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Reset state when channel changes
    setLoading(true);
    setError(false);
    // Save the channel ID
    saveLastChannel(currentChannel.id);
    
    // Player source is handled by useVideoPlayer hook updates
    // Just ensure we play
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

  // Auto-hide UI
  const [uiVisible, setUiVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showControls = () => {
    setUiVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Only auto-hide if channel list is NOT visible
    if (!showChannelList) {
      controlsTimeoutRef.current = setTimeout(() => {
        setUiVisible(false);
      }, 4000);
    }
  };

  useEffect(() => {
    showControls();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showChannelList]); // Re-run when showChannelList changes

  // Hardware Back Button Handler
  useEffect(() => {
    const backAction = () => {
      showControls();
      if (showChannelList) {
        setShowChannelList(false);
        return true;
      }
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showChannelList, navigation]);

  // TV/Keyboard Event Handler
  useEffect(() => {
    // Fallback for remote control events using Keyboard module
    // This works for Android TV / Fire TV D-pad events
    const onKeyDown = (e: any) => {
      showControls();
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
          // Instead of just showing toast, maybe toggle controls focus?
          // For now, let's keep it simple or maybe open audio menu?
          // Keeping original behavior for Right key (Audio Toast placeholder)
          // But now we have a real button. Let's keep this as a shortcut.
          cycleAudioTrack();
        }
      } else if (keyName === 'Select' || keyName === 'Enter' || keyName === 'DPadCenter' || keyName === ' ') {
         // Toggle UI or select
         if (!showChannelList) {
           // Just showing controls is enough (handled by showControls call above)
         }
      } else if (keyName === 'm' || keyName === 'M') {
        toggleResizeMode();
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

  const toggleResizeMode = () => {
    setContentFit(prev => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill'; // 'fill' is 'stretch' effectively
      return 'contain';
    });
    showControls();
  };

  const cycleAudioTrack = () => {
    // Placeholder logic for audio track cycling
    // In a real scenario, we would iterate player.audioTracks
    // For now, we'll simulate it and show the toast
    setAudioTrackName(prev => prev === 'Default' ? 'Alternative' : 'Default');
    showAudioToastMessage();
    showControls();
  };

  const cycleVideoQuality = () => {
    // Placeholder logic for video quality cycling
    // expo-video usually handles ABR automatically.
    // Manual selection would require accessing player.availableVideoTracks if supported.
    const qualities = ['Auto', '1080p', '720p', '480p'];
    setQualityName(prev => {
      const currentIndex = qualities.indexOf(prev);
      const nextIndex = (currentIndex + 1) % qualities.length;
      return qualities[nextIndex];
    });
    showQualityToastMessage();
    showControls();
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

  const showQualityToastMessage = () => {
    setShowQualityToast(true);
    Animated.sequence([
      Animated.timing(qualityToastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(qualityToastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowQualityToast(false));
  };

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleError = (e: any) => {
    console.log("Playback error:", e);
    setError(true);
    setLoading(false);
    
    // Attempt to retry once after 3 seconds before falling back
    if (!retryTimeoutRef.current) {
        retryTimeoutRef.current = setTimeout(() => {
            console.log("Retrying playback...");
            setError(false);
            setLoading(true);
            player.replaceAsync({
                uri: currentChannel.url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            player.play();
            retryTimeoutRef.current = null;
        }, 3000);
    } else {
        // ...
    }
  };

  const manualRetry = () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = null;
    setError(false);
    setLoading(true);
    player.replaceAsync({
        uri: currentChannel.url,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    player.play();
  };

  const renderChannelItem = ({ item }: { item: Channel }) => (
    <Pressable
      style={({ pressed }) => [
        styles.channelListItem,
        pressed && styles.channelListItemFocused,
        item.id === currentChannel.id && styles.channelListItemActive
      ]}
      onPress={() => {
        setCurrentChannel(item);
        setShowChannelList(false); // Close list on selection
      }}
    >
      <ChannelLogo uri={item.logo} name={item.name} style={styles.channelListLogo} />
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
        contentFit={contentFit}
        nativeControls={false}
      />

      <Pressable 
        style={StyleSheet.absoluteFill} 
        onPress={() => {
          if (uiVisible) {
            setUiVisible(false);
          } else {
            showControls();
          }
        }}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Playback Error</Text>
          <TouchableOpacity style={styles.retryButton} onPress={manualRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
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
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </View>
      )}

      {/* Audio Toast (Right) */}
      {showAudioToast && (
        <Animated.View style={[styles.audioToast, { opacity: toastOpacity }]}>
          <Volume2 color="#fff" size={32} />
          <Text style={styles.audioToastText}>Audio: {audioTrackName}</Text>
        </Animated.View>
      )}

      {/* Quality Toast (Right) */}
      {showQualityToast && (
        <Animated.View style={[styles.audioToast, { opacity: qualityToastOpacity, top: '60%' }]}>
          <Settings color="#fff" size={32} />
          <Text style={styles.audioToastText}>Quality: {qualityName}</Text>
        </Animated.View>
      )}

      {uiVisible && (
        <>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            focusable={true}
          >
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>

          {/* Player Controls Bar */}
          <View style={styles.controlsBar}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={toggleResizeMode}
              focusable={true}
            >
              <Maximize color="#fff" size={24} />
              <Text style={styles.controlText}>
                {contentFit === 'contain' ? 'Fit' : contentFit === 'cover' ? 'Zoom' : 'Stretch'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={cycleAudioTrack}
              focusable={true}
            >
              <Volume2 color="#fff" size={24} />
              <Text style={styles.controlText}>Audio</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={cycleVideoQuality}
              focusable={true}
            >
              <Settings color="#fff" size={24} />
              <Text style={styles.controlText}>Quality</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  // Controls Bar
  controlsBar: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 10,
    zIndex: 10,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    padding: 5,
  },
  controlText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
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
  retryButton: {
    marginTop: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default PlayerScreen;
