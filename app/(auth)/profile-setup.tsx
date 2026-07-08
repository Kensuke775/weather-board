import { useState } from 'react';
import { ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { AvatarItem } from '@/components/AvatarItem';
import { BrownTheme, Fonts } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/login.png');

const AVATARS = [
  // 動物
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦉',
  '🐺', '🐴', '🦄', '🐝', '🦋', '🐢', '🐬', '🦭', '🐿️', '🦔',
  // 食べ物・かわいい系
  '🍓', '🍰', '🧁', '🍩', '🍪', '🧸',
  // 自然・植物
  '🌸', '🌼', '🌻', '🍄', '🌈', '⭐', '🌙',
  // キャラ系
  '👻', '🤖', '👾', '🎃',
];

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

  const handleSaveProfile = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
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
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, nickname: nickname.trim(), avatar_emoji: avatar }, { onConflict: 'user_id' });
      if (error) {
        console.error('[profile-setup] handleSaveProfile', error.message);
        setErrorMessage('プロフィールの保存に失敗しました。');
        return;
      }
      router.replace('/(auth)/room-setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarColumns = AVATARS.reduce<string[][]>((acc, emoji, i) => {
    const colIndex = Math.floor(i / 2);
    if (!acc[colIndex]) acc[colIndex] = [];
    acc[colIndex].push(emoji);
    return acc;
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>

            <AuthHeader title="Profile Setup" subtitle="プロフィールを設定しましょう" />

            {/* カード */}
            <View style={{
              marginHorizontal: 24,
              backgroundColor: BrownTheme.cardBackground,
              borderRadius: 24,
              paddingHorizontal: 28,
              paddingTop: 28,
              paddingBottom: 28,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 10,
            }}>

              {/* アバタープレビュー */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: 'white',
                  borderWidth: 2,
                  borderColor: avatar ? BrownTheme.buttonBackground : BrownTheme.contentBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                }}>
                  {avatar ? (
                    <Text style={{ fontSize: 50 }}>{avatar}</Text>
                  ) : (
                    <Ionicons name="person-outline" size={36} color={BrownTheme.mutedText} />
                  )}
                </View>
              </View>

              {/* ニックネーム */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Ionicons name="person-outline" size={15} color={BrownTheme.primaryText} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>ニックネームを入力</Text>
                </View>
                <TextInput
                  value={nickname}
                  onChangeText={(text) => { setNickname(text); setErrorMessage(null); }}
                  placeholder="ニックネームを入力"
                  placeholderTextColor={BrownTheme.mutedText}
                  autoCapitalize="none"
                  maxLength={6}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    color: BrownTheme.primaryText,
                    marginBottom: 6,
                  }}
                />
                <Text style={{ fontSize: 11, color: BrownTheme.mutedText }}>いつでも変更できます</Text>
              </View>

              {/* アバター選択（2行横スクロール） */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Ionicons name="happy-outline" size={15} color={BrownTheme.primaryText} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>アバターを選んでください</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingVertical: 4 }}>
                  {avatarColumns.map((column, colIndex) => (
                    <View key={colIndex} style={{ gap: 10 }}>
                      {column.map((emoji) => (
                        <AvatarItem
                          key={emoji}
                          emoji={emoji}
                          isSelected={avatar === emoji}
                          onPress={() => { setAvatar(emoji); setErrorMessage(null); }}
                        />
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{errorMessage}</Text>
              )}

              {/* 次へボタン */}
              <Pressable onPress={handleSaveProfile} disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                <View style={{ backgroundColor: BrownTheme.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="arrow-forward-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>次へ</Text>
                </View>
              </Pressable>

            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
