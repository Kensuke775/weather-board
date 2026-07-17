import { useCallback, useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { ProfileForm } from '@/components/ProfileForm';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { TOAST_DURATION } from '@/constants/ui';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export default function ProfileEdit() {
  const { user } = useUser();
  const router = useRouter();

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCurrentProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname, avatar_emoji')
      .eq('user_id', user.id)
      .single();
    if (error) {
      console.error('[profile-edit] fetchCurrentProfile', error.message);
      return;
    }
    if (data.nickname) setNickname(data.nickname);
    if (data.avatar_emoji) setAvatar(data.avatar_emoji);
  }, [user?.id]);

  useEffect(() => {
    fetchCurrentProfile();
  }, [fetchCurrentProfile]);

  const handleSave = async () => {
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
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, nickname: nickname.trim(), avatar_emoji: avatar }, { onConflict: 'user_id' });
      if (error) {
        console.error('[profile-edit] handleSave', error.message);
        setErrorMessage('プロフィールの保存に失敗しました。');
        return;
      }
      Toast.show({ type: 'success', text1: 'プロフィールを変更しました。', visibilityTime: TOAST_DURATION.default });
      router.back();
    } finally {
      setIsSubmitting(false);
    }
  };

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

              {errorMessage && (
                <Text style={{ fontSize: 13, color: '#C0392B', marginTop: 20 }}>{errorMessage}</Text>
              )}

              <Pressable onPress={handleSave} disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1, marginTop: 24 }}>
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
