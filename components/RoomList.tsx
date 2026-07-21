import { useRef, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';

import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { TOAST_DURATION } from '@/constants/ui';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export function RoomList() {
  const { user } = useUser();
  const userId = user?.id;
  const { rooms, currentRoomId, setCurrentRoomId, refreshRooms } = useRoom();
  const [isLeavingRoomId, setIsLeavingRoomId] = useState<string | null>(null);
  const [renameRoomId, setRenameRoomId] = useState<string | null>(null);
  const [renameRoomName, setRenameRoomName] = useState('');
  const renameInputRef = useRef<TextInput>(null);

  const handleCopyInviteCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Toast.show({ type: 'success', text1: 'コピーしました。', visibilityTime: TOAST_DURATION.short });
  };

  const handleLeaveRoom = (roomId: string) => {
    Alert.alert('確認', '退出するとこのルームのカレンダー履歴が見られなくなります。本当に退出しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '退出する',
        style: 'destructive',
        onPress: async () => {
          if (isLeavingRoomId) return;
          setIsLeavingRoomId(roomId);
          try {
            const { error } = await supabase.from('room_members').delete().eq('user_id', userId).eq('room_id', roomId);
            if (error) {
              console.error('[RoomList] handleLeaveRoom', error.message);
              Alert.alert('退出に失敗しました。');
              return;
            }
            await refreshRooms();
            if (currentRoomId === roomId) {
              const remaining = rooms.filter((item) => item.rooms.id !== roomId);
              setCurrentRoomId(remaining[0]?.rooms.id ?? null);
            }
            Toast.show({ type: 'success', text1: 'ルームを退出しました', visibilityTime: TOAST_DURATION.default });
          } finally {
            setIsLeavingRoomId(null);
          }
        },
      },
    ]);
  };

  const handleRenameRoom = async () => {
    if (!renameRoomId) return;
    if (renameRoomName.trim().length === 0) {
      Alert.alert('ルーム名を入力してください。');
      return;
    }
    const { error } = await supabase.from('rooms').update({ name: renameRoomName.trim() }).eq('id', renameRoomId);
    if (error) {
      console.error('[RoomList] handleRenameRoom', error.message);
      Alert.alert('ルーム名の変更に失敗しました。');
      return;
    }
    await refreshRooms();
    setRenameRoomId(null);
    Toast.show({ type: 'success', text1: 'ルーム名を変更しました。', visibilityTime: TOAST_DURATION.default });
  };

  return (
    <View style={{ gap: 12 }}>
      {rooms.length === 0 && (
        <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack, textAlign: 'center', paddingVertical: 16 }}>
          まだルームに参加していません
        </Text>
      )}

      {rooms.map(({ rooms: room }) => (
        <View
          key={room.id}
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

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }} numberOfLines={1}>
              {room.name}
            </Text>
            <Pressable onPress={() => room.invite_code && handleCopyInviteCode(room.invite_code)}>
              <Text style={{ fontSize: 12, color: WeatherBoardColors.textMutedBlack, marginTop: 2 }}>
                招待コード: {room.invite_code}（タップでコピー）
              </Text>
            </Pressable>
          </View>

          {room.created_by === userId && (
            <Pressable
              onPress={() => {
                setRenameRoomId(room.id);
                setRenameRoomName(room.name);
              }}
              hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={WeatherBoardColors.textMutedBlack} />
            </Pressable>
          )}
          <Pressable onPress={() => handleLeaveRoom(room.id)} disabled={isLeavingRoomId === room.id} hitSlop={8}>
            <Ionicons name="exit-outline" size={18} color="#C0392B" />
          </Pressable>
        </View>
      ))}

      {/* 名前変更モーダル */}
      <Modal visible={renameRoomId !== null} animationType="fade" transparent onShow={() => renameInputRef.current?.focus()}>
        <Pressable onPress={() => setRenameRoomId(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View onStartShouldSetResponder={() => true} style={{ ...CardStyle, borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark, marginBottom: 12 }}>
              ルーム名を変更
            </Text>
            <TextInput
              ref={renameInputRef}
              value={renameRoomName}
              onChangeText={setRenameRoomName}
              placeholder="新しいルーム名"
              placeholderTextColor={WeatherBoardColors.textMutedBlack}
              autoCapitalize="none"
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.12)',
                paddingVertical: 12,
                paddingHorizontal: 14,
                fontSize: 14,
                color: WeatherBoardColors.textPrimaryDark,
                marginBottom: 16,
              }}
            />
            <Pressable onPress={handleRenameRoom} style={{ backgroundColor: WeatherBoardColors.buttonBackground, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>変更する</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
