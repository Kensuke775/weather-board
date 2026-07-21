import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import AvatarWeatherBadge from '@/components/AvatarWeatherBadge';
import NotificationsHeader, { FILTERS, FilterKey } from '@/components/NotificationsHeader';
import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/lib/types';


const TYPE_LABEL: Record<Notification['type'], string> = {
  comment: 'コメント',
  talk: 'リアクション',
  reaction: 'リアクション',
  room_join: 'ルーム招待',
  follow: 'フォロー',
  room_message: 'ルームチャット',
  direct_message: 'DM',
};

const TYPE_PILL_COLOR: Record<Notification['type'], string> = {
  comment: 'rgba(96,165,250,0.25)',
  talk: 'rgba(134,239,172,0.35)',
  reaction: 'rgba(134,239,172,0.35)',
  room_join: 'rgba(196,181,253,0.35)',
  follow: 'rgba(251,191,36,0.35)',
  room_message: 'rgba(196,181,253,0.35)',
  direct_message: 'rgba(96,165,250,0.25)',
};

// 戻り値の型は書かない: expo-router の typed routes は Href がリテラル型である
// ことを要求するため、`string` に型注釈すると幅が広がり router.push に渡せなくなる
// （app/(tabs)/index.tsx の selectQuery と同じ理由）。
const getNavigationTarget = (item: Notification) => {
  if (item.type === 'room_message' && item.room_id) return `/room-chat/${item.room_id}` as const;
  if (item.type === 'room_join' && item.room_id) return `/room-chat/${item.room_id}` as const;
  if (item.type === 'direct_message' && item.conversation_id) return `/dm-chat/${item.conversation_id}` as const;
  if (item.type !== 'follow' && item.type !== 'room_join' && item.weather_log_id) return `/weather-log/${item.weather_log_id}` as const;
  return null;
};

const isRoomNotification = (type: Notification['type']): boolean => type === 'room_message' || type === 'room_join';

// 通知本文の固定文言。comment だけは投稿の note をそのまま本文として使うため、
// このマップには含めず getNotificationBody 側でフォールバックする。
const NOTIFICATION_BODY_LABEL: Partial<Record<Notification['type'], string>> = {
  follow: 'あなたをフォローしました',
  room_join: 'ルームに招待されました',
  room_message: 'ルームチャットに新しいメッセージがあります',
  direct_message: '新しいメッセージがあります',
  talk: '投稿にリアクションがつきました',
  reaction: '投稿にリアクションがつきました',
};

const getNotificationBody = (item: Notification): string => NOTIFICATION_BODY_LABEL[item.type] ?? (item.note ?? '');

// タグは自分の投稿に付けたものであり、リアクション通知に出すと自分の投稿のように見えてしまうため出さない。
const shouldShowTags = (item: Notification): boolean => item.type !== 'talk' && item.type !== 'reaction' && item.tags.length > 0;

const matchesFilter = (type: Notification['type'], filter: FilterKey): boolean => {
  if (filter === 'all') return true;
  if (filter === 'comment') return type === 'comment';
  if (filter === 'dm') return type === 'direct_message';
  return type === 'room_join' || type === 'room_message';
};

const fetchNotifications = async (userId: string, setter: (data: Notification[]) => void) => {
  const { data: notificationsData, error: notificationsError } = await supabase
    .from('notifications')
    .select('*, profiles!from_user_id(nickname, avatar_emoji), weather_logs(weather, note, weather_log_activities(activity_tag_id, activity_tags(tag_name)))')
    .eq('to_user_id', userId)
    .neq('from_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (notificationsError) {
    console.error('[notifications] fetchNotifications', notificationsError.message);
    Alert.alert('通知取得に失敗しました。');
    return;
  }
  const formattedData = notificationsData.map((item) => {
    const weatherLog = Array.isArray(item.weather_logs) ? item.weather_logs[0] : item.weather_logs;
    type ActivityRow = { activity_tag_id: string; activity_tags: { tag_name: string } | { tag_name: string }[] | null };
    const activities: ActivityRow[] = weatherLog?.weather_log_activities ?? [];
    const tags = activities
      .filter((tag) => tag.activity_tags !== null)
      .map((tag) => {
        const activityTag = Array.isArray(tag.activity_tags) ? tag.activity_tags[0] : tag.activity_tags!;
        return { id: tag.activity_tag_id, name: activityTag.tag_name };
      });
    return {
      ...item,
      weather: weatherLog?.weather ?? null,
      note: weatherLog?.note ?? null,
      tags,
    };
  });
  setter(formattedData);
};

const handleMarkAllRead = async (userId: string) => {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('to_user_id', userId).not('is_read', 'is', true);
  if (error) {
    console.error('[notifications] handleMarkAllRead', error.message);
    Alert.alert('既読の更新に失敗しました。');
  }
};

