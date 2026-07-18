import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';

import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { DirectMessageItem } from '@/lib/types';

type OtherUser = { id: string; nickname: string; avatar_emoji: string };

const fetchOtherUser = async (conversationId: string, myUserId: string, setter: (user: OtherUser | null) => void) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('user_a_id, user_b_id, user_a:profiles!conversations_user_a_id_fkey(nickname, avatar_emoji), user_b:profiles!conversations_user_b_id_fkey(nickname, avatar_emoji)')
    .eq('id', conversationId)
    .single();
  if (error) {
    console.error('[dm-chat] fetchOtherUser', error.message);
    return;
  }
  const userA = Array.isArray(data.user_a) ? data.user_a[0] : data.user_a;
  const userB = Array.isArray(data.user_b) ? data.user_b[0] : data.user_b;
  const isMeUserA = data.user_a_id === myUserId;
  const otherId = isMeUserA ? data.user_b_id : data.user_a_id;
  const otherProfile = isMeUserA ? userB : userA;
  setter({ id: otherId, nickname: otherProfile.nickname, avatar_emoji: otherProfile.avatar_emoji });
};

const fetchMessages = async (conversationId: string, setter: (data: DirectMessageItem[]) => void) => {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[dm-chat] fetchMessages', error.message);
    return;
  }
  setter(data);
};

const checkIsBlocked = async (myUserId: string, otherUserId: string, setter: (blocked: boolean) => void) => {
  const { data, error } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${myUserId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${myUserId})`);
  if (error) {
    console.error('[dm-chat] checkIsBlocked', error.message);
    return;
  }
  setter(data.length > 0);
};

export default function DmChatScreen() {
  const { conversation_id: conversationId } = useLocalSearchParams<{ conversation_id: string }>();
  const { user } = useUser();
  const userId = user?.id;

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;
    fetchOtherUser(conversationId, userId, setOtherUser);
  }, [conversationId, userId]);

  useEffect(() => {
    if (!userId || !otherUser) return;
    checkIsBlocked(userId, otherUser.id, setIsBlocked);
  }, [userId, otherUser]);

  useEffect(() => {
    if (!conversationId) return;
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const channelName = `direct-messages-${conversationId}`;
      const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      await fetchMessages(conversationId, setMessages);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` }, async () => {
          await fetchMessages(conversationId, setMessages);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (isSending || !conversationId || !userId || isBlocked) return;
    const body = inputText.trim();
    if (body === '') return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('direct_messages').insert({ conversation_id: conversationId, sender_id: userId, body });
      if (error) {
        console.error('[dm-chat] handleSend', error.message);
        return;
      }
      setInputText('');
      Keyboard.dismiss();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <Stack.Screen options={{ title: otherUser?.nickname ?? 'DM' }} />
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
          renderItem={({ item }) => {
            const isMine = item.sender_id === userId;
            return (
              <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, maxWidth: '80%' }}>
                  {isMine && (
                    <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>
                      {new Date(item.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                  <View
                    style={{
                      backgroundColor: isMine ? WeatherBoardColors.buttonBackground : '#FFFFFF',
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isMine ? 0 : 0.05,
                      shadowRadius: 4,
                    }}>
                    <Text style={{ fontSize: 14, color: isMine ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark }}>{item.body}</Text>
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

        {isBlocked ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack }}>
              ブロック中のため、メッセージは送信できません
            </Text>
          </View>
        ) : (
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
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
