import { useRef, useState } from 'react';
import { ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { BrownTheme, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/login.png');
const redirectTo = makeRedirectUri();

type SubmittingName = 'google' | 'apple' | 'password' | 'guest' | null;

export default function AuthLogin() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLastCharVisible, setIsLastCharVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<SubmittingName>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    if (email.length === 0) {
      setErrorMessage('メールアドレスを入力してからタップしてください。');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.error('[login] handleForgotPassword', error.message);
      setErrorMessage('リセットメールの送信に失敗しました。');
      return;
    }
    setResetMessage('パスワードリセットのメールを送信しました。メールをご確認ください。');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setErrorMessage(null);
    if (text.length > 0) {
      setIsLastCharVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setIsLastCharVisible(false), 800);
    } else {
      setIsLastCharVisible(false);
    }
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
      const userId = authData.user.id;
      const guestEmojis = ['🌤', '☁️', '🌧', '⛅', '🌈', '❄️', '🌊', '🍃'];
      const randomEmoji = guestEmojis[Math.floor(Math.random() * guestEmojis.length)];

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ user_id: userId, nickname: 'ゲスト', avatar_emoji: randomEmoji });
      if (profileError) {
        console.error('[login] handleGuestLogin profile', profileError.message);
        setErrorMessage('ゲストプロフィールの作成に失敗しました。');
        return;
      }

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('invite_code', 'demo11')
        .single();
      if (roomError || !roomData) {
        console.error('[login] handleGuestLogin room', roomError?.message);
        setErrorMessage('デモルームへの参加に失敗しました。');
        return;
      }

      const { error: memberError } = await supabase
        .from('room_members')
        .insert({ room_id: roomData.id, user_id: userId });
      if (memberError) {
        console.error('[login] handleGuestLogin member', memberError?.message);
        setErrorMessage('デモルームへの参加に失敗しました。');
        return;
      }

      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled">

            <AuthHeader title="Log In" />

            {/* カード */}
            <View style={{
              marginHorizontal: 24,
              backgroundColor: BrownTheme.cardBackground,
              borderRadius: 24,
              paddingHorizontal: 28,
              paddingVertical: 32,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 10,
            }}>

              {/* メールアドレス */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="mail-outline" size={15} color={BrownTheme.primaryText} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>メールアドレス</Text>
                </View>
                <TextInput
                  value={email}
                  onChangeText={(text) => { setEmail(text); setErrorMessage(null); }}
                  placeholder="example@email.com"
                  placeholderTextColor={BrownTheme.mutedText}
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    color: BrownTheme.primaryText,
                  }}
                />
              </View>

              {/* パスワード */}
              <View style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="lock-closed-outline" size={15} color={BrownTheme.primaryText} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>パスワード</Text>
                </View>
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                }}>
                  <TextInput
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="パスワード"
                    placeholderTextColor={BrownTheme.mutedText}
                    textContentType="password"
                    secureTextEntry={!isPasswordVisible && !isLastCharVisible}
                    autoCapitalize="none"
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      fontSize: 14,
                      color: BrownTheme.primaryText,
                    }}
                  />
                  <Pressable onPress={() => setIsPasswordVisible((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={BrownTheme.mutedText}
                    />
                  </Pressable>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: BrownTheme.mutedText }}>※6文字以上で設定してください</Text>
                <Pressable onPress={handleForgotPassword} hitSlop={8}>
                  <Text style={{ fontSize: 12, color: BrownTheme.buttonBackground, textDecorationLine: 'underline' }}>
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
                <View style={{ backgroundColor: BrownTheme.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="log-in-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>ログイン</Text>
                </View>
              </Pressable>

              {/* または */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: BrownTheme.contentBorder }} />
                <Text style={{ marginHorizontal: 12, fontSize: 12, color: BrownTheme.mutedText }}>または</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: BrownTheme.contentBorder }} />
              </View>

              <View style={{ gap: 10 }}>
                {/* Google */}
                <Pressable
                  onPress={handleGoogleLogin}
                  disabled={isSubmitting !== null}
                  style={{ opacity: isSubmitting !== null ? 0.7 : 1 }}>
                  <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: BrownTheme.contentBorder, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: BrownTheme.primaryText, fontSize: 15, fontWeight: '600', marginRight: 36 }}>Google でログイン</Text>
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
                  <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: BrownTheme.buttonBackground, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="person-add-outline" size={20} color={BrownTheme.buttonBackground} style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: BrownTheme.buttonBackground, fontSize: 15, fontWeight: '600', marginRight: 36 }}>アカウントを新しく作る</Text>
                  </View>
                </Pressable>

                {/* ゲストとして試す */}
                <Pressable onPress={handleGuestLogin} disabled={isSubmitting !== null} style={{ opacity: isSubmitting !== null ? 0.7 : 1 }}>
                  <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: BrownTheme.mutedText, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="eye-outline" size={20} color={BrownTheme.mutedText} style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: BrownTheme.mutedText, fontSize: 15, fontWeight: '600', marginRight: 36 }}>ゲストとして試す</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