const dateSectionLabel = (createdAt: string): string => {
  const date = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(date, today)) return '今日';
  if (isSameDay(date, yesterday)) return '昨日';
  return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
};

type ListRow = { kind: 'section'; label: string } | { kind: 'notification'; item: Notification };

export default function Notifications() {
  const { user } = useUser();
  const userId = user?.id;
  const router = useRouter();
  // 一番下の通知がタブバーに隠れてスクロールし切れなくなるのを防ぐための下余白。
  const tabBarSpace = useTabBarSpace(48);
  const [dataNotifications, setDataNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const channelName = `notifications-list-${userId}`;
      const existing = supabase.getChannels().find((ch) => ch.subTopic === channelName);
      if (existing) supabase.removeChannel(existing);
      await fetchNotifications(userId, setDataNotifications);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
          await fetchNotifications(userId, setDataNotifications);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const validNotifications = useMemo(() => dataNotifications.filter((item) => item.profiles !== null), [dataNotifications]);

  const filterCounts = useMemo(
    () =>
      FILTERS.reduce(
        (acc, { key }) => {
          acc[key] = validNotifications.filter((item) => matchesFilter(item.type, key)).length;
          return acc;
        },
        {} as Record<FilterKey, number>,
      ),
    [validNotifications],
  );

  const filteredNotifications = useMemo(() => validNotifications.filter((item) => matchesFilter(item.type, activeFilter)), [validNotifications, activeFilter]);

  const rows = useMemo<ListRow[]>(() => {
    const result: ListRow[] = [];
    let lastLabel: string | null = null;
    for (const item of filteredNotifications) {
      const label = dateSectionLabel(item.created_at);
      if (label !== lastLabel) {
        result.push({ kind: 'section', label });
        lastLabel = label;
      }
      result.push({ kind: 'notification', item });
    }
    return result;
  }, [filteredNotifications]);

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <NotificationsHeader
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filterCounts={filterCounts}
        onMarkAllRead={() => userId && handleMarkAllRead(userId)}
      />
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(row, index) => (row.kind === 'section' ? `section-${row.label}-${index}` : row.item.id)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => <Text style={{ color: WeatherBoardColors.textPrimaryDark, fontWeight: '700', textAlign: 'center', padding: 20 }}>まだ通知がありません。</Text>}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: tabBarSpace }}
        renderItem={({ item: row }) => {
          if (row.kind === 'section') {
            return (
              <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark, marginTop: 6, marginBottom: 2, marginHorizontal: 20 }}>
                {row.label}
              </Text>
            );
          }
          const item = row.item;
          const handleIdentityPress = () => {
            if (isRoomNotification(item.type)) {
              const target = getNavigationTarget(item);
              if (target) router.push(target);
              return;
            }
            if (item.from_user_id) router.push(`/user-profile?userId=${item.from_user_id}`);
          };
          return (
            <Pressable
              onPress={() => {
                const target = getNavigationTarget(item);
                if (target) router.push(target);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: WeatherBoardColors.divider,
                padding: 14,
                marginHorizontal: 20,
              }}>
              <Pressable onPress={handleIdentityPress} style={{ position: 'relative' }}>
                <AvatarWeatherBadge
                  avatarEmoji={item.profiles?.avatar_emoji ?? '👤'}
                  weather={item.weather ?? 'cloudy'}
                  size={40}
                />
                {!item.is_read && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      left: -2,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: '#EF4444',
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                    }}
                  />
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Pressable onPress={handleIdentityPress}>
                    <Text style={{ color: WeatherBoardColors.textPrimaryDark, fontWeight: '700', fontSize: 14 }}>{item.profiles?.nickname}</Text>
                  </Pressable>
                  <View style={{ backgroundColor: TYPE_PILL_COLOR[item.type], borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>{TYPE_LABEL[item.type]}</Text>
                  </View>
                  <Text style={{ color: WeatherBoardColors.textMutedBlack, fontSize: 11, marginLeft: 'auto' }}>
                    {dateSectionLabel(item.created_at) === '今日'
                      ? new Date(item.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                      : new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: WeatherBoardColors.textPrimaryDark, fontSize: 12.5 }} numberOfLines={2}>
                      {getNotificationBody(item)}
                    </Text>
                    {shouldShowTags(item) && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {item.tags.map((tag) => (
                          <View key={tag.id} style={{ backgroundColor: WeatherBoardColors.tagBackground, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, color: WeatherBoardColors.textPrimaryDark }}>#{tag.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  {getNavigationTarget(item) && <Ionicons name="chevron-forward" size={16} color={WeatherBoardColors.textMutedBlack} />}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
