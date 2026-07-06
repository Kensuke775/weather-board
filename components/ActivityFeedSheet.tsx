import { RefObject } from 'react';
import { Text, View } from 'react-native';

import { BlurView } from 'expo-blur';
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
  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['30%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      handleIndicatorStyle={{ backgroundColor: 'white' }}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}>
      <BlurView intensity={40} tint="dark" className="flex-1 p-6" style={{ borderTopWidth: 1, borderTopColor: WeatherBoardColors.glassBorder }}>
        <BottomSheetFlatList
          data={activityFeed.filter(hasActivityFeedProfiles)}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View className="h-4" />}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: tabBarHeight }}
          renderItem={({ item }) => (
            <View className="flex-row gap-3 w-full">
              <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMuted }}>
                {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMuted }}>
                {item.from.avatar_emoji} {item.from.nickname}が {item.to.avatar_emoji}
                {item.to.nickname}にコメントしました。
              </Text>
            </View>
          )}
        />
      </BlurView>
    </BottomSheetModal>
  );
}
