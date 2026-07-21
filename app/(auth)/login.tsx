import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { CardStyle, Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const redirectTo = makeRedirectUri();

type SubmittingName = 'google' | 'apple' | 'password' | 'guest' | 'reset' | null;

export default function AuthLogin() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<SubmittingName>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    if (isSubmitting) return;
    if (email.length === 0) {
      setErrorMessage('メールアドレスを入力してからタップしてください。');
      return;
    }
    setIsSubmitting('reset');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        console.error('[login] handleForgotPassword', error.message);
        if (error.code === 'over_email_send_rate_limit') {
          setErrorMessage('送信回数の上限に達しました。しばらく時間をおいてからもう一度お試しください。');
        } else {
          setErrorMessage('リセットメールの送信に失敗しました。');
        }
        return;
      }
      setResetMessage('パスワードリセットのメールを送信しました。メールをご確認ください。');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setErrorMessage(null);
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting('google');
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
      setIsSubmitting(null);
    }
  };

  const handleAppleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) return;
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) {
        console.error('[login] handleAppleLogin', error.message);
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[login] handleAppleLogin', e);
      }
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleLogin = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting('password');
    try {
      if (email.length === 0) {
        setErrorMessage('メールアドレスを入力してください。');
        return;
      }
      if (password.length === 0) {
        setErrorMessage('パスワードを入力してください。');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[login] handleLogin', error.message);
        if (error.message === 'Network request failed') {
          setErrorMessage('通信エラーが発生しました。ネットワークを確認してください。');
        } else {
          setErrorMessage('メールアドレスまたはパスワードが正しくありません。');
        }
        return;
      }
      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleGuestLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting('guest');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !authData.user) {
        console.error('[login] handleGuestLogin', authError?.message);
        setErrorMessage('ゲストログインに失敗しました。');
        return;
      }
      // プロフィール作成・デモルーム参加はEULA同意後（eula.tsx）で行う。
      router.replace('/(auth)/eula');
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <AuthHeader title="Log In" subtitle="おかえりなさい、続きを始めましょう" showImage />
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled">

            {/* カード（島） */}
            <View style={{
              ...CardStyle,
              marginHorizontal: 24,
              marginTop: 20,
              borderRadius: 24,
              paddingHorizontal: 28,
              paddingVertical: 32,
            }}>

              {/* メールアドレス */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="mail-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>メールアドレス</Text>
                </View>
                <TextInput
                  value={email}
                  onChangeText={(text) => { setEmail(text); setErrorMessage(null); }}
                  placeholder="example@email.com"
                  placeholderTextColor={WeatherBoardColors.textMutedBlack}
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  keyboardType="ascii-capable"
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.12)',
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    color: WeatherBoardColors.textPrimaryDark,
                  }}
                />
              </View>

              {/* パスワード */}
              <View style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="lock-closed-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>パスワード</Text>
                </View>
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.12)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                }}>
                  <TextInput
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="パスワード"
                    placeholderTextColor={WeatherBoardColors.textMutedBlack}
                    textContentType="password"
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      fontSize: 14,
                      color: WeatherBoardColors.textPrimaryDark,
                    }}
                  />
                  <Pressable onPress={() => setIsPasswordVisible((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={WeatherBoardColors.textMutedBlack}
                    />
                  </Pressable>
                </View>
              </View>
              <View style={{ marginBottom: 12, gap: 4 }}>
                <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>※6文字以上で設定してください</Text>
                <Pressable onPress={handleForgotPassword} disabled={isSubmitting !== null} hitSlop={8}>
                  <Text style={{ fontSize: 12, color: WeatherBoardColors.buttonBackground, textDecorationLine: 'underline', opacity: isSubmitting !== null ? 0.5 : 1 }}>
                    パスワードをお忘れですか？
                  </Text>
                </Pressable>
              </View>

              {resetMessage && (
                <Text style={{ fontSize: 13, color: '#27AE60', marginBottom: 12 }}>{resetMessage}</Text>
              )}

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>
                  {errorMessage}
                </Text>
              )}

              {/* ログインボタン */}
              <Pressable onPress={handleLogin} disabled={isSubmitting !== null} style={{ marginBottom: 20, opacity: isSubmitting !== null ? 0.7 : 1 }}>
                <View style={{ backgroundColor: WeatherBoardColors.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="log-in-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>ログイン</Text>
                </View>
              </Pressable>

              {/* または */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: WeatherBoardColors.divider }} />
                <Text style={{ marginHorizontal: 12, fontSize: 12, color: WeatherBoardColors.textMutedBlack }}>または</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: WeatherBoardColors.divider }} />
              </View>

              <View style={{ gap: 10 }}>
                {/* Google */}
                <Pressable
                  onPress={handleGoogleLogin}
                  disabled={isSubmitting !== null}
                  style={{ opacity: isSubmitting !== null ? 0.7 : 1 }}>
                  <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: WeatherBoardColors.textPrimaryDark, fontSize: 15, fontWeight: '600', marginRight: 36 }}>Google でログイン</Text>
                  </View>
                </Pressable>

                {/* Apple (iOS のみ) */}
                {Platform.OS === 'ios' && (
                  <Pressable onPress={handleAppleLogin} disabled={isSubmitting !== null} style={{ opacity: isSubmitting !== null ? 0.7 : 1 }}>
                    <View style={{ backgroundColor: '#000', borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="logo-apple" size={20} color="white" style={{ marginLeft: 16 }} />
                      <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '600', marginRight: 36 }}>Apple でログイン</Text>
                    </View>
                  </Pressable>
                )}

                {/* アカウントを新しく作る */}
                <Pressable onPress={() => router.push('/(auth)/signup')}>
                  <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: WeatherBoardColors.textMutedBlack, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="person-add-outline" size={20} color={WeatherBoardColors.textMutedBlack} style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: WeatherBoardColors.textMutedBlack, fontSize: 15, fontWeight: '600', marginRight: 36 }}>アカウントを新しく作る</Text>
                  </View>
                </Pressable>

                {/* ゲストとして試す（本番では非表示・開発用に残す） */}
                <Pressable onPress={handleGuestLogin} disabled={isSubmitting !== null} style={{ opacity: isSubmitting !== null ? 0.7 : 1, display: 'none' }}>
                  <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: WeatherBoardColors.textMutedBlack, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="eye-outline" size={20} color={WeatherBoardColors.textMutedBlack} style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: WeatherBoardColors.textMutedBlack, fontSize: 15, fontWeight: '600', marginRight: 36 }}>ゲストとして試す</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
