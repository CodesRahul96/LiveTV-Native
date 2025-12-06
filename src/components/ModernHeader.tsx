import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Grid, List as ListIcon } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

interface ModernHeaderProps {
  viewMode: 'list' | 'grid';
  onToggleView: () => void;
}

const ModernHeader: React.FC<ModernHeaderProps> = ({ viewMode, onToggleView }) => {
  return (
    <View style={styles.headerContainer}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.6)', 'transparent']}
          style={styles.gradient}
        >
          <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.content}>
              <View style={styles.titleContainer}>
                <Text style={[styles.titleText, { color: '#FFD700', marginRight: 4 }]}>EXCLUSIVE</Text>
                <Text style={[styles.titleText, { color: '#FFF' }]}>TV</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={onToggleView}
                activeOpacity={0.7}
              >
                {viewMode === 'list' ? (
                  <Grid color="#FFD700" size={22} />
                ) : (
                  <ListIcon color="#FFD700" size={22} />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  gradient: {
    width: '100%',
    paddingBottom: 20,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 215, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
});

export default ModernHeader;
