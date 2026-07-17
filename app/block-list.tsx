import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import Toast from 'react-native-toast-message';

import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { TOAST_DURATION } from '@/constants/ui';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

type BlockedUser = {
  id: string;
  blocked_id: string;
  profiles: { nickname: string; avatar_emoji: string } | null;
};

export default function BlockList() {
  const { user } = useUser();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBlockedUsers = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('blocks')
      .select('id, blocked_id, profiles!blocks_blocked_id_fkey(nickname, avatar_emoji)')
      .eq('blocker_id', user.id);
    if (error) {
      console.error('[block-list] fetchBlockedUsers', error.message);
      Alert.alert('ブロック一覧の取得に失敗しました。');
      return;
    }
    const formatted = (data ?? []).map((item) => ({
      ...item,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
    }));
    setBlockedUsers(formatted);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleUnblock = async (blockId: string) => {
    const { error } = await supabase.from('blocks').delete().eq('id', blockId);
    if (error) {
      console.error('[block-list] handleUnblock', error.message);
      Alert.alert('ブロック解除に失敗しました。');
      return;
    }
    setBlockedUsers((prev) => prev.filter((item) => item.id !== blockId));
    Toast.show({ type: 'success', text1: 'ブロックを解除しました。', visibilityTime: TOAST_DURATION.default });
  };

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }}>
        {!isLoading && blockedUsers.length === 0 ? (
          <View style={{ ...CardStyle, borderRadius: 20, padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textMutedBlack }}>
              ブロック中のユーザーはいません。
            </Text>
          </View>
        ) : (
          <View style={{ ...CardStyle, borderRadius: 20, overflow: 'hidden', flex: 1 }}>
            <FlatList
              data={blockedUsers}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginLeft: 64 }} />
              )}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{item.profiles?.avatar_emoji}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
                    {item.profiles?.nickname}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Alert.alert('確認', 'ブロックを解除しますか？', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '解除する', onPress: () => handleUnblock(item.id) },
                      ]);
                    }}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: 'rgba(96,165,250,0.12)' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.buttonBackground }}>
                      解除する
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );
}
