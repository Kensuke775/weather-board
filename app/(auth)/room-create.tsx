import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Alert, ImageBackground, Pressable, Text, TextInput, View } from 'react-native';

import { WeatherBoardColors } from '@/constants/theme';
import { generateInviteCode } from '@/lib/generateInviteCode';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

const backgroundImage = require('@/assets/images/weather/room-create.png');

export default function RoomCreate() {
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const handleCreateRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      if (roomName === '') return Alert.alert('ルーム名が空になってます。');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
      const roomId = Crypto.randomUUID();
      const { error: roomError } = await supabase.from('rooms').insert({ id: roomId, name: roomName, invite_code: generateInviteCode(), created_by: user.id });
      if (roomError) return Alert.alert(roomError.message);
      const { error: memberError } = await supabase.from('room_members').insert({ room_id: roomId, user_id: user.id });

      if (memberError) return Alert.alert(memberError.message);
      else router.replace('/(tabs)');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center px-10">
      <View>
        <View className="w-full mb-12">
          <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            ルーム名を決めてください
          </Text>
          <TextInput value={roomName} onChangeText={setRoomName} placeholder="テキストを入力できます。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
        </View>

        <View className="w-full">
          <Pressable className="mb-12 py-6 px-2 rounded-xl flex justify-center items-center border" onPress={handleCreateRoom} style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
              ルームを作成する
            </Text>
          </Pressable>
        </View>

        <View className="w-full">
          <Pressable className="py-6 px-2 rounded-xl flex justify-center items-center border" onPress={() => router.replace('/(tabs)')} style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
              ホーム画面へ戻る
            </Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}
