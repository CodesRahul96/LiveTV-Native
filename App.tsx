import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    const lockOrientation = async () => {
      if (Platform.isTV) {
        // Force landscape mode for TV experience
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        // Allow portrait/landscape for mobile
        await ScreenOrientation.unlockAsync();
      }
    };
    
    lockOrientation();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
