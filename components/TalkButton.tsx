import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BlurView } from 'expo-blur';

import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

type TalkButtonProps = {
  to_user_id: string;
  weather_log_id: string;
};

export default function TalkButton({ to_user_id, weather_log_id }: TalkButtonProps) {
  const [isActiveButton, setIsActiveButton] = useState(false);
  const { currentRoomId } = useRoom();
  const { user } = useUser();
  const userId = user?.id;
  const [isSending, setIsSending] = useState(false);

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
        const { error: notificationError } = await supabase.from('notifications').insert({ type: 'talk', from_user_id: userId, to_user_id, weather_log_id, is_read: false, room_id: currentRoomId });
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
    <View style={{ alignSelf: 'flex-start' }}>
      <Pressable onPress={handleTalk} disabled={isActiveButton} className="mb-2" style={{ opacity: isActiveButton ? 0.4 : 1 }}>
        <BlurView intensity={40} tint="dark" className="py-2 px-5" style={{ borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
          <Text className="font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            TALK
          </Text>
        </BlurView>
      </Pressable>

      <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMuted, textAlign: 'right' }}>
        {isActiveButton ? '※通知しました。' : '※相手に通知が届きます。'}
      </Text>
    </View>
  );
}
