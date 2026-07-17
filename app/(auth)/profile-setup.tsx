import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { ProfileForm } from '@/components/ProfileForm';
import { CardStyle, Fonts, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export default function ProfileSetUp() {
  const { user } = useUser();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    if (!user?.id) {
      setErrorMessage('ユーザー情報が取得できませんでした。');
      return;
    }
    if (nickname.trim().length === 0) {
      setErrorMessage('ニックネームを入力してください。');
      return;
    }
    if (nickname.length > 6) {
      setErrorMessage('ニックネームは6文字以内で入力してください。');
      return;
    }
    if (avatar === '') {
      setErrorMessage('アバターを選んでください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, nickname: nickname.trim(), avatar_emoji: avatar }, { onConflict: 'user_id' });
      if (profileError) {
        console.error('[profile-setup] handleSubmit profile', profileError.message);
        setErrorMessage('プロフィールの保存に失敗しました。');
        return;
      }

      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <AuthHeader title="Profile Setup" subtitle="プロフィールを設定しましょう" />
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>

            {/* カード（島） */}
            <View style={{
              ...CardStyle,
              marginHorizontal: 24,
              marginTop: 20,
              borderRadius: 24,
              paddingHorizontal: 28,
              paddingTop: 28,
              paddingBottom: 28,
            }}>

              <ProfileForm
                nickname={nickname}
                onChangeNickname={(text) => { setNickname(text); setErrorMessage(null); }}
                avatar={avatar}
                onChangeAvatar={(emoji) => { setAvatar(emoji); setErrorMessage(null); }}
              />

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginTop: 20 }}>{errorMessage}</Text>
              )}

              {/* はじめるボタン */}
              <Pressable onPress={handleSubmit} disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1, marginTop: 24 }}>
                <View style={{ backgroundColor: WeatherBoardColors.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="arrow-forward-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>はじめる</Text>
                </View>
              </Pressable>

            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
