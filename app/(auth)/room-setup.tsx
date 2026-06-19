import { useRef, useState } from 'react';
import { Alert, ImageBackground, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { useRouter } from 'expo-router';
import GlassButton from '@/components/GlassButton';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import useRoomCreate from '@/hooks/useRoomCreate';
import useRoomJoin from '@/hooks/useRoomJoin';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/settings.png');

export default function RoomSetup() {
  const router = useRouter();
  const { refreshRooms } = useRoom();
  const [isJoinVisible, setIsJoinVisible] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const roomNameInputRef = useRef<TextInput>(null);
  const inviteCodeInputRef = useRef<TextInput>(null);

  const { handleCreateRoom, setRoomName, roomName } = useRoomCreate(async () => {
    await refreshRooms();
    setRoomName('');
    router.replace('/(tabs)');
  });

  const { inviteCode, setInviteCode, handleJoinRoom } = useRoomJoin(async () => {
    await refreshRooms();
    setInviteCode('');
    router.replace('/(tabs)');
  });

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[room-setup] handleLogout', error.message);
        Alert.alert('ログアウトに失敗しました。');
        return;
      }
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center px-6">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />

      <View className="w-full gap-6">
        <GlassButton onPress={() => setIsCreateVisible(true)} buttonText="ルームを作成する" buttonIcon="add-circle-outline" backgroundColor={WeatherBoardColors.accentBackground} />
        <GlassButton onPress={() => setIsJoinVisible(true)} buttonText="ルームに参加する" buttonIcon="enter-outline" backgroundColor={WeatherBoardColors.tertiaryBackground} />
        <GlassButton onPress={handleLogout} buttonText="ログアウト" buttonIcon="log-out-outline" backgroundColor={WeatherBoardColors.secondaryBackground} />
      </View>

      <Modal visible={isCreateVisible} animationType="slide" transparent={true} onShow={() => roomNameInputRef.current?.focus()}>
        <Pressable onPress={() => setIsCreateVisible(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                ルーム名を決めてください
              </Text>
              <TextInput ref={roomNameInputRef} value={roomName} onChangeText={setRoomName} placeholder="テキストを入力できます。" placeholderTextColor={WeatherBoardColors.placeholderDark} autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>
            <View className="w-full">
              <GlassButton onPress={handleCreateRoom} buttonText="ルームを作成する" buttonIcon="checkmark-outline" backgroundColor={WeatherBoardColors.accentBackground} />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isJoinVisible} animationType="slide" transparent={true} onShow={() => inviteCodeInputRef.current?.focus()}>
        <Pressable onPress={() => setIsJoinVisible(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%' }} onStartShouldSetResponder={() => true}>
            <View className="w-full mb-12">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                招待コードを入力出来ます。
              </Text>
              <TextInput ref={inviteCodeInputRef} value={inviteCode} onChangeText={setInviteCode} placeholder="テキストを入力できます。" placeholderTextColor={WeatherBoardColors.placeholderDark} autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>
            <View className="w-full pb-12">
              <GlassButton onPress={handleJoinRoom} buttonText="参加する" buttonIcon="checkmark-outline" backgroundColor={WeatherBoardColors.tertiaryBackground} />
            </View>
          </View>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
}
