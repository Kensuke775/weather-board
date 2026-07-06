import { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { WeatherBoardColors } from '@/constants/theme';

type GlassButtonProps = {
  onPress: () => void;
  backgroundColor?: string;
  buttonText: string;
  buttonIcon?: ComponentProps<typeof Ionicons>['name'];
  iconPosition?: 'left' | 'inline';
};

export default function GlassButton({ onPress, backgroundColor, buttonText, buttonIcon, iconPosition = 'left' }: GlassButtonProps) {
  return (
    <View className="relative w-full overflow-hidden rounded-xl border" style={{ backgroundColor: backgroundColor, borderColor: WeatherBoardColors.glassBorder }}>
      <Pressable onPress={onPress} className="flex-row gap-4 py-6 flex justify-center items-center">
        {buttonIcon && <Ionicons name={buttonIcon} size={24} color="white" className={iconPosition === 'inline' ? undefined : 'absolute left-4'} />}
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          {buttonText}
        </Text>
      </Pressable>
    </View>
  );
}
