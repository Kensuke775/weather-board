import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

const PRIMARY_BROWN = '#624221';

type TalkButtonProps = {
  to_user_id: string;
  weather_log_id: string;
  variant?: 'dark' | 'light';
};

export default function TalkButton({ to_user_id, weather_log_id, variant = 'dark' }: TalkButtonProps) {
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
  if (variant === 'light') {
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
            borderColor: 'rgba(98,66,33,0.12)',
            opacity: isActiveButton ? 0.4 : 1,
          }}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={PRIMARY_BROWN} />
          <Text style={{ fontWeight: '700', color: PRIMARY_BROWN, fontSize: 13 }}>TALK</Text>
        </Pressable>
        <Text style={{ fontSize: 9, color: 'rgba(98,66,33,0.55)', marginTop: 2 }}>{isActiveButton ? '※通知しました。' : '※相手に通知が届きます。'}</Text>
      </View>
    );
  }

  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <Pressable onPress={handleTalk} disabled={isActiveButton || isOwnPost} className="mb-2" style={{ opacity: isActiveButton ? 0.4 : 1 }}>
        <BlurView intensity={40} tint="dark" className="py-2 px-5" style={{ borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
          <Text className="font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            TALK
          </Text>
        </BlurView>
      </Pressable>

      <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMuted, textAlign: 'right' }}>
        {isOwnPost ? '※自分の投稿です。' : isActiveButton ? '※通知しました。' : '※相手に通知が届きます。'}
      </Text>
    </View>
  );
}
