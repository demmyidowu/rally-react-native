/**
 * Rally App Design System
 * Lavender Purple Theme (Based on Logo)
 */

export const colors = {
  // Primary colors from logo
  primary: '#7B68A8',        // Lavender Purple (main)
  primaryDark: '#5D4F82',    // Deeper Purple
  primaryLight: '#9B8BC4',   // Light Lavender

  // Secondary/accent colors
  secondary: '#B8A8D4',      // Soft Lavender
  accent: '#6B5B95',         // Rich Purple

  // Backgrounds
  background: '#F8F6FC',     // Very Light Lavender
  surface: '#FFFFFF',        // White surface
  surfaceLight: '#FAF8FF',   // Slight lavender tint

  // Base colors
  white: '#FFFFFF',
  black: '#000000',

  // Gray scale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Status colors
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#EAB308',
  warningLight: '#FEF9C3',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(123, 104, 168, 0.1)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' as const },
  h2: { fontSize: 24, fontWeight: 'bold' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: 'normal' as const },
  caption: { fontSize: 14, fontWeight: 'normal' as const },
  small: { fontSize: 12, fontWeight: 'normal' as const },
};

export const shadows = {
  xs: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.0,
    elevation: 1,
  },
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2.0,
    elevation: 2,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 4.0,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8.0,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12.0,
    elevation: 12,
  },
};

// Animation timing constants
export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  buttonPress: {
    scale: 0.97,
    duration: 100,
  },
  cardPress: {
    scale: 0.98,
    duration: 100,
  },
};

// Border width constants
export const borders = {
  thin: 1,
  medium: 2,
  thick: 3,
};
