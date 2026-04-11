import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { COLORS } from '../constants/theme';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  darkMode?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message, 
  fullScreen = false,
  darkMode = false 
}) => {
  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, darkMode && styles.fullScreenDark]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        {message && <Text style={[styles.message, darkMode && styles.messageDark]}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={COLORS.accent} />
      {message && <Text style={[styles.message, darkMode && styles.messageDark]}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  fullScreenDark: {
    backgroundColor: COLORS.backgroundDark,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  messageDark: {
    color: COLORS.white,
  },
});
