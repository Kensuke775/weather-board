import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

import { RoomList } from '@/components/RoomList';
import { RoomSetupForm } from '@/components/RoomSetupForm';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { TOAST_DURATION } from '@/constants/ui';
import { useRoom } from '@/context/RoomContext';
import useRoomCreate from '@/hooks/useRoomCreate';
import useRoomJoin from '@/hooks/useRoomJoin';

export default function RoomSetupScreen() {
  const { setCurrentRoomId, refreshRooms } = useRoom();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const { handleCreateRoom, setRoomName, roomName, iconEmoji, setIconEmoji, isCreating } = useRoomCreate(async (roomId) => {
    setRoomName('');
    await refreshRooms();
    setCurrentRoomId(roomId);
    Toast.show({ type: 'success', text1: 'ルームを作成しました', visibilityTime: TOAST_DURATION.default });
  });

  const { inviteCode, setInviteCode, isJoining, handleJoinRoom } = useRoomJoin(async (joinedRoomName, roomId) => {
    setInviteCode('');
    await refreshRooms();
    setCurrentRoomId(roomId);
    Toast.show({ type: 'success', text1: `${joinedRoomName}に参加しました。`, visibilityTime: TOAST_DURATION.default });
  });

  const handlePasteInviteCode = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setInviteCode(text.trim());
  };

  const isSubmitting = isCreating || isJoining;

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>

            <View style={{ ...CardStyle, borderRadius: 20, padding: 20, marginBottom: 24 }}>
              <RoomSetupForm
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                selectedIcon={iconEmoji}
                onChangeIcon={setIconEmoji}
                roomName={roomName}
                onChangeRoomName={(text) => setRoomName(text.slice(0, 30))}
                inviteCode={inviteCode}
                onChangeInviteCode={setInviteCode}
                onPasteInviteCode={handlePasteInviteCode}
              />
              <Pressable
                onPress={activeTab === 'create' ? handleCreateRoom : handleJoinRoom}
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.7 : 1, marginTop: 20 }}>
                <View style={{ backgroundColor: WeatherBoardColors.buttonBackground, borderRadius: 12, paddingVertical: 15, alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                    {activeTab === 'create' ? 'ルームを作成する' : '参加する'}
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark, marginBottom: 12 }}>
              参加中のルーム
            </Text>
            <RoomList />

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
