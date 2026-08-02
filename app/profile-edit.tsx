import { useCallback, useEffect, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { ProfileForm } from '@/components/ProfileForm';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { PREFECTURES } from '@/constants/prefectures';
import { TOAST_DURATION } from '@/constants/ui';
import { useUser } from '@/context/UserContext';
import usePendingAction from '@/hooks/usePendingAction';
import { supabase } from '@/lib/supabase';

export default function ProfileEdit() {
  const { user } = useUser();
  const router = useRouter();

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [prefecture, setPrefecture] = useState<string | null>(null);
  const [isPrefecturePickerOpen, setIsPrefecturePickerOpen] = useState(false);
  const saveAction = usePendingAction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCurrentProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname, avatar_emoji, prefecture')
      .eq('user_id', user.id)
      .single();
    if (error) {
      console.error('[profile-edit] fetchCurrentProfile', error.message);
      return;
    }
    if (data.nickname) setNickname(data.nickname);
    if (data.avatar_emoji) setAvatar(data.avatar_emoji);
    setPrefecture(data.prefecture ?? null);
  }, [user?.id]);

  useEffect(() => {
    fetchCurrentProfile();
  }, [fetchCurrentProfile]);

  const handleSave = () =>
    saveAction.preventDuplicateRun(async () => {
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
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, nickname: nickname.trim(), avatar_emoji: avatar, prefecture }, { onConflict: 'user_id' });
      if (error) {
        console.error('[profile-edit] handleSave', error.message);
        setErrorMessage('プロフィールの保存に失敗しました。');
        return;
      }
      Toast.show({ type: 'success', text1: 'プロフィールを変更しました。', visibilityTime: TOAST_DURATION.default });
      router.back();
    });

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>
            <View style={{ ...CardStyle, borderRadius: 20, padding: 20 }}>
              <ProfileForm
                nickname={nickname}
                onChangeNickname={(text) => { setNickname(text); setErrorMessage(null); }}
                avatar={avatar}
                onChangeAvatar={(emoji) => { setAvatar(emoji); setErrorMessage(null); }}
              />

              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: WeatherBoardColors.textMutedBlack, marginBottom: 8 }}>
                  都道府県
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

              <Pressable onPress={handleSave} disabled={saveAction.isPending} style={{ opacity: saveAction.isPending ? 0.7 : 1, marginTop: 24 }}>
                <View style={{ backgroundColor: WeatherBoardColors.buttonBackground, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-outline" size={20} color="white" style={{ marginLeft: 16 }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: 15, fontWeight: '700', marginRight: 36 }}>保存する</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
