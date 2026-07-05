import React, { useState } from 'react';
import { Alert, Dimensions, FlatList, ImageBackground, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ActivityTagPicker, { ActivityTag } from '@/components/ActivityTagPicker';
import { Fonts } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG } from '@/lib/types';

const backgroundImage = require('@/assets/images/weather/post.png');
const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.5)';
const ACCENT_BLUE = '#6B9BDE';

export default function Post() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const { top } = useSafeAreaInsets();
  const { currentRoomId, setCurrentRoomId, rooms } = useRoom();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [weather, setWeather] = useState('sunny');
  const [note, setNote] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<ActivityTag[]>([]);
  const [isRoomModalVisible, setIsRoomModalVisible] = useState(false);
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
        .upsert(
          { user_id: userId, weather, note, room_id: currentRoomId, logged_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() },
          { onConflict: 'user_id,room_id,logged_date' },
        )
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
      const activityData = selectedTags.map((tag) => ({ weather_log_id: logData.id, activity_tag_id: tag.id }));
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
      const historyActivitiesData = selectedTags.map((tag) => ({ weather_log_history_id: historyData.id, tag_name: tag.tag_name }));
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
  const currentRoomName = rooms.find((r) => r.rooms.id === currentRoomId)?.rooms.name;

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      {/* ── Fixed header: title + weather picker ── */}
      <View style={{ paddingTop: top + 16 }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DancingScript_400Regular', fontSize: 38, color: PRIMARY_BROWN, lineHeight: 44 }}>
              {"How's your\nweather today?"}
            </Text>
            <Text style={{ color: MUTED_BROWN, fontSize: 13, marginTop: 4 }}>今日の天気はどう？</Text>
          </View>
          <Text style={{ fontSize: 28, marginTop: 8 }}>🌿</Text>
        </View>

        {/* Weather picker card */}
        <View
          style={{
            marginHorizontal: 20,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 20,
            paddingTop: 10,
            paddingBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 10,
            elevation: 3,
          }}>
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
            style={{ height: 90 }}
            renderItem={({ item: [, value], index }) => (
              <View
                style={{
                  width: ITEM_WIDTH,
                  opacity: index === selectedIndex ? 1 : 0.4,
                  transform: [{ scale: index === selectedIndex ? 1.2 : 0.8 }],
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Text style={{ fontSize: 46, lineHeight: 52 }}>{value.emoji}</Text>
                <Text
                  style={{
                    color: index === selectedIndex ? PRIMARY_BROWN : MUTED_BROWN,
                    fontSize: index === selectedIndex ? 10 : 9,
                    fontWeight: index === selectedIndex ? '700' : '400',
                    textAlign: 'center',
                    marginTop: 2,
                  }}>
                  {value.label}
                </Text>
              </View>
            )}
          />

          {/* Dots + date row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {Object.keys(WEATHER_CONFIG).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === selectedIndex ? PRIMARY_BROWN : 'rgba(98,66,33,0.2)',
                  }}
                />
              ))}
            </View>
            <Text style={{ color: MUTED_BROWN, fontSize: 11 }}>{now}</Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable body ── */}
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}>

        {/* Room selector (compact) */}
        {rooms.length > 1 && (
          <View style={{ marginBottom: 20 }}>
            <Pressable
              onPress={() => setIsRoomModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255,255,255,0.85)',
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}>
              <Text style={{ color: PRIMARY_BROWN, fontWeight: '600', fontSize: 13 }}>{currentRoomName}</Text>
              <Ionicons name="chevron-down" size={16} color={MUTED_BROWN} />
            </Pressable>
            <Modal visible={isRoomModalVisible} transparent={true} animationType="slide">
              <Pressable style={{ flex: 1 }} onPress={() => setIsRoomModalVisible(false)}>
                <View
                  onStartShouldSetResponder={() => true}
                  style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 }}>
                  <Text style={{ textAlign: 'center', fontWeight: '700', paddingTop: 20, paddingBottom: 8, color: PRIMARY_BROWN }}>部屋を選んでください</Text>
                  <Picker
                    selectedValue={currentRoomId}
                    onValueChange={(value) => value !== null && setCurrentRoomId(value)}>
                    {rooms.map((room) => (
                      <Picker.Item key={room.rooms.id} label={room.rooms.name} value={room.rooms.id} />
                    ))}
                  </Picker>
                </View>
              </Pressable>
            </Modal>
          </View>
        )}

        {/* Activity tags */}
        <View style={{ marginBottom: 20 }}>
          <ActivityTagPicker
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            isInputVisible={isInputVisible}
            setIsInputVisible={setIsInputVisible}
          />
        </View>

        {/* Memo section */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Text style={{ fontSize: 15 }}>☕</Text>
            <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 14 }}>ひとことメモ</Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.92)',
              borderRadius: 16,
              padding: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 1,
            }}>
            <TextInput
              value={note}
              onChangeText={setNote}
              autoCapitalize="none"
              multiline
              blurOnSubmit={true}
              numberOfLines={2}
              placeholder="今日の気分を一言メモ…"
              placeholderTextColor={MUTED_BROWN}
              style={{ color: PRIMARY_BROWN, fontSize: 14, minHeight: 48 }}
            />
            <Text style={{ textAlign: 'right', fontSize: 14, marginTop: 4 }}>🌿</Text>
          </View>
        </View>

        {/* Post button */}
        <Pressable
          onPress={handlePost}
          style={{
            backgroundColor: isPosting ? 'rgba(107,155,222,0.6)' : ACCENT_BLUE,
            borderRadius: 16,
            paddingVertical: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 8,
          }}>
          <Text style={{ fontSize: 18 }}>☀️</Text>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>天気を投稿する</Text>
        </Pressable>
        <Text style={{ color: MUTED_BROWN, fontSize: 11, textAlign: 'center' }}>投稿内容はWeekly分析に反映されます</Text>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
}
