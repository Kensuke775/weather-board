import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { TOAST_DURATION } from '@/constants/ui';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { startOrOpenConversation } from '@/lib/conversations';
import { supabase } from '@/lib/supabase';

type ProfileData = {
  nickname: string;
  avatar_emoji: string;
  prefecture: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

const fetchUserProfile = async (targetUserId: string, currentUserId: string): Promise<ProfileData | null> => {
  const [profileResult, followerResult, followingResult, followingCheckResult] = await Promise.all([
    supabase.from('profiles').select('nickname, avatar_emoji, prefecture').eq('user_id', targetUserId).single(),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', targetUserId),
    supabase.from('follows').select('followed_id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', currentUserId).eq('followed_id', targetUserId),
  ]);
  if (profileResult.error) {
    console.error('[user-profile] fetchUserProfile', profileResult.error.message);
    return null;
  }
  return {
    nickname: profileResult.data.nickname,
    avatar_emoji: profileResult.data.avatar_emoji ?? '👤',
    prefecture: profileResult.data.prefecture ?? null,
    followerCount: followerResult.count ?? 0,
    followingCount: followingResult.count ?? 0,
    isFollowing: (followingCheckResult.count ?? 0) > 0,
  };
};

export default function UserProfile() {
  const router = useRouter();
  const { user } = useUser();
  const { rooms } = useRoom();
  const { userId: targetUserId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isStartingDm, setIsStartingDm] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const isOwnProfile = user?.id === targetUserId;

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !targetUserId) return;
      setIsLoading(true);
      fetchUserProfile(targetUserId, user.id).then((data) => {
        setProfile(data);
        setIsLoading(false);
      });
    }, [user?.id, targetUserId]),
  );

  const handleToggleFollow = async () => {
    if (!user?.id || !targetUserId || !profile || isFollowLoading) return;
    setIsFollowLoading(true);

    const wasFollowing = profile.isFollowing;
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: !wasFollowing,
            followerCount: wasFollowing ? prev.followerCount - 1 : prev.followerCount + 1,
          }
        : prev,
    );

    if (wasFollowing) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', targetUserId);
      if (error) {
        console.error('[user-profile] unfollow', error.message);
        setProfile((prev) => prev ? { ...prev, isFollowing: true, followerCount: prev.followerCount + 1 } : prev);
      }
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: user.id, followed_id: targetUserId });
      if (error) {
        console.error('[user-profile] follow', error.message);
        setProfile((prev) => prev ? { ...prev, isFollowing: false, followerCount: prev.followerCount - 1 } : prev);
      } else {
        await supabase.from('notifications').insert({
          to_user_id: targetUserId,
          from_user_id: user.id,
          type: 'follow',
          weather_log_id: null,
          is_read: false,
        });
      }
    }

    setIsFollowLoading(false);
  };

  const handleSendDm = async () => {
    if (!user?.id || !targetUserId || isStartingDm) return;
    setIsStartingDm(true);
    try {
      const conversationId = await startOrOpenConversation(user.id, targetUserId);
      if (!conversationId) return;
      router.push(`/dm-chat/${conversationId}`);
    } finally {
      setIsStartingDm(false);
    }
  };

  const inviteToRoom = async (roomId: string, roomName: string) => {
    if (!user?.id || !targetUserId || isInviting) return;
    setIsInviting(true);
    try {
      const { data: existingMember } = await supabase.from('room_members').select('user_id').eq('room_id', roomId).eq('user_id', targetUserId).maybeSingle();
      if (existingMember) {
        Alert.alert(`すでに「${roomName}」に参加しています。`);
        return;
      }
      const { error } = await supabase.from('room_members').insert({ room_id: roomId, user_id: targetUserId });
      if (error) {
        console.error('[user-profile] inviteToRoom', error.message);
        Alert.alert('招待に失敗しました。');
        return;
      }
      const { error: notifyError } = await supabase.from('notifications').insert({
        to_user_id: targetUserId,
        from_user_id: user.id,
        type: 'room_join',
        room_id: roomId,
      });
      if (notifyError) console.error('[user-profile] inviteToRoom notify', notifyError.message);
      Toast.show({ type: 'success', text1: `「${roomName}」に招待しました`, visibilityTime: TOAST_DURATION.default });
    } finally {
      setIsInviting(false);
    }
  };

  const handleInviteToRoom = () => {
    if (rooms.length === 0) {
      Alert.alert('参加中のルームがありません。');
      return;
    }
    if (rooms.length === 1) {
      const room = rooms[0].rooms;
      inviteToRoom(room.id, room.name);
      return;
    }
    Alert.alert('招待するルームを選んでください', '', [
      ...rooms.map(({ rooms: room }) => ({ text: room.name, onPress: () => inviteToRoom(room.id, room.name) })),
      { text: 'キャンセル', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <Stack.Screen options={{ title: profile?.nickname ?? '' }} />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={WeatherBoardColors.buttonBackground} />
        </View>
      ) : !profile ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: WeatherBoardColors.textMutedBlack }}>プロフィールが見つかりません。</Text>
        </View>
      ) : (
        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ ...CardStyle, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: WeatherBoardColors.screenBackground, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 40 }}>{profile.avatar_emoji}</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
              {profile.nickname}
            </Text>
            {profile.prefecture && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={13} color={WeatherBoardColors.textMutedBlack} />
                <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack }}>{profile.prefecture}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 32, marginTop: 4 }}>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
                  {profile.followingCount}
                </Text>
                <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>フォロー中</Text>
              </View>
              <View style={{ width: 1, backgroundColor: WeatherBoardColors.divider }} />
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
                  {profile.followerCount}
                </Text>
                <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>フォロワー</Text>
              </View>
            </View>
            {!isOwnProfile && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                <Pressable
                  onPress={handleToggleFollow}
                  disabled={isFollowLoading}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: profile.isFollowing ? 'rgba(0,0,0,0.07)' : WeatherBoardColors.buttonBackground,
                    opacity: isFollowLoading ? 0.6 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                  <Ionicons
                    name={profile.isFollowing ? 'checkmark' : 'add'}
                    size={15}
                    color={profile.isFollowing ? WeatherBoardColors.textPrimaryDark : 'white'}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: profile.isFollowing ? WeatherBoardColors.textPrimaryDark : 'white' }}>
                    {profile.isFollowing ? 'フォロー中' : 'フォローする'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSendDm}
                  disabled={isStartingDm}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: 'rgba(0,0,0,0.07)',
                    opacity: isStartingDm ? 0.6 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                  <Ionicons name="chatbubble-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>DMを送る</Text>
                </Pressable>
                <Pressable
                  onPress={handleInviteToRoom}
                  disabled={isInviting}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: 'rgba(0,0,0,0.07)',
                    opacity: isInviting ? 0.6 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                  <Ionicons name="people-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>ルームに招待する</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
