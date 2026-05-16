import React, { useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

import ActivityTagPicker, { ActivityTag } from '@/components/ActivityTagPicker';
import { WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG } from '@/lib/types';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

const backgroundImage = require('@/assets/images/weather/cork_board.png');

export default function Post() {
  const [weather, setWeather] = useState('');
  const [note, setNote] = useState('');
  const router = useRouter();
  const [isInputVisible, setIsInputVisible] = useState(false);

  const [selectedId, setSelectedId] = useState<ActivityTag[]>([]);
  const handlePost = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーの取得がでいませんでした。');
    if (!weather) return Alert.alert('今の気分を選んでください。');
    const { data: logData, error: logError } = await supabase
      .from('weather_logs')
      .upsert({ user_id: user.id, weather, note, logged_date: new Date().toISOString().split('T')[0] }, { onConflict: 'user_id,logged_date' })
      .select('id')
      .single();
    if (logError) return Alert.alert(logError.message);
    const { data: historyData, error: historyError } = await supabase
      .from('weather_log_history')
      .insert({ weather_log_id: logData.id, weather, note, recorded_at: new Date().toISOString().split('T')[0] })
      .select('id')
      .single();
    if (historyError) return Alert.alert(historyError.message);

    const activityData = selectedId.map((tag) => ({
      weather_log_id: logData.id,
      activity_tag_id: tag.id,
    }));

    if (selectedId.length > 0) {
      const { error: deleteActivityTagError } = await supabase.from('weather_log_activities').delete().eq('weather_log_id', logData.id);
      if (deleteActivityTagError) return Alert.alert(deleteActivityTagError.message);
      const { error: insertActivityTagError } = await supabase.from('weather_log_activities').insert(activityData);
      if (insertActivityTagError) return Alert.alert(insertActivityTagError.message);
    }

    const historyActivitiesData = selectedId.map((tag) => ({
      weather_log_history_id: historyData.id,
      tag_name: tag.tag_name,
    }));

    if (selectedId.length > 0) {
      await supabase.from('weather_log_history_activities').insert(historyActivitiesData);
    }

    setWeather('');
    setNote('');
    setSelectedId([]);
    router.replace('/(tabs)');
  };
  return (
    <ImageBackground source={backgroundImage} className="flex-1">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} className="px-10" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 120, paddingBottom: 60 }}>
        <TouchableWithoutFeedback onPress={() => setIsInputVisible(false)}>
          <View>
            <View className="mb-12">
              <Text className="text-ms font-bold mb-2" style={{ color: WeatherBoardColors.textPrimary }}>
                今の気分を選んでください
              </Text>
              <BlurView intensity={40} tint="light" className="flex-row justify-between gap-2 p-4 border overflow-hidden" style={{ borderRadius: 16, borderColor: WeatherBoardColors.glassBorder }}>
                {Object.entries(WEATHER_CONFIG).map(([key, value]) => (
                  <Pressable key={key} onPress={() => setWeather(key)} style={{ opacity: weather === key ? 1 : 0.3 }}>
                    <Text className="text-xl">{value.emoji}</Text>
                  </Pressable>
                ))}
              </BlurView>
            </View>

            <View className="mb-10">
              <Text className="text-ms font-bold mb-2" style={{ color: WeatherBoardColors.textPrimary }}>
                選択中:
              </Text>
              <BlurView intensity={40} tint="light" className="flex-row flex-wrap items-center gap-2 p-4 border overflow-hidden" style={{ borderRadius: 16, borderColor: WeatherBoardColors.glassBorder }}>
                {selectedId.map((tag) => (
                  <View key={tag.id}>
                    <Text className="text-ms font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
                      #{tag.tag_name}
                    </Text>
                  </View>
                ))}
              </BlurView>
            </View>

            <View className="mb-10">
              <ActivityTagPicker selectedId={selectedId} setSelectedId={setSelectedId} isInputVisible={isInputVisible} setIsInputVisible={setIsInputVisible} />
            </View>

            <View className="mb-12">
              <Text className="text-ms font-bold mb-2" style={{ color: WeatherBoardColors.textPrimary }}>
                メモを残す
              </Text>
              <TextInput value={note} onChangeText={setNote} autoCapitalize="none" placeholder="テキストを入力してください。" className="py-4 px-2 rounded-xl bg-white border" style={{ borderColor: WeatherBoardColors.glassBorder }} />
            </View>
            <View className="mb-12">
              <Pressable onPress={handlePost} className="mb-12 py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
                <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
                  天気を投稿する
                </Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </ImageBackground>
  );
}
