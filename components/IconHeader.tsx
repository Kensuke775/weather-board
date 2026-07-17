import { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

const DARK_TEXT = 'rgba(0,0,0,0.85)';
const DARK_MUTED = 'rgba(0,0,0,0.45)';

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
        backgroundColor: '#FFFFFF',
        paddingTop: top + 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle || children ? 4 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={icon} size={26} color={DARK_TEXT} />
          <Text style={{ fontSize: 24, fontWeight: '700', color: DARK_TEXT }}>{title}</Text>
        </View>
        {rightContent}
      </View>
      {subtitle && <Text style={{ fontSize: 12, color: DARK_MUTED, marginBottom: children ? 16 : 0 }}>{subtitle}</Text>}
      {children}
    </View>
  );
}
