import { ComponentProps, Dispatch, RefObject, SetStateAction, useRef } from 'react';
import { Pressable, ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { PREFECTURES } from '@/constants/prefectures';
import { WeatherBoardColors } from '@/constants/theme';
import { DEFAULT_QUICK_FILTERS, QuickFilters } from '@/lib/homeFeed';
import { WEATHER_CONFIG, WeatherType } from '@/lib/types';

const WEATHER_FILTER_OPTIONS: { label: string; value: WeatherType | null }[] = [
  { label: 'All', value: null },
  ...Object.entries(WEATHER_CONFIG).map(([key, cfg]) => ({ label: cfg.emoji, value: key as WeatherType })),
];

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
};

function FilterChip({ label, selected, onPress, icon, style }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: icon ? 6 : 0,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 100,
          backgroundColor: selected ? WeatherBoardColors.buttonBackground : WeatherBoardColors.tagBackground,
        },
        style,
      ]}>
      {icon && <Ionicons name={icon} size={13} color={selected ? 'white' : WeatherBoardColors.textPrimaryDark} />}
      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? 'white' : WeatherBoardColors.textPrimaryDark }}>{label}</Text>
    </Pressable>
  );
}

type FilterSheetProps = {
  bottomSheetRef: RefObject<BottomSheetModal | null>;
  tabBarHeight: number;
  quickFilters: QuickFilters;
  setQuickFilters: Dispatch<SetStateAction<QuickFilters>>;
  tagQuery: string;
  setTagQuery: Dispatch<SetStateAction<string>>;
};

export default function FilterSheet({
  bottomSheetRef,
  tabBarHeight,
  quickFilters,
  setQuickFilters,
  tagQuery,
  setTagQuery,
}: FilterSheetProps) {
  const tagInputRef = useRef<React.ComponentRef<typeof BottomSheetTextInput>>(null);

  const handleResetFilters = () => {
    setQuickFilters(DEFAULT_QUICK_FILTERS);
    setTagQuery('');
    tagInputRef.current?.clear();
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['55%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: WeatherBoardColors.divider }}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}>
      <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 20, gap: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>絞り込み</Text>
          <Pressable onPress={handleResetFilters}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: WeatherBoardColors.buttonBackground }}>リセット</Text>
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textMutedBlack }}>天気</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {WEATHER_FILTER_OPTIONS.map(({ label, value }) => (
              <FilterChip key={label} label={label} selected={quickFilters.weather === value} onPress={() => setQuickFilters((prev) => ({ ...prev, weather: value }))} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textMutedBlack }}>タグ</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: WeatherBoardColors.tagBackground,
              borderRadius: 100,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}>
            <Ionicons name="search-outline" size={14} color={WeatherBoardColors.textMutedBlack} style={{ marginRight: 6 }} />
            <BottomSheetTextInput
              ref={tagInputRef}
              defaultValue={tagQuery}
              onChangeText={setTagQuery}
              placeholder="タグで検索..."
              placeholderTextColor={WeatherBoardColors.textMutedBlack}
              style={{ flex: 1, fontSize: 13, color: WeatherBoardColors.textPrimaryDark, paddingVertical: 0 }}
            />
            {tagQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  setTagQuery('');
                  tagInputRef.current?.clear();
                }}
                hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={WeatherBoardColors.textMutedBlack} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textMutedBlack }}>エリア</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <FilterChip label="全国" selected={quickFilters.prefecture === null} onPress={() => setQuickFilters((prev) => ({ ...prev, prefecture: null }))} />
            {PREFECTURES.map((pref) => (
              <FilterChip key={pref} label={pref} selected={quickFilters.prefecture === pref} onPress={() => setQuickFilters((prev) => ({ ...prev, prefecture: pref }))} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textMutedBlack }}>フォロー</Text>
          <FilterChip
            label="フォロー中の投稿のみ"
            selected={quickFilters.followingOnly}
            onPress={() => setQuickFilters((prev) => ({ ...prev, followingOnly: !prev.followingOnly }))}
            icon="people-outline"
            style={{ alignSelf: 'flex-start' }}
          />
        </View>

        <Pressable
          onPress={() => bottomSheetRef.current?.dismiss()}
          style={{
            backgroundColor: WeatherBoardColors.buttonBackground,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: 'white' }}>閉じる</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
