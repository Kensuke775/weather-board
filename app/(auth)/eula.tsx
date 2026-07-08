import { useState } from 'react';
import { ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { BrownTheme, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/login.png');

const SECTIONS = [
  {
    title: '1. 禁止事項',
    body: '本アプリでは、以下に該当する投稿・コメント・行為を禁止します。違反が確認された場合、該当コンテンツの削除やアカウントの利用停止・削除を行うことがあります。\n・誹謗中傷、嫌がらせ、差別的な表現\n・暴力的、わいせつ、その他不適切な内容\n・他者になりすます行為、第三者の権利を侵害する行為\n・その他、法令や公序良俗に反する行為',
  },
  {
    title: '2. 通報・ブロック機能',
    body: '本アプリには、不適切な投稿・コメント・ユーザーを通報する機能、および迷惑なユーザーをブロックする機能があります。通報内容は運営者が確認し、必要に応じて対応します。',
  },
  {
    title: '3. アカウントの停止・削除',
    body: '本規約に違反したユーザーに対して、運営者は事前の通知なくコンテンツの削除、アカウントの利用停止または削除を行うことができます。',
  },
  {
    title: '4. 規約の変更',
    body: '本規約は必要に応じて変更することがあります。重要な変更がある場合は、アプリ内でお知らせします。',
  },
  {
    title: '5. お問い合わせ',
    body: '本規約に関するご質問は t.ypebob96@gmail.com までご連絡ください。',
  },
];

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
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>

            <AuthHeader title="Terms of Use" subtitle="利用規約" />

            {/* カード */}
            <View style={{
              marginHorizontal: 24,
              backgroundColor: BrownTheme.cardBackground,
              borderRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 10,
            }}>

              {/* イントロ */}
              <Text style={{ fontSize: 13, color: BrownTheme.primaryText, lineHeight: 20, marginBottom: 20 }}>
                Weather Board（以下「本アプリ」）をご利用いただく前に、以下の内容をご確認のうえ同意してください。
              </Text>

              {/* セクション */}
              {SECTIONS.map((section) => (
                <View key={section.title} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: BrownTheme.primaryText, marginBottom: 8 }}>
                    {section.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: BrownTheme.primaryText, lineHeight: 20, opacity: 0.85 }}>
                    {section.body}
                  </Text>
                </View>
              ))}

              {/* 区切り線 */}
              <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder, marginBottom: 20 }} />

              {/* チェックボックス */}
              <Pressable
                onPress={() => { setAgreed((v) => !v); setErrorMessage(null); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Ionicons
                  name={agreed ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color={agreed ? BrownTheme.buttonBackground : BrownTheme.mutedText}
                />
                <Text style={{ fontSize: 14, color: BrownTheme.primaryText, fontWeight: '500' }}>
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
                    backgroundColor: BrownTheme.buttonBackground,
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
                    <Ionicons name="exit-outline" size={20} color={BrownTheme.mutedText} style={{ marginLeft: 16 }} />
                    <Text style={{ flex: 1, textAlign: 'center', color: BrownTheme.mutedText, fontSize: 15, fontWeight: '500', marginRight: 36 }}>
                      同意しない（ログアウト）
                    </Text>
                  </View>
                </Pressable>
              </View>

            </View>

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
