import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

type TalkButtonProps = {
  to_user_id: string;
  weather_log_id: string;
};

export default function TalkButton({ to_user_id, weather_log_id }: TalkButtonProps) {
  const [isActiveButton, setIsActiveButton] = useState(false);
  const { user } = useUser();
  const userId = user?.id;
  const [isSending, setIsSending] = useState(false);
  const isOwnPost = userId === to_user_id;

  useEffect(() => {
    const fetchReactionData = async () => {
      const { data: reactionData, error: reactionError } = await supabase.from('reactions').select('from_user_id, weather_log_id').eq('from_user_id', userId).eq('weather_log_id', weather_log_id);
      if (reactionError) {
        console.error('[TalkButton] fetchReactionData', reactionError.message);
        Alert.alert('リアクションズの取得に失敗しました。');
        return;
      }
      if (reactionData.length > 0) setIsActiveButton(true);
    };
    fetchReactionData();
  }, [weather_log_id, userId]);

  const handleTalk = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      const { error: reactionError } = await supabase.from('reactions').insert({ from_user_id: userId, to_user_id, weather_log_id });
      if (reactionError) {
        console.error('[TalkButton] handleTalk', reactionError.message);
        Alert.alert('リアクションズの書き込みに失敗しました。');
        return;
      }
      if (userId !== to_user_id) {
        const { error: notificationError } = await supabase.from('notifications').insert({ type: 'talk', from_user_id: userId, to_user_id, weather_log_id, is_read: false });
        if (notificationError) {
          console.error('[TalkButton] handleTalk', notificationError.message);
          Alert.alert('通知の書き込みに失敗しました。');
          return;
        }
      }
      setIsActiveButton(true);
    } finally {
      setIsSending(false);
    }
  };
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Pressable
        onPress={handleTalk}
        disabled={isActiveButton || isOwnPost}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'rgba(255,255,255,0.85)',
          borderRadius: 18,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: WeatherBoardColors.divider,
          opacity: isActiveButton ? 0.4 : 1,
        }}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={WeatherBoardColors.textPrimaryDark} />
        <Text style={{ fontWeight: '700', color: WeatherBoardColors.textPrimaryDark, fontSize: 13 }}>TALK</Text>
      </Pressable>
      <Text style={{ fontSize: 9, color: WeatherBoardColors.textMutedBlack, marginTop: 2 }}>{isActiveButton ? '※通知しました。' : '※相手に通知が届きます。'}</Text>
    </View>
  );
}
