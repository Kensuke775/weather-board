import React, { JSX, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import CommentSection from '@/components/CommentSection';
import ReportBlockMenu from '@/components/ReportBlockMenu';
import TalkButton from '@/components/TalkButton';
import { WeatherBoardColors } from '@/constants/theme';
import { AVATAR_BUTTON, BLUR_INTENSITY, CARD_TEXT } from '@/constants/ui';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { CommentsStatus, WEATHER_CONFIG, WeatherType } from '@/lib/types';

type WeatherCardProps = {
  nickname: string;
  avatar_emoji: string;
  weather: WeatherType;
  note: string | null;
  updated_at: string;
  weather_log_id: string;
  user_id: string;
  unreadCount: number;
  tags: { id: string; name: string }[];
  commentStatus: CommentsStatus;
};

const handleDeletePost = async (weather_log_id: string, onDeleted: () => void) => {
  const { error } = await supabase.from('weather_logs').delete().eq('id', weather_log_id);
  if (error) {
    console.error('[WeatherCard] handleDeletePost', error.message);
    Alert.alert('投稿の削除に失敗しました。');
    return;
  }
  onDeleted();
};

const markAsRead = async (userId: string, weather_log_id: string) => {
  const { error: notificationError } = await supabase.from('notifications').update({ is_read: true }).eq('to_user_id', userId).eq('weather_log_id', weather_log_id);
  if (notificationError) {
    console.error('[WeatherCard] markAsRead', notificationError.message);
    Alert.alert('通知の取得に失敗しました。');
    return;
  }
};

export default function WeatherCard({ nickname, avatar_emoji, weather, note, updated_at, weather_log_id, user_id, unreadCount, tags, commentStatus }: WeatherCardProps): JSX.Element {
  const { user } = useUser();
  const userId = user?.id;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const formattedDate = new Date(updated_at).toLocaleTimeString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Pressable
        onPress={() => {
          setIsModalVisible(true);
          if (!userId) return;
          markAsRead(userId, weather_log_id);
        }}
        style={{ flex: 1, maxWidth: '50%', overflow: 'visible' }}>
        <View className="overflow-visible relative">
          <BlurView
            intensity={BLUR_INTENSITY}
            tint="light"
            className="p-4 border overflow-visible"
            style={{ borderColor: WeatherBoardColors.glassBorder, backgroundColor: Platform.OS === 'ios' ? WEATHER_CONFIG[weather].color : WEATHER_CONFIG[weather].darkColor }}>
            <View className="flex flex-row items-center gap-1 mb-2">
              <Text className="text-base">{avatar_emoji}</Text>
              <Text className="text-[12px] font-semibold" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={1}>
                {nickname}
              </Text>
              <Text className="text-lg">{WEATHER_CONFIG[weather].emoji}</Text>
            </View>
            <View className="flex flex-row items-center gap-1 mb-2">
              <Text className="text-[10px] flex-1 overflow-hidden" style={{ color: WeatherBoardColors.textPrimary, height: CARD_TEXT.noteHeight }} numberOfLines={2}>
                {note}
              </Text>
            </View>
            <View className="flex-row items-center gap-2 flex-wrap mb-2 overflow-hidden text-[8px]" style={{ height: CARD_TEXT.tagRowHeight }}>
              {tags.map((tag) => (
                <Text key={tag.id} numberOfLines={1} className="text-[10px]" style={{ color: WeatherBoardColors.textPrimary }}>
                  #{tag.name}
                </Text>
              ))}
            </View>

            <View className="flex-row items-center gap-2">
              <View className="flex-row gap-1 items-center">
                <Ionicons name="chatbubble-ellipses-outline" size={12} />
                <Text className="text-xs font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                  {commentStatus[weather_log_id]?.count > 0 ? commentStatus[weather_log_id]?.count : 0}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                {commentStatus[weather_log_id]?.commenters.slice(0, 4).map((commenter) => (
                  <Text key={commenter.user_id} className="text-[10px]">
                    {commenter.emoji}
                  </Text>
                ))}
                {(commentStatus[weather_log_id]?.commenters.length ?? 0) > 4 && <Text className="text-[10px] text-gray-400">...</Text>}
              </View>
            </View>
          </BlurView>
          {unreadCount > 0 && (
            <View className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex justify-center items-center">
              <Text className="text-white text-xs font-bold">{unreadCount}</Text>
            </View>
          )}
          <View className="flex-row justify-end">
            <Text className="text-[8px]" style={{ color: WeatherBoardColors.textMuted }}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </Pressable>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} automaticOffset style={{ flex: 1, justifyContent: 'flex-end' }}>
          <BlurView intensity={BLUR_INTENSITY} tint="dark" className="flex-1 p-5" style={{ backgroundColor: Platform.OS === 'ios' ? WEATHER_CONFIG[weather].color : WEATHER_CONFIG[weather].darkColor }}>
            <View className="flex-row justify-between mb-5 mt-20">
              <Pressable onPress={() => setIsModalVisible(false)}>
                <BlurView intensity={BLUR_INTENSITY} tint="dark" style={{ width: AVATAR_BUTTON.size, height: AVATAR_BUTTON.size, borderRadius: AVATAR_BUTTON.borderRadius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WeatherBoardColors.glassBorder }}>
                  <Ionicons name="close" size={20} style={{ color: WeatherBoardColors.textPrimary }} />
                </BlurView>
              </Pressable>
              <View className="flex-row items-start gap-2">
                {userId === user_id && (
                  <Pressable
                    onPress={() => {
                      Alert.alert('確認', 'この投稿を削除しますか？\n削除すると元に戻せません。', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除する', style: 'destructive', onPress: () => handleDeletePost(weather_log_id, () => setIsModalVisible(false)) },
                      ]);
                    }}>
                    <BlurView intensity={BLUR_INTENSITY} tint="dark" style={{ width: AVATAR_BUTTON.size, height: AVATAR_BUTTON.size, borderRadius: AVATAR_BUTTON.borderRadius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WeatherBoardColors.glassBorder }}>
                      <Ionicons name="trash-outline" size={18} style={{ color: WeatherBoardColors.textPrimary }} />
                    </BlurView>
                  </Pressable>
                )}
                <ReportBlockMenu targetUserId={user_id} weatherLogId={weather_log_id} onBlocked={() => setIsModalVisible(false)} />
                <TalkButton to_user_id={user_id} weather_log_id={weather_log_id} />
              </View>
            </View>

            <View className="mb-4">
              <View className="flex flex-row items-center gap-3 mb-4">
                <Text className="text-xl">{avatar_emoji}</Text>
                <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={1}>
                  {nickname}
                </Text>
                <Text className="text-lg">{WEATHER_CONFIG[weather].emoji}</Text>
              </View>
              <View className="flex flex-row items-center gap-1 mb-4">
                <Text className="text-xs" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={2}>
                  {note}
                </Text>
              </View>

              <View>
                <View className="flex-row items-center gap-2 flex-wrap mb-1">
                  {tags.map((tag) => (
                    <Text key={tag.id} numberOfLines={1} className="text-[10px]" style={{ color: WeatherBoardColors.textPrimary }}>
                      #{tag.name}
                    </Text>
                  ))}
                </View>
                <View className="flex-row justify-end">
                  <Text className="text-xs" style={{ color: WeatherBoardColors.textMuted }}>
                    posted:{formattedDate}
                  </Text>
                </View>
              </View>
            </View>
            <CommentSection to_user_id={user_id} weather_log_id={weather_log_id} />
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
