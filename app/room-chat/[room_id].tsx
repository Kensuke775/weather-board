import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import useUserProfileNavigation from '@/hooks/useUserProfileNavigation';
import { supabase } from '@/lib/supabase';
import { RoomMessageItem } from '@/lib/types';

type RoomMemberItem = {
  user_id: string;
  nickname: string;
  avatar_emoji: string;
};

const fetchRoomMessages = async (roomId: string, setter: (data: RoomMessageItem[]) => void) => {
  const { data, error } = await supabase
    .from('room_messages')
    .select('id, room_id, sender_id, body, created_at, profiles(nickname, avatar_emoji)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[room-chat] fetchRoomMessages', error.message);
    return;
  }
  setter(data.map((row) => ({ ...row, profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles })));
};

const fetchBlockedIds = async (userId: string, setter: (ids: Set<string>) => void) => {
  const { data, error } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId);
  if (error) {
    console.error('[room-chat] fetchBlockedIds', error.message);
    return;
  }
  setter(new Set(data.map((row) => row.blocked_id)));
};

const fetchMemberCount = async (roomId: string, setter: (count: number) => void) => {
  const { count, error } = await supabase.from('room_members').select('user_id', { count: 'exact', head: true }).eq('room_id', roomId);
  if (error) {
    console.error('[room-chat] fetchMemberCount', error.message);
    return;
  }
  setter(count ?? 0);
};

const fetchMembers = async (roomId: string, setter: (members: RoomMemberItem[]) => void, loadingSetter: (loading: boolean) => void) => {
  loadingSetter(true);
  const { data, error } = await supabase.from('room_members').select('user_id').eq('room_id', roomId);
  if (error) {
    console.error('[room-chat] fetchMembers', error.message);
    loadingSetter(false);
    return;
  }
  const userIds = data.map((row) => row.user_id);
  if (userIds.length === 0) {
    setter([]);
    loadingSetter(false);
    return;
  }
  const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('user_id, nickname, avatar_emoji').in('user_id', userIds);
  if (profilesError) {
    console.error('[room-chat] fetchMembers profiles', profilesError.message);
    loadingSetter(false);
    return;
  }
  const profilesById = new Map(profilesData.map((profile) => [profile.user_id, profile]));
  setter(
    userIds.map((memberUserId) => {
      const profile = profilesById.get(memberUserId);
      return { user_id: memberUserId, nickname: profile?.nickname ?? '---', avatar_emoji: profile?.avatar_emoji ?? '👤' };
    }),
  );
  loadingSetter(false);
};

