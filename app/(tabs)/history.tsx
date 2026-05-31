import { useCallback, useState } from 'react';
import { Alert, ImageBackground, Modal, Pressable, Text, View } from 'react-native';

import WeatherCalendar from '@/components/WeatherCalendar';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { supabase } from '@/lib/supabase';
import { HistoryLog } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from 'expo-router';

const backgroundImage = require('@/assets/images/weather/history.png');

function initialMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export default function History() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryLog[]>([]);
  const { currentRoomId, setCurrentRoomId, rooms } = useRoom();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(initialMonthStart());
  const [year, month] = currentMonth.split('-').map(Number);
  const initializeMonth = String(month).padStart(2, '0');
  const dayLast = String(new Date(year, month, 0).getDate()).padStart(2, '0');
  const initialMonthEnd = `${year}-${initializeMonth}-${dayLast}`;

  useFocusEffect(
    useCallback(() => {
      const fetchHistory = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
        const { data: historyData, error: historyError } = await supabase
          .from('weather_logs')
          .select('id, user_id, weather, logged_date, profiles(avatar_emoji)')
          .gte('logged_date', currentMonth)
          .lte('logged_date', initialMonthEnd)
          .eq('room_id', currentRoomId)
          .order('updated_at', { ascending: false });
        if (historyError) return Alert.alert(historyError.message);

        const filteredHistoryData = historyData.filter((record, idx, self) => idx === self.findIndex((r) => r.logged_date === record.logged_date && r.user_id === record.user_id));

        setHistoryData(filteredHistoryData as unknown as HistoryLog[]);
        setCurrentUserId(user.id);
      };
      fetchHistory();
    }, [currentMonth, initialMonthEnd, currentRoomId]),
  );
  const currentRoomName = rooms?.find((item) => item?.rooms.id === currentRoomId)?.rooms.name;
  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center px-5">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>

      <View className="pt-24 pb-40">
        <Text className="text-4xl text-center mb-8" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
          History
        </Text>
        <View>
          <Pressable onPress={() => setIsModalVisible(true)} className="flex-row items-center gap-2 mb-2 py-2 px-2 bg-black/30 self-start rounded-xl border" style={{ borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-sm text-white font-bold">{`部屋: ${currentRoomName}`}</Text>
            <Ionicons name="chevron-down" size={16} color="white" />
          </Pressable>

          <WeatherCalendar historyData={historyData} currentUserId={currentUserId} setDisplayMonth={setCurrentMonth} />
        </View>

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
    </ImageBackground>
  );
}
