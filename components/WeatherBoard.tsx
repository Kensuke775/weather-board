import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import WeatherCard from '@/components/WeatherCard';
import { CommentsStatus, WeatherBoardItem } from '@/lib/types';

type WeatherBoardProps = {
  weatherLogs: WeatherBoardItem[];
  unreadCounts: Record<string, number>;
  commentStatus: CommentsStatus;
  reactionStatus: Record<string, number>;
  currentUserId?: string;
  followedUserIds?: Set<string>;
  onToggleFollow?: (userId: string) => void;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function WeatherBoard({ weatherLogs, unreadCounts, commentStatus, reactionStatus, currentUserId, followedUserIds, onToggleFollow, onEndReached, isLoadingMore, refreshing, onRefresh }: WeatherBoardProps) {
  return (
    <FlatList
      data={weatherLogs}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 14, justifyContent: 'flex-start' }}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 16, paddingTop: 16, paddingHorizontal: '2.5%' }}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor="white" /> : undefined}
      ListFooterComponent={isLoadingMore ? () => <ActivityIndicator size="small" color="white" style={{ marginTop: 16 }} /> : undefined}
      renderItem={({ item }) => (
        <WeatherCard
          nickname={item.profiles?.nickname ?? '---'}
          avatar_emoji={item.profiles?.avatar_emoji ?? '👤'}
          weather={item.weather}
          note={item.note}
          updated_at={item.updated_at}
          weather_log_id={item.id}
          userId={item.user_id}
          currentUserId={currentUserId}
          isFollowing={followedUserIds?.has(item.user_id)}
          onToggleFollow={onToggleFollow}
          unreadCount={unreadCounts[item.id] ?? 0}
          tags={item.tags}
          commentStatus={commentStatus}
          reactionCount={reactionStatus[item.id] ?? 0}
        />
      )}
    />
  );
}
