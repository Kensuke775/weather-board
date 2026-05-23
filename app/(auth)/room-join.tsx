import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ImageBackground, Pressable, Text, TextInput, View } from 'react-native';

import { WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/room-join.png');

export default function RoomJoin() {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const handleJoinRoom = async () => {
    if (isJoining) return;
    try {
      setIsJoining(true);
      if (inviteCode === '') return Alert.alert('招待コードを入力してください。');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');

      const { data: roomData, error: roomError } = await supabase.from('rooms').select('id').eq('invite_code', inviteCode).single();
      if (roomError) return Alert.alert(roomError.message);
      const { data: roomMembersData, error: roomMembersError } = await supabase.from('room_members').select('user_id').eq('room_id', roomData.id).eq('user_id', user.id);
      if (roomMembersError) return Alert.alert(roomMembersError.message);
      if (roomMembersData.length > 0) return Alert.alert('すでに所属しているルームです。');

      const { error: memberError } = await supabase.from('room_members').insert({ room_id: roomData.id, user_id: user.id });
      if (memberError) return Alert.alert(memberError.message);
      router.replace('/(tabs)');
    } finally {
      setIsJoining(false);
    }
  };
  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <View>
        <View className="w-full mb-12">
          <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            招待コードを入力出来ます。
          </Text>
          <TextInput value={inviteCode} onChangeText={setInviteCode} placeholder="テキストを入力できます。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
        </View>

        <View className="w-full pb-12">
          <Pressable className="mb-12 py-6 px-2 rounded-xl flex justify-center items-center border" onPress={handleJoinRoom} style={{ backgroundColor: WeatherBoardColors.tertiaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
              参加する
            </Text>
          </Pressable>
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
