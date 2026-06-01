import { useState } from 'react';
import { Alert } from 'react-native';

import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';


export default function useProfileSetUp(onSuccess: () => Promise<void>) {
  const { user } = useUser();
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatar, setAvatar] = useState('');
  const userId = user?.id;
  const handleSaveProfile = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!userId) {
        Alert.alert('ユーザーが取得できませんでした。');
        return;
      }
      if (nickname === '') {
        Alert.alert('ニックネームの入力欄が空になっています。');
        return;
      }
      if (avatar === '') {
        Alert.alert('アバターを選んでください。');
        return;
      }
      const { error } = await supabase.from('profiles').upsert({ user_id: userId, nickname, avatar_emoji: avatar }, { onConflict: 'user_id' });
      if (error) {
        console.error('[profile-setup] handleSaveProfile', error.message);
        Alert.alert('プロフィール作成に失敗しました。');
        return;
      }
      await onSuccess?.()
    } finally {
      setIsSubmitting(false);
    }
  };


  return {
    handleSaveProfile, setNickname, setAvatar, avatar, nickname
  }
}