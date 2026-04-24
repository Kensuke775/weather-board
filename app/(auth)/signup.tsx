import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function AuthSignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert(error.message);
    } else {
      router.replace('/(auth)/profile-setup');
    }
  };
  return (
    <View className="w-full h-full flex justify-center">
      <View>
        <Text className="mb-2">メールアドレス</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="example@email.com" autoCapitalize="none" keyboardType="email-address" className="mb-12" />
        <Text className="mb-2">パスワード</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry className="mb-12" />
        <Pressable onPress={handleSignUp} className="mb-12">
          <Text>新規登録</Text>
        </Pressable>
      </View>
      <Pressable className="mb-12" onPress={() => router.replace('/(auth)/login')}>
        <Text>戻る</Text>
      </Pressable>
    </View>
  );
}
