import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import useProfileSetUp from '@/hooks/useProfileSetUp';
import useRoomCreate from '@/hooks/useRoomCreate';
import useRoomJoin from '@/hooks/useRoomJoin';
import { supabase } from '@/lib/supabase';

type RoomData = {
  rooms: { id: string; name: string; invite_code: string }[];
};

const AVATARS = [
  // 動物
  '🐶',
  '🐱',
  '🐭',
  '🐹',
  '🐰',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐸',
  '🐵',
  '🐔',
  '🐧',
  '🐦',
  '🦆',
  '🦉',
  '🐺',
  '🐴',
  '🦄',
  '🐝',
  '🦋',
  '🐢',
  '🐬',
  '🦭',
  '🐙',
  '🐿️',
  '🦔',
  // 食べ物・かわいい系
  '🍓',
  '🍑',
  '🍒',
  '🍰',
  '🧁',
  '🍩',
  '🍪',
  '🧸',
  // 自然・植物
  '🌸',
  '🌼',
  '🌻',
  '🍄',
  '🌈',
  '⭐',
  '🌙',
  '☁️',
  // キャラ系
  '👻',
  '🤖',
  '👾',
  '🎃',
];

const backgroundImage = require('@/assets/images/weather/settings.png');

export default function Settings() {
  const { user } = useUser();
  const userId = user?.id;
  const router = useRouter();
  const [roomData, setRoomData] = useState<RoomData[]>([]);
  const { setCurrentRoomId, refreshRooms } = useRoom();
  const [isInviteVisible, setIsInviteVisible] = useState(false);
  const [isJoinVisible, setIsJoinVisible] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isProfileSetUpVisible, setIsProfileSetUpVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { handleCreateRoom, setRoomName, roomName } = useRoomCreate(async (roomId) => {
    setIsCreateVisible(false);
    Toast.show({ type: 'success', text1: `ルーム[${roomName}]を作成しました`, visibilityTime: 1500 });
    setRoomName('');
    await fetchInviteData();
    await refreshRooms();
    setCurrentRoomId(roomId);
    router.replace('/(tabs)');
  });

  const { inviteCode, setInviteCode, isJoining, handleJoinRoom } = useRoomJoin(async (roomName, roomId) => {
    setIsJoinVisible(false);
    Toast.show({ type: 'success', text1: `${roomName}に参加しました。`, visibilityTime: 1500 });
    setInviteCode('');
    await fetchInviteData();
    await refreshRooms();
    setCurrentRoomId(roomId);
    router.replace('/(tabs)');
  });

  const { handleSaveProfile, setNickname, setAvatar, avatar, nickname } = useProfileSetUp(async () => {
    setIsProfileSetUpVisible(false);
    Toast.show({ type: 'success', text1: `プロフィールを変更しました。`, visibilityTime: 1500 });
    await fetchProfileData();
  });

  const fetchInviteData = useCallback(async () => {
    const { data: roomData, error: roomError } = await supabase.from('room_members').select('rooms(id, name, invite_code)').eq('user_id', userId);
    if (roomError) {
      console.error('[settings] fetchInviteData', roomError.message);
      Alert.alert('ルームメンバーの取得に失敗しました。');
      return;
    }
    setRoomData(roomData ?? []);
  }, [userId]);

  const fetchProfileData = useCallback(async () => {
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('nickname, avatar_emoji').eq('user_id', userId);
    if (profileError) {
      console.error('[settings] fetchProfileData', profileError.message);
      Alert.alert('プロフィールの取得に失敗しました。');
      return;
    }
    setAvatar(profileData[0]?.avatar_emoji);
    setNickname(profileData[0]?.nickname);
  }, [userId, setNickname, setAvatar]);

  const handleLeaveRoom = async (roomId: string) => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      const { error: roomMembersError } = await supabase.from('room_members').delete().eq('user_id', userId).eq('room_id', roomId);
      if (roomMembersError) {
        console.error('[settings] handleLeaveRoom', roomMembersError.message);
        Alert.alert('削除に失敗しました。');
        return;
      }
      const remaining = roomData.flatMap((d) => d.rooms).filter((d) => d.id !== roomId);
      setCurrentRoomId(remaining[0]?.id ?? null);
      await fetchInviteData();
      await refreshRooms();
      Toast.show({ type: 'success', text1: `ルームを削除しました`, visibilityTime: 1500 });
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[settings] handleLeaveRoom', error.message);
        Alert.alert('ログアウトに失敗しました。');
        return;
      }
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInviteData();
      fetchProfileData();
    }, [fetchProfileData, fetchInviteData]),
  );

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center gap-12 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <Pressable onPress={() => setIsCreateVisible(true)} className="w-full py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルームを作成する
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsJoinVisible(true)} className="w-full py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.tertiaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルームに参加する
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsInviteVisible(true)} className="w-full py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.tertiaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルーム一覧
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setIsProfileSetUpVisible(true)}
        className="w-full py-6 px-2 rounded-xl flex justify-center items-center border"
        style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          プロフィール編集
        </Text>
      </Pressable>

      <Pressable onPress={handleLogout} className="w-full py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          ログアウト
        </Text>
      </Pressable>

      <Modal visible={isInviteVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsInviteVisible(false)} className="flex-1">
          <BlurView intensity={40} tint="light" className="flex-1 justify-center pt-40 pb-20 px-4">
            <FlatList
              data={roomData.flatMap((data) => data?.rooms)}
              keyExtractor={(item) => item?.id}
              contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}
              ListEmptyComponent={
                <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                  まだ所属しているルームがありません。
                </Text>
              }
              renderItem={({ item }) => {
                return (
                  <View>
                    <Pressable
                      onPress={async () => {
                        await Clipboard.setStringAsync(item?.invite_code);
                        Toast.show({
                          type: 'success',
                          text1: 'コピーしました。',
                          visibilityTime: 1000,
                        });
                      }}
                      className="mb-6 p-6 rounded-xl bg-white">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-semibold">{item?.name}</Text>
                      </View>

                      <View className="flex-row justify-between items-center gap-2">
                        <Text className="text-xl font-bold">{item?.invite_code}</Text>
                        <View className="flex-row items-center gap-6">
                          <Text className="text-xl font-semibold">コピー</Text>

                          <Pressable
                            onPress={() => {
                              Alert.alert('確認', '本当に退出しますか？', [
                                { text: 'キャンセル', style: 'cancel' },
                                { text: '退出する', style: 'destructive', onPress: () => handleLeaveRoom(item?.id) },
                              ]);
                            }}>
                            <Text className="text-xl font-bold">退出</Text>
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              }}></FlatList>
            {roomData.length > 0 ? (
              <Text className="text-sm font-bold mt-4" style={{ color: WeatherBoardColors.textPrimary }}>
                ※タップで保存できます。
              </Text>
            ) : null}
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
              <Pressable onPress={handleCreateRoom} className="mb-12 py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
                <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
                  ルームを作成する
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </Pressable>
        <Toast position="bottom" bottomOffset={40} />
      </Modal>

      <Modal visible={isProfileSetUpVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsProfileSetUpVisible(false)} className="flex-1">
          <BlurView intensity={40} tint="light" className="flex-1 justify-center p-5">
            <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 40, paddingVertical: 40 }}>
              <View className="justify-center flex-1">
                <View className="mb-8">
                  <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                    ニックネームを変更できます。
                  </Text>
                  <TextInput value={nickname} onChangeText={setNickname} placeholder="テキストを入力してください。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
                </View>

                <View>
                  <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                    アバターを選んでください。
                  </Text>
                </View>

                <View className="relative flex items-center p-4 overflow-hidden mb-8" style={{ borderRadius: 16 }}>
                  <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}></View>
                  <View className="flex-row gap-3 flex-wrap justify-center mb-4">
                    {AVATARS.map((item) => (
                      <Pressable key={item} onPress={() => setAvatar(item)} style={{ opacity: avatar === item ? 1 : 0.6 }}>
                        <Text className="text-4xl">{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Pressable onPress={handleSaveProfile} className="py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
                  <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
                    保存する
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </BlurView>
        </Pressable>
        <Toast position="bottom" bottomOffset={40} />
      </Modal>
    </ImageBackground>
  );
}
