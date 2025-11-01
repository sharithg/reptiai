/**
 * Reptile Care App Theme
 * A nature-inspired design system with comprehensive color palette,
 * spacing, typography, and styling utilities.
 */

import { Platform } from 'react-native';

// Primary color palette - nature/reptile inspired
const primary = '#2D7A3D'; // Forest green
const primaryLight = '#4CAF50'; // Lighter green
const primaryDark = '#1B5E20'; // Darker green
const secondary = '#FF6B35'; // Terracotta orange
const accent = '#4ECDC4'; // Turquoise

export const Colors = {
  light: {
    // Primary colors
    primary: primary,
    primaryLight: primaryLight,
    primaryDark: primaryDark,
    secondary: secondary,
    accent: accent,
    tint: primary,

    // Background colors
    background: '#FAFAFA',
    backgroundSecondary: '#FFFFFF',
    backgroundElevated: '#FFFFFF',
    backgroundOverlay: 'rgba(0, 0, 0, 0.5)',

    // Text colors
    text: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#FFFFFF',

    // UI colors
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    divider: '#EEEEEE',
    
    // Semantic colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',

    // Interactive states
    pressed: 'rgba(45, 122, 61, 0.1)',
    disabled: '#CCCCCC',

    // Icons
    icon: '#666666',
    iconSecondary: '#999999',
    tabIconDefault: '#999999',
    tabIconSelected: primary,
  },
  dark: {
    // Primary colors
    primary: primaryLight,
    primaryLight: '#66BB6A',
    primaryDark: primary,
    secondary: '#FF8A65',
    accent: '#80CBC4',
    tint: primaryLight,

    // Background colors
    background: '#121212',
    backgroundSecondary: '#1E1E1E',
    backgroundElevated: '#2C2C2C',
    backgroundOverlay: 'rgba(0, 0, 0, 0.7)',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
    textInverse: '#1A1A1A',

    // UI colors
    border: '#333333',
    borderLight: '#2A2A2A',
    divider: '#2C2C2C',
    
    // Semantic colors
    success: '#66BB6A',
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#64B5F6',

    // Interactive states
    pressed: 'rgba(76, 175, 80, 0.2)',
    disabled: '#555555',

    // Icons
    icon: '#B0B0B0',
    iconSecondary: '#808080',
    tabIconDefault: '#808080',
    tabIconSelected: primaryLight,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Spacing system (4px base unit)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius system
export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Shadow/elevation system
export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
};

// Typography scale
export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};
