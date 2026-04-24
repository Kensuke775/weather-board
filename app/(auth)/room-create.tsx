import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { generateInviteCode } from '@/lib/generateInviteCode';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function RoomCreate() {
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const handleCreateRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      if (roomName === '') return Alert.alert('ルーム名が空になってます。');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
      const roomId = Crypto.randomUUID();
      const { error: roomError } = await supabase.from('rooms').insert({ id: roomId, name: roomName, invite_code: generateInviteCode(), created_by: user.id });

      if (roomError) return Alert.alert(roomError.message);
      const { error: memberError } = await supabase.from('room_members').insert({ room_id: roomId, user_id: user.id });

      if (memberError) return Alert.alert(memberError.message);
      else router.replace('/(tabs)');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View className="flex justify-center w-full h-full">
      <View>
        <Text className="mb-2">ルーム名を決めてください</Text>
        <TextInput value={roomName} onChangeText={setRoomName} className="mb-12" />

        <Pressable onPress={handleCreateRoom} className="mb-12">
          <Text>ルームを作成する</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/(tabs)')} className="mb-12">
          <Text>ホーム画面へ戻る</Text>
        </Pressable>
      </View>
    </View>
  );
}
