import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import useUserProfileNavigation from '@/hooks/useUserProfileNavigation';
import { supabase } from '@/lib/supabase';
import { ConversationItem } from '@/lib/types';

const fetchConversations = async (userId: string, setter: (data: ConversationItem[]) => void) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      'id, user_a_id, user_b_id, last_message_at, user_a:profiles!conversations_user_a_id_fkey(nickname, avatar_emoji), user_b:profiles!conversations_user_b_id_fkey(nickname, avatar_emoji)',
    )
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  if (error) {
    console.error('[room-chat/index] fetchConversations', error.message);
    return;
  }
  setter(
    data.map((row) => ({
      ...row,
      user_a: Array.isArray(row.user_a) ? row.user_a[0] : row.user_a,
      user_b: Array.isArray(row.user_b) ? row.user_b[0] : row.user_b,
    })),
  );
};

export default function TalkHubScreen() {
  const router = useRouter();
  const navigateToProfile = useUserProfileNavigation();
  const { user } = useUser();
  const userId = user?.id;
  const { rooms, refreshRooms } = useRoom();
  const [activeTab, setActiveTab] = useState<'room' | 'dm'>('room');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const avatarPressedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchConversations(userId, setConversations);
    }, [userId]),
  );

  const handleRefresh = async () => {
    if (!userId) return;
    setIsRefreshing(true);
    await Promise.all([fetchConversations(userId, setConversations), refreshRooms()]);
    setIsRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      {/* ルーム / DM 切り替えピル */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 100, padding: 4, gap: 4 }}>
          <Pressable
            onPress={() => setActiveTab('room')}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 100,
              backgroundColor: activeTab === 'room' ? WeatherBoardColors.buttonBackground : 'transparent',
            }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'room' ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark }}>
              ルーム
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('dm')}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 100,
              backgroundColor: activeTab === 'dm' ? WeatherBoardColors.buttonBackground : 'transparent',
            }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'dm' ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark }}>
              DM
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'dm' ? (
        <FlatList
          data={conversations}
          keyExtractor={(conversation) => conversation.id}
          contentContainerStyle={{ flexGrow: 1, padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack, textAlign: 'center', paddingTop: 24 }}>
              まだDMはありません{'\n'}相手のプロフィールメニューから「DMを送る」で開始できます
            </Text>
          }
          renderItem={({ item: conversation }) => {
            const other = conversation.user_a_id === userId ? conversation.user_b : conversation.user_a;
            const otherUserId = conversation.user_a_id === userId ? conversation.user_b_id : conversation.user_a_id;
            return (
              <Pressable
                onPress={() => {
                  if (avatarPressedRef.current) {
                    avatarPressedRef.current = false;
                    return;
                  }
                  router.push(`/dm-chat/${conversation.id}`);
                }}
                style={{
                  ...CardStyle,
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                <Pressable
                  onPressIn={() => { avatarPressedRef.current = true; }}
                  onPress={() => navigateToProfile(otherUserId)}
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>{other.avatar_emoji}</Text>
                </Pressable>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }} numberOfLines={1}>
                  {other.nickname}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={({ rooms: room }) => room.id}
          contentContainerStyle={{ flexGrow: 1, padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack, textAlign: 'center', paddingTop: 24 }}>
              まだルームに参加していません
            </Text>
          }
          renderItem={({ item: { rooms: room } }) => (
            <Pressable
              onPress={() => router.push(`/room-chat/${room.id}`)}
              style={{
                ...CardStyle,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{room.icon_emoji ?? '⛅'}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }} numberOfLines={1}>
                {room.name}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
