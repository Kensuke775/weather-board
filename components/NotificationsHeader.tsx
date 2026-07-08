import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type FilterKey = 'all' | 'comment' | 'reaction' | 'room';

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'comment', label: 'コメント' },
  { key: 'reaction', label: 'リアクション' },
  { key: 'room', label: 'ルーム' },
];

const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.55)';

type NotificationsHeaderProps = {
  activeFilter: FilterKey;
  onFilterChange: (key: FilterKey) => void;
  filterCounts: Record<FilterKey, number>;
  onMarkAllRead: () => void;
};

export default function NotificationsHeader({ activeFilter, onFilterChange, filterCounts, onMarkAllRead }: NotificationsHeaderProps) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="mail-outline" size={26} color={PRIMARY_BROWN} />
          <Text style={{ fontSize: 24, fontWeight: '700', color: PRIMARY_BROWN }}>Mail Box</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onMarkAllRead}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(98,66,33,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark-done-outline" size={18} color={PRIMARY_BROWN} />
          </Pressable>
          <Pressable style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(98,66,33,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings-outline" size={18} color={PRIMARY_BROWN} />
          </Pressable>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: MUTED_BROWN, marginBottom: 16 }}>あなた宛に届いたお知らせやコメントです</Text>

      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(98,66,33,0.05)', borderRadius: 100, padding: 4, gap: 4 }}>
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
                gap: 4,
                paddingVertical: 8,
                borderRadius: 100,
                backgroundColor: isActive ? PRIMARY_BROWN : 'transparent',
              }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#FFFFFF' : PRIMARY_BROWN }} numberOfLines={1}>
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
                  backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(98,66,33,0.1)',
                }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: isActive ? '#FFFFFF' : PRIMARY_BROWN }}>{filterCounts[key]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
