import React, { JSX, useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import { CARD_TEXT } from '@/constants/ui';
import { WeatherBoardColors } from '@/constants/theme';
import { CommentsStatus, WEATHER_CONFIG, WeatherType } from '@/lib/types';
import AvatarWeatherBadge from '@/components/AvatarWeatherBadge';

type WeatherCardProps = {
  nickname: string;
  avatar_emoji: string;
  weather: WeatherType;
  note: string | null;
  updated_at: string;
  weather_log_id: string;
  userId: string;
  unreadCount: number;
  tags: { id: string; name: string }[];
  commentStatus: CommentsStatus;
  reactionCount: number;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function WeatherCard({ nickname, avatar_emoji, weather, note, updated_at, weather_log_id, userId, unreadCount, tags, commentStatus, reactionCount }: WeatherCardProps): JSX.Element {
  const router = useRouter();
  const avatarPressedRef = useRef(false);
  const formattedDate = new Date(updated_at).toLocaleTimeString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const cardColor = WEATHER_CONFIG[weather].cardColor;

  const cardContent = (
    <View style={{ padding: 14 }}>
      <Pressable
        onPressIn={() => { avatarPressedRef.current = true; }}
        onPress={() => { router.push(`/user-profile?userId=${userId}`); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AvatarWeatherBadge avatarEmoji={avatar_emoji} weather={weather} size={32} variant="glass" />
        <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }} numberOfLines={1}>
          {nickname}
        </Text>
      </Pressable>
      <View className="mb-2">
        <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMutedDark, height: CARD_TEXT.noteHeight }} numberOfLines={2}>
          {note}
        </Text>
      </View>
      <View className="flex-row items-center gap-1.5 flex-wrap overflow-hidden mb-2" style={{ height: CARD_TEXT.tagRowHeight }}>
        {tags.map((tag) => (
          <View key={tag.id} style={{ backgroundColor: hexToRgba(cardColor, 0.5), borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text numberOfLines={1} className="text-[10px]" style={{ color: WeatherBoardColors.textPrimaryDark }}>
              #{tag.name}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-row items-center gap-2 mb-1">
        <View className="flex-row gap-1 items-center">
          <Ionicons name="chatbubble-ellipses-outline" size={12} color={WeatherBoardColors.textMutedDark} />
          <Text className="text-xs font-bold" style={{ color: WeatherBoardColors.textMutedDark }}>
            {commentStatus[weather_log_id]?.count > 0 ? commentStatus[weather_log_id]?.count : 0}
          </Text>
        </View>
        {reactionCount > 0 && (
          <View className="flex-row gap-1 items-center">
            <Ionicons name="heart-outline" size={12} color={WeatherBoardColors.textMutedDark} />
            <Text className="text-xs font-bold" style={{ color: WeatherBoardColors.textMutedDark }}>
              {reactionCount}
            </Text>
          </View>
        )}
        <View className="flex-row items-center gap-1">
          {commentStatus[weather_log_id]?.commenters.slice(0, 4).map((commenter) => (
            <Text key={commenter.user_id} className="text-[10px]">
              {commenter.emoji}
            </Text>
          ))}
          {(commentStatus[weather_log_id]?.commenters.length ?? 0) > 4 && (
            <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMutedDark }}>
              ...
            </Text>
          )}
        </View>
      </View>
      <Text className="text-[9px] text-right" style={{ color: WeatherBoardColors.textMutedDark }}>
        {formattedDate}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={() => {
        if (avatarPressedRef.current) {
          avatarPressedRef.current = false;
          return;
        }
        router.push(`/weather-log/${weather_log_id}`);
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
              <BlurView intensity={20} tint="light" pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.28) }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: '30%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.18) }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: '55%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.16) }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: '75%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.14) }} />
            </>
          ) : (
            <>
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.55) }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: '30%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.2) }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: '60%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.15) }} />
            </>
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
  );
}
