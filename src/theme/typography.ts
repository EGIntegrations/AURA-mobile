import { Platform } from 'react-native';

export const AURA_FONTS = {
  rounded: Platform.select({
    ios: 'System', // SF Rounded on iOS
    android: 'sans-serif',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
};

export const AURA_TEXT = {
  heading: {
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  body: {
    fontFamily: AURA_FONTS.body,
  },
};
