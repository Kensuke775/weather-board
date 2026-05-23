import * as Clipboard from 'expo-clipboard';
import { Alert, ImageBackground, Modal, Pressable, Text, View } from 'react-native';

import { WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import Toast from 'react-native-toast-message';

type RoomData = {
  rooms: { id: string; name: string; invite_code: string };
};

export default function Settings() {
  const router = useRouter();
  const [roomData, setRoomData] = useState<RoomData[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);

  const fetchInviteData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーの取得がでいませんでした。');
    const { data: roomData, error: roomError } = await supabase.from('room_members').select('rooms(id, name, invite_code)').eq('user_id', user.id);
    if (roomError) return Alert.alert(roomError.message);

    setRoomData(roomData as unknown as RoomData[]);
  };

  const handleLeaveRoom = async (roomId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーの取得がでいませんでした。');
    const { error: roomMembersError } = await supabase.from('room_members').delete().eq('user_id', user.id).eq('room_id', roomId);
    if (roomMembersError) Alert.alert(roomMembersError.message);
    await fetchInviteData();
  };

  useFocusEffect(
    useCallback(() => {
      fetchInviteData();
    }, []),
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('ログアウトに失敗しました。');
    else router.replace('/(auth)/login');
  };

  const backgroundImage = require('@/assets/images/weather/explore.png');
  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center gap-12 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <Pressable
        className="w-full py-6 px-2 rounded-xl flex justify-center items-center border"
        onPress={() => router.push('/(auth)/room-create')}
        style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルームを作成する
        </Text>
      </Pressable>

      <Pressable
        className="w-full py-6 px-2 rounded-xl flex justify-center items-center border"
        onPress={() => router.push('/(auth)/room-join')}
        style={{ backgroundColor: WeatherBoardColors.tertiaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルームに参加する
        </Text>
      </Pressable>

      <Pressable className="w-full py-6 px-2 rounded-xl flex justify-center items-center border" onPress={() => setModalVisible(true)} style={{ backgroundColor: WeatherBoardColors.tertiaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルーム一覧
        </Text>
      </Pressable>

      <Pressable onPress={handleLogout} className="w-full py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          ログアウト
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/profile-edit')}
        className="w-full py-6 px-2 rounded-xl flex justify-center items-center border"
        style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          プロフィール編集
        </Text>
      </Pressable>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setModalVisible(false)} className="flex-1">
          <BlurView intensity={40} tint="light" className="flex-1 justify-center p-5">
            {roomData.map((data) => (
              <Pressable
                key={data.rooms.id}
                onPress={async () => {
                  await Clipboard.setStringAsync(data.rooms.invite_code);
                  Toast.show({
                    type: 'success',
                    text1: 'コピーしました。',
                    visibilityTime: 1000,
                  });
                }}
                className="mb-6 p-6 rounded-xl bg-white">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-semibold">{data.rooms.name}</Text>
                </View>

                <View className="flex-row justify-between items-center gap-2">
                  <Text className="text-xl font-bold">{data.rooms.invite_code}</Text>
                  <View className="flex-row items-center gap-6">
                    <Text className="text-xl font-semibold">コピー</Text>

                    <Pressable
                      onPress={() => {
                        Alert.alert('確認', '本当に退出しますか？', [
                          { text: 'キャンセル', style: 'cancel' },
                          { text: '退出する', style: 'destructive', onPress: () => handleLeaveRoom(data.rooms.id) },
                        ]);
                      }}>
                      <Text className="text-xl font-bold">退出</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
            {roomData.length > 0 ? (
              <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                ※タップで保存できます。
              </Text>
            ) : (
              <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                まだ所属しているルームがありません。
              </Text>
            )}
          </BlurView>
        </Pressable>
        <Toast />
      </Modal>
    </ImageBackground>
  );
}
