import { FlatList, View } from 'react-native';

import WeatherCard from '@/components/WeatherCard';
import { CommentsStatus, WeatherBoardItem } from '@/lib/types';

type WeatherBoardProps = {
  weatherLogs: WeatherBoardItem[];
  unreadCounts: Record<string, number>;
  commentStatus: CommentsStatus;
  reactionStatus: Record<string, number>;
};

export default function WeatherBoard({ weatherLogs, unreadCounts, commentStatus, reactionStatus }: WeatherBoardProps) {
  return (
    <FlatList
      data={weatherLogs}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 14, justifyContent: 'flex-start' }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 16, paddingTop: 16 ,paddingHorizontal: '2.5%'}}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      renderItem={({ item }) => (
        <WeatherCard
          nickname={item.profiles.nickname}
          avatar_emoji={item.profiles.avatar_emoji}
          weather={item.weather}
          note={item.note}
          updated_at={item.updated_at}
          weather_log_id={item.id}
          unreadCount={unreadCounts[item.id] ?? 0}
          tags={item.tags}
          commentStatus={commentStatus}
          reactionCount={reactionStatus[item.id] ?? 0}
        />
      )}
    />
  );
}
