import { Alert } from 'react-native';

import { toDateString } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { ActivityFeedItem, CommentsStatus, WeatherBoardItem, WeatherType } from '@/lib/types';

export const FEED_PAGE_SIZE = 20;

export type FeedFilters = {
  weather: WeatherType | null;
  tag: string;
  prefecture: string | null;
  followingOnly: boolean;
  followedUserIds: string[];
};
export const DEFAULT_FILTERS: FeedFilters = {
  weather: null,
  tag: '',
  prefecture: null,
  followingOnly: false,
  followedUserIds: [],
};

// 絞り込みボトムシートでユーザーが直接操作する3項目（天気・エリア・フォロー中のみ）をまとめたもの。
// tagQueryはデバウンス処理が別に必要、followedUserIdsはRealtimeで自動更新されるため、あえて含めない
// （変わる理由が異なるstateは一緒にしない）。
export type QuickFilters = Pick<FeedFilters, 'weather' | 'prefecture' | 'followingOnly'>;
export const DEFAULT_QUICK_FILTERS: QuickFilters = {
  weather: null,
  prefecture: null,
  followingOnly: false,
};

export const fetchTodaySummary = async (setter: (data: Record<string, number>) => void) => {
  const today = toDateString();
  const { data, error } = await supabase.from('weather_logs').select('weather').eq('logged_date', today);
  if (error) {
    console.error('[index(tab)] fetchTodaySummary', error.message);
    return;
  }
  const counts = (data ?? []).reduce(
    (acc, { weather }) => {
      acc[weather] = (acc[weather] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  setter(counts);
};

// comments → weather_logs → profiles のネストしたembedは使わず、段階的に取得してJSでマージする
// （lib/date.ts と同じ理由。詳しくはメモリのfeedback-postgrest-nested-embedsを参照）。
export const fetchActivityFeed = async (setter: (data: ActivityFeedItem[]) => void) => {
  const { data: commentsData, error: commentsError } = await supabase.from('comments').select('id, user_id, weather_log_id, created_at').order('created_at', { ascending: false }).limit(30);
  if (commentsError) {
    console.error('[index(tab)] fetchActivityFeed', commentsError.message);
    return;
  }
  if (commentsData.length === 0) {
    setter([]);
    return;
  }

  const logIds = Array.from(new Set(commentsData.map((c) => c.weather_log_id)));
  const { data: logsData, error: logsError } = await supabase.from('weather_logs').select('id, user_id').in('id', logIds);
  if (logsError) {
    console.error('[index(tab)] fetchActivityFeed', logsError.message);
    return;
  }
  const ownerIdByLogId = new Map(logsData.map((log) => [log.id, log.user_id]));

  const userIds = Array.from(new Set([...commentsData.map((c) => c.user_id), ...logsData.map((log) => log.user_id)]));
  const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('user_id, nickname, avatar_emoji').in('user_id', userIds);
  if (profilesError) {
    console.error('[index(tab)] fetchActivityFeed', profilesError.message);
    return;
  }
  const profileByUserId = new Map(profilesData.map((profile) => [profile.user_id, { nickname: profile.nickname, avatar_emoji: profile.avatar_emoji }]));

  const items: ActivityFeedItem[] = commentsData
    .map((comment) => {
      const toUserId = ownerIdByLogId.get(comment.weather_log_id);
      if (!toUserId) return null;
      return {
        id: comment.id,
        from_user_id: comment.user_id,
        to_user_id: toUserId,
        weather_log_id: comment.weather_log_id,
        created_at: comment.created_at,
        from: profileByUserId.get(comment.user_id) ?? null,
        to: profileByUserId.get(toUserId) ?? null,
      };
    })
    .filter((item): item is ActivityFeedItem => item !== null);

  setter(items);
};

export const fetchReactionsData = async (setter: (data: Record<string, number>) => void) => {
  const { data: reactionsData, error: reactionsError } = await supabase.from('post_reactions').select('weather_log_id, from_user_id');
  if (reactionsError) {
    console.error('[index(tab)] fetchReactionsData', reactionsError.message);
    Alert.alert('リアクションの取得に失敗しました。');
    return;
  }
  const reactorSets = new Map<string, Set<string>>();
  for (const row of reactionsData) {
    if (!reactorSets.has(row.weather_log_id)) reactorSets.set(row.weather_log_id, new Set());
    reactorSets.get(row.weather_log_id)!.add(row.from_user_id);
  }
  const countMap = Object.fromEntries(Array.from(reactorSets.entries()).map(([logId, users]) => [logId, users.size]));
  setter(countMap);
};

export const fetchNotificationsData = async (userId: string, setter: (data: Record<string, number>) => void) => {
  const { data: notificationsData, error: notificationsError } = await supabase.from('notifications').select('weather_log_id').eq('type', 'comment').eq('to_user_id', userId).eq('is_read', false);
  if (notificationsError) {
    console.error('[index(tab)] fetchNotificationsData', notificationsError.message);
    Alert.alert('通知取得に失敗しました。');
    return;
  }
  const unreadCountMap = notificationsData.reduce(
    (acc, notification) => {
      acc[notification.weather_log_id] = (acc[notification.weather_log_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  setter(unreadCountMap);
};

export const fetchCommentsData = async (setter: (data: CommentsStatus) => void) => {
  const { data: commentsData, error: commentsError } = await supabase.from('comments').select('weather_log_id, user_id, profiles(avatar_emoji)');
  if (commentsError) {
    console.error('[index(tab)] fetchCommentsData', commentsError.message);
    Alert.alert('コメントの取得に失敗しました。');
    return;
  }

  const intermediate = new Map<string, { users: Map<string, string | undefined>; count: number }>();

  for (const status of commentsData) {
    const profile = Array.isArray(status.profiles) ? status.profiles[0] : status.profiles;
    const avatars = profile?.avatar_emoji;
    if (!intermediate.has(status.weather_log_id)) {
      intermediate.set(status.weather_log_id, { users: new Map(), count: 0 });
    }
    const entry = intermediate.get(status.weather_log_id)!;
    if (!entry.users.has(status.user_id)) {
      entry.users.set(status.user_id, avatars);
    }
    entry.count += 1;
  }

  const commentersMap = Object.fromEntries(
    Array.from(intermediate.entries()).map(([logId, { users, count }]) => [
      logId,
      {
        commenters: Array.from(users.entries()).map(([user_id, emoji]) => ({ user_id, emoji })),
        count,
      },
    ]),
  ) as CommentsStatus;

  setter(commentersMap);
};

export const fetchFollowedUserIds = async (userId: string, setter: (ids: Set<string>) => void) => {
  const { data, error } = await supabase.from('follows').select('followed_id').eq('follower_id', userId);
  if (error) {
    console.error('[index(tab)] fetchFollowedUserIds', error.message);
    return;
  }
  setter(new Set((data ?? []).map((row) => row.followed_id)));
};

// weather_log_activities → activity_tags のネストしたembedは、room_members↔profiles・follows↔profiles と
// 同様にPostgRESTのリレーション解決が不安定（同一セッション内でも結果が空になることがある）なため使わず、
// 2段階取得＋JSでのマージに統一する。
// Supabase側のPostgRESTスキーマキャッシュが一時的に不安定になり、エラーにはならず
// 「正常に空」の結果が返ってくることがある。空だった場合は1回だけ間を置いて再取得する。
const fetchWeatherLogActivitiesWithRetry = async (logIds: string[]) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await supabase.from('weather_log_activities').select('weather_log_id, activity_tag_id').in('weather_log_id', logIds);
    if (result.error || result.data.length > 0) return result;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return supabase.from('weather_log_activities').select('weather_log_id, activity_tag_id').in('weather_log_id', logIds);
};

const fetchTagsByLogIds = async (logIds: string[]): Promise<Map<string, { id: string; name: string }[]>> => {
  const tagsByLogId = new Map<string, { id: string; name: string }[]>();
  if (logIds.length === 0) return tagsByLogId;

  const { data: activitiesData, error: activitiesError } = await fetchWeatherLogActivitiesWithRetry(logIds);
  if (activitiesError) {
    console.error('[index(tab)] fetchTagsByLogIds', activitiesError.message);
    return tagsByLogId;
  }

  const tagIds = Array.from(new Set(activitiesData.map((row) => row.activity_tag_id).filter((id): id is string => id !== null)));
  if (tagIds.length === 0) return tagsByLogId;

  const { data: tagsData, error: tagsError } = await supabase.from('activity_tags').select('id, tag_name').in('id', tagIds);
  if (tagsError) {
    console.error('[index(tab)] fetchTagsByLogIds', tagsError.message);
    return tagsByLogId;
  }
  const tagNameById = new Map(tagsData.map((tag) => [tag.id, tag.tag_name]));

  // weather_log_activities に同じ (weather_log_id, activity_tag_id) の行が一時的に重複することがあるため、
  // Set で重複を弾く。list.some() による O(n²) スキャンを O(1) に置き換える。
  const seenTagIdsByLogId = new Map<string, Set<string>>();
  for (const activity of activitiesData) {
    if (!activity.activity_tag_id) continue;
    const tagName = tagNameById.get(activity.activity_tag_id);
    if (!tagName) continue;
    let seenIds = seenTagIdsByLogId.get(activity.weather_log_id);
    if (!seenIds) {
      seenIds = new Set();
      seenTagIdsByLogId.set(activity.weather_log_id, seenIds);
      tagsByLogId.set(activity.weather_log_id, []);
    }
    if (seenIds.has(activity.activity_tag_id)) continue;
    seenIds.add(activity.activity_tag_id);
    tagsByLogId.get(activity.weather_log_id)!.push({ id: activity.activity_tag_id, name: tagName });
  }
  return tagsByLogId;
};

export const fetchFeedPage = async (page: number, setter: (data: WeatherBoardItem[]) => void, loadingSetter: (loading: boolean) => void, filters: FeedFilters = DEFAULT_FILTERS) => {
  if (filters.followingOnly && filters.followedUserIds.length === 0) {
    setter([]);
    loadingSetter(false);
    return;
  }

  const from = page * FEED_PAGE_SIZE;
  const to = from + FEED_PAGE_SIZE - 1;
  const hasTagFilter = filters.tag.trim().length > 0;
  const hasPrefectureFilter = filters.prefecture !== null;

  let matchingLogIdsByTag: string[] | null = null;
  if (hasTagFilter) {
    const { data: matchingLogIdsData, error: matchingLogIdsError } = await supabase.rpc('search_weather_log_ids_by_tag', { search_term: filters.tag.trim() });
    if (matchingLogIdsError) {
      console.error('[index(tab)] fetchFeedPage(tagSearch)', matchingLogIdsError.message);
      Alert.alert('投稿の取得に失敗しました。');
      return;
    }
    matchingLogIdsByTag = (matchingLogIdsData as { weather_log_id: string }[]).map((row) => row.weather_log_id);
    if (matchingLogIdsByTag.length === 0) {
      setter([]);
      loadingSetter(false);
      return;
    }
  }

  // Supabase の .select() はクエリ文字列がリテラル型でないと戻り値の型を推論できない
  // （テンプレートリテラルで組み立てると string に広がり GenericStringError になる）ため、
  // リテラルのまま持つ三項演算子で組み立てている。
  const selectQuery = hasPrefectureFilter ? 'id, user_id, weather, note, updated_at, profiles!inner(nickname, avatar_emoji, prefecture)' : 'id, user_id, weather, note, updated_at, profiles(nickname, avatar_emoji, prefecture)';

  let query = supabase.from('weather_logs').select(selectQuery).order('updated_at', { ascending: false }).range(from, to);

  if (filters.weather) query = query.eq('weather', filters.weather);
  if (hasPrefectureFilter) query = query.eq('profiles.prefecture', filters.prefecture);
  if (filters.followingOnly) query = query.in('user_id', filters.followedUserIds);
  if (matchingLogIdsByTag) query = query.in('id', matchingLogIdsByTag);

  const { data: weatherLogsData, error: weatherLogsError } = await query;

  if (weatherLogsError) {
    console.error('[index(tab)] fetchFeedPage', weatherLogsError.message);
    Alert.alert('投稿の取得に失敗しました。');
    return;
  }

  const tagsByLogId = await fetchTagsByLogIds(weatherLogsData.map((log) => log.id));

  const formattedData = weatherLogsData.map((log) => ({
    ...log,
    profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles,
    tags: tagsByLogId.get(log.id) ?? [],
  }));
  setter(formattedData);
  loadingSetter(false);
};
