import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import ActivityTagPicker, { ActivityTag } from '@/components/ActivityTagPicker';
import IconHeader from '@/components/IconHeader';
import { BrownTheme, CardStyle, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import usePendingAction from '@/hooks/usePendingAction';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';
import { toDateString } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG } from '@/lib/types';

const MAX_NOTE_LENGTH = 200;
export const MAX_SELECTED_TAGS = 5;
const POSTED_CONFIRMATION_DELAY = 900;

export default function Post() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const [weather, setWeather] = useState('sunny');
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<ActivityTag[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const postAction = usePendingAction();
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [showPostedConfirmation, setShowPostedConfirmation] = useState(false);
  // フォーム下部がタブバーに隠れないようにするための下余白。
  const tabBarHeight = useTabBarSpace(48);
  const ITEM_WIDTH = 80;
  const LIST_PADDING = 20;

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const loadTodayPost = async () => {
        const today = toDateString();
        const { data, error } = await supabase
          .from('weather_logs')
          .select('weather, note, weather_log_activities(activity_tags(id, tag_name, user_id))')
          .eq('user_id', userId)
          .eq('logged_date', today)
          .maybeSingle();
        if (error) {
          console.error('[post] loadTodayPost', error.message);
          return;
        }
        if (!data) {
          setHasPostedToday(false);
          return;
        }
        setHasPostedToday(true);
        setWeather(data.weather);
        setNote(data.note ?? '');
        const weatherKeys = Object.keys(WEATHER_CONFIG);
        const index = weatherKeys.indexOf(data.weather);
        setSelectedIndex(index >= 0 ? index : 0);
        const tags = (data.weather_log_activities ?? [])
          .map((a) => (Array.isArray(a.activity_tags) ? a.activity_tags[0] : a.activity_tags))
          .filter((tag): tag is ActivityTag => tag !== null);
        setSelectedTags(tags);
      };
      loadTodayPost();
    }, [userId]),
  );

  const handlePost = () =>
    postAction.preventDuplicateRun(async () => {
      if (!userId) return;
      if (!weather) {
        Alert.alert('今の気分を選んでください。');
        return;
      }
      const { data: logData, error: logError } = await supabase
        .from('weather_logs')
        .upsert({ user_id: userId, weather, note, logged_date: toDateString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id,logged_date' })
        .select('id')
        .single();
      if (logError) {
        console.error('[post] handlePost', logError.message);
        Alert.alert('ログの更新に失敗しました。');
        return;
      }
      const { error: commentsError } = await supabase.from('comments').delete().eq('weather_log_id', logData.id);
      if (commentsError) {
        console.error('[post] handlePost', commentsError.message);
        Alert.alert('コメントの削除に失敗しました。');
        return;
      }
      const { data: historyData, error: historyError } = await supabase
        .from('weather_log_history')
        .insert({ weather_log_id: logData.id, weather, note, recorded_at: toDateString() })
        .select('id')
        .single();
      if (historyError) {
        console.error('[post] handlePost', historyError.message);
        Alert.alert('投稿に失敗しました。');
        return;
      }
      const activityData = selectedTags.map((tag) => ({
        weather_log_id: logData.id,
        activity_tag_id: tag.id,
      }));

      const { error: deleteActivityTagError } = await supabase.from('weather_log_activities').delete().eq('weather_log_id', logData.id);
      if (deleteActivityTagError) {
        console.error('[post] handlePost', deleteActivityTagError.message);
        Alert.alert('タグの削除に失敗しました。');
        return;
      }
      if (selectedTags.length > 0) {
        const { error: insertActivityTagError } = await supabase.from('weather_log_activities').insert(activityData);
        if (insertActivityTagError) {
          console.error('[post] handlePost', insertActivityTagError.message);
          Alert.alert('タグの追加に失敗しました。');
          return;
        }
      }

      const historyActivitiesData = selectedTags.map((tag) => ({
        weather_log_history_id: historyData.id,
        tag_name: tag.tag_name,
      }));

      if (selectedTags.length > 0) {
        await supabase.from('weather_log_history_activities').insert(historyActivitiesData);
      }

      setWeather('sunny');
      setNote('');
      setSelectedTags([]);
      setSelectedIndex(0);
      setShowPostedConfirmation(true);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, POSTED_CONFIRMATION_DELAY);
    });

  const now = new Date().toLocaleString('ja-JP', { month: '2-digit', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <IconHeader icon="partly-sunny-outline" title="Post" subtitle="他のユーザと気分を共有しよう！！">
        {hasPostedToday && (
          <View className="self-center flex-row items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(251,191,36,0.9)', marginTop: 12 }}>
            <Ionicons name="warning-outline" size={13} color="#78350F" />
            <Text className="text-xs font-bold" style={{ color: '#78350F' }}>
              本日投稿済み・上書きされます
            </Text>
          </View>
        )}
      </IconHeader>

      <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={20} className="px-5" contentContainerStyle={{ flexGrow: 1, paddingTop: 24, paddingBottom: tabBarHeight }}>
        <View style={{ ...CardStyle, borderRadius: 24, padding: 20 }}>
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="sunny-outline" size={16} color={WeatherBoardColors.textPrimaryDark} />
                <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimaryDark }}>
                  今の気分
                </Text>
              </View>
              <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMutedBlack, letterSpacing: 0.5 }}>
                {now}
              </Text>
            </View>
            <FlatList
              data={Object.entries(WEATHER_CONFIG)}
              keyExtractor={([key]) => key}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 20, paddingHorizontal: LIST_PADDING, alignItems: 'center' }}
              style={{ height: 95, marginHorizontal: -20 }}
              renderItem={({ item: [key, value], index }) => {
                const isSelected = index === selectedIndex;
                return (
                  <Pressable
                    onPress={() => {
                      setSelectedIndex(index);
                      setWeather(key);
                    }}
                    style={{
                      width: ITEM_WIDTH,
                      height: 84,
                      borderRadius: 16,
                      backgroundColor: isSelected ? WeatherBoardColors.buttonBackground : 'rgba(0,0,0,0.05)',
                      opacity: isSelected ? 1 : 0.7,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Text style={{ fontSize: 30, lineHeight: 34 }}>{value.emoji}</Text>
                    <Text className="text-[9px] font-bold mt-1" style={{ color: isSelected ? 'white' : WeatherBoardColors.textMutedBlack }}>
                      {value.label}
                    </Text>
                  </Pressable>
                );
              }}></FlatList>
          </View>

          <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder, marginVertical: 20 }} />

          <View>
            <View className="flex-row items-center gap-1.5 mb-4">
              <Ionicons name="checkmark-circle-outline" size={16} color={WeatherBoardColors.textPrimaryDark} />
              <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimaryDark }}>
                選択中
              </Text>
            </View>
            <View className="flex-row flex-wrap items-center gap-2">
              {selectedTags.length === 0 ? (
                <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.placeholderDark }}>
                  選択中のタグはありません。
                </Text>
              ) : (
                selectedTags.map((tag) => (
                  <View key={tag.id} className="flex-row items-center gap-1.5 px-3 py-1.5" style={{ borderRadius: 100, backgroundColor: WeatherBoardColors.buttonBackground }}>
                    <Text className="text-xs font-bold text-white">{tag.tag_name}</Text>
                    <Pressable onPress={() => setSelectedTags(selectedTags.filter((item) => item.id !== tag.id))} hitSlop={6}>
                      <Ionicons name="close" size={13} color="white" />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder, marginVertical: 20 }} />

          <ActivityTagPicker selectedTags={selectedTags} setSelectedTags={setSelectedTags} maxSelected={MAX_SELECTED_TAGS} />

          <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder, marginVertical: 20 }} />

          <View>
            <View className="flex-row items-center gap-1.5 mb-4">
              <Ionicons name="create-outline" size={16} color={WeatherBoardColors.textPrimaryDark} />
              <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimaryDark }}>
                ひとことメモ
              </Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              autoCapitalize="none"
              multiline
              blurOnSubmit={true}
              numberOfLines={2}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="今日の気分を一言メモ…"
              placeholderTextColor="rgba(0,0,0,0.4)"
              className="py-4 px-3 rounded-xl"
              style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: WeatherBoardColors.textPrimaryDark }}
            />
            <Text className="text-right text-[10px] mt-1" style={{ color: WeatherBoardColors.textMutedBlack }}>
              {note.length}/{MAX_NOTE_LENGTH}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder, marginVertical: 20 }} />

          <Pressable onPress={handlePost} disabled={postAction.isPending} className="w-full flex-row justify-center items-center gap-3 py-4" style={{ borderRadius: 100, backgroundColor: WeatherBoardColors.buttonBackground, opacity: postAction.isPending ? 0.7 : 1 }}>
            <Ionicons name="sunny-outline" size={22} color="white" />
            <Text className="text-base font-bold text-white">天気を投稿する</Text>
          </Pressable>
          {showPostedConfirmation && (
            <View className="self-center mt-2 flex-row items-center gap-1.5 px-3 py-1.5" style={{ borderRadius: 100, backgroundColor: 'rgba(0,0,0,0.75)' }}>
              <Ionicons name="checkmark" size={14} color="white" />
              <Text className="text-xs font-bold text-white">投稿しました！</Text>
            </View>
          )}
          <Text className="text-center text-xs mt-2" style={{ color: WeatherBoardColors.textMutedBlack }}>
            投稿内容はWeekly分析に反映されます
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
