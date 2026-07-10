import * as Clipboard from 'expo-clipboard';
import React, { ComponentProps, useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Fonts } from '@/constants/theme';
import { TOAST_DURATION } from '@/constants/ui';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import useRoomCreate from '@/hooks/useRoomCreate';
import useRoomJoin from '@/hooks/useRoomJoin';
import { supabase } from '@/lib/supabase';

type RoomData = {
  rooms: { id: string; name: string; invite_code: string; created_by: string }[];
};

type ModalName = 'invite' | 'join' | 'create' | 'rename' | 'account' | 'blockList' | null;

type BlockedUser = {
  id: string;
  blocked_id: string;
  profiles: { nickname: string; avatar_emoji: string } | null;
};

type LoadingName = 'leaving' | 'loggingOut' | 'deletingAccount' | null;

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');
const PRIMARY_BROWN = '#624221';
const SECONDARY_BROWN = 'rgba(98,66,33,0.75)';
const MUTED_BROWN = 'rgba(98,66,33,0.5)';

type MenuItemProps = {
  label: string;
  description: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  onPress: () => void;
};

function MenuItem({ label, description, iconName, iconBg, onPress }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={iconName} size={22} color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 15 }}>{label}</Text>
        <Text style={{ color: MUTED_BROWN, fontSize: 11, marginTop: 2 }}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={MUTED_BROWN} />
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const { top } = useSafeAreaInsets();
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
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  const { handleCreateRoom, setRoomName, roomName } = useRoomCreate(async (roomId) => {
    setActiveModal(null);
    setRoomName('');
    await fetchInviteData();
    await refreshRooms();
    setCurrentRoomId(roomId);
    Toast.show({ type: 'success', text1: `ルーム[${roomName}]を作成しました`, visibilityTime: TOAST_DURATION.default });
  });

  const { inviteCode, setInviteCode, handleJoinRoom } = useRoomJoin(async (roomName, roomId) => {
    setActiveModal(null);
    setInviteCode('');
    await fetchInviteData();
    await refreshRooms();
    setCurrentRoomId(roomId);
    Toast.show({ type: 'success', text1: `${roomName}に参加しました。`, visibilityTime: TOAST_DURATION.default });
  });

  const fetchInviteData = useCallback(async () => {
    const { data: roomData, error: roomError } = await supabase
      .from('room_members')
      .select('rooms(id, name, invite_code, created_by)')
      .eq('user_id', userId);
    if (roomError) {
      console.error('[settings] fetchInviteData', roomError.message);
      Alert.alert('ルームメンバーの取得に失敗しました。');
      return;
    }
    setRoomData(roomData ?? []);
  }, [userId]);

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
    Toast.show({ type: 'success', text1: 'ブロックを解除しました。', visibilityTime: TOAST_DURATION.default });
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
      Toast.show({ type: 'success', text1: `ルームを削除しました`, visibilityTime: TOAST_DURATION.default });
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
    Toast.show({ type: 'success', text1: 'ルーム名を変更しました。', visibilityTime: TOAST_DURATION.default });
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
    }, [fetchInviteData]),
  );

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: top + 20, paddingHorizontal: 20 }}>
        {/* Title */}
        <Text
          style={{
            fontFamily: 'DancingScript_400Regular',
            fontSize: 32,
            color: PRIMARY_BROWN,
            textAlign: 'center',
            lineHeight: 42,
            marginBottom: 36,
          }}>
          {"How's your\nweather today?"}
        </Text>

        {/* Menu items */}
        <View style={{ gap: 12 }}>
          <MenuItem
            label="ルームを作成する"
            description="新しいルームを作成します"
            iconName="add-circle"
            iconBg="#F5A623"
            onPress={() => setActiveModal('create')}
          />
          <MenuItem
            label="ルームに参加する"
            description="ルームに参加します"
            iconName="enter"
            iconBg="#4CAF7D"
            onPress={() => setActiveModal('join')}
          />
          <MenuItem
            label="ルーム一覧"
            description="参加中のルームを確認します"
            iconName="list"
            iconBg="#A0A0A0"
            onPress={() => setActiveModal('invite')}
          />
          <MenuItem
            label="アカウント設定"
            description="プロフィールや各種設定を行います"
            iconName="settings-sharp"
            iconBg="#A0A0A0"
            onPress={() => setActiveModal('account')}
          />
          <MenuItem
            label="ログアウト"
            description="アカウントからログアウトします"
            iconName="log-out-outline"
            iconBg="#A0A0A0"
            onPress={() => {
              Alert.alert('確認', 'ログアウトしますか？', [
                { text: 'キャンセル', style: 'cancel' },
                { text: 'ログアウトする', onPress: handleLogout, style: 'default' },
              ]);
            }}
          />
        </View>
      </View>

      {/* ─── ルーム一覧 modal ─── */}
      <Modal visible={activeModal === 'invite'} animationType="slide" transparent={true}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', paddingTop: 120, paddingBottom: 80, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <FlatList
              data={roomData.flatMap((data) => data?.rooms)}
              keyExtractor={(item) => item?.id}
              contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}
              ListFooterComponent={() =>
                roomData.length > 0 ? (
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginTop: 4 }}>※タップで保存できます。</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={async () => {
                    await Clipboard.setStringAsync(item?.invite_code);
                    setActiveModal(null);
                    Toast.show({ type: 'success', text1: 'コピーしました。', visibilityTime: TOAST_DURATION.short });
                  }}
                  style={{ marginBottom: 16, padding: 20, borderRadius: 16, backgroundColor: 'white' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: PRIMARY_BROWN }}>{item?.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: PRIMARY_BROWN }}>{item?.invite_code}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 14, color: SECONDARY_BROWN }}>コピー</Text>
                      {item?.created_by === userId && (
                        <Pressable
                          onPress={() => {
                            setRenameRoomId(item.id);
                            setRenameRoomName(item.name);
                            setActiveModal('rename');
                          }}>
                          <Text style={{ fontSize: 14, color: SECONDARY_BROWN }}>名前変更</Text>
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
                        <Text style={{ fontSize: 14, color: '#EF4444' }}>退出</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* ─── 名前変更 modal ─── */}
      <Modal visible={activeModal === 'rename'} animationType="slide" transparent={true} onShow={() => renameInputRef.current?.focus()}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ marginBottom: 8, fontSize: 15, fontWeight: '700', color: 'white' }}>ルーム名を変更できます。</Text>
              <TextInput
                ref={renameInputRef}
                value={renameRoomName}
                onChangeText={setRenameRoomName}
                placeholder="新しいルーム名を入力してください。"
                autoCapitalize="none"
                style={{ backgroundColor: 'white', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 }}
              />
            </View>
            <Pressable
              onPress={() => handleRenameRoom(renameRoomId, renameRoomName)}
              style={{ backgroundColor: PRIMARY_BROWN, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>変更する</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ─── ルームに参加 modal ─── */}
      <Modal visible={activeModal === 'join'} animationType="slide" transparent={true} onShow={() => joinInputRef.current?.focus()}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ marginBottom: 8, fontSize: 15, fontWeight: '700', color: 'white' }}>招待コードを入力出来ます。</Text>
              <TextInput
                ref={joinInputRef}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="招待コードを入力してください。"
                autoCapitalize="none"
                style={{ backgroundColor: 'white', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 }}
              />
            </View>
            <Pressable
              onPress={handleJoinRoom}
              style={{ backgroundColor: '#4CAF7D', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>ルームに参加する</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ─── ルームを作成 modal ─── */}
      <Modal visible={activeModal === 'create'} animationType="slide" transparent={true} onShow={() => createInputRef.current?.focus()}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ marginBottom: 8, fontSize: 15, fontWeight: '700', color: 'white' }}>ルーム名を決めてください</Text>
              <TextInput
                ref={createInputRef}
                value={roomName}
                onChangeText={setRoomName}
                placeholder="ルーム名を入力してください。"
                autoCapitalize="none"
                style={{ backgroundColor: 'white', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 }}
              />
            </View>
            <Pressable
              onPress={handleCreateRoom}
              style={{ backgroundColor: '#F5A623', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>ルームを作成する</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ─── アカウント設定 modal ─── */}
      <Modal visible={activeModal === 'account'} animationType="slide" transparent={true}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', paddingTop: 120, paddingBottom: 80, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View onStartShouldSetResponder={() => true} style={{ gap: 12 }}>
              <Pressable
                onPress={() => { setActiveModal(null); router.push('/profile-edit'); }}
                style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#A0A0A0', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person-outline" size={22} color="white" />
                </View>
                <Text style={{ flex: 1, color: PRIMARY_BROWN, fontWeight: '700', fontSize: 15 }}>プロフィール編集</Text>
                <Ionicons name="chevron-forward" size={18} color={MUTED_BROWN} />
              </Pressable>

              <Pressable
                onPress={() => {
                  setActiveModal('blockList');
                  fetchBlockedUsers();
                }}
                style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#A0A0A0', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="ban-outline" size={22} color="white" />
                </View>
                <Text style={{ flex: 1, color: PRIMARY_BROWN, fontWeight: '700', fontSize: 15 }}>ブロック一覧</Text>
                <Ionicons name="chevron-forward" size={18} color={MUTED_BROWN} />
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert('確認', 'アカウントを削除しますか？', [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: '削除する', onPress: handleDeleteAccount, style: 'destructive' },
                  ]);
                }}
                style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="trash-outline" size={22} color="white" />
                </View>
                <Text style={{ flex: 1, color: '#EF4444', fontWeight: '700', fontSize: 15 }}>アカウントを削除</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(239,68,68,0.5)" />
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ─── ブロック一覧 modal ─── */}
      <Modal visible={activeModal === 'blockList'} animationType="slide" transparent={true}>
        <Pressable onPress={() => setActiveModal(null)} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', paddingTop: 120, paddingBottom: 80, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <FlatList
              data={blockedUsers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}
              ListEmptyComponent={
                <Text style={{ fontSize: 14, fontWeight: '700', textAlign: 'center', color: 'white' }}>ブロック中のユーザーはいません。</Text>
              }
              renderItem={({ item }) => (
                <View style={{ marginBottom: 12, padding: 16, borderRadius: 16, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{item.profiles?.avatar_emoji}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: PRIMARY_BROWN }}>{item.profiles?.nickname}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Alert.alert('確認', 'ブロックを解除しますか？', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '解除する', onPress: () => handleUnblock(item.id) },
                      ]);
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B9BDE' }}>解除する</Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        </Pressable>
      </Modal>

    </ImageBackground>
  );
}
