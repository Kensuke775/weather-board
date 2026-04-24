import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function RoomJoin() {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();
  const handleJoinRoom = async () => {
    if (isJoining) return;
    try {
      setIsJoining(true);
      if (inviteCode === '') return Alert.alert('招待コードを入力してください。');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');

      const { data: roomData, error: roomError } = await supabase.from('rooms').select('id').eq('invite_code', inviteCode).single();
      if (roomError) return Alert.alert(roomError.message);
      if (!roomData) return;

      const { error: memberError } = await supabase.from('room_members').insert({ room_id: roomData.id, user_id: user.id });
      if (memberError) return Alert.alert(memberError.message);
      else router.replace('/(tabs)');
    } finally {
      setIsJoining(false);
    }
  };
  return (
    <View className="flex justify-center w-full h-full">
      <View>
        <Text className="mb-2">招待コードを入力出来ます。</Text>
        <TextInput className="mb-12" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="none" />
        <Pressable onPress={handleJoinRoom} className="mb-12">
          <Text>参加する</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(tabs)')} className="mb-12">
          <Text>ホーム画面へ戻る</Text>
        </Pressable>
      </View>
    </View>
  );
}
