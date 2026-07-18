import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

type FollowUser = {
  user_id: string;
  nickname: string;
  avatar_emoji: string;
};

const fetchFollowers = async (userId: string): Promise<FollowUser[]> => {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, profiles!follower_id(nickname, avatar_emoji)')
    .eq('followed_id', userId);
  if (error) {
    console.error('[follow-list] fetchFollowers', error.message);
    return [];
  }
  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.follower_id,
      nickname: profile?.nickname ?? '---',
      avatar_emoji: profile?.avatar_emoji ?? '👤',
    };
  });
};

const fetchFollowing = async (userId: string): Promise<FollowUser[]> => {
  const { data, error } = await supabase
    .from('follows')
    .select('followed_id, profiles!followed_id(nickname, avatar_emoji)')
    .eq('follower_id', userId);
  if (error) {
    console.error('[follow-list] fetchFollowing', error.message);
    return [];
  }
  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.followed_id,
      nickname: profile?.nickname ?? '---',
      avatar_emoji: profile?.avatar_emoji ?? '👤',
    };
  });
};

export default function FollowList() {
  const { user } = useUser();
  const { type } = useLocalSearchParams<{ type: 'followers' | 'following' }>();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      setIsLoading(true);
      const load = type === 'followers' ? fetchFollowers : fetchFollowing;
      load(user.id).then((result) => {
        setUsers(result);
        setIsLoading(false);
      });
    }, [user?.id, type]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <Stack.Screen options={{ title: type === 'followers' ? 'フォロワー' : 'フォロー中' }} />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={WeatherBoardColors.buttonBackground} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={() => (
            <Text style={{ textAlign: 'center', padding: 40, color: WeatherBoardColors.textMutedBlack, fontWeight: '600' }}>
              {type === 'followers' ? 'フォロワーはまだいません。' : 'フォロー中のユーザーはいません。'}
            </Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginLeft: 76 }} />}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{item.avatar_emoji}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
                {item.nickname}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
