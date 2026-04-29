import { supabase } from '@/lib/supabase';
import { Alert, Pressable, Text, View } from 'react-native';

type TalkButtonProps = {
    to_user_id: string;
    weather_log_id: string;
}

export default function TalkButton({ to_user_id, weather_log_id}: TalkButtonProps) {
  const sendTalkNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if(!user) return Alert.alert('ユーザーが取得出来ませんでした。');

    const { error: reactionError } = await supabase.from('reactions').insert({from_user_id: user.id, to_user_id, weather_log_id});
    if(reactionError) return Alert.alert(reactionError.message);

    const { error: notificationError } = await supabase.from('notifications').insert({ type: 'talk', from_user_id: user.id, to_user_id, weather_log_id, is_read: false});
    if(notificationError) return Alert.alert(notificationError.message);
  };
  return (
    <View>
      <View>
        <Pressable onPress={sendTalkNotifications}>
          <Text>ちょっと話す</Text>
        </Pressable>
      </View>
    </View>
  );
}
