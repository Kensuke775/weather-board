import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

export default function AuthLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) Alert.alert(error.message);
    else router.replace('/(tabs)');
  };
  return (
    <View className="w-full h-full flex justify-center">
      <View>
        <Text className="mb-2">メールアドレス</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="example@email.com" autoCapitalize="none" keyboardType="email-address" className="mb-12" />
        <Text className="mb-2">パスワード</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" className="mb-12" />
        <Pressable className="mb-12" onPress={handleLogin}>
          <Text>ログイン</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/signup')}>
          <Text>アカウントをお持ちでない方はこちら</Text>
        </Pressable>
      </View>
    </View>
  );
}
