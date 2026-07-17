import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import IconHeader from '@/components/IconHeader';
import { WeatherBoardColors } from '@/constants/theme';

export type FilterKey = 'all' | 'comment' | 'reaction' | 'room';

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'comment', label: 'コメント' },
  { key: 'reaction', label: 'リアクション' },
  { key: 'room', label: 'ルーム' },
];

type NotificationsHeaderProps = {
  activeFilter: FilterKey;
  onFilterChange: (key: FilterKey) => void;
  filterCounts: Record<FilterKey, number>;
  onMarkAllRead: () => void;
};

export default function NotificationsHeader({ activeFilter, onFilterChange, filterCounts, onMarkAllRead }: NotificationsHeaderProps) {
  return (
    <IconHeader
      icon="mail-outline"
      title="Mail Box"
      subtitle="あなた宛に届いたお知らせやコメントです"
      rightContent={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onMarkAllRead}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark-done-outline" size={18} color={WeatherBoardColors.textPrimaryDark} />
          </Pressable>
          <Pressable style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings-outline" size={18} color={WeatherBoardColors.textPrimaryDark} />
          </Pressable>
        </View>
      }>
      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 100, padding: 4, gap: 4 }}>
        {FILTERS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          return (
            <Pressable
              key={key}
              onPress={() => onFilterChange(key)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                paddingVertical: 8,
                paddingHorizontal: 4,
                borderRadius: 100,
                backgroundColor: isActive ? WeatherBoardColors.buttonBackground : 'transparent',
              }}>
              <Text
                style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark, flexShrink: 1 }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}>
                {label}
              </Text>
              <View
                style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  paddingHorizontal: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.08)',
                }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: isActive ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark }}>{filterCounts[key]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </IconHeader>
  );
}
