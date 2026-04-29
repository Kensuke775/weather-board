import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { CommentItem } from '@/lib/types';

type CommentSectionProps = {
  weather_log_id: string;
  to_user_id: string;
};

export default function CommentSection({ weather_log_id, to_user_id }: CommentSectionProps) {
  const [inputText, setInputText] = useState('');
  const [comments, setComments] = useState<CommentItem[]>([]);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase.from('comments').select('id, weather_log_id, user_id, body, created_at, profiles(nickname, avatar_emoji)').eq('weather_log_id', weather_log_id);
      if (error) return Alert.alert(error.message);
      const formattedData = data.map((log) => ({ ...log, profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles }));
      setComments(formattedData);
    };
    fetchComments();
    const channel = supabase
      .channel('comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weather_log_id]);
  const handleSendComment = async () => {
    if (inputText === '') return Alert.alert('入力欄が空です。');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');

    const { error: commentError } = await supabase.from('comments').insert({ weather_log_id, user_id: user.id, body: inputText });
    if (commentError) return Alert.alert(commentError.message);
    const { error: notificationError } = await supabase.from('notifications').insert({ type: 'comment', to_user_id, weather_log_id, from_user_id: user.id, is_read: false });
    if (notificationError) Alert.alert(notificationError.message);
    setInputText('');
  };
  return (
    <View className="flex justify-center w-full h-full">
      <View>
        <View>
          {comments.map((comment) => (
            <View key={comment.id}>
              <View>
                <View>
                  <Text>{comment.profiles.avatar_emoji}</Text>
                  <Text>{comment.profiles.nickname}</Text>
                </View>
                <View>
                  <Text>{comment.body}</Text>
                </View>
              </View>
              <View>
                <Text>{comment.created_at}</Text>
              </View>
            </View>
          ))}
        </View>
        <View>
          <Text>コメントする</Text>
          <View className="flex flex-row justify-space-between w-full">
            <TextInput value={inputText} onChangeText={setInputText} autoCapitalize="none" placeholder="入力する" />
            <Pressable onPress={handleSendComment}>
              <Text>送信する</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
