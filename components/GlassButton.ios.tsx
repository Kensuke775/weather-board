import { Pressable, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { WeatherBoardColors } from '@/constants/theme';
import { ComponentProps } from 'react';

type GlassButtonProps = {
  onPress: () => void;
  backgroundColor?: string;
  buttonText: string;
  buttonIcon?: ComponentProps<typeof Ionicons>['name'];
  iconPosition?: 'left' | 'inline';
};

export default function GlassButton({ onPress, backgroundColor, buttonText, buttonIcon, iconPosition = 'left' }: GlassButtonProps) {
  return (
    <BlurView intensity={60} tint="light" className="relative w-full overflow-hidden rounded-xl border" style={{ backgroundColor: backgroundColor, borderColor: WeatherBoardColors.glassBorder }}>
      <Pressable onPress={onPress} className="flex-row gap-4 py-6 flex justify-center items-center">
        {buttonIcon && <Ionicons name={buttonIcon} size={24} color="white" className={iconPosition === 'inline' ? undefined : 'absolute left-4'} />}
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          {buttonText}
        </Text>
      </Pressable>
    </BlurView>
  );
}
