import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import GlassButton from '@/components/GlassButton';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import useProfileSetUp from '@/hooks/useProfileSetUp';
import useRoomCreate from '@/hooks/useRoomCreate';
import useRoomJoin from '@/hooks/useRoomJoin';
import { supabase } from '@/lib/supabase';

type RoomData = {
  rooms: { id: string; name: string; invite_code: string; created_by: string }[];
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
  const [isRenameVisible, setIsRenameVisible] = useState(false);
  const [renameRoomId, setRenameRoomId] = useState('');
  const [renameRoomName, setRenameRoomName] = useState('');

  const { handleCreateRoom, setRoomName, roomName } = useRoomCreate(async (roomId) => {
    setIsCreateVisible(false);
    setRoomName('');
    await fetchInviteData();
    await refreshRooms();
    setCurrentRoomId(roomId);
    router.replace('/(tabs)');
    Toast.show({ type: 'success', text1: `ルーム[${roomName}]を作成しました`, visibilityTime: 1500 });
  });

  const { inviteCode, setInviteCode, handleJoinRoom } = useRoomJoin(async (roomName, roomId) => {
    setIsJoinVisible(false);
    setInviteCode('');
    await fetchInviteData();
    await refreshRooms();
    setCurrentRoomId(roomId);
    router.replace('/(tabs)');
    Toast.show({ type: 'success', text1: `${roomName}に参加しました。`, visibilityTime: 1500 });
  });

  const { handleSaveProfile, setNickname, setAvatar, avatar, nickname } = useProfileSetUp(async () => {
    await fetchProfileData();
    setIsProfileSetUpVisible(false);
    Toast.show({ type: 'success', text1: `プロフィールを変更しました。`, visibilityTime: 1500 });
  });

  const fetchInviteData = useCallback(async () => {
    const { data: roomData, error: roomError } = await supabase.from('room_members').select('rooms(id, name, invite_code, created_by)').eq('user_id', userId);
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
      setIsInviteVisible(false);
      Toast.show({ type: 'success', text1: `ルームを削除しました`, visibilityTime: 1500 });
    } finally {
      setIsLeaving(false);
    }
  };

  const handleRenameRoom = async (roomId: string, newName: string) => {
    if (newName.trim().length === 0) {
      Alert.alert('ルーム名を入力してください。');
      return;
    }
    const { error } = await supabase.from('rooms').update({ name: newName.trim() }).eq('id', roomId);
    if (error) {
      console.error('[settings] handleRenameRoom', error.message);
      Alert.alert('ルーム名の変更に失敗しました。');
      return;
    }
    await fetchInviteData();
    await refreshRooms();
    setIsRenameVisible(false);
    Toast.show({ type: 'success', text1: 'ルーム名を変更しました。', visibilityTime: 1500 });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[settings] handleLogout', error.message);
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
    <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center gap-8 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>

      <GlassButton onPress={() => setIsCreateVisible(true)} buttonText="ルームを作成する" buttonIcon="add-circle-outline" backgroundColor={WeatherBoardColors.accentBackground} />

      <GlassButton onPress={() => setIsJoinVisible(true)} buttonText="ルームに参加する" buttonIcon="enter-outline" backgroundColor={WeatherBoardColors.tertiaryBackground} />

      <GlassButton onPress={() => setIsInviteVisible(true)} buttonText="ルーム一覧" buttonIcon="list-outline" backgroundColor={WeatherBoardColors.glassBackgroundButton}/>

      <GlassButton onPress={() => setIsProfileSetUpVisible(true)} buttonText="プロフィール編集" buttonIcon="person-outline" backgroundColor={WeatherBoardColors.glassBackgroundButton}/>

      <GlassButton
        onPress={() => {
          Alert.alert('確認', 'ログアウトしますか？', [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'ログアウトする', onPress: handleLogout, style: 'default' },
          ]);
        }}
        buttonText="ログアウト"
        buttonIcon="log-out-outline"
        backgroundColor={WeatherBoardColors.glassBackgroundButton}
      />

      <Modal visible={isInviteVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsInviteVisible(false)} className="flex-1">
          <View className="flex-1 justify-center pt-40 pb-20 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <FlatList
              data={roomData.flatMap((data) => data?.rooms)}
              keyExtractor={(item) => item?.id}
              contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}
              ListFooterComponent={() => {
                return roomData.length > 0 ? (
                  <Text className="text-sm font-bold mt-2" style={{ color: WeatherBoardColors.textPrimary }}>
                    ※タップで保存できます。
                  </Text>
                ) : null;
              }}
              renderItem={({ item }) => {
                return (
                  <Pressable
                    onPress={async () => {
                      await Clipboard.setStringAsync(item?.invite_code);
                      setIsInviteVisible(false);
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

                        {item?.created_by === userId && (
                          <Pressable
                            onPress={() => {
                              setRenameRoomId(item.id);
                              setRenameRoomName(item.name);
                              setIsInviteVisible(false);
                              setIsRenameVisible(true);
                            }}>
                            <Text className="text-xl font-bold">名前変更</Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => {
                            if (roomData.flatMap((d) => d.rooms).length === 1) {
                              Alert.alert('退出できません', '最低でも1つのルームに所属している必要があります。');
                              return;
                            }
                            Alert.alert('確認', '退出するとこのルームのカレンダー履歴が見られなくなります。本当に退出しますか？', [
                              { text: 'キャンセル', style: 'cancel' },
                              { text: '退出する', style: 'destructive', onPress: () => handleLeaveRoom(item?.id) },
                            ]);
                          }}>
                          <Text className="text-xl font-bold">退出</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              }}></FlatList>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isRenameVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsRenameVisible(false)} className="flex-1">
          <View className="flex-1 justify-center p-5" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                ルーム名を変更できます。
              </Text>
              <TextInput value={renameRoomName} onChangeText={setRenameRoomName} placeholder="新しいルーム名を入力してください。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>
            <GlassButton onPress={() => handleRenameRoom(renameRoomId, renameRoomName)} buttonText="変更する" buttonIcon="pencil-outline" backgroundColor={WeatherBoardColors.accentBackground} />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isJoinVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsJoinVisible(false)} className="flex-1">
          <View className="flex-1 justify-center p-5" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                招待コードを入力出来ます。
              </Text>
              <TextInput value={inviteCode} onChangeText={setInviteCode} placeholder="テキストを入力できます。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>

            <GlassButton onPress={handleJoinRoom} buttonText="ルームに参加する" buttonIcon="enter-outline" backgroundColor={WeatherBoardColors.tertiaryBackground} />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isCreateVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsCreateVisible(false)} className="flex-1">
          <View className="flex-1 justify-center p-5" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                ルーム名を決めてください
              </Text>
              <TextInput value={roomName} onChangeText={setRoomName} placeholder="テキストを入力できます。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>
            <GlassButton onPress={handleCreateRoom} buttonText="ルームを作成する" buttonIcon="add-circle-outline" backgroundColor={WeatherBoardColors.accentBackground} />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isProfileSetUpVisible} animationType="slide" transparent={true}>
        <Pressable onPress={() => setIsProfileSetUpVisible(false)} className="flex-1">
          <View className="flex-1 justify-center p-5" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
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
                  <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0)' }}></View>
                  <View className="flex-row gap-2 flex-wrap justify-center mb-4">
                    {AVATARS.map((item) => (
                      <Pressable key={item} onPress={() => setAvatar(item)} style={{ opacity: avatar === item ? 1 : 0.6 }}>
                        <Text className="text-4xl">{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <GlassButton onPress={handleSaveProfile} buttonText="保存する" buttonIcon="add-circle-outline" backgroundColor={WeatherBoardColors.accentBackground} />
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
}
