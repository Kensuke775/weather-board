import { useState } from 'react';
import { Alert, ImageBackground, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import useRoomCreate from '@/hooks/useRoomCreate';
import useRoomJoin from '@/hooks/useRoomJoin';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/explore.png');

export default function RoomSetup() {
  const router = useRouter();
  const { refreshRooms } = useRoom();
  const [isJoinVisible, setIsJoinVisible] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { handleCreateRoom, setRoomName, roomName, isCreating } = useRoomCreate(async () => {
    await refreshRooms();
    setRoomName('');
    router.replace('/(tabs)');
  });

  const { inviteCode, setInviteCode, isJoining, handleJoinRoom } = useRoomJoin(async () => {
    await refreshRooms();
    setInviteCode('');
    router.replace('/(tabs)');
  });

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[room-setup] handleLogout', error.message);
        Alert.alert('ログアウトに失敗しました。');
        return;
      }
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center px-10">
      <Pressable
        className="w-full mb-12 py-6 px-2 rounded-xl flex justify-center items-center border"
        onPress={() => setIsCreateVisible(true)}
        style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルームを作成する
        </Text>
      </Pressable>

      <Pressable
        className="w-full mb-12 py-6 px-2 rounded-xl flex justify-center items-center border"
        onPress={() => setIsJoinVisible(true)}
        style={{ backgroundColor: WeatherBoardColors.tertiaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルームに参加する
        </Text>
      </Pressable>

      <Pressable className="w-full py-6 px-2 rounded-xl flex justify-center items-center border" onPress={handleLogout} style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          ログアウト
        </Text>
      </Pressable>

      <Modal visible={isCreateVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsCreateVisible(false)} className="flex-1">
          <BlurView intensity={40} tint="light" className="flex-1 justify-center p-5">
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                ルーム名を決めてください
              </Text>
              <TextInput value={roomName} onChangeText={setRoomName} placeholder="テキストを入力できます。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>

            <View className="w-full">
              <Pressable
                onPress={handleCreateRoom}
                disabled={isCreating}
                className="mb-12 py-6 px-2 rounded-xl flex justify-center items-center border"
                style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
                <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
                  ルームを作成する
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </Pressable>
        <Toast position="bottom" bottomOffset={40} />
      </Modal>

      <Modal visible={isJoinVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsJoinVisible(false)} className="flex-1">
          <BlurView intensity={40} tint="light" className="flex-1 justify-center p-5">
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                招待コードを入力出来ます。
              </Text>
              <TextInput value={inviteCode} onChangeText={setInviteCode} placeholder="テキストを入力できます。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>

            <View className="w-full pb-12">
              <Pressable
                onPress={handleJoinRoom}
                disabled={isJoining}
                className="mb-12 py-6 px-2 rounded-xl flex justify-center items-center border"
                style={{ backgroundColor: WeatherBoardColors.tertiaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
                <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
                  参加する
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </Pressable>
        <Toast position="bottom" bottomOffset={40} />
      </Modal>
    </ImageBackground>
  );
}
