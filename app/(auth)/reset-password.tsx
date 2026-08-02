import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { CardStyle, Fonts, WeatherBoardColors } from '@/constants/theme';
import usePendingAction from '@/hooks/usePendingAction';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const submitAction = usePendingAction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResetPassword = () =>
    submitAction.preventDuplicateRun(async () => {
      setErrorMessage(null);
      if (newPassword.length < 6) {
        setErrorMessage('パスワードは6文字以上で設定してください。');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('パスワードが一致しません。');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error('[reset-password] handleResetPassword', error.message);
        setErrorMessage('パスワードの変更に失敗しました。もう一度お試しください。');
        return;
      }
      router.replace('/(tabs)');
    });

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <AuthHeader title="New Password" subtitle="新しいパスワードを設定してください" />
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

            {/* カード（島） */}
            <View style={{
              ...CardStyle,
              marginHorizontal: 24,
              marginTop: 20,
              borderRadius: 24,
              paddingHorizontal: 28,
              paddingVertical: 32,
            }}>

              {/* 新しいパスワード */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="lock-closed-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>新しいパスワード</Text>
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
                    value={newPassword}
                    onChangeText={(text) => { setNewPassword(text); setErrorMessage(null); }}
                    placeholder="6文字以上"
                    placeholderTextColor={WeatherBoardColors.textMutedBlack}
                    textContentType="newPassword"
                    secureTextEntry={!isNewPasswordVisible}
                    selectTextOnFocus={false}
                    autoCapitalize="none"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: WeatherBoardColors.textPrimaryDark }}
                  />
                  <Pressable onPress={() => setIsNewPasswordVisible((v) => !v)} hitSlop={8}>
                    <Ionicons name={isNewPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color={WeatherBoardColors.textMutedBlack} />
                  </Pressable>
                </View>
                <Text style={{ fontSize: 11, color: '#27AE60', marginTop: 4 }}>
                  ※候補の「強力なパスワード」を使うと、次回から自動でログインできて便利です
                </Text>
              </View>

              {/* 確認用パスワード */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="lock-closed-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>パスワード（確認）</Text>
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
                    value={confirmPassword}
                    onChangeText={(text) => { setConfirmPassword(text); setErrorMessage(null); }}
                    placeholder="もう一度入力"
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
                </View>
                {!isConfirmPasswordVisible && (
                  <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack, marginTop: 4 }}>
                    ※非表示のまま入力し直すと、内容が全て消えて上書きされます
                  </Text>
                )}
              </View>

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{errorMessage}</Text>
              )}

              <Pressable onPress={handleResetPassword} disabled={submitAction.isPending} style={{ opacity: submitAction.isPending ? 0.7 : 1 }}>
                <View style={{ backgroundColor: WeatherBoardColors.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>
                    パスワードを変更する
                  </Text>
                </View>
              </Pressable>

            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
