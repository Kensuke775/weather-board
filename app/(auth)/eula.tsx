import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { EulaContent } from '@/components/EulaContent';
import { CardStyle, Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function AuthEula() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [agreed, setAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAgree = async () => {
    if (!agreed) {
      setErrorMessage('利用規約への同意が必要です。');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      router.replace('/(auth)/profile-setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisagree = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[eula] handleDisagree', error.message);
      return;
    }
    router.replace('/(auth)/login');
  };

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <AuthHeader title="Terms of Use" subtitle="利用規約" />
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>

            {/* カード（島） */}
            <View style={{
              ...CardStyle,
              marginHorizontal: 24,
              marginTop: 20,
              borderRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 0,
            }}>

              <EulaContent />

              {/* 区切り線 */}
              <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginBottom: 20 }} />

              {/* チェックボックス */}
              <Pressable
                onPress={() => { setAgreed((v) => !v); setErrorMessage(null); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Ionicons
                  name={agreed ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color={agreed ? WeatherBoardColors.buttonBackground : WeatherBoardColors.textMutedBlack}
                />
                <Text style={{ fontSize: 14, color: WeatherBoardColors.textPrimaryDark, fontWeight: '500' }}>
                  上記の内容に同意します
                </Text>
              </Pressable>

              {/* エラー */}
              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>
                  {errorMessage}
                </Text>
              )}

              {/* ボタン */}
              <View style={{ gap: 8, paddingBottom: 8 }}>
                <Pressable onPress={handleAgree} disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                  <View style={{
                    backgroundColor: WeatherBoardColors.buttonBackground,
                    borderRadius: 12,
                    paddingVertical: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>
                      同意して続ける
                    </Text>
                  </View>
                </Pressable>

                <Pressable onPress={handleDisagree}>
                  <View style={{ paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="exit-outline" size={20} color={WeatherBoardColors.textMutedBlack} style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: WeatherBoardColors.textMutedBlack, fontSize: 15, fontWeight: '500', marginRight: 36 }}>
                      同意しない（ログアウト）
                    </Text>
                  </View>
                </Pressable>
              </View>

            </View>

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
