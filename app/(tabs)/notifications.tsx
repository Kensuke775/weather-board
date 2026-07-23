import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import AvatarWeatherBadge from '@/components/AvatarWeatherBadge';
import NotificationsHeader, { FilterKey } from '@/components/NotificationsHeader';
import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';
import useUserProfileNavigation from '@/hooks/useUserProfileNavigation';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/lib/types';


const TYPE_LABEL: Record<Notification['type'], string> = {
  comment: 'コメント',
  talk: 'リアクション',
  reaction: 'リアクション',
  room_join: 'ルーム参加',
  room_invite: 'ルーム招待',
  follow: 'フォロー',
  room_message: 'ルームチャット',
  direct_message: 'DM',
};

const TYPE_PILL_COLOR: Record<Notification['type'], string> = {
  comment: 'rgba(96,165,250,0.25)',
  talk: 'rgba(134,239,172,0.35)',
  reaction: 'rgba(134,239,172,0.35)',
  room_join: 'rgba(196,181,253,0.35)',
  room_invite: 'rgba(196,181,253,0.35)',
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
  if (item.type === 'room_invite' && item.room_id) return `/room-chat/${item.room_id}` as const;
  if (item.type === 'direct_message' && item.conversation_id) return `/dm-chat/${item.conversation_id}` as const;
  if (item.type !== 'follow' && item.type !== 'room_join' && item.weather_log_id) return `/weather-log/${item.weather_log_id}` as const;
  return null;
};

const isRoomNotification = (type: Notification['type']): boolean => type === 'room_message' || type === 'room_join' || type === 'room_invite';

// 通知本文の固定文言。comment・direct_message は本文をそのまま表示するため、
// このマップには含めず getNotificationBody 側でフォールバックする。
const NOTIFICATION_BODY_LABEL: Partial<Record<Notification['type'], string>> = {
  follow: 'あなたをフォローしました',
  room_join: 'ルームに参加しました',
  room_invite: 'ルームに招待されました',
  room_message: 'ルームチャットに新しいメッセージがあります',
  talk: '投稿にリアクションがつきました',
  reaction: '投稿にリアクションがつきました',
};

// comment・direct_message は本文をそのまま表示する。投稿本文やタグは自分の投稿のように見えてしまうため使わない。
const getNotificationBody = (item: Notification): string => {
  const fixedLabel = NOTIFICATION_BODY_LABEL[item.type];
  if (fixedLabel) return fixedLabel;
  if (item.type === 'direct_message') return item.direct_message_body ?? '';
  return item.comment_body ?? '';
};

// リアクション・ルームチャットの新着メッセージは同じ投稿/ルームへの通知が連続して届きやすいので、
// 同じ日付セクション内・同じ対象（投稿 or ルーム）ならまとめて1行にする。
const groupKeyFor = (item: Notification): string | null => {
  if ((item.type === 'reaction' || item.type === 'talk') && item.weather_log_id) return `reaction:${item.weather_log_id}`;
  if (item.type === 'room_message' && item.room_id) return `room_message:${item.room_id}`;
  return null;
};

const getGroupedNotificationBody = (items: Notification[]): string => {
  if (items.length === 1) return getNotificationBody(items[0]);
  if (items[0].type === 'reaction' || items[0].type === 'talk') return `${items.length}件のリアクションが届きました`;
  return `${items.length}件の新着メッセージがあります`;
};

const matchesFilter = (type: Notification['type'], filter: FilterKey): boolean => {
  if (filter === 'all') return true;
  if (filter === 'comment') return type === 'comment';
  if (filter === 'dm') return type === 'direct_message';
  return type === 'room_join' || type === 'room_invite' || type === 'room_message';
};

// comments のネストしたembedは使わず、2段階取得+JSでのマージに統一する
// （lib/date.ts・app/(tabs)/index.tsxのfetchTagsByLogIdsと同じ理由。メモリのfeedback-postgrest-nested-embeds参照）。
const fetchCommentBodiesByIds = async (commentIds: string[]): Promise<Map<string, string>> => {
  const bodyByCommentId = new Map<string, string>();
  if (commentIds.length === 0) return bodyByCommentId;
  const { data, error } = await supabase.from('comments').select('id, body').in('id', commentIds);
  if (error) {
    console.error('[notifications] fetchCommentBodiesByIds', error.message);
    return bodyByCommentId;
  }
  for (const row of data) bodyByCommentId.set(row.id, row.body);
  return bodyByCommentId;
};

const fetchDirectMessageBodiesByIds = async (messageIds: string[]): Promise<Map<string, string>> => {
  const bodyByMessageId = new Map<string, string>();
  if (messageIds.length === 0) return bodyByMessageId;
  const { data, error } = await supabase.from('direct_messages').select('id, body').in('id', messageIds);
  if (error) {
    console.error('[notifications] fetchDirectMessageBodiesByIds', error.message);
    return bodyByMessageId;
  }
  for (const row of data) bodyByMessageId.set(row.id, row.body);
  return bodyByMessageId;
};

