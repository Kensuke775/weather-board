import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ImageBackground, Pressable, Text, TextInput, View } from 'react-native';

const backgroundImage = require('@/assets/images/weather/login.png');

export default function AuthLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (email.length === 0) {
      Alert.alert('メールアドレスが空です。');
      setIsSubmitting(false);
      return;
    }

    if (password.length === 0) {
      Alert.alert('パスワードが空です。');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsSubmitting(false);
      console.error('[login] handleLogin', error.message);
      if (error.message === 'Network request failed') {
        Alert.alert('通信エラーが発生しました。ネットワークを確認してください。');
      } else {
        Alert.alert('メールアドレスまたはパスワードが正しくありません。');
      }
      return;
    }
    setIsSubmitting(false);
    router.replace('/(tabs)');
  };

  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center gap-10 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />

      <Text className="text-4xl text-center" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
        Log In
      </Text>
      <View>
        <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          メールアドレス
        </Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="example@email.com" autoCapitalize="none" keyboardType="email-address" className="bg-white py-4 px-2 rounded-xl" />
      </View>

      <View className="w-full">
        <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          パスワード
        </Text>
        <TextInput value={password} onChangeText={setPassword} placeholder="パスワード" secureTextEntry autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl mb-2" />
        <Text className="text-sm" style={{ color: WeatherBoardColors.textPrimary }}>
          ※6文字以上で設定してください
        </Text>
      </View>

      <Pressable onPress={handleLogin} className="py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          ログイン
        </Text>
      </Pressable>
      <Pressable className="py-6 px-2 rounded-xl flex justify-center items-center border" onPress={() => router.push('/(auth)/signup')} style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          アカウントをお持ちでない方はこちら
        </Text>
      </Pressable>
    </ImageBackground>
  );
}