export default function RoomChatScreen() {
  const navigateToProfile = useUserProfileNavigation();
  const { room_id: roomId } = useLocalSearchParams<{ room_id: string }>();
  const { user } = useUser();
  const userId = user?.id;
  const { rooms, refreshRooms } = useRoom();
  const roomName = rooms.find((item) => item.rooms.id === roomId)?.rooms.name ?? 'トーク';
  const { bottom } = useSafeAreaInsets();

  const [messages, setMessages] = useState<RoomMessageItem[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [members, setMembers] = useState<RoomMemberItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const memberSheetRef = useRef<BottomSheetModal>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!roomId) return;
    refreshRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const channelName = `room-members-count-${roomId}`;
      const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      await fetchMemberCount(roomId, setMemberCount);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, async () => {
          await fetchMemberCount(roomId, setMemberCount);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const channelName = `room-messages-${roomId}`;
      const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      await fetchRoomMessages(roomId, setMessages);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` }, async () => {
          await fetchRoomMessages(roomId, setMessages);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!userId) return;
    fetchBlockedIds(userId, setBlockedIds);
  }, [userId]);

  const handleDeleteMessage = async (messageId: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
    const { error } = await supabase.from('room_messages').delete().eq('id', messageId);
    if (error) {
      console.error('[room-chat] handleDeleteMessage', error.message);
      Alert.alert('メッセージの削除に失敗しました。');
      if (roomId) await fetchRoomMessages(roomId, setMessages);
      return;
    }
  };

  const handleSend = async () => {
    if (isSending || !roomId || !userId) return;
    const body = inputText.trim();
    if (body === '') return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('room_messages').insert({ room_id: roomId, sender_id: userId, body });
      if (error) {
        console.error('[room-chat] handleSend', error.message);
        return;
      }
      setInputText('');
      Keyboard.dismiss();

      const { data: otherMembers, error: membersError } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', roomId)
        .neq('user_id', userId);
      if (membersError) {
        console.error('[room-chat] handleSend notify', membersError.message);
      } else if (otherMembers.length > 0) {
        const { error: notifyError } = await supabase.from('notifications').insert(
          otherMembers.map((member) => ({
            to_user_id: member.user_id,
            from_user_id: userId,
            type: 'room_message',
            room_id: roomId,
            is_read: false,
          })),
        );
        if (notifyError) console.error('[room-chat] handleSend notify', notifyError.message);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenMembers = () => {
    memberSheetRef.current?.present();
    if (roomId) fetchMembers(roomId, setMembers, setIsLoadingMembers);
  };

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable onPress={handleOpenMembers} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#000000' }}>{roomName}</Text>
              {memberCount !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>{memberCount}人が参加中</Text>
                  <Ionicons name="chevron-down" size={11} color={WeatherBoardColors.textMutedBlack} />
                </View>
              )}
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'flex-end', gap: 10 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingBottom: 24 }}>
              <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack }}>まだメッセージはありません</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === userId;
            const isBlocked = blockedIds.has(item.sender_id);
            // data は新しい順（inverted指定のため）。時系列で1つ前のメッセージは index+1 側にある。
            const previousBySameSender = messages[index + 1]?.sender_id === item.sender_id;
            const showSenderInfo = !isMine && !previousBySameSender;

            return (
              <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                {showSenderInfo && (
                  <Pressable
                    onPress={() => navigateToProfile(item.sender_id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 }}>
                    <Text style={{ fontSize: 14 }}>{item.profiles?.avatar_emoji}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: WeatherBoardColors.textMutedBlack }}>
                      {item.profiles?.nickname}
                    </Text>
                  </Pressable>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, maxWidth: '80%' }}>
                  <Pressable
                    disabled={!isMine}
                    onLongPress={() =>
                      Alert.alert('確認', 'このメッセージを削除しますか？\n削除すると元に戻せません。', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除する', style: 'destructive', onPress: () => handleDeleteMessage(item.id) },
                      ])
                    }
                    style={{
                      backgroundColor: isBlocked ? WeatherBoardColors.tagBackground : isMine ? WeatherBoardColors.buttonBackground : '#FFFFFF',
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isMine || isBlocked ? 0 : 0.05,
                      shadowRadius: 4,
                    }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: isBlocked ? WeatherBoardColors.textMutedBlack : isMine ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark,
                        fontStyle: isBlocked ? 'italic' : 'normal',
                      }}>
                      {isBlocked ? 'ブロックしたユーザーです' : item.body}
                    </Text>
                  </Pressable>
                  <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>
                    {new Date(item.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: Math.max(bottom, 12) }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="メッセージを入力..."
              placeholderTextColor={WeatherBoardColors.textMutedBlack}
              style={{ fontSize: 14, color: WeatherBoardColors.textPrimaryDark, maxHeight: 100 }}
              multiline
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={isSending || inputText.trim() === ''}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: WeatherBoardColors.buttonBackground,
              opacity: isSending || inputText.trim() === '' ? 0.5 : 1,
            }}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BottomSheetModal
        ref={memberSheetRef}
        snapPoints={['50%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: WeatherBoardColors.divider }}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark, paddingHorizontal: 20, paddingBottom: 12 }}>
          参加メンバー({members.length}人)
        </Text>
        {isLoadingMembers ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={WeatherBoardColors.buttonBackground} />
          </View>
        ) : (
          <BottomSheetFlatList
            data={members}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider }} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  memberSheetRef.current?.dismiss();
                  navigateToProfile(item.user_id);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <Text style={{ fontSize: 22 }}>{item.avatar_emoji}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>{item.nickname}</Text>
              </Pressable>
            )}
          />
        )}
      </BottomSheetModal>
    </View>
  );
}
