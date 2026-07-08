import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ImageBackground, Pressable, Text, View } from 'react-native';

import NotificationsHeader, { FILTERS, FilterKey } from '@/components/NotificationsHeader';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { Notification, WEATHER_CONFIG } from '@/lib/types';

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');
const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.55)';
const CREAM = '#FCF8F0';

const TYPE_LABEL: Record<Notification['type'], string> = {
  comment: 'コメント',
  talk: 'リアクション',
  reaction: 'リアクション',
  room_join: 'ルーム招待',
};

const TYPE_PILL_COLOR: Record<Notification['type'], string> = {
  comment: 'rgba(96,165,250,0.25)',
  talk: 'rgba(134,239,172,0.35)',
  reaction: 'rgba(134,239,172,0.35)',
  room_join: 'rgba(196,181,253,0.35)',
};

const matchesFilter = (type: Notification['type'], filter: FilterKey): boolean => {
  if (filter === 'all') return true;
  if (filter === 'comment') return type === 'comment';
  if (filter === 'reaction') return type === 'talk' || type === 'reaction';
  return type === 'room_join';
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
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('to_user_id', userId).eq('is_read', false);
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
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
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
        ListEmptyComponent={() => <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', textAlign: 'center', padding: 20 }}>まだ通知がありません。</Text>}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        renderItem={({ item: row }) => {
          if (row.kind === 'section') {
            return (
              <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY_BROWN, marginTop: 6, marginBottom: 2, marginHorizontal: 20 }}>
                {row.label}
              </Text>
            );
          }
          const item = row.item;
          return (
            <Pressable
              onPress={() => item.weather_log_id && router.push(`/weather-log/${item.weather_log_id}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 14,
                marginHorizontal: 20,
              }}>
              {!item.is_read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#D97757', marginTop: 6 }} />}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(98,66,33,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ fontSize: 20 }}>{item.profiles?.avatar_emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 14 }}>{item.profiles?.nickname}</Text>
                  {item.weather && <Text style={{ fontSize: 13 }}>{WEATHER_CONFIG[item.weather].emoji}</Text>}
                  <View style={{ backgroundColor: TYPE_PILL_COLOR[item.type], borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: PRIMARY_BROWN }}>{TYPE_LABEL[item.type]}</Text>
                  </View>
                </View>
                <Text style={{ color: 'rgba(98,66,33,0.85)', fontSize: 12.5 }} numberOfLines={2}>
                  {item.note ?? (item.type === 'room_join' ? 'ルームに参加しました' : '')}
                </Text>
                {item.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {item.tags.map((tag) => (
                      <View key={tag.id} style={{ backgroundColor: CREAM, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: MUTED_BROWN }}>#{tag.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ color: MUTED_BROWN, fontSize: 11 }}>
                  {dateSectionLabel(item.created_at) === '今日'
                    ? new Date(item.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                    : new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={MUTED_BROWN} />
              </View>
            </Pressable>
          );
        }}
      />
    </ImageBackground>
  );
}
