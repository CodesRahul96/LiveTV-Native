import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    console.log("App mounted. Platform.isTV:", Platform.isTV);
    const lockOrientation = async () => {
      try {
        if (Platform.isTV) {
          console.log("Locking to landscape");
          // Force landscape mode for TV experience
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          console.log("Unlocking orientation");
          // Allow portrait/landscape for mobile
          await ScreenOrientation.unlockAsync();
        }
      } catch (e) {
        console.error("Failed to set orientation:", e);
      }
    };
    
    lockOrientation();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
