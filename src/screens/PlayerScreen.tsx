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
  Platform,
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
  const [hasMultipleAudioTracks, setHasMultipleAudioTracks] = useState(false);
  // Removed quality state
  const [contentFit, setContentFit] = useState<VideoContentFit>('fill');
  
  // Animation for toast
  // Animation for toast
  const toastOpacity = useRef(new Animated.Value(0)).current;
  // Removed quality toast opacity

  // Initialize Video Player
  // Helper helper to convert Hex to Base64Url
  const hexToBase64Url = (hex: string) => {
    try {
      // Remove any non-hex characters
      const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
      if (cleanHex.length % 2 !== 0) return '';
      
      const binary = cleanHex.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join('') || '';
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.log("Error converting hex to base64", e);
      return '';
    }
  };

  const videoSource = useMemo(() => {
    // User requested to remove User-Agent (let player use default)
    const headers: Record<string, string> = {}; 

    let drm = undefined;
    if (currentChannel.licenseKey) {
      const parts = currentChannel.licenseKey.split(':');
      if (parts.length === 2) {
        const kidHex = parts[0];
        const keyHex = parts[1];
        
        const kid = hexToBase64Url(kidHex);
        const k = hexToBase64Url(keyHex);

        if (kid && k) {
            const clearKeyJson = JSON.stringify({
                keys: [{ kty: 'oct', k, kid }],
                type: 'temporary'
            });
            // Use local license server instead of data URI to avoid protocol errors on Android
            // Android Emulator loopback: 10.0.2.2
            // Physical device: needs machine IP (we default to 10.0.2.2 for now as mostly emulator usage is implied with 'java.net')
            const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
            const licenseServer = `http://${host}:3000/license?keys=${encodeURIComponent(btoa(clearKeyJson))}`;
            
            drm = {
                type: 'clearkey',
                licenseServer
            } as any;
            console.log("DRM Configured for", currentChannel.name);
        }
      }
    }

    return {
      uri: currentChannel.url,
      headers, // Empty now
      drm
    };
  }, [currentChannel.url, currentChannel.licenseKey]);

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false;
    player.staysActiveInBackground = true;
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
        // Check for multiple audio tracks
        // @ts-ignore
        if (player.audioTracks && player.audioTracks.length > 1) {
          setHasMultipleAudioTracks(true);
        } else {
          setHasMultipleAudioTracks(false);
        }
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

  // TV Remote Event Handler
  // @ts-ignore - useTVEventHandler is available in recent RN versions
  const { useTVEventHandler } = require('react-native');
  
  const [lastRemoteEventTime, setLastRemoteEventTime] = useState(0);

  // We use a try-catch block or conditional import in a real app, 
  // but here we'll assume it's available or fallback gracefully if not (it won't crash, just won't hook).
  // Actually, let's stick to the Keyboard listener for maximum compatibility across Phone/TV 
  // UNLESS we are sure.
  // Wait, the user specifically asked for Fire TV.
  // Let's IMPROVE the Keyboard listener to be more robust instead of replacing it, 
  // as useTVEventHandler might not be available in the types if not configured.
  
  // REVISED PLAN: Stick to Keyboard but add more key codes and logging.
  
  useEffect(() => {
    const onKeyDown = (e: any) => {
      showControls();
      const keyName = e.nativeEvent?.key;
      console.log('Key pressed:', keyName); // Debugging

      // Fire TV / Android TV Key Mapping
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
          cycleAudioTrack();
        }
      } else if (
        keyName === 'Select' || 
        keyName === 'Enter' || 
        keyName === 'DPadCenter' || 
        keyName === ' ' ||
        keyName === 'MediaPlayPause'
      ) {
         if (!showChannelList) {
           // Toggle controls or Play/Pause?
           // For now, just show controls
         }
      } else if (keyName === 'Menu') {
        // Fire TV Menu button - Removed resize toggle
        // toggleResizeMode();
      }
    };

    const subscription = Keyboard.addListener('keydown' as any, onKeyDown);
    return () => subscription.remove();
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



  const cycleAudioTrack = () => {
    // Placeholder logic for audio track cycling
    // In a real scenario, we would iterate player.audioTracks
    // For now, we'll simulate it and show the toast
    setAudioTrackName(prev => prev === 'Default' ? 'Alternative' : 'Default');
    showAudioToastMessage();
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
                    'User-Agent': '' // Empty or just remove key? The tool requires replacement content.
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
        headers: {}
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



      {/* On-Screen Controls (Mobile Only) */}
      {/* On-Screen Controls (Mobile Only) */}
      {uiVisible && (
        <>
          {!Platform.isTV && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              focusable={false} // Disable focus on touch controls for TV
            >
              <ArrowLeft color="#fff" size={24} />
            </TouchableOpacity>
          )}

          {/* Player Controls Bar */}
          {!Platform.isTV && (
            <View style={styles.controlsBar}>
              {hasMultipleAudioTracks && (
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={cycleAudioTrack}
                  focusable={false}
                >
                  <Volume2 color="#fff" size={24} />
                  <Text style={styles.controlText}>Audio</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
