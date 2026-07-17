import { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { CardStyle, WeatherBoardColors } from '@/constants/theme';

type IconHeaderProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
  children?: ReactNode;
};

export default function IconHeader({ icon, title, subtitle, rightContent, children }: IconHeaderProps) {
  const { top } = useSafeAreaInsets();

  return (
    <View
      style={{
        ...CardStyle,
        paddingTop: top + 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle || children ? 4 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={icon} size={26} color={WeatherBoardColors.textPrimaryDark} />
          <Text style={{ fontSize: 24, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>{title}</Text>
        </View>
        {rightContent}
      </View>
      {subtitle && <Text style={{ fontSize: 12, color: WeatherBoardColors.textMutedBlack, marginBottom: children ? 16 : 0 }}>{subtitle}</Text>}
      {children}
    </View>
  );
}
