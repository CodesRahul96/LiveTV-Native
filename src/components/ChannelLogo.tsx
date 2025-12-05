import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, StyleProp } from 'react-native';

interface ChannelLogoProps {
  uri?: string;
  name: string;
  style?: StyleProp<ImageStyle>;
}

const ChannelLogo: React.FC<ChannelLogoProps> = ({ uri, name, style }) => {
  const [error, setError] = useState(false);

  // Generate a consistent color based on the name
  const getBackgroundColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (!uri || error) {
    return (
      <View style={[styles.container, style, { backgroundColor: getBackgroundColor(name) }]}>
        <Text style={styles.initials}>{getInitials(name)}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, style]}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    // Default styles if needed
  },
  initials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
});

export default ChannelLogo;
