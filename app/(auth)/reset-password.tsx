import { useState } from 'react';
import { ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BrownTheme, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/login.png');

export default function ResetPassword() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResetPassword = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    if (newPassword.length < 6) {
      setErrorMessage('パスワードは6文字以上で設定してください。');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('パスワードが一致しません。');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error('[reset-password] handleResetPassword', error.message);
        setErrorMessage('パスワードの変更に失敗しました。もう一度お試しください。');
        return;
      }
      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 48 }}
            keyboardShouldPersistTaps="handled">

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

              {/* ヘッダー */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Ionicons name="leaf-outline" size={22} color={BrownTheme.primaryText} style={{ marginBottom: 4 }} />
                <Text style={{ fontFamily: 'DancingScript_400Regular', fontSize: 38, color: BrownTheme.primaryText, lineHeight: 48 }}>
                  New Password
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '55%', marginTop: 6 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: BrownTheme.contentBorder }} />
                </View>
              </View>

              {/* 新しいパスワード */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="lock-closed-outline" size={15} color={BrownTheme.primaryText} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>新しいパスワード</Text>
                </View>
                <View style={{ backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                  <TextInput
                    value={newPassword}
                    onChangeText={(text) => { setNewPassword(text); setErrorMessage(null); }}
                    placeholder="6文字以上"
                    placeholderTextColor={BrownTheme.mutedText}
                    textContentType="newPassword"
                    secureTextEntry={!isNewPasswordVisible}
                    autoCapitalize="none"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: BrownTheme.primaryText }}
                  />
                  <Pressable onPress={() => setIsNewPasswordVisible((v) => !v)} hitSlop={8}>
                    <Ionicons name={isNewPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color={BrownTheme.mutedText} />
                  </Pressable>
                </View>
              </View>

              {/* 確認用パスワード */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="lock-closed-outline" size={15} color={BrownTheme.primaryText} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>パスワード（確認）</Text>
                </View>
                <View style={{ backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(text) => { setConfirmPassword(text); setErrorMessage(null); }}
                    placeholder="もう一度入力"
                    placeholderTextColor={BrownTheme.mutedText}
                    textContentType="newPassword"
                    secureTextEntry={!isConfirmPasswordVisible}
                    autoCapitalize="none"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: BrownTheme.primaryText }}
                  />
                  <Pressable onPress={() => setIsConfirmPasswordVisible((v) => !v)} hitSlop={8}>
                    <Ionicons name={isConfirmPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color={BrownTheme.mutedText} />
                  </Pressable>
                </View>
              </View>

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{errorMessage}</Text>
              )}

              <Pressable
                onPress={handleResetPassword}
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                <View style={{ backgroundColor: BrownTheme.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
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
    </ImageBackground>
  );
}
