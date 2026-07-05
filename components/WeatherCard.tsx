import React, { JSX, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

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

const PRIMARY_BROWN = '#624221';
const SECONDARY_BROWN = 'rgba(98,66,33,0.75)';
const MUTED_BROWN = 'rgba(98,66,33,0.55)';

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
  const cardColor = WEATHER_CONFIG[weather].cardColor;

  const cardContent = (
    <View style={{ padding: 14 }}>
      <View className="flex flex-row items-center gap-1 mb-2">
        <Text className="text-base">{avatar_emoji}</Text>
        <Text className="text-[12px] font-semibold flex-1" style={{ color: PRIMARY_BROWN }} numberOfLines={1}>
          {nickname}
        </Text>
        <Text className="text-lg">{WEATHER_CONFIG[weather].emoji}</Text>
      </View>
      <View className="mb-2">
        <Text className="text-[10px]" style={{ color: SECONDARY_BROWN, height: CARD_TEXT.noteHeight }} numberOfLines={2}>
          {note}
        </Text>
      </View>
      <View className="flex-row items-center gap-2 flex-wrap overflow-hidden mb-2" style={{ height: CARD_TEXT.tagRowHeight }}>
        {tags.map((tag) => (
          <Text key={tag.id} numberOfLines={1} className="text-[10px]" style={{ color: MUTED_BROWN }}>
            #{tag.name}
          </Text>
        ))}
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="flex-row gap-1 items-center">
            <Ionicons name="chatbubble-ellipses-outline" size={12} color={MUTED_BROWN} />
            <Text className="text-xs font-bold" style={{ color: MUTED_BROWN }}>
              {commentStatus[weather_log_id]?.count > 0 ? commentStatus[weather_log_id]?.count : 0}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            {commentStatus[weather_log_id]?.commenters.slice(0, 4).map((commenter) => (
              <Text key={commenter.user_id} className="text-[10px]">
                {commenter.emoji}
              </Text>
            ))}
            {(commentStatus[weather_log_id]?.commenters.length ?? 0) > 4 && (
              <Text className="text-[10px]" style={{ color: MUTED_BROWN }}>...</Text>
            )}
          </View>
        </View>
        <Text className="text-[9px]" style={{ color: MUTED_BROWN }}>
          {formattedDate}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <Pressable
        onPress={() => {
          setIsModalVisible(true);
          if (!userId) return;
          markAsRead(userId, weather_log_id);
        }}
        style={{ flex: 1, maxWidth: '50%' }}>
        {/* Shadow wrapper */}
        <View
          style={{
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          }}>
          {/* Clip wrapper with glass border */}
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              elevation: 4,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.55)',
            }}>
            {Platform.OS === 'ios' ? (
              <>
                <BlurView intensity={20} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                {/* Right-leaning gradient overlay */}
                <LinearGradient
                  colors={[hexToRgba(cardColor, 0.3), hexToRgba(cardColor, 0.78)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              </>
            ) : (
              <LinearGradient
                colors={[hexToRgba(cardColor, 0.5), cardColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            )}
            {cardContent}
          </View>
        </View>
        {unreadCount > 0 && (
          <View className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex justify-center items-center">
            <Text className="text-white text-xs font-bold">{unreadCount}</Text>
          </View>
        )}
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
