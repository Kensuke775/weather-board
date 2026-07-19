import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';

import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { RoomMessageItem } from '@/lib/types';

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

export default function RoomChatScreen() {
  const { room_id: roomId } = useLocalSearchParams<{ room_id: string }>();
  const { user } = useUser();
  const userId = user?.id;
  const { rooms } = useRoom();
  const roomName = rooms.find((item) => item.rooms.id === roomId)?.rooms.name ?? 'トーク';

  const [messages, setMessages] = useState<RoomMessageItem[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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
          })),
        );
        if (notifyError) console.error('[room-chat] handleSend notify', notifyError.message);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <Stack.Screen options={{ title: roomName }} />
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 }}>
                    <Text style={{ fontSize: 14 }}>{item.profiles?.avatar_emoji}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: WeatherBoardColors.textMutedBlack }}>
                      {item.profiles?.nickname}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, maxWidth: '80%' }}>
                  {isMine && (
                    <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>
                      {new Date(item.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                  <View
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
                  </View>
                  {!isMine && (
                    <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>
                      {new Date(item.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
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
    </View>
  );
}
