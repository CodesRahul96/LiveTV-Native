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
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Channel } from '../types';
import { TEST_CHANNEL, useChannels } from '../data/channels';
import { ArrowLeft, Volume2, Maximize } from 'lucide-react-native';
import { saveLastChannel } from '../utils/storage';

const PlayerScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  // @ts-ignore
  const { channel } = route.params;
  const { channels } = useChannels();
  
  const [currentChannel, setCurrentChannel] = useState<Channel>(channel);
  const [loading, setLoading] = useState(true);
  const [showChannelList, setShowChannelList] = useState(false);
  const [showAudioToast, setShowAudioToast] = useState(false);
  const [audioTrackName, setAudioTrackName] = useState('Default');
  const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.CONTAIN);
  
  const videoRef = useRef<Video>(null);
  
  // Animation for toast
  const toastOpacity = useRef(new Animated.Value(0)).current;

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
    // Save the channel ID
    saveLastChannel(currentChannel.id);
  }, [currentChannel]);

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
  }, [showChannelList]);

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
    const onKeyDown = (e: any) => {
      showControls();
      const keyName = e.nativeEvent?.key;

      if (['ArrowUp', 'DPadUp', 'Up'].includes(keyName)) {
        changeChannel('next');
      } else if (['ArrowDown', 'DPadDown', 'Down'].includes(keyName)) {
        changeChannel('prev');
      } else if (['ArrowLeft', 'DPadLeft', 'Left'].includes(keyName)) {
        if (!showChannelList) setShowChannelList(true);
      } else if (['ArrowRight', 'DPadRight', 'Right'].includes(keyName)) {
        if (showChannelList) {
          setShowChannelList(false);
        } else {
          cycleAudioTrack();
        }
      } else if (['Select', 'Enter', 'DPadCenter', 'Center', ' '].includes(keyName)) {
         if (!showChannelList) {
           if (uiVisible) {
             setUiVisible(false);
           } else {
             showControls();
           }
         }
      } else if (['Menu', 'ContextMenu', 'm', 'M'].includes(keyName)) {
        toggleResizeMode();
      }
    };

    // @ts-ignore
    const subscription = Keyboard.addListener('keydown', onKeyDown);
    return () => subscription.remove();
  }, [showChannelList, currentChannel, uiVisible]); 

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
    setResizeMode(prev => {
      if (prev === ResizeMode.CONTAIN) return ResizeMode.COVER;
      if (prev === ResizeMode.COVER) return ResizeMode.STRETCH;
      return ResizeMode.CONTAIN;
    });
    showControls();
  };

  const cycleAudioTrack = () => {
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

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        handleError(status.error);
      }
      return;
    }

    if (status.isPlaying) {
      setLoading(false);
    } else if (status.isBuffering) {
      setLoading(true);
    }
  };

  const handleError = (e: any) => {
    console.error("Video Playback Error:", e);
    setLoading(false);
    
    // Fallback to test channel if not already playing it
    if (currentChannel.id !== TEST_CHANNEL.id) {
      console.log("Falling back to Test Channel");
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
        setShowChannelList(false);
      }}
    >
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={styles.channelListLogo} />
      ) : (
        <View style={[styles.channelListLogo, { backgroundColor: '#555' }]} />
      )}
      <Text style={styles.channelListText} numberOfLines={1}>{item.name}</Text>
    </Pressable>
  );

  const channelList = useMemo(() => channels, [channels]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: currentChannel.url }}
        resizeMode={resizeMode}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        useNativeControls={false}
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

      {/* Channel List Overlay */}
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

      {/* Audio Toast */}
      {showAudioToast && (
        <Animated.View style={[styles.audioToast, { opacity: toastOpacity }]}>
          <Volume2 color="#fff" size={32} />
          <Text style={styles.audioToastText}>Audio: {audioTrackName}</Text>
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
                {resizeMode === ResizeMode.CONTAIN ? 'Fit' : resizeMode === ResizeMode.COVER ? 'Zoom' : 'Stretch'}
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
});

export default PlayerScreen;
