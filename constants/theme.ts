import { Platform } from "react-native";

import { DancingScript_400Regular } from "@expo-google-fonts/dancing-script";

const ios = Platform.OS === "ios";

export const WeatherBoardColors = {
  textPrimary: "rgba(255,255,255,0.95)",
  textMuted: "rgba(255,255,255,0.7)",
  textMutedGlay: "rgba(255,255,255,0.5)",
  textMutedDark: "rgba(0,0,0,0.7)",
  accentBackground: ios ? "rgba(96, 165, 250, 0.7)" : "rgba(96, 165, 250)",
  secondaryBackground: ios ? "rgba(120, 120, 120, 0.7)" : "rgba(120, 120, 120)",
  tertiaryBackground: ios ? "rgba(34, 197, 94, 0.7)" : "rgba(34, 197, 94)",
  glassBorder: "rgba(255,255,255,0.5)",
  glassBackground: ios ? "rgba(255,255,255,0.15)" : "rgba(255,255,255, 0.3)",
  glassBackgroundButton: ios ? "rgba(120,120,120,0.7)" : "rgba(120,120,120)",
};

export const Fonts = {
  title: "DancingScript_400Regular",
  titleFont: DancingScript_400Regular,
};

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};
