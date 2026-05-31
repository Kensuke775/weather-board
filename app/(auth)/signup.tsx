import { useState } from 'react';
import { Alert, ImageBackground, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useFonts } from 'expo-font';

import { supabase } from '@/lib/supabase';
import { Fonts, WeatherBoardColors } from '@/constants/theme';

const backgroundImage = require('@/assets/images/weather/signup.png');

export default function AuthSignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async () => {
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

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setIsSubmitting(false);
      console.error('[signup] handleSignUp', error.message);
      if (error.message === 'Network request failed') {
        Alert.alert('通信エラーが発生しました。ネットワークを確認してください。');
      } else {
        Alert.alert('メールアドレスまたはパスワードが正しくありません。');
      }
      return;
    }
    setIsSubmitting(false);
    router.replace('/(auth)/profile-setup');
  };

  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center gap-10 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
      <Text className="text-4xl text-center" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
        Sign Up
      </Text>
      <View className="w-full">
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

      <Pressable onPress={handleSignUp} className="py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          新規登録
        </Text>
      </Pressable>
      <Pressable
        className="py-6 px-2 rounded-xl flex justify-center items-center border"
        onPress={() => router.replace('/(auth)/login')}
        style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          戻る
        </Text>
      </Pressable>
    </ImageBackground>
  );
}
