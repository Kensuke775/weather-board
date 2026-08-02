import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { EulaContent } from '@/components/EulaContent';
import { CardStyle, Fonts, WeatherBoardColors } from '@/constants/theme';
import usePendingAction from '@/hooks/usePendingAction';
import { supabase } from '@/lib/supabase';
import { isValidEmail } from '@/lib/validation';

const redirectTo = makeRedirectUri();

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
  const submitAction = usePendingAction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const emailValid = isValidEmail(email);
  const strength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const req6chars = password.length >= 6;
  const reqHasLetterAndNumber = /[A-Za-z]/.test(password) && /[0-9]/.test(password);

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setErrorMessage(null);
  };

  const handleGoogleSignUp = () =>
    submitAction.preventDuplicateRun(async () => {
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
    });

  const handleAppleSignUp = () =>
    submitAction.preventDuplicateRun(async () => {
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
      }
    });

  const handleSignUp = () =>
    submitAction.preventDuplicateRun(async () => {
      setErrorMessage(null);
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
      if (!agreed) {
        setErrorMessage('利用規約への同意が必要です。');
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error('[signup] handleSignUp', error.message);
        if (error.message === 'Network request failed') {
          setErrorMessage('通信エラーが発生しました。ネットワークを確認してください。');
        } else if (error.code === 'user_already_exists') {
          setErrorMessage('すでに登録されているメールアドレスです。');
        } else {
          setErrorMessage('登録に失敗しました。メールアドレスをご確認ください。');
        }
        return;
      }
      if (data.session) {
        router.replace('/(auth)/profile-setup');
      } else {
        setSignUpSuccess(true);
      }
    });

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <AuthHeader title="Sign Up" subtitle="アカウントを作成して、はじめましょう" />
        <ScrollView
            contentContainerStyle={{ paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>

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
                  placeholder="example@gmail.com"
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
                {email.length > 0 && !emailValid && (
                  <Text style={{ fontSize: 12, color: '#C0392B', marginTop: 6 }}>不正なメールアドレスです</Text>
                )}
              </View>

              {/* パスワード */}
              <View style={{ marginBottom: 16 }}>
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
                  marginBottom: 8,
                }}>
                  <TextInput
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="パスワード"
                    placeholderTextColor={WeatherBoardColors.textMutedBlack}
                    textContentType="newPassword"
                    secureTextEntry={!isPasswordVisible}
                    selectTextOnFocus={false}
                    autoCapitalize="none"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: WeatherBoardColors.textPrimaryDark }}
                  />
                  <Pressable onPress={() => setIsPasswordVisible((v) => !v)} hitSlop={8}>
                    <Ionicons name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color={WeatherBoardColors.textMutedBlack} />
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
                          backgroundColor: i <= strength.level ? strengthColors[strength.level] : 'rgba(0,0,0,0.1)',
                        }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: strengthColors[strength.level] }}>
                      パスワードの強度：{strength.label}
                    </Text>
                  </View>
                )}
                <Text style={{ fontSize: 11, color: '#27AE60', marginTop: 4 }}>
                  ※候補の「強力なパスワード」を使うと、次回から自動でログインできて便利です
                </Text>
              </View>

              {/* パスワード確認 */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="lock-closed-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>パスワード確認</Text>
                </View>
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.12)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  marginBottom: 4,
                }}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(text) => { setConfirmPassword(text); setErrorMessage(null); }}
                    placeholder="パスワードを再入力"
                    placeholderTextColor={WeatherBoardColors.textMutedBlack}
                    textContentType="newPassword"
                    secureTextEntry={!isConfirmPasswordVisible}
                    selectTextOnFocus={false}
                    autoCapitalize="none"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: WeatherBoardColors.textPrimaryDark }}
                  />
                  <Pressable onPress={() => setIsConfirmPasswordVisible((v) => !v)} hitSlop={8}>
                    <Ionicons name={isConfirmPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color={WeatherBoardColors.textMutedBlack} />
                  </Pressable>
                  {passwordsMatch && <Ionicons name="checkmark" size={18} color="#27AE60" style={{ marginLeft: 8 }} />}
                </View>
                {passwordsMatch && (
                  <Text style={{ fontSize: 11, color: '#27AE60' }}>パスワードが一致しています</Text>
                )}
                {!isConfirmPasswordVisible && (
                  <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack, marginTop: 2 }}>
                    ※非表示のまま入力し直すと、内容が全て消えて上書きされます
                  </Text>
                )}
              </View>

              {/* パスワード要件チェックリスト */}
              {password.length > 0 && (
                <View style={{
                  backgroundColor: 'rgba(0,0,0,0.05)',
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
                      <Ionicons name="checkmark-circle" size={16} color={met ? '#27AE60' : WeatherBoardColors.textMutedBlack} />
                      <Text style={{ fontSize: 12, color: met ? WeatherBoardColors.textPrimaryDark : WeatherBoardColors.textMutedBlack, flex: 1 }}>{label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 利用規約 */}
              <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginBottom: 20 }} />
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Ionicons name="document-text-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>利用規約</Text>
                </View>
                <EulaContent />
                <Pressable
                  onPress={() => { setAgreed((v) => !v); setErrorMessage(null); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <Ionicons
                    name={agreed ? 'checkbox-outline' : 'square-outline'}
                    size={24}
                    color={agreed ? WeatherBoardColors.buttonBackground : WeatherBoardColors.textMutedBlack}
                  />
                  <Text style={{ fontSize: 14, color: WeatherBoardColors.textPrimaryDark, fontWeight: '500' }}>
                    上記の内容に同意します
                  </Text>
                </Pressable>
              </View>
              <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginBottom: 20 }} />

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{errorMessage}</Text>
              )}

              {/* 新規登録ボタン */}
              <Pressable onPress={handleSignUp} disabled={submitAction.isPending} style={{ marginBottom: 20, opacity: submitAction.isPending ? 0.7 : 1 }}>
                <View style={{ backgroundColor: WeatherBoardColors.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="person-add-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>新規登録</Text>
                </View>
              </Pressable>

              {/* または */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: WeatherBoardColors.divider }} />
                <Text style={{ marginHorizontal: 12, fontSize: 12, color: WeatherBoardColors.textMutedBlack }}>または</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: WeatherBoardColors.divider }} />
              </View>

              <View style={{ gap: 10, marginBottom: 16 }}>
                {/* Google */}
                <Pressable onPress={handleGoogleSignUp} disabled={submitAction.isPending} style={{ opacity: submitAction.isPending ? 0.7 : 1 }}>
                  <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: WeatherBoardColors.textPrimaryDark, fontSize: 15, fontWeight: '600', marginRight: 36 }}>Google で登録</Text>
                  </View>
                </Pressable>

                {/* Apple (iOS のみ) */}
                {Platform.OS === 'ios' && (
                  <Pressable onPress={handleAppleSignUp} disabled={submitAction.isPending} style={{ opacity: submitAction.isPending ? 0.7 : 1 }}>
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
                    <Text style={{ fontSize: 12, color: WeatherBoardColors.textMutedBlack }}>メールをご確認のうえ、登録を完了してください。</Text>
                  </View>
                </View>
              )}

              {/* 戻る */}
              <Pressable onPress={() => router.replace('/(auth)/login')}>
                <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: WeatherBoardColors.textMutedBlack, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="arrow-back-outline" size={20} color={WeatherBoardColors.textMutedBlack} style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: WeatherBoardColors.textMutedBlack, fontSize: 15, fontWeight: '600', marginRight: 36 }}>戻る</Text>
                </View>
              </Pressable>

            </View>
          </Pressable>
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
