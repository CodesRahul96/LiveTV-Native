import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const SkeletonLoader = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  const renderSkeletonItem = (key: number) => (
    <View key={key} style={styles.skeletonItem}>
      <Animated.View style={[styles.skeletonImage, { opacity }]} />
      <Animated.View style={[styles.skeletonText, { opacity }]} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Simulate Categories */}
      {[1, 2, 3].map((category) => (
        <View key={category} style={styles.categoryContainer}>
          <Animated.View style={[styles.categoryTitle, { opacity }]} />
          <View style={styles.row}>
            {[1, 2, 3, 4].map((item) => renderSkeletonItem(item))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    width: 120,
    height: 20,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  skeletonItem: {
    marginRight: 16,
    width: 140,
  },
  skeletonImage: {
    width: 140,
    height: 80,
    backgroundColor: '#333',
    borderRadius: 12,
    marginBottom: 8,
  },
  skeletonText: {
    width: 100,
    height: 14,
    backgroundColor: '#333',
    borderRadius: 4,
    alignSelf: 'center',
  },
});

export default SkeletonLoader;
