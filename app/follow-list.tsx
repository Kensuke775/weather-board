import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import useUserProfileNavigation from '@/hooks/useUserProfileNavigation';
import { supabase } from '@/lib/supabase';

type FollowUser = {
  user_id: string;
  nickname: string;
  avatar_emoji: string;
};

const fetchProfilesByIds = async (userIds: string[]): Promise<Map<string, { nickname: string; avatar_emoji: string }>> => {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('user_id, nickname, avatar_emoji').in('user_id', userIds);
  if (error) {
    console.error('[follow-list] fetchProfilesByIds', error.message);
    return new Map();
  }
  return new Map(data.map((profile) => [profile.user_id, { nickname: profile.nickname, avatar_emoji: profile.avatar_emoji ?? '👤' }]));
};

const fetchFollowRelations = async (userId: string, direction: 'followers' | 'following'): Promise<FollowUser[]> => {
  const query =
    direction === 'followers'
      ? supabase.from('follows').select('follower_id').eq('followed_id', userId)
      : supabase.from('follows').select('followed_id').eq('follower_id', userId);
  const { data, error } = await query;
  if (error) {
    console.error('[follow-list] fetchFollowRelations', error.message);
    return [];
  }
  const relatedUserIds = data.map((row) => (direction === 'followers' ? (row as { follower_id: string }).follower_id : (row as { followed_id: string }).followed_id));
  const profilesById = await fetchProfilesByIds(relatedUserIds);
  return relatedUserIds.map((relatedUserId) => {
    const profile = profilesById.get(relatedUserId);
    return {
      user_id: relatedUserId,
      nickname: profile?.nickname ?? '---',
      avatar_emoji: profile?.avatar_emoji ?? '👤',
    };
  });
};

export default function FollowList() {
  const navigateToProfile = useUserProfileNavigation();
  const { user } = useUser();
  const { type } = useLocalSearchParams<{ type: 'followers' | 'following' }>();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      setIsLoading(true);
      fetchFollowRelations(user.id, type).then((result) => {
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
            <Pressable
              onPress={() => navigateToProfile(item.user_id)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{item.avatar_emoji}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
                {item.nickname}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
