/**
 * Avatar Component
 * User avatar with fallback to initials
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from './theme';

export interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 48,
}) => {
  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getBackgroundColor = (fullName: string): string => {
    // Generate a consistent color based on name
    const colors = [
      '#512888', // K-State Purple
      '#8B1538', // Rally Red
      '#3B82F6', // Blue
      '#22C55E', // Green
      '#EAB308', // Yellow
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#14B8A6', // Teal
    ];
    const index = fullName.length % colors.length;
    return colors[index];
  };

  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);
  const fontSize = size * 0.4;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          accessibilityLabel={`${name}'s avatar`}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            { fontSize },
          ]}
          accessibilityLabel={`${name}'s initials`}
        >
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
