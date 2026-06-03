import React, { JSX, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import TalkButton from '@/components/TalkButton';
import CommentSection from '@/components/CommentSection';
import { WeatherBoardColors } from '@/constants/theme';
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

  const backgroundColor = WEATHER_CONFIG[weather].color;

  return (
    <>
      <Pressable
        onPress={() => {
          setIsModalVisible(true);
          if (!userId) return;
          markAsRead(userId, weather_log_id);
        }}
        style={{ flex: 1, maxWidth: '48%' }}>
        <View>
          <BlurView intensity={40} tint="light" className="p-4 border" style={{ borderColor: WeatherBoardColors.glassBorder, backgroundColor: backgroundColor }}>
            <View className="flex flex-row items-center gap-1 mb-4">
              <Text className="text-xl">{avatar_emoji}</Text>
              <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={1}>
                {nickname}
              </Text>
              <Text className="text-lg">{WEATHER_CONFIG[weather].emoji}</Text>
            </View>
            <View className="flex flex-row items-center gap-1 mb-4">
              <Text className="text-xs flex-1 overflow-hidden" style={{ color: WeatherBoardColors.textPrimary, height: 30 }} numberOfLines={2}>
                {note}
              </Text>
            </View>
            <View className="flex-row items-center gap-2 flex-wrap mb-4 overflow-hidden" style={{ height: 13 }}>
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
                {commentStatus[weather_log_id]?.commenters.map((commenter) => (
                  <Text key={commenter.user_id} className="text-[10px]">
                    {commenter.emoji}
                  </Text>
                ))}
              </View>
            </View>
          </BlurView>
          {unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex justify-center items-center">
              <Text className="text-white text-xs font-bold">{unreadCount}</Text>
            </View>
          )}
          <View className="flex-row justify-end">
            <Text className="text-xs" style={{ color: WeatherBoardColors.textMuted }}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </Pressable>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end">
          <BlurView intensity={40} tint="dark" className="flex-1 p-5" style={{ backgroundColor: WEATHER_CONFIG[weather].color }}>
            <View className="flex-row justify-between mb-5 mt-20">
              <Pressable onPress={() => setIsModalVisible(false)}>
                <BlurView intensity={40} tint="dark" style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WeatherBoardColors.glassBorder }}>
                  <Ionicons name="close" size={20} style={{ color: WeatherBoardColors.textPrimary }} />
                </BlurView>
              </Pressable>
              <TalkButton to_user_id={user_id} weather_log_id={weather_log_id} />
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
        </View>
      </Modal>
    </>
  );
}
