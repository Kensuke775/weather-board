import { useState } from 'react';
import { Alert, ImageBackground, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { makeRedirectUri } from 'expo-auth-session';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import GlassButton from '@/components/GlassButton';
import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/login.png');
const redirectTo = makeRedirectUri();

export default function AuthLogin() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        console.error('[login] handleGoogleLogin', error.message);
        return;
      }
      if (!data.url) return;
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.replace('#', ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) return;
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        router.replace('/(tabs)');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[login] handleLogin', error.message);
        if (error.message === 'Network request failed') {
          Alert.alert('通信エラーが発生しました。ネットワークを確認してください。');
        } else {
          Alert.alert('メールアドレスまたはパスワードが正しくありません。');
        }
        return;
      }
      router.replace('/(tabs)');
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
          Log In
        </Text>
        <View className="mb-4">
          <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            メールアドレス
          </Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="example@email.com" placeholderTextColor={WeatherBoardColors.placeholderDark} textContentType="emailAddress" autoCapitalize="none" keyboardType="email-address" className="bg-white py-4 px-2 rounded-xl" />
        </View>

        <View className="w-full mb-8">
          <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            パスワード
          </Text>
          <TextInput value={password} onChangeText={setPassword} placeholder="パスワード" placeholderTextColor={WeatherBoardColors.placeholderDark} textContentType="password" secureTextEntry autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl mb-2" />
          <Text className="text-sm" style={{ color: WeatherBoardColors.textPrimary }}>
            ※6文字以上で設定してください
          </Text>
        </View>

        <View className="flex gap-8">
          <GlassButton onPress={handleLogin} buttonText="ログイン" backgroundColor={WeatherBoardColors.accentBackground} buttonIcon="log-in-outline" />
          <GlassButton onPress={handleGoogleLogin} buttonText="Googleでログイン" buttonIcon="logo-google" backgroundColor="#4285F4" />
          <GlassButton onPress={() => router.push('/(auth)/signup')} buttonText="アカウントを新しく作る" backgroundColor={WeatherBoardColors.secondaryBackground} buttonIcon="person-add-outline" />
        </View>
      </ImageBackground>
    </Pressable>
  );
}
