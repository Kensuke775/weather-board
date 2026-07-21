import React, { ComponentProps, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import IconHeader from '@/components/IconHeader';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';
import { supabase } from '@/lib/supabase';

type LoadingName = 'loggingOut' | 'deletingAccount' | null;

type MenuItemProps = {
  label: string;
  description: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  onPress: () => void;
  danger?: boolean;
};

function MenuItem({ label, description, iconName, iconBg, onPress, danger = false }: MenuItemProps) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={iconName} size={22} color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? '#EF4444' : WeatherBoardColors.textPrimaryDark, fontWeight: '700', fontSize: 15 }}>{label}</Text>
        <Text style={{ color: WeatherBoardColors.textMutedBlack, fontSize: 11, marginTop: 2 }}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? 'rgba(239,68,68,0.5)' : WeatherBoardColors.textMutedBlack} />
    </Pressable>
  );
}

type ProfileSummary = {
  nickname: string;
  avatar_emoji: string;
  followerCount: number;
  followingCount: number;
};

export default function Settings() {
  const router = useRouter();
  const { user } = useUser();
  // 最後のメニュー項目がタブバーに隠れてスクロールし切れなくなるのを防ぐための下余白。
  const tabBarSpace = useTabBarSpace(24);
  const [isLoading, setIsLoading] = useState<LoadingName>(null);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      const fetchProfileSummary = async () => {
        const [profileResult, followerResult, followingResult] = await Promise.all([
          supabase.from('profiles').select('nickname, avatar_emoji').eq('user_id', user.id).single(),
          supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', user.id),
          supabase.from('follows').select('followed_id', { count: 'exact', head: true }).eq('follower_id', user.id),
        ]);
        if (profileResult.error) {
          console.error('[settings] fetchProfileSummary profile', profileResult.error.message);
          return;
        }
        setProfileSummary({
          nickname: profileResult.data.nickname,
          avatar_emoji: profileResult.data.avatar_emoji ?? '👤',
          followerCount: followerResult.count ?? 0,
          followingCount: followingResult.count ?? 0,
        });
      };
      fetchProfileSummary();
    }, [user?.id]),
  );

  const handleLogout = async () => {
    if (isLoading) return;
    setIsLoading('loggingOut');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[settings] handleLogout', error.message);
        Alert.alert('ログアウトに失敗しました。');
        return;
      }
    } finally {
      setIsLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (isLoading) return;
    setIsLoading('deletingAccount');
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        console.error('[settings] handleDeleteAccount', error.message);
        Alert.alert('アカウント削除に失敗しました。');
        return;
      }
      await supabase.auth.signOut();
    } finally {
      setIsLoading(null);
    }
  };

  const DIVIDER = <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginLeft: 76 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <IconHeader icon="settings-outline" title="Settings" subtitle="アカウントや各種設定を行います" />

      <ScrollView contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: tabBarSpace }}>
        {profileSummary && (
          <View style={{ ...CardStyle, borderRadius: 20, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: WeatherBoardColors.screenBackground, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 30 }}>{profileSummary.avatar_emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark, marginBottom: 6 }}>
                {profileSummary.nickname}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable
                  onPress={() => router.push('/follow-list?type=following')}
                  style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
                    {profileSummary.followingCount}
                  </Text>
                  <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>フォロー中</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/follow-list?type=followers')}
                  style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
                    {profileSummary.followerCount}
                  </Text>
                  <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>フォロワー</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        <View style={{ ...CardStyle, borderRadius: 20, overflow: 'hidden' }}>
          <MenuItem
            label="ルーム設定"
            description="ルームの作成・参加・一覧を管理します"
            iconName="people-outline"
            iconBg="#4CAF7D"
            onPress={() => router.push('/room-setup')}
          />
          {DIVIDER}
          <MenuItem
            label="プロフィール編集"
            description="ニックネームとアバターを変更します"
            iconName="person-outline"
            iconBg={WeatherBoardColors.buttonBackground}
            onPress={() => router.push('/profile-edit')}
          />
        </View>

        <Text style={{ fontSize: 12, fontWeight: '700', color: WeatherBoardColors.textMutedBlack, marginTop: 20, marginBottom: 8, marginLeft: 4 }}>
          アカウント設定
        </Text>
        <View style={{ ...CardStyle, borderRadius: 20, overflow: 'hidden' }}>
          <MenuItem
            label="ブロック一覧"
            description="ブロック中のユーザーを確認・解除します"
            iconName="ban-outline"
            iconBg="#A0A0A0"
            onPress={() => router.push('/block-list')}
          />
          {DIVIDER}
          <MenuItem
            label="利用規約"
            description="本アプリの利用規約を確認します"
            iconName="document-text-outline"
            iconBg="#A0A0A0"
            onPress={() => router.push('/terms')}
          />
          {DIVIDER}
          <MenuItem
            label="プライバシーポリシー"
            description="個人情報の取り扱いについて確認します"
            iconName="shield-checkmark-outline"
            iconBg="#A0A0A0"
            onPress={() => router.push('/privacy-policy')}
          />
          {DIVIDER}
          <MenuItem
            label="ログアウト"
            description="アカウントからログアウトします"
            iconName="log-out-outline"
            iconBg="#A0A0A0"
            onPress={() => {
              Alert.alert('確認', 'ログアウトしますか？', [
                { text: 'キャンセル', style: 'cancel' },
                { text: 'ログアウトする', onPress: handleLogout, style: 'default' },
              ]);
            }}
          />
          {DIVIDER}
          <MenuItem
            label="アカウントを削除"
            description="アカウントを完全に削除します"
            iconName="trash-outline"
            iconBg="#EF4444"
            danger
            onPress={() => {
              Alert.alert('確認', 'アカウントを削除しますか？\n削除すると元に戻せません。', [
                { text: 'キャンセル', style: 'cancel' },
                { text: '削除する', onPress: handleDeleteAccount, style: 'destructive' },
              ]);
            }}
          />
        </View>
      </ScrollView>

    </View>
  );
}
