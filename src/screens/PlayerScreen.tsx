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
  Dimensions,
} from 'react-native';
import { useVideoPlayer, VideoView, VideoContentFit } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Channel } from '../types';
import { TEST_CHANNEL, useChannels } from '../data/channels';
import { ArrowLeft, Volume2, Maximize, Monitor, Settings, Sun } from 'lucide-react-native';
import { saveLastChannel } from '../utils/storage';
import { useKeepAwake } from 'expo-keep-awake';
import ChannelLogo from '../components/ChannelLogo';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Brightness from 'expo-brightness';

const { width } = Dimensions.get('window');

const PlayerScreen = () => {
  useKeepAwake();
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
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
  const [contentFit, setContentFit] = useState<VideoContentFit>('fill');
  
  // Gesture States
  const [gestureActive, setGestureActive] = useState(false);
  const [gestureType, setGestureType] = useState<'brightness' | 'volume' | null>(null);
  const [gestureValue, setGestureValue] = useState(0); 
  
  const startValueRef = useRef(0);
  const gestureTypeRef = useRef<'brightness' | 'volume' | null>(null);
  
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const hexToBase64Url = (hex: string) => {
    try {
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
    // Use VLC User-Agent as it's often whitelisted for IPTV streams
    const headers: Record<string, string> = {
      'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18'
    }; 

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
      headers,
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
    const lock = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (e) {
        console.warn("Error locking orientation:", e);
      }
    };
    lock();
    
    return () => {
      // Unlock on unmount
      const unlock = async () => {
        try {
          await ScreenOrientation.unlockAsync();
        } catch (e) {
           console.warn("Error unlocking orientation:", e);
        }
      };
      unlock();
      
      // Cleanup retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);
    saveLastChannel(currentChannel.id);
    player.play();
  }, [currentChannel, player]);

  useEffect(() => {
    const statusSubscription = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        setLoading(false);
        setError(false);
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

  const [uiVisible, setUiVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showControls = () => {
    setUiVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (!showChannelList) {
      controlsTimeoutRef.current = setTimeout(() => {
        setUiVisible(false);
      }, 4000);
    }
  };

  useEffect(() => {
    showControls();
    if (showChannelList) {
      const index = channels.findIndex(c => c.id === currentChannel.id);
      if (index !== -1) {
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
        }, 100);
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showChannelList]);

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

  useEffect(() => {
    const onKeyDown = (e: any) => {
      showControls();
      const keyName = e.nativeEvent?.key;
      console.log('Key pressed:', keyName); 

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
          openAudioSelection();
        }
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

  // Audio Selection State
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<any>(null);

  const openAudioSelection = () => {
    // Cast to any to access audioTracks if not in types (though we know it exists now)
    const p = player as any;
    
    if (p.availableAudioTracks && p.availableAudioTracks.length > 0) {
        setAvailableAudioTracks(p.availableAudioTracks);
        // Find current
        setCurrentAudioTrack(p.audioTrack);
        setShowAudioModal(true);
        setUiVisible(false); 
    } else {
        setShowAudioToast(true);
        setAudioTrackName("No other tracks");
        setTimeout(() => setShowAudioToast(false), 2000);
    }
  };

  const selectAudioTrack = (track: any) => {
      const p = player as any;
      p.audioTrack = track;
      setCurrentAudioTrack(track);
      setShowAudioModal(false);
      showControls();
      
      // Toast
      setAudioTrackName(track.label || `Track ${availableAudioTracks.indexOf(track) + 1}`);
      showAudioToastMessage();
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
    
    if (!retryTimeoutRef.current) {
        retryTimeoutRef.current = setTimeout(() => {
            console.log("Retrying playback...");
            setError(false);
            setLoading(true);
            player.replaceAsync({
                uri: currentChannel.url,
                headers: {
                    'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18'
                }
            });
            player.play();
            retryTimeoutRef.current = null;
        }, 3000);
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
             'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18'
        }
    });
    player.play();
  };

  // Pan Gesture Handlers
  const panGesture = useMemo(() => Gesture.Pan()
    .enabled(!showAudioModal)
    .onStart((e) => {
      if (Platform.isTV) return;
      
      const isLeft = e.x < width / 2;
      setGestureActive(true);
      
      if (isLeft) {
        gestureTypeRef.current = 'brightness';
        setGestureType('brightness');
        Brightness.getBrightnessAsync().then(val => {
           startValueRef.current = val;
        });
      } else {
        gestureTypeRef.current = 'volume';
        setGestureType('volume');
        startValueRef.current = player.volume;
      }
    })
    .onUpdate((e) => {
       if (Platform.isTV) return;
       const type = gestureTypeRef.current;
       if (!type) return;

       const delta = -e.translationY / 200; 
       
       let newValue = Math.max(0, Math.min(1, startValueRef.current + delta));
       
       setGestureValue(Math.round(newValue * 100));
       
       if (type === 'brightness') {
           Brightness.setBrightnessAsync(newValue);
       } else {
           player.volume = newValue;
       }
    })
    .onEnd(() => {
        setGestureActive(false);
        setGestureType(null);
        gestureTypeRef.current = null;
    })
    .runOnJS(true), [player, showAudioModal]);

  const channelList = useMemo(() => channels, [channels]);

  const renderChannelItem = ({ item }: { item: Channel }) => (
    <Pressable
      style={({ pressed }) => [
        styles.channelListItem,
        item.id === currentChannel.id && styles.channelListItemActive,
        pressed && styles.channelListItemFocused
      ]}
      onPress={() => {
        setCurrentChannel(item);
        setShowChannelList(false);
        showControls();
      }}
    >
      <ChannelLogo uri={item.logo} name={item.name} style={styles.channelListLogo} />
      <Text style={styles.channelListText} numberOfLines={1}>{item.name}</Text>
    </Pressable>
  );

  const renderAudioModal = () => (
      <View style={styles.audioModalOverlay}>
          <View style={styles.audioModalContent}>
              <Text style={styles.overlayTitle}>Select Audio</Text>
              <FlatList
                  data={availableAudioTracks}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item, index }) => (
                      <TouchableOpacity 
                        style={[
                            styles.audioTrackItem, 
                            currentAudioTrack === item && styles.audioTrackItemActive
                        ]}
                        onPress={() => selectAudioTrack(item)}
                      >
                          <Text style={styles.audioTrackText}>
                              {item.label || item.language || `Track ${index + 1}`}
                          </Text>
                          {currentAudioTrack === item && <View style={styles.activeDot} />}
                      </TouchableOpacity>
                  )}
              />
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowAudioModal(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
          </View>
      </View>
  );

  return (
    <GestureDetector gesture={panGesture}>
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
            if (showAudioModal) {
                setShowAudioModal(false);
                return;
            }
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

        {gestureActive && (
          <View style={styles.gestureOverlay}>
              {gestureType === 'brightness' ? <Sun color="#fff" size={48} /> : <Volume2 color="#fff" size={48} />}
              <Text style={styles.gestureText}>{gestureValue}%</Text>
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

        {showChannelList && (
          <View style={styles.channelListOverlay}>
            <Text style={styles.overlayTitle}>Channels</Text>
            <FlatList
              data={channelList}
              renderItem={renderChannelItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.channelListContent}
              getItemLayout={(data, index) => (
                {length: 65, offset: 65 * index, index}
              )}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                }, 500);
              }}
              ref={flatListRef}
            />
          </View>
        )}
        
        {showAudioModal && renderAudioModal()}

        {showAudioToast && (
          <Animated.View style={[styles.audioToast, { opacity: toastOpacity }]}>
            <Volume2 color="#fff" size={32} />
            <Text style={styles.audioToastText}>Audio: {audioTrackName}</Text>
          </Animated.View>
        )}

        {uiVisible && !showAudioModal && (
          <>
            {!Platform.isTV && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                focusable={false} 
              >
                <ArrowLeft color="#fff" size={24} />
              </TouchableOpacity>
            )}

            {!Platform.isTV && (
              <View style={styles.controlsBar}>
                  <TouchableOpacity 
                    style={styles.controlButton} 
                    onPress={openAudioSelection}
                    focusable={false}
                  >
                    <Volume2 color="#fff" size={24} />
                    <Text style={styles.controlText}>Audio</Text>
                  </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </GestureDetector>
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
  gestureOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 50,
  },
  gestureText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  audioModalOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 100,
  },
  audioModalContent: {
      backgroundColor: '#1a1a1a',
      padding: 20,
      borderRadius: 12,
      width: 300,
      maxHeight: '80%',
  },
  audioTrackItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  audioTrackItemActive: {
      backgroundColor: '#2a2a2a',
  },
  audioTrackText: {
      color: '#fff',
      fontSize: 16,
  },
  activeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#3498db',
  },
  closeButton: {
      marginTop: 20,
      alignItems: 'center',
      padding: 10,
      backgroundColor: '#333',
      borderRadius: 8,
  },
  closeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  }
});

export default PlayerScreen;
