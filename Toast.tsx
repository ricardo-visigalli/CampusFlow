import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/theme';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, visible, onHide }) => {
  const translateY = new Animated.Value(-100);

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2700),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  const backgroundColor = type === 'success' ? COLORS.success : 
                          type === 'error' ? COLORS.error : COLORS.primary;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], backgroundColor }]}>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
  },
  message: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
