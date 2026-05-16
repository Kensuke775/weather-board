import { WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

type TalkButtonProps = {
  to_user_id: string;
  weather_log_id: string;
};

export default function TalkButton({ to_user_id, weather_log_id }: TalkButtonProps) {
  const [isActiveButton, setIsActiveButton] = useState(false);
  useEffect(() => {
    const fetchReactionData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return Alert.alert('ユーザーの取得に失敗しました。');
      const { data: reactionData, error: reactionError } = await supabase.from('reactions').select('from_user_id, weather_log_id').eq('from_user_id', user.id).eq('weather_log_id', weather_log_id);
      if (reactionError) return Alert.alert(reactionError.message);
      if (reactionData.length > 0) setIsActiveButton(true);
    };
    fetchReactionData();
  }, [weather_log_id]);
  const sendTalkNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');

    const { error: reactionError } = await supabase.from('reactions').insert({ from_user_id: user.id, to_user_id, weather_log_id });
    if (reactionError) return Alert.alert(reactionError.message);

    if (user.id !== to_user_id) {
      const { error: notificationError } = await supabase.from('notifications').insert({ type: 'talk', from_user_id: user.id, to_user_id, weather_log_id, is_read: false });
      if (notificationError) return Alert.alert(notificationError.message);
    }
    setIsActiveButton(true);
  };
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <Pressable onPress={sendTalkNotifications} disabled={isActiveButton} className="mb-2" style={{ opacity: isActiveButton ? 0.4 : 1 }}>
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
