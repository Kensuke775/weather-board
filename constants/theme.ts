/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { DancingScript_400Regular } from '@expo-google-fonts/dancing-script';

export const WeatherBoardColors = {
  textPrimary: 'rgba(255,255,255,0.95)',
  textMuted: 'rgba(255,255,255,0.7)',
  textMutedGlay: 'rgba(255,255,255,0.5)',
  textMutedDark: 'rgba(0,0,0,0.7)',
  accentBackground: 'rgba(96, 165, 250)',
  secondaryBackground: 'rgba(120, 120, 120)',
  tertiaryBackground:'rgba(34, 197, 94)',
  glassBorder: 'rgba(255,255,255,0.5)',
  glassBackground: 'rgba(255,255,255,0.15)',
}

export const Fonts = {
  title: 'DancingScript_400Regular',
  titleFont: DancingScript_400Regular
}


const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};