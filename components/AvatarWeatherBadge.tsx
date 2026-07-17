import { Text, View } from 'react-native';

import { WEATHER_CONFIG, WeatherType } from '@/lib/types';

type AvatarWeatherBadgeProps = {
  avatarEmoji: string;
  weather: WeatherType;
  size?: number;
  variant?: 'neutral' | 'glass';
};

export default function AvatarWeatherBadge({ avatarEmoji, weather, size = 32, variant = 'neutral' }: AvatarWeatherBadgeProps) {
  const avatarFontSize = Math.round(size * 0.5);
  const badgeFontSize = Math.round(size * 0.375);

  const circleStyle =
    variant === 'glass'
      ? {
          backgroundColor: 'rgba(255,255,255,0.72)',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.9)',
          shadowColor: '#000' as const,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        }
      : {
          backgroundColor: 'rgba(0,0,0,0.05)',
        };

  return (
    <View style={{ width: size + 6, height: size + 2 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          ...circleStyle,
        }}>
        <Text style={{ fontSize: avatarFontSize, lineHeight: avatarFontSize * 1.25 }}>{avatarEmoji}</Text>
      </View>
      <Text style={{ position: 'absolute', top: -2, right: 0, fontSize: badgeFontSize }}>
        {WEATHER_CONFIG[weather].emoji}
      </Text>
    </View>
  );
}
