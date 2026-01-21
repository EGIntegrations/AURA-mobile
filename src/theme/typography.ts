import { Platform } from 'react-native';

export const AURA_FONTS = {
  pixel: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
};

export const AURA_TEXT = {
  pixelHeading: {
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.6,
  },
  pixelLabel: {
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  body: {
    fontFamily: AURA_FONTS.body,
  },
};
