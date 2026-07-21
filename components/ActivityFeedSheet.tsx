import { RefObject } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';

import { WeatherBoardColors } from '@/constants/theme';
import { ActivityFeedItem } from '@/lib/types';

type ActivityFeedSheetProps = {
  bottomSheetRef: RefObject<BottomSheetModal | null>;
  activityFeed: ActivityFeedItem[];
  tabBarHeight: number;
};

const hasActivityFeedProfiles = (
  item: ActivityFeedItem,
): item is ActivityFeedItem & { from: NonNullable<ActivityFeedItem['from']>; to: NonNullable<ActivityFeedItem['to']> } =>
  item.from !== null && item.to !== null;

export default function ActivityFeedSheet({ bottomSheetRef, activityFeed, tabBarHeight }: ActivityFeedSheetProps) {
  const router = useRouter();

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['50%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: WeatherBoardColors.textMutedBlack }}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>アクティビティフィード</Text>
      </View>
      <BottomSheetFlatList
        data={activityFeed.filter(hasActivityFeedProfiles)}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginHorizontal: 20 }} />}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        ListEmptyComponent={
          <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack, textAlign: 'center', paddingVertical: 24 }}>
            まだアクティビティがありません。
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              bottomSheetRef.current?.dismiss();
              router.push(`/weather-log/${item.weather_log_id}`);
            }}
            style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: WeatherBoardColors.textPrimaryDark }}>
                {item.from.avatar_emoji} {item.from.nickname} が {item.to.avatar_emoji}
                {item.to.nickname} の投稿にコメントしました
              </Text>
              <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack, marginTop: 2 }}>
                {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </BottomSheetModal>
  );
}
