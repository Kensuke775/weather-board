import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

export default function ProfileSetUp() {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const router = useRouter();

  const handleSaveProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーが取得できませんでした。');
    if (nickname === '') return Alert.alert('ニックネームの入力欄が空になっています。');
    if (avatar === '') return Alert.alert('アバターを選んでください。');
    const { error } = await supabase.from('profiles').insert({ user_id: user.id, nickname, avatar_emoji: avatar });
    if (error) Alert.alert(error.message);
    else router.replace('/(tabs)');
  };
  return (
    <View className="w-full h-full flex justify-center">
      <View>
        <Text>ニックネームを考えてください。</Text>
        <TextInput value={nickname} onChangeText={setNickname} className="mb-12"></TextInput>
        <Text>アバター絵文字を選べます。</Text>
        <View className="flex-row mb-12">
          <Pressable onPress={() => setAvatar('🐻')} style={{ opacity: avatar === '🐻' ? 1 : 0.3 }}>
            <Text>🐻</Text>
          </Pressable>
          <Pressable onPress={() => setAvatar('🦊')} style={{ opacity: avatar === '🦊' ? 1 : 0.3 }}>
            <Text>🦊</Text>
          </Pressable>
          <Pressable onPress={() => setAvatar('🐼')} style={{ opacity: avatar === '🐼' ? 1 : 0.3 }}>
            <Text>🐼</Text>
          </Pressable>
          <Pressable onPress={() => setAvatar('🐸')} style={{ opacity: avatar === '🐸' ? 1 : 0.3 }}>
            <Text>🐸</Text>
          </Pressable>
          <Pressable onPress={() => setAvatar('🐧')} style={{ opacity: avatar === '🐧' ? 1 : 0.3 }}>
            <Text>🐧</Text>
          </Pressable>
        </View>
        <Pressable onPress={handleSaveProfile} className="mb-12">
          <Text>保存する</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => router.replace('/(auth)/login')}>
        <Text>ログイン画面に戻る</Text>
      </Pressable>
    </View>
  );
}
