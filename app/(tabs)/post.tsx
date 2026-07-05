import React, { useState } from 'react';
import { Alert, Dimensions, FlatList, ImageBackground, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';

import ActivityTagPicker, { ActivityTag } from '@/components/ActivityTagPicker';
import GlassButton from '@/components/GlassButton';
import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG } from '@/lib/types';

const backgroundImage = require('@/assets/images/weather/post.png');

export default function Post() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const { currentRoomId, setCurrentRoomId, rooms } = useRoom();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [weather, setWeather] = useState('sunny');
  const [note, setNote] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<ActivityTag[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const { width } = Dimensions.get('window');
  const ITEM_WIDTH = 80;
  const PADDING = (width - ITEM_WIDTH) / 2;

  const handlePost = async () => {
    if (isPosting) return;
    setIsPosting(true);
    try {
      if (!userId) return;
      if (!weather) {
        Alert.alert('今の気分を選んでください。');
        return;
      }
      const { data: logData, error: logError } = await supabase
        .from('weather_logs')
        .upsert({ user_id: userId, weather, note, room_id: currentRoomId, logged_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() }, { onConflict: 'user_id,room_id,logged_date' })
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
        .insert({ weather_log_id: logData.id, weather, note, recorded_at: new Date().toISOString().split('T')[0] })
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

      setWeather('');
      setNote('');
      setSelectedTags([]);
      router.replace('/(tabs)');
    } finally {
      setIsPosting(false);
    }
  };

  if (!fontsLoaded) return null;

  const now = new Date().toLocaleString('ja-JP', { month: '2-digit', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <ImageBackground source={backgroundImage} className="flex-1">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} />
      <View className="flex-1 pb-8">
        <BlurView intensity={10} tint="light" className="pt-20 pb-2 overflow-visible" style={{ borderBottomWidth: 1, borderColor: WeatherBoardColors.glassBorder }}>
          <Text className="text-4xl text-center" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
            {`How's your weather today?`}
          </Text>
          <FlatList
            data={Object.entries(WEATHER_CONFIG)}
            keyExtractor={([key]) => key}
            snapToInterval={ITEM_WIDTH + 32}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (ITEM_WIDTH + 32));
              setSelectedIndex(index);
              setWeather(Object.keys(WEATHER_CONFIG)[index]);
            }}
            decelerationRate="fast"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 32, paddingHorizontal: PADDING, alignItems: 'center' }}
            style={{ height: 95 }}
            renderItem={({ item: [key, value], index }) => (
              <View style={{ width: ITEM_WIDTH, opacity: index === selectedIndex ? 1 : 0.4, transform: [{ scale: index === selectedIndex ? 1.3 : 0.8 }], justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 50, lineHeight: 55 }}>{value.emoji}</Text>

                <Text className="text-[8px]" style={{ color: WeatherBoardColors.textMuted }}>
                  {value.label}
                </Text>
              </View>
            )}></FlatList>
          <View>
            <Text className="text-right pr-4 text-[10px]" style={{ color: WeatherBoardColors.textMuted, letterSpacing: 0.5 }}>
              {now}
            </Text>
          </View>
        </BlurView>

        <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={20} className="px-10" contentContainerStyle={{ flexGrow: 1, paddingTop: 60, paddingBottom: 30 }}>
          <View>
              <View className="mb-12">
                <Text className="text-sm font-bold mb-4" style={{ color: WeatherBoardColors.textPrimary }}>
                  投稿するルームを選ぼう
                </Text>

                <View>
                  <Pressable onPress={() => setIsModalVisible(true)}>
                    <View className="flex-row items-center justify-between gap-2 py-2 px-4 border overflow-hidden" style={{ borderRadius: 16, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
                      <Text className="text-base font-bold" style={{ color: 'black' }}>
                        {rooms.find((data) => data.rooms.id === currentRoomId)?.rooms.name}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="black" />
                    </View>
                  </Pressable>
                  <Modal visible={isModalVisible} transparent={true} animationType="slide">
                    <Pressable style={{ flex: 1 }} onPress={() => setIsModalVisible(false)}>
                      <View onStartShouldSetResponder={() => true} className="pb-32" style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white' }}>
                        <Text className="text-center font-bold pt-8">部屋を選んでください</Text>
                        <Picker
                          selectedValue={currentRoomId}
                          onValueChange={(value) => {
                            setCurrentRoomId(value);
                          }}>
                          {rooms.map((room) => (
                            <Picker.Item key={room.rooms.id} label={room.rooms.name} value={room.rooms.id} />
                          ))}
                        </Picker>
                      </View>
                    </Pressable>
                  </Modal>
                </View>
              </View>

              <View className="mb-10">
                <Text className="text-sm font-bold mb-4" style={{ color: WeatherBoardColors.textPrimary }}>
                  選択中:
                </Text>
                <View className="flex-row flex-wrap items-center gap-2 py-2 px-4 border overflow-hidden" style={{ borderRadius: 16, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
                  {selectedTags.length === 0 ? (
                    <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.placeholderDark }}>
                      選択中のタグはありません。
                    </Text>
                  ) : (
                    selectedTags.map((tag) => (
                      <View key={tag.id}>
                        <Text className="text-sm font-bold" style={{ color: 'black' }}>
                          #{tag.tag_name}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View className="mb-10">
                <ActivityTagPicker selectedTags={selectedTags} setSelectedTags={setSelectedTags} isInputVisible={isInputVisible} setIsInputVisible={setIsInputVisible} />
              </View>

              <View className="mb-12">
                <Text className="text-sm font-bold mb-4" style={{ color: WeatherBoardColors.textPrimary }}>
                  ひとことメモ
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  autoCapitalize="none"
                  multiline
                  blurOnSubmit={true}
                  numberOfLines={2}
                  placeholder="今日の気分を一言メモ…"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  className="py-4 px-2 rounded-xl bg-white border"
                  style={{ borderColor: WeatherBoardColors.glassBorder }}
                />
              </View>

              <View className="mb-24">
                <GlassButton onPress={handlePost} buttonText="天気を投稿する" buttonIcon="sunny-outline" backgroundColor={WeatherBoardColors.accentBackground} />
                <Text className="text-center text-xs mt-2" style={{ color: WeatherBoardColors.textMuted }}>
                  投稿内容はWeekly分析に反映されます
                </Text>
              </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </ImageBackground>
  );
}
