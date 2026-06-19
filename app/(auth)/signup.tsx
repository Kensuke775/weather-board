import { useState } from 'react';
import { Alert, ImageBackground, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';

import GlassButton from '@/components/GlassButton';
import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/signup.png');

export default function AuthSignUp() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (email.length === 0) {
        Alert.alert('メールアドレスが空です。');
        return;
      }
      if (password.length === 0) {
        Alert.alert('パスワードが空です。');
        return;
      }
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error('[signup] handleSignUp', error.message);
        if (error.message === 'Network request failed') {
          Alert.alert('通信エラーが発生しました。ネットワークを確認してください。');
        } else {
          Alert.alert('メールアドレスまたはパスワードが正しくありません。');
        }
        return;
      }
      router.replace('/(auth)/profile-setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
      <ImageBackground source={backgroundImage} className="flex-1 justify-center px-6">
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
        <Text className="text-4xl text-center mb-10" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
          Sign Up
        </Text>
        <View className="w-full mb-4">
          <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            メールアドレス
          </Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="example@email.com" placeholderTextColor={WeatherBoardColors.placeholderDark} textContentType="emailAddress" autoCapitalize="none" keyboardType="email-address" className="bg-white py-4 px-2 rounded-xl" />
        </View>

        <View className="w-full mb-8">
          <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            パスワード
          </Text>
          <TextInput value={password} onChangeText={setPassword} placeholder="パスワード" placeholderTextColor={WeatherBoardColors.placeholderDark} textContentType="newPassword" secureTextEntry autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl mb-2" />
          <Text className="text-sm" style={{ color: WeatherBoardColors.textPrimary }}>
            ※6文字以上で設定してください
          </Text>
        </View>

        <View className="flex gap-8">
          <GlassButton onPress={handleSignUp} buttonText="新規登録" buttonIcon="person-add-outline" backgroundColor={WeatherBoardColors.accentBackground} />
          <GlassButton onPress={() => router.replace('/(auth)/login')} buttonText="戻る" buttonIcon="arrow-back-outline" backgroundColor={WeatherBoardColors.secondaryBackground} />
        </View>
      </ImageBackground>
    </Pressable>
  );
}
