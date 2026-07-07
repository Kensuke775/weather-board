import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { BrownTheme } from '@/constants/theme';

type Props = {
  emoji: string;
  isSelected: boolean;
  onPress: () => void;
  size?: number;
};

export function AvatarItem({ emoji, isSelected, onPress, size = 60 }: Props) {
  return (
    <Pressable onPress={onPress} style={{ position: 'relative' }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: isSelected ? BrownTheme.buttonBackground : BrownTheme.contentBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: size * 0.52 }}>{emoji}</Text>
      </View>
      {isSelected && (
        <View style={{
          position: 'absolute',
          bottom: -6,
          right: -6,
          backgroundColor: BrownTheme.buttonBackground,
          borderRadius: 12,
          width: 22,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: BrownTheme.cardBackground,
        }}>
          <Ionicons name="checkmark" size={12} color="white" />
        </View>
      )}
    </Pressable>
  );
}
