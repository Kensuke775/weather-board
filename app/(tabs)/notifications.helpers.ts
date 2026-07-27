import { FilterKey } from '@/components/NotificationsHeader';
import { Notification } from '@/lib/types';

// 戻り値の型は書かない: expo-router の typed routes は Href がリテラル型である
// ことを要求するため、`string` に型注釈すると幅が広がり router.push に渡せなくなる
// （app/(tabs)/index.tsx の selectQuery と同じ理由）。
export const getNavigationTarget = (item: Notification) => {
  if (item.type === 'room_message' && item.room_id) return `/room-chat/${item.room_id}` as const;
  if (item.type === 'room_join' && item.room_id) return `/room-chat/${item.room_id}` as const;
  if (item.type === 'room_invite' && item.room_id) return `/room-chat/${item.room_id}` as const;
  if (item.type === 'direct_message' && item.conversation_id) return `/dm-chat/${item.conversation_id}` as const;
  if (item.type !== 'follow' && item.type !== 'room_join' && item.weather_log_id) return `/weather-log/${item.weather_log_id}` as const;
  return null;
};

export const isRoomNotification = (type: Notification['type']): boolean => type === 'room_message' || type === 'room_join' || type === 'room_invite';

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
export const getNotificationBody = (item: Notification): string => {
  const fixedLabel = NOTIFICATION_BODY_LABEL[item.type];
  if (fixedLabel) return fixedLabel;
  if (item.type === 'direct_message') return item.direct_message_body ?? '';
  return item.comment_body ?? '';
};

// リアクション・ルームチャットの新着メッセージは同じ投稿/ルームへの通知が連続して届きやすいので、
// 同じ日付セクション内・同じ対象（投稿 or ルーム）ならまとめて1行にする。
export const groupKeyFor = (item: Notification): string | null => {
  if ((item.type === 'reaction' || item.type === 'talk') && item.weather_log_id) return `reaction:${item.weather_log_id}`;
  if (item.type === 'room_message' && item.room_id) return `room_message:${item.room_id}`;
  return null;
};

export const getGroupedNotificationBody = (items: Notification[]): string => {
  if (items.length === 1) return getNotificationBody(items[0]);
  if (items[0].type === 'reaction' || items[0].type === 'talk') return `${items.length}件のリアクションが届きました`;
  return `${items.length}件の新着メッセージがあります`;
};

export const matchesFilter = (type: Notification['type'], filter: FilterKey): boolean => {
  if (filter === 'all') return true;
  if (filter === 'comment') return type === 'comment';
  if (filter === 'dm') return type === 'direct_message';
  return type === 'room_join' || type === 'room_invite' || type === 'room_message';
};

export const dateSectionLabel = (createdAt: string, now: Date = new Date()): string => {
  const date = new Date(createdAt);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(date, now)) return '今日';
  if (isSameDay(date, yesterday)) return '昨日';
  return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
};
