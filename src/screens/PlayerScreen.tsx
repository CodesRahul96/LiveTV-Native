import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Channel } from '../types';
import { TEST_CHANNEL } from '../data/channels';
import { ArrowLeft } from 'lucide-react-native';
import { saveLastChannel } from '../utils/storage';

const PlayerScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  // @ts-ignore
  const { channel } = route.params;
  const videoRef = useRef<Video>(null);
  
  const [currentChannel, setCurrentChannel] = useState<Channel>(channel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
  }, [currentChannel]);

  const handleError = (e: any) => {
    setError(true);
    setLoading(false);
    
    // Fallback to test channel if not already playing it
    if (currentChannel.id !== TEST_CHANNEL.id) {
      setCurrentChannel(TEST_CHANNEL);
    }
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <Video
        ref={videoRef}
        source={{ uri: currentChannel.url }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        shouldPlay
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={() => setLoading(true)}
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
});

export default PlayerScreen;