const fetchNotifications = async (userId: string, setter: (data: Notification[]) => void) => {
  const { data: notificationsData, error: notificationsError } = await supabase
    .from('notifications')
    .select('*, profiles!from_user_id(nickname, avatar_emoji), weather_logs(weather)')
    .eq('to_user_id', userId)
    .neq('from_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (notificationsError) {
    console.error('[notifications] fetchNotifications', notificationsError.message);
    Alert.alert('通知取得に失敗しました。');
    return;
  }
  const commentIds = notificationsData.map((item) => item.comment_id).filter((id): id is string => id !== null);
  const messageIds = notificationsData.map((item) => item.direct_message_id).filter((id): id is string => id !== null);
  const [bodyByCommentId, bodyByMessageId] = await Promise.all([fetchCommentBodiesByIds(commentIds), fetchDirectMessageBodiesByIds(messageIds)]);
  const formattedData = notificationsData.map((item) => {
    const weatherLog = Array.isArray(item.weather_logs) ? item.weather_logs[0] : item.weather_logs;
    return {
      ...item,
      weather: weatherLog?.weather ?? null,
      comment_body: item.comment_id ? (bodyByCommentId.get(item.comment_id) ?? null) : null,
      direct_message_body: item.direct_message_id ? (bodyByMessageId.get(item.direct_message_id) ?? null) : null,
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

type ListRow = { kind: 'section'; label: string } | { kind: 'notification'; items: Notification[] };

export default function Notifications() {
  const { user } = useUser();
  const userId = user?.id;
  const router = useRouter();
  const navigateToProfile = useUserProfileNavigation();
  // 一番下の通知がタブバーに隠れてスクロールし切れなくなるのを防ぐための下余白。
  const tabBarSpace = useTabBarSpace(48);
  const [dataNotifications, setDataNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!userId) return;
    setIsRefreshing(true);
    await fetchNotifications(userId, setDataNotifications);
    setIsRefreshing(false);
  };

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

  // 従来は FILTERS の各キーに対して .filter() を走らせる複数スキャンだった。
  // 1回のループで全フィルタのカウントを確定する。
  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = { all: 0, comment: 0, dm: 0, room: 0 };
    for (const item of validNotifications) {
      counts.all++;
      if (item.type === 'comment') counts.comment++;
      else if (item.type === 'direct_message') counts.dm++;
      else if (item.type === 'room_join' || item.type === 'room_invite' || item.type === 'room_message') counts.room++;
    }
    return counts;
  }, [validNotifications]);

  const filteredNotifications = useMemo(() => validNotifications.filter((item) => matchesFilter(item.type, activeFilter)), [validNotifications, activeFilter]);

  const rows = useMemo<ListRow[]>(() => {
    const result: ListRow[] = [];
    let lastLabel: string | null = null;
    // 同じ日付セクション内で、同じ対象（投稿 or ルーム）の通知が来たら既存の行にまとめる。
    const groupRowIndexByKey = new Map<string, number>();
    for (const item of filteredNotifications) {
      const label = dateSectionLabel(item.created_at);
      if (label !== lastLabel) {
        result.push({ kind: 'section', label });
        lastLabel = label;
        groupRowIndexByKey.clear();
      }
      const key = groupKeyFor(item);
      if (key === null) {
        result.push({ kind: 'notification', items: [item] });
        continue;
      }
      const existingIndex = groupRowIndexByKey.get(key);
      if (existingIndex === undefined) {
        groupRowIndexByKey.set(key, result.length);
        result.push({ kind: 'notification', items: [item] });
      } else {
        const row = result[existingIndex];
        if (row.kind === 'notification') row.items.push(item);
      }
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
        keyExtractor={(row, index) => (row.kind === 'section' ? `section-${row.label}-${index}` : row.items[0].id)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => <Text style={{ color: WeatherBoardColors.textPrimaryDark, fontWeight: '700', textAlign: 'center', padding: 20 }}>まだ通知がありません。</Text>}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: tabBarSpace }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        renderItem={({ item: row }) => {
          if (row.kind === 'section') {
            return (
              <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark, marginTop: 6, marginBottom: 2, marginHorizontal: 20 }}>
                {row.label}
              </Text>
            );
          }
          const { items } = row;
          const latest = items[0];
          const isGrouped = items.length > 1;
          const hasUnread = items.some((i) => !i.is_read);
          const handleIdentityPress = () => {
            if (isGrouped || isRoomNotification(latest.type)) {
              const target = getNavigationTarget(latest);
              if (target) router.push(target);
              return;
            }
            if (latest.from_user_id) navigateToProfile(latest.from_user_id);
          };
          return (
            <Pressable
              onPress={() => {
                const target = getNavigationTarget(latest);
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
                  avatarEmoji={latest.profiles?.avatar_emoji ?? '👤'}
                  weather={latest.weather ?? 'cloudy'}
                  size={40}
                />
                {hasUnread && (
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
                    <Text style={{ color: WeatherBoardColors.textPrimaryDark, fontWeight: '700', fontSize: 14 }}>
                      {latest.profiles?.nickname}{isGrouped ? ' 他' : ''}
                    </Text>
                  </Pressable>
                  <View style={{ backgroundColor: TYPE_PILL_COLOR[latest.type], borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>{TYPE_LABEL[latest.type]}</Text>
                  </View>
                  <Text style={{ color: WeatherBoardColors.textMutedBlack, fontSize: 11, marginLeft: 'auto' }}>
                    {dateSectionLabel(latest.created_at) === '今日'
                      ? new Date(latest.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                      : new Date(latest.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: WeatherBoardColors.textPrimaryDark, fontSize: 12.5 }} numberOfLines={2}>
                      {getGroupedNotificationBody(items)}
                    </Text>
                  </View>
                  {getNavigationTarget(latest) && <Ionicons name="chevron-forward" size={16} color={WeatherBoardColors.textMutedBlack} />}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
