import React, { JSX } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import { CARD_TEXT } from '@/constants/ui';
import { CommentsStatus, WEATHER_CONFIG, WeatherType } from '@/lib/types';

type WeatherCardProps = {
  nickname: string;
  avatar_emoji: string;
  weather: WeatherType;
  note: string | null;
  updated_at: string;
  weather_log_id: string;
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

export default function WeatherCard({ nickname, avatar_emoji, weather, note, updated_at, weather_log_id, unreadCount, tags, commentStatus }: WeatherCardProps): JSX.Element {
  const router = useRouter();
  const formattedDate = new Date(updated_at).toLocaleTimeString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const cardColor = WEATHER_CONFIG[weather].cardColor;

  const cardContent = (
    <View style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {/* Avatar with badge backing */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.72)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }}>
          <Text style={{ fontSize: 16, lineHeight: 20 }}>{avatar_emoji}</Text>
        </View>
        {/* Centered name */}
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: PRIMARY_BROWN }} numberOfLines={1}>
          {nickname}
        </Text>
        {/* Weather emoji */}
        <Text style={{ fontSize: 18, width: 32, textAlign: 'right' }}>{WEATHER_CONFIG[weather].emoji}</Text>
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
              <Text className="text-[10px]" style={{ color: MUTED_BROWN }}>
                ...
              </Text>
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
    <Pressable onPress={() => router.push(`/weather-log/${weather_log_id}`)} style={{ flex: 1, maxWidth: '50%' }}>
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
              {/* Stepped right-leaning gradient (no native module required) */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.28) }} />
              <View style={{ position: 'absolute', top: 0, left: '30%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.18) }} />
              <View style={{ position: 'absolute', top: 0, left: '55%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.16) }} />
              <View style={{ position: 'absolute', top: 0, left: '75%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.14) }} />
            </>
          ) : (
            <>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.55) }} />
              <View style={{ position: 'absolute', top: 0, left: '30%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.2) }} />
              <View style={{ position: 'absolute', top: 0, left: '60%', right: 0, bottom: 0, backgroundColor: hexToRgba(cardColor, 0.15) }} />
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
