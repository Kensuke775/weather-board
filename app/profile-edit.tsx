import { useCallback, useEffect, useRef } from 'react';
import { ImageBackground, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import GlassButton from '@/components/GlassButton';
import ScreenHeader from '@/components/ScreenHeader';
import { BrownTheme } from '@/constants/theme';
import { TOAST_DURATION } from '@/constants/ui';
import { useUser } from '@/context/UserContext';
import useProfileSetUp from '@/hooks/useProfileSetUp';
import { supabase } from '@/lib/supabase';

const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
  '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🐦',
  '🦆', '🦉', '🐺', '🐴', '🦄', '🐝',
  '🦋', '🐢', '🐬', '🦭', '🐙', '🐿️',
  '🦔', '🍓', '🍑', '🍒', '🍰', '🧁',
  '🍩', '🍪', '🧸', '🌸', '🌼', '🌻',
  '🍄', '🌈', '⭐', '🌙', '☁️', '👻',
  '🤖', '👾', '🎃',
];

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');
const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.5)';
const CREAM = '#FCF8F0';

export default function ProfileEdit() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { user } = useUser();
  const userId = user?.id;
  const nicknameInputRef = useRef<TextInput>(null);

  const { handleSaveProfile, setNickname, setAvatar, avatar, nickname } = useProfileSetUp(async () => {
    Toast.show({ type: 'success', text1: 'プロフィールを変更しました。', visibilityTime: TOAST_DURATION.default });
    router.back();
  });

  const fetchCurrentProfile = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname, avatar_emoji')
      .eq('user_id', userId)
      .single();
    if (error) {
      console.error('[profile-edit] fetchCurrentProfile', error.message);
      return;
    }
    if (data.nickname) setNickname(data.nickname);
    if (data.avatar_emoji) setAvatar(data.avatar_emoji);
  }, [userId, setNickname, setAvatar]);

  useEffect(() => {
    fetchCurrentProfile();
  }, [fetchCurrentProfile]);

  return (
    <View style={{ flex: 1 }}>
      {/* ── ヘッダー: コンテンツから完全独立 ── */}
      <ScreenHeader title="プロフィール編集 🌿" onBack={() => router.back()} />

      {/* ── コルクボード背景 ── */}
      <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 30, paddingTop: 80, paddingBottom: bottom + 16 }}>

          {/* ── コンテンツカード ── */}
          <View
            style={{
              flex: 1,
              borderRadius: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 8,
            }}>
            <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}>

              {/* クリーム: ニックネーム */}
              <View style={{ backgroundColor: CREAM, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 15 }}>🌿</Text>
                  <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 15 }}>ニックネームを変更できます</Text>
                </View>
                <Text style={{ color: MUTED_BROWN, fontSize: 11, marginBottom: 10 }}>ニックネームは6文字まででお願いします。</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.88)',
                    borderWidth: 1,
                    borderColor: 'rgba(98,66,33,0.15)',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: Platform.OS === 'ios' ? 13 : 9,
                  }}>
                  <TextInput
                    ref={nicknameInputRef}
                    value={nickname}
                    onChangeText={setNickname}
                    maxLength={6}
                    placeholder="ニックネームを入力してください"
                    autoCapitalize="none"
                    style={{ flex: 1, color: PRIMARY_BROWN, fontSize: 15 }}
                  />
                  <Text style={{ color: MUTED_BROWN, fontSize: 12 }}>{(nickname ?? '').length}/6</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder }} />

              {/* 白: アバターラベル・グリッド・保存ボタンをすべて内包 */}
              <View style={{ flex: 1, backgroundColor: CREAM }}>

                {/* アバターラベル (固定) */}
                <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 15 }}>🌿</Text>
                    <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 15 }}>アバターを選んでください</Text>
                  </View>
                </View>

                {/* アバターグリッド (スクロール) */}
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {AVATARS.map((item) => (
                      <View
                        key={item}
                        style={{
                          width: '16.666%',
                          padding: 2,
                          borderRadius: 12,
                          backgroundColor: avatar === item ? '#FEEBD5' : 'transparent',
                        }}>
                        <Pressable
                          onPress={() => setAvatar(item)}
                          style={{
                            aspectRatio: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: avatar === item ? '#FEEBD5' : 'rgba(255,255,255,0.95)',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: 'rgba(98,66,33,0.08)',
                            shadowColor: avatar === item ? '#FEEBD5' : '#000',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: avatar === item ? 1 : 0.03,
                            shadowRadius: avatar === item ? 8 : 2,
                            elevation: avatar === item ? 6 : 1,
                          }}>
                          <Text style={{ fontSize: 26 }}>{item}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                {/* 保存ボタン: カード内・固定下部 */}
                <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
                  <GlassButton
                    onPress={handleSaveProfile}
                    buttonText="保存する"
                    buttonIcon="add-circle-outline"
                    backgroundColor={BrownTheme.buttonBackground}
                    iconPosition="inline"
                  />
                </View>

              </View>
            </View>
          </View>

        </View>
      </ImageBackground>
    </View>
  );
}
