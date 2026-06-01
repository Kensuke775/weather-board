import { FlatList } from 'react-native';

import { CommentsStatus, WeatherBoardItem } from '@/lib/types';
import WeatherCard from '@/components/WeatherCard';

type WeatherBoardProps = {
  weatherLogs: WeatherBoardItem[];
  unreadCounts: Record<string, number>;
  commentStatus: CommentsStatus;
};

export default function WeatherBoard({ weatherLogs, unreadCounts, commentStatus }: WeatherBoardProps) {
  return (
    <FlatList
      data={weatherLogs}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12, justifyContent: 'flex-start' }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center'}}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <WeatherCard
          nickname={item.profiles.nickname}
          avatar_emoji={item.profiles.avatar_emoji}
          weather={item.weather}
          note={item.note}
          updated_at={item.updated_at}
          weather_log_id={item.id}
          user_id={item.user_id}
          unreadCount={unreadCounts[item.id] ?? 0}
          tags={item.tags}
          commentStatus={commentStatus}
        />
      )}
    />
  );
}
