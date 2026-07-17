import { ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardStyle, Fonts, WeatherBoardColors } from '@/constants/theme';

const heroImage = require('@/assets/images/weather/login.png');

type Props = {
  title: string;
  subtitle?: string;
  showImage?: boolean;
  children?: ReactNode;
};

export function AuthHeader({ title, subtitle, showImage = false, children }: Props) {
  const { top } = useSafeAreaInsets();

  return (
    <View
      style={{
        ...CardStyle,
        alignItems: 'center',
        paddingTop: top + 12,
        paddingBottom: 20,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderBottomWidth: 1,
        borderBottomColor: WeatherBoardColors.divider,
      }}>
      {showImage && (
        <View
          style={{
            marginBottom: 8,
            borderRadius: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
          }}>
          <Image
            source={heroImage}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: WeatherBoardColors.divider,
            }}
          />
        </View>
      )}
      <Text style={{ fontFamily: Fonts.title, fontSize: 38, color: WeatherBoardColors.textPrimaryDark, lineHeight: 44 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 14, color: WeatherBoardColors.textMutedBlack, marginTop: 8, marginBottom: children ? 16 : 0 }}>
          {subtitle}
        </Text>
      )}
      {children && <View style={{ width: '100%' }}>{children}</View>}
    </View>
  );
}
