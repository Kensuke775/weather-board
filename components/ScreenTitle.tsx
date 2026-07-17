import { Text, View } from 'react-native';

import { Fonts, WeatherBoardColors } from '@/constants/theme';

type ScreenTitleProps = {
  title: string;
  subtitle?: string;
  fontSize?: number;
};

export default function ScreenTitle({ title, subtitle, fontSize = 36 }: ScreenTitleProps) {
  return (
    <View className="items-center">
      <Text style={{ fontFamily: Fonts.title, fontSize, color: WeatherBoardColors.textPrimary, textAlign: 'center' }}>{title}</Text>
      {subtitle && (
        <Text className="text-xs mt-0.5" style={{ color: WeatherBoardColors.textMuted, textAlign: 'center' }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
