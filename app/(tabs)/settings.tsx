import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, ImageBackground, Modal, Pressable, Text, TextInput, View } from 'react-native';

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

type ModalName = 'invite' | 'join' | 'create' | 'profileSetup' | 'rename' | 'account' | 'blockList' | null;

type BlockedUser = {
  id: string;
  blocked_id: string;
  profiles: { nickname: string; avatar_emoji: string } | null;
};

type LoadingName = 'leaving' | 'loggingOut' | 'deletingAccount' | null;

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
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const { setCurrentRoomId, refreshRooms } = useRoom();
  const [activeModal, setActiveModal] = useState<ModalName>(null);
  const [isLoading, setIsLoading] = useState<LoadingName>(null);
  const [renameRoomId, setRenameRoomId] = useState('');
  const [renameRoomName, setRenameRoomName] = useState('');
  const renameInputRef = useRef<TextInput>(null);
  const joinInputRef = useRef<TextInput>(null);
  const createInputRef = useRef<TextInput>(null);
  const nicknameInputRef = useRef<TextInput>(null);

  const { handleCreateRoom, setRoomName, roomName } = useRoomCreate(async (roomId) => {
    setActiveModal(null);
    setRoomName('');
    await fetchInviteData();
    await refreshRooms();
    setCurrentRoomId(roomId);
    router.replace('/(tabs)');
    Toast.show({ type: 'success', text1: `ルーム[${roomName}]を作成しました`, visibilityTime: 1500 });
  });

  const { inviteCode, setInviteCode, handleJoinRoom } = useRoomJoin(async (roomName, roomId) => {
    setActiveModal(null);
    setInviteCode('');
    await fetchInviteData();
    await refreshRooms();
    setCurrentRoomId(roomId);
    router.replace('/(tabs)');
    Toast.show({ type: 'success', text1: `${roomName}に参加しました。`, visibilityTime: 1500 });
  });

  const { handleSaveProfile, setNickname, setAvatar, avatar, nickname } = useProfileSetUp(async () => {
    await fetchProfileData();
    setActiveModal(null);
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

  const fetchBlockedUsers = useCallback(async () => {
    const { data: blockedData, error: blockedError } = await supabase
      .from('blocks')
      .select('id, blocked_id, profiles!blocks_blocked_id_fkey(nickname, avatar_emoji)')
      .eq('blocker_id', userId);
    if (blockedError) {
      console.error('[settings] fetchBlockedUsers', blockedError.message);
      Alert.alert('ブロック一覧の取得に失敗しました。');
      return;
    }
    const formattedData = (blockedData ?? []).map((item) => ({
      ...item,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
    }));
    setBlockedUsers(formattedData);
  }, [userId]);

  const handleUnblock = async (blockId: string) => {
    const { error } = await supabase.from('blocks').delete().eq('id', blockId);
    if (error) {
      console.error('[settings] handleUnblock', error.message);
      Alert.alert('ブロック解除に失敗しました。');
      return;
    }
    setBlockedUsers((prev) => prev.filter((item) => item.id !== blockId));
    Toast.show({ type: 'success', text1: 'ブロックを解除しました。', visibilityTime: 1500 });
  };

  const handleLeaveRoom = async (roomId: string) => {
    if (isLoading) return;
    setIsLoading('leaving');
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
      setActiveModal(null);
      Toast.show({ type: 'success', text1: `ルームを削除しました`, visibilityTime: 1500 });
    } finally {
      setIsLoading(null);
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
    setActiveModal(null);
    Toast.show({ type: 'success', text1: 'ルーム名を変更しました。', visibilityTime: 1500 });
  };

  const handleLogout = async () => {
    if (isLoading) return;
    setIsLoading('loggingOut');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[settings] handleLogout', error.message);
        Alert.alert('ログアウトに失敗しました。');
        return;
      }
    } finally {
      setIsLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (isLoading) return;
    setIsLoading('deletingAccount');
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        console.error('[settings] handleDeleteAccount', error.message);
        Alert.alert('アカウント削除に失敗しました。');
        return;
      }
      await supabase.auth.signOut();
    } finally {
      setIsLoading(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInviteData();
      fetchProfileData();
    }, [fetchProfileData, fetchInviteData]),
  );

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center gap-4 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>

      <GlassButton onPress={() => setActiveModal('create')} buttonText="ルームを作成する" buttonIcon="add-circle-outline" backgroundColor={WeatherBoardColors.accentBackground} />

      <GlassButton onPress={() => setActiveModal('join')} buttonText="ルームに参加する" buttonIcon="enter-outline" backgroundColor={WeatherBoardColors.tertiaryBackground} />

      <GlassButton onPress={() => setActiveModal('invite')} buttonText="ルーム一覧" buttonIcon="list-outline" backgroundColor={WeatherBoardColors.glassBackgroundButton} />

      <GlassButton onPress={() => setActiveModal('account')} buttonText="アカウント設定" buttonIcon="settings-outline" backgroundColor={WeatherBoardColors.glassBackgroundButton} />

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

      <Modal visible={activeModal === 'invite'} animationType="slide" transparent={true}>
        <Pressable onPress={() => setActiveModal(null)} className="flex-1">
          <View className="flex-1 justify-center pt-40 pb-20 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <FlatList
              data={roomData.flatMap((data) => data?.rooms)}
              keyExtractor={(item) => item?.id}
              contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}
              ListFooterComponent={() => {
                return roomData.length > 0 ? (
                  <Text className="text-sm font-bold mt-1" style={{ color: WeatherBoardColors.textPrimary }}>
                    ※タップで保存できます。
                  </Text>
                ) : null;
              }}
              renderItem={({ item }) => {
                return (
                  <Pressable
                    onPress={async () => {
                      await Clipboard.setStringAsync(item?.invite_code);
                      setActiveModal(null);
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
                      <View className="flex-row items-center gap-4">
                        <Text className="text-xl font-semibold">コピー</Text>

                        {item?.created_by === userId && (
                          <Pressable
                            onPress={() => {
                              setRenameRoomId(item.id);
                              setRenameRoomName(item.name);
                              setActiveModal('rename');
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

      <Modal visible={activeModal === 'rename'} animationType="slide" transparent={true} onShow={() => renameInputRef.current?.focus()}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                ルーム名を変更できます。
              </Text>
              <TextInput ref={renameInputRef} value={renameRoomName} onChangeText={setRenameRoomName} placeholder="新しいルーム名を入力してください。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>
            <View className="w-full">
              <GlassButton onPress={() => handleRenameRoom(renameRoomId, renameRoomName)} buttonText="変更する" buttonIcon="pencil-outline" backgroundColor={WeatherBoardColors.accentBackground} />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={activeModal === 'join'} animationType="slide" transparent={true} onShow={() => joinInputRef.current?.focus()}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                招待コードを入力出来ます。
              </Text>
              <TextInput ref={joinInputRef} value={inviteCode} onChangeText={setInviteCode} placeholder="テキストを入力できます。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>
            <View className="w-full">
              <GlassButton onPress={handleJoinRoom} buttonText="ルームに参加する" buttonIcon="enter-outline" backgroundColor={WeatherBoardColors.tertiaryBackground} />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={activeModal === 'create'} animationType="slide" transparent={true} onShow={() => createInputRef.current?.focus()}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                ルーム名を決めてください
              </Text>
              <TextInput ref={createInputRef} value={roomName} onChangeText={setRoomName} placeholder="テキストを入力できます。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>
            <View className="w-full">
              <GlassButton onPress={handleCreateRoom} buttonText="ルームを作成する" buttonIcon="add-circle-outline" backgroundColor={WeatherBoardColors.accentBackground} />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={activeModal === 'account'} animationType="slide" transparent={true}>
        <Pressable onPress={() => setActiveModal(null)} className="flex-1">
          <View className="flex-1 justify-center pt-40 pb-20 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View onStartShouldSetResponder={() => true} className="gap-4">
              <GlassButton onPress={() => setActiveModal('profileSetup')} buttonText="プロフィール編集" buttonIcon="person-outline" backgroundColor={WeatherBoardColors.glassBackgroundButton} />

              <GlassButton
                onPress={() => {
                  setActiveModal('blockList');
                  fetchBlockedUsers();
                }}
                buttonText="ブロック一覧"
                buttonIcon="ban-outline"
                backgroundColor={WeatherBoardColors.glassBackgroundButton}
              />

              <GlassButton
                onPress={() => {
                  Alert.alert('確認', 'アカウントを削除しますか？', [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: '削除する', onPress: handleDeleteAccount, style: 'destructive' },
                  ]);
                }}
                buttonText="アカウントを削除"
                buttonIcon="trash-outline"
                backgroundColor={WeatherBoardColors.glassBackgroundButton}
              />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={activeModal === 'blockList'} animationType="slide" transparent={true}>
        <Pressable onPress={() => setActiveModal(null)} className="flex-1">
          <View className="flex-1 justify-center pt-40 pb-20 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <FlatList
              data={blockedUsers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}
              ListEmptyComponent={
                <Text className="text-base font-bold text-center" style={{ color: WeatherBoardColors.textPrimary }}>
                  ブロック中のユーザーはいません。
                </Text>
              }
              renderItem={({ item }) => (
                <View className="mb-4 p-4 rounded-xl bg-white flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xl">{item.profiles?.avatar_emoji}</Text>
                    <Text className="text-base font-semibold">{item.profiles?.nickname}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Alert.alert('確認', 'ブロックを解除しますか？', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '解除する', onPress: () => handleUnblock(item.id) },
                      ]);
                    }}>
                    <Text className="text-base font-bold" style={{ color: WeatherBoardColors.accentBackground }}>
                      解除する
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={activeModal === 'profileSetup'} animationType="slide" transparent={true}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View className="gap-12">
              <View>
                <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                  ニックネームを変更できます。
                </Text>
                <Text className="mb-2 text-xs" style={{ color: WeatherBoardColors.textMuted }}>
                  ニックネームは6文字まででお願いします。
                </Text>
                <TextInput ref={nicknameInputRef} value={nickname} onChangeText={setNickname} maxLength={6} placeholder="テキストを入力してください。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
              </View>

              <View>
                <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                  アバターを選んでください。
                </Text>
                <View className="relative overflow-hidden p-4" style={{ borderRadius: 16, height: 280 }}>
                  <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
                  <FlatList
                    data={AVATARS}
                    keyExtractor={(item) => item}
                    numColumns={6}
                    columnWrapperStyle={{ justifyContent: 'center', gap: 8 }}
                    contentContainerStyle={{ gap: 8 }}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => setAvatar(item)} style={{ opacity: avatar === item ? 1 : 0.6, flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 32 }}>{item}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              </View>

              <GlassButton onPress={handleSaveProfile} buttonText="保存する" buttonIcon="add-circle-outline" backgroundColor={WeatherBoardColors.accentBackground} />
            </View>
          </View>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
}
