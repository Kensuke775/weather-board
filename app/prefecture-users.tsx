import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { Stack, useLocalSearchParams } from 'expo-router';

import AvatarWeatherBadge from '@/components/AvatarWeatherBadge';
import { WeatherBoardColors } from '@/constants/theme';
import useUserProfileNavigation from '@/hooks/useUserProfileNavigation';
import { toDateString } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { WeatherType } from '@/lib/types';

type PrefectureUser = {
  user_id: string;
  nickname: string;
  avatar_emoji: string;
  weather: WeatherType;
};

const fetchPrefectureUsers = async (prefecture: string): Promise<PrefectureUser[]> => {
  const today = toDateString();
  const { data, error } = await supabase
    .from('weather_logs')
    .select('user_id, weather, profiles!inner(nickname, avatar_emoji, prefecture)')
    .eq('logged_date', today)
    .eq('profiles.prefecture', prefecture);

  if (error) {
    console.error('[prefecture-users] fetchPrefectureUsers', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id as string,
      nickname: (profile?.nickname as string) ?? '',
      avatar_emoji: (profile?.avatar_emoji as string) ?? '😊',
      weather: row.weather as WeatherType,
    };
  });
};

export default function PrefectureUsersScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const navigateToProfile = useUserProfileNavigation();
  const [users, setUsers] = useState<PrefectureUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    setIsLoading(true);
    fetchPrefectureUsers(name).then((result) => {
      setUsers(result);
      setIsLoading(false);
    });
  }, [name]);

  return (
    <>
      <Stack.Screen
        options={{
          title: name ?? '',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: 'rgba(96, 165, 250)',
          headerTitleStyle: { color: '#000000' },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
        }}
      />
      <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={WeatherBoardColors.buttonBackground} />
          </View>
        ) : users.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: WeatherBoardColors.textMutedBlack, fontSize: 14 }}>
              今日の投稿がありません
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={{ paddingVertical: 8 }}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginHorizontal: 16 }} />
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigateToProfile(item.user_id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
                <AvatarWeatherBadge
                  avatarEmoji={item.avatar_emoji}
                  weather={item.weather}
                  size={44}
                />
                <Text style={{ fontSize: 15, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
                  {item.nickname}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}
