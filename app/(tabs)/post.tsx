import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG } from '@/lib/types';
import { useRouter } from 'expo-router';

export default function Post() {
  const [weather, setWeather] = useState('');
  const [note, setNote] = useState('');
  const router = useRouter();
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
    const { error: historyError } = await supabase.from('weather_log_history').insert({ weather_log_id: logData.id, weather, note, recorded_at: new Date().toISOString().split('T')[0] });
    if (historyError) return Alert.alert(historyError.message);
    else router.replace('/(tabs)');
  };
  return (
    <View className="flex justify-center w-full h-full">
      <View>
        <View className="mb-12">
          <Text>今の気分を選んでください</Text>
          {Object.entries(WEATHER_CONFIG).map(([key, value]) => (
            <Pressable key={key} onPress={() => setWeather(key)} style={{ opacity: weather === key ? 1 : 0.3 }}>
              <Text>{value.emoji}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mb-12">
          <Text className="mb-2">メモを入力出来ます(AIの判断材料になります。)</Text>
          <TextInput value={note} onChangeText={setNote} />
        </View>
        <View className="mb-12">
          <Pressable onPress={handlePost} className="mb-12">
            <Text>天気を投稿する</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
