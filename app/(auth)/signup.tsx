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

type SubmittingName = 'password' | 'google' | 'apple' | null;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(password: string): { level: number; label: string } {
  if (password.length === 0) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['', '弱い', '普通', 'まあまあ', '強い'];
  return { level: score, label: labels[score] ?? '強い' };
}

const strengthColors = ['transparent', '#E74C3C', '#E67E22', '#F1C40F', '#27AE60'];

export default function AuthSignUp() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isLastCharVisible, setIsLastCharVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<SubmittingName>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const emailValid = isValidEmail(email);
  const strength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const req6chars = password.length >= 6;
  const reqHasLetterAndNumber = /[A-Za-z]/.test(password) && /[0-9]/.test(password);

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

  const handleGoogleSignUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting('google');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) return;
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.replace('#', ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) return;
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        router.replace('/(tabs)');
      }
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleAppleSignUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) return;
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      if (error) {
        console.error('[signup] handleAppleSignUp', error.message);
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[signup] handleAppleSignUp', e);
      }
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleSignUp = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting('password');
    try {
      if (!emailValid) {
        setErrorMessage('正しいメールアドレスを入力してください。');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('パスワードは6文字以上で設定してください。');
        return;
      }
      if (!passwordsMatch) {
        setErrorMessage('パスワードが一致していません。');
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error('[signup] handleSignUp', error.message);
        if (error.message === 'Network request failed') {
          setErrorMessage('通信エラーが発生しました。ネットワークを確認してください。');
        } else {
          setErrorMessage('登録に失敗しました。メールアドレスをご確認ください。');
        }
        return;
      }
      if (data.session) {
        router.replace('/(auth)/eula');
      } else {
        setSignUpSuccess(true);
      }
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>

            <AuthHeader title="Sign Up" subtitle="アカウントを作成して、はじめましょう" />

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
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                }}>
                  <TextInput
                    value={email}
                    onChangeText={(text) => { setEmail(text); setErrorMessage(null); }}
                    placeholder="example@gmail.com"
                    placeholderTextColor={BrownTheme.mutedText}
                    textContentType="emailAddress"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: BrownTheme.primaryText }}
                  />
                  {emailValid && <Ionicons name="checkmark" size={18} color="#27AE60" />}
                </View>
                {email.length > 0 && !emailValid && (
                  <Text style={{ fontSize: 12, color: '#C0392B', marginTop: 6 }}>不正なメールアドレスです</Text>
                )}
              </View>

              {/* パスワード */}
              <View style={{ marginBottom: 16 }}>
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
                  marginBottom: 8,
                }}>
                  <TextInput
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="パスワード"
                    placeholderTextColor={BrownTheme.mutedText}
                    textContentType="newPassword"
                    secureTextEntry={!isPasswordVisible && !isLastCharVisible}
                    autoCapitalize="none"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: BrownTheme.primaryText }}
                  />
                  <Pressable onPress={() => setIsPasswordVisible((v) => !v)} hitSlop={8}>
                    <Ionicons name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color={BrownTheme.mutedText} />
                  </Pressable>
                </View>
                {password.length > 0 && (
                  <View>
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: i <= strength.level ? strengthColors[strength.level] : BrownTheme.contentBorder,
                        }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: strengthColors[strength.level] }}>
                      パスワードの強度：{strength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* パスワード確認 */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="lock-closed-outline" size={15} color={BrownTheme.primaryText} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>パスワード確認</Text>
                </View>
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  marginBottom: 4,
                }}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(text) => { setConfirmPassword(text); setErrorMessage(null); }}
                    placeholder="パスワードを再入力"
                    placeholderTextColor={BrownTheme.mutedText}
                    textContentType="newPassword"
                    secureTextEntry={!isConfirmPasswordVisible}
                    autoCapitalize="none"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: BrownTheme.primaryText }}
                  />
                  <Pressable onPress={() => setIsConfirmPasswordVisible((v) => !v)} hitSlop={8} style={{ marginRight: 8 }}>
                    <Ionicons name={isConfirmPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color={BrownTheme.mutedText} />
                  </Pressable>
                  {passwordsMatch && <Ionicons name="checkmark" size={18} color="#27AE60" />}
                </View>
                {passwordsMatch && (
                  <Text style={{ fontSize: 11, color: '#27AE60' }}>パスワードが一致しています</Text>
                )}
              </View>

              {/* パスワード要件チェックリスト */}
              {password.length > 0 && (
                <View style={{
                  backgroundColor: BrownTheme.contentBorder,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 20,
                  gap: 8,
                }}>
                  {[
                    { label: '6文字以上で入力してください', met: req6chars },
                    { label: '英字・数字をそれぞれ1つ以上含めてください', met: reqHasLetterAndNumber },
                    { label: '他のサービスで使用していないパスワードを推奨します', met: req6chars },
                  ].map(({ label, met }) => (
                    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={met ? '#27AE60' : BrownTheme.mutedText} />
                      <Text style={{ fontSize: 12, color: met ? BrownTheme.primaryText : BrownTheme.mutedText, flex: 1 }}>{label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{errorMessage}</Text>
              )}

              {/* 新規登録ボタン */}
              <Pressable onPress={handleSignUp} disabled={isSubmitting !== null} style={{ marginBottom: 20, opacity: isSubmitting !== null ? 0.7 : 1 }}>
                <View style={{ backgroundColor: BrownTheme.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="person-add-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>新規登録</Text>
                </View>
              </Pressable>

              {/* または */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: BrownTheme.contentBorder }} />
                <Text style={{ marginHorizontal: 12, fontSize: 12, color: BrownTheme.mutedText }}>または</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: BrownTheme.contentBorder }} />
              </View>

              <View style={{ gap: 10, marginBottom: 16 }}>
                {/* Google */}
                <Pressable onPress={handleGoogleSignUp} disabled={isSubmitting !== null} style={{ opacity: isSubmitting !== null ? 0.7 : 1 }}>
                  <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: BrownTheme.contentBorder, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: BrownTheme.primaryText, fontSize: 15, fontWeight: '600', marginRight: 36 }}>Google で登録</Text>
                  </View>
                </Pressable>

                {/* Apple (iOS のみ) */}
                {Platform.OS === 'ios' && (
                  <Pressable onPress={handleAppleSignUp} disabled={isSubmitting !== null} style={{ opacity: isSubmitting !== null ? 0.7 : 1 }}>
                    <View style={{ backgroundColor: '#000', borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="logo-apple" size={20} color="white" style={{ marginLeft: 16 }} />
                      <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '600', marginRight: 36 }}>Apple で登録</Text>
                    </View>
                  </Pressable>
                )}
              </View>

              {/* 確認メール送信済みバナー */}
              {signUpSuccess && (
                <View style={{
                  backgroundColor: '#F0FBF4',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#27AE60',
                  padding: 16,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <Ionicons name="mail-outline" size={22} color="#27AE60" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#27AE60', marginBottom: 2 }}>確認メールを送りました</Text>
                    <Text style={{ fontSize: 12, color: BrownTheme.mutedText }}>メールをご確認のうえ、登録を完了してください。</Text>
                  </View>
                </View>
              )}

              {/* 戻る */}
              <Pressable onPress={() => router.replace('/(auth)/login')}>
                <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: BrownTheme.mutedText, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="arrow-back-outline" size={20} color={BrownTheme.mutedText} style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: BrownTheme.mutedText, fontSize: 15, fontWeight: '600', marginRight: 36 }}>戻る</Text>
                </View>
              </Pressable>

            </View>
          </Pressable>
          </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
