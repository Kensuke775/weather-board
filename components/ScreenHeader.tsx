import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.5)';
const CREAM = '#FCF8F0';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  avatarEmoji?: string;
  titleEmoji?: string;
  onBack: () => void;
  rightContent?: ReactNode;
};

export default function ScreenHeader({ title, subtitle, avatarEmoji, titleEmoji, onBack, rightContent }: ScreenHeaderProps) {
  const { top } = useSafeAreaInsets();

  const backButton = (
    <Pressable
      onPress={onBack}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(98,66,33,0.12)',
      }}>
      <Ionicons name="chevron-back" size={20} color={PRIMARY_BROWN} />
    </Pressable>
  );

  if (!rightContent) {
    return (
      <View
        style={{
          backgroundColor: CREAM,
          paddingTop: top + 4,
          paddingBottom: 14,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        {backButton}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 17 }}>{title}</Text>
        </View>
        {/* spacer to keep title centered */}
        <View style={{ width: 34 }} />
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: CREAM,
        paddingTop: top + 4,
        paddingBottom: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        {backButton}
        {avatarEmoji && (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(255,255,255,0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(98,66,33,0.12)',
            }}>
            <Text style={{ fontSize: 16 }}>{avatarEmoji}</Text>
          </View>
        )}
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 17 }} numberOfLines={1}>
              {title}
            </Text>
            {titleEmoji && <Text style={{ fontSize: 15 }}>{titleEmoji}</Text>}
          </View>
          {subtitle && <Text style={{ color: MUTED_BROWN, fontSize: 11, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{rightContent}</View>
    </View>
  );
}
