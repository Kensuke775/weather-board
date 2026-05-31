import { supabase } from '@/lib/supabase';

import { useState } from 'react';
import { Alert } from 'react-native';


export default function useProfileSetUp(onSuccess: () => Promise<void>) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProfile = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      Alert.alert('ユーザーが取得できませんでした。');
      return;
    }
    if (nickname === ''){
      setIsSubmitting(false);
      Alert.alert('ニックネームの入力欄が空になっています。');
      return;
    }
    if (avatar === '') {
      setIsSubmitting(false);
      Alert.alert('アバターを選んでください。');
      return;
    }
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, nickname, avatar_emoji: avatar }, {onConflict: 'user_id'});
    if (error){
      setIsSubmitting(false);
      console.error('[profile-setup] handleSaveProfile', error.message);
      Alert.alert('プロフィール作成に失敗しました。');
      return;
    }
    await onSuccess?.()
  };


  return {
    handleSaveProfile, setNickname, setAvatar, avatar, nickname
  }
}