import { useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { ProfileForm } from '@/components/ProfileForm';
import { PREFECTURES } from '@/constants/prefectures';
import { CardStyle, Fonts, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import usePendingAction from '@/hooks/usePendingAction';
import { supabase } from '@/lib/supabase';

export default function ProfileSetUp() {
  const { user } = useUser();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [prefecture, setPrefecture] = useState<string | null>(null);
  const [isPrefecturePickerOpen, setIsPrefecturePickerOpen] = useState(false);

  const submitAction = usePendingAction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = () =>
    submitAction.preventDuplicateRun(async () => {
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

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, nickname: nickname.trim(), avatar_emoji: avatar, prefecture }, { onConflict: 'user_id' });
      if (profileError) {
        console.error('[profile-setup] handleSubmit profile', profileError.message);
        setErrorMessage('プロフィールの保存に失敗しました。');
        return;
      }

      router.replace('/(tabs)');
    });

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

              {/* 都道府県（任意） */}
              <View style={{ marginTop: 20, gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: WeatherBoardColors.textMutedBlack }}>
                  都道府県(任意)
                </Text>
                <Pressable
                  onPress={() => setIsPrefecturePickerOpen(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: WeatherBoardColors.screenBackground,
                  }}>
                  <Text style={{ fontSize: 15, color: prefecture ? WeatherBoardColors.textPrimaryDark : WeatherBoardColors.textMutedBlack }}>
                    {prefecture ?? '未設定'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={WeatherBoardColors.textMutedBlack} />
                </Pressable>
              </View>

              <Modal visible={isPrefecturePickerOpen} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: WeatherBoardColors.divider }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>都道府県を選択</Text>
                    <Pressable onPress={() => setIsPrefecturePickerOpen(false)} hitSlop={8}>
                      <Ionicons name="close" size={24} color={WeatherBoardColors.textPrimaryDark} />
                    </Pressable>
                  </View>
                  <FlatList
                    data={PREFECTURES}
                    keyExtractor={(item) => item}
                    ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider }} />}
                    ListHeaderComponent={
                      <Pressable
                        onPress={() => { setPrefecture(null); setIsPrefecturePickerOpen(false); }}
                        style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 15, color: WeatherBoardColors.textMutedBlack }}>未設定に戻す</Text>
                        {prefecture === null && <Ionicons name="checkmark" size={18} color={WeatherBoardColors.buttonBackground} />}
                      </Pressable>
                    }
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => { setPrefecture(item); setIsPrefecturePickerOpen(false); }}
                        style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 15, color: WeatherBoardColors.textPrimaryDark }}>{item}</Text>
                        {prefecture === item && <Ionicons name="checkmark" size={18} color={WeatherBoardColors.buttonBackground} />}
                      </Pressable>
                    )}
                  />
                </View>
              </Modal>

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginTop: 20 }}>{errorMessage}</Text>
              )}

              {/* はじめるボタン */}
              <Pressable onPress={handleSubmit} disabled={submitAction.isPending} style={{ opacity: submitAction.isPending ? 0.7 : 1, marginTop: 24 }}>
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
