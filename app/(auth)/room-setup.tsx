import { useState } from 'react';
import {
  Alert,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/AuthHeader';
import { BrownTheme, Fonts } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/login.png');

const ROOM_ICONS = ['☀️', '⛅', '🌧️', '🌈', '❄️', '🌙'];

export default function RoomSetup() {
  const router = useRouter();
  const { user } = useUser();
  const { rooms, refreshRooms, setCurrentRoomId } = useRoom();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const [selectedIcon, setSelectedIcon] = useState('☀️');
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [openMenuRoomId, setOpenMenuRoomId] = useState<string | null>(null);
  const [isLeavingRoomId, setIsLeavingRoomId] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      if (roomName.trim() === '') {
        Alert.alert('ルーム名を入力してください。');
        return;
      }
      if (!user?.id) {
        Alert.alert('ユーザーが取得できませんでした。');
        return;
      }
      const roomId = Crypto.randomUUID();
      const { error: roomError } = await supabase.from('rooms').insert({
        id: roomId,
        name: roomName.trim(),
        invite_code: Math.random().toString(36).slice(2, 8),
        created_by: user.id,
        icon_emoji: selectedIcon,
      });
      if (roomError) {
        console.error('[room-setup] handleCreateRoom', roomError.message);
        Alert.alert('ルームの作成に失敗しました。');
        return;
      }
      const { error: memberError } = await supabase.from('room_members').insert({
        room_id: roomId,
        user_id: user.id,
      });
      if (memberError) {
        console.error('[room-setup] handleCreateRoom member', memberError.message);
        Alert.alert('ルームメンバーの記録に失敗しました。');
        return;
      }
      await refreshRooms();
      setRoomName('');
      setCurrentRoomId(roomId);
      router.replace('/(tabs)');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      if (inviteCode.trim() === '') {
        Alert.alert('招待コードを入力してください。');
        return;
      }
      if (!user?.id) {
        Alert.alert('ユーザーが取得できませんでした。');
        return;
      }
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('invite_code', inviteCode.trim())
        .single();
      if (roomError) {
        console.error('[room-setup] handleJoinRoom', roomError.message);
        Alert.alert('招待コードが正しくありません。');
        return;
      }
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', roomData.id)
        .eq('user_id', user.id);
      if (existingMember && existingMember.length > 0) {
        Alert.alert('すでに参加しているルームです。');
        return;
      }
      const { error: memberError } = await supabase.from('room_members').insert({
        room_id: roomData.id,
        user_id: user.id,
      });
      if (memberError) {
        console.error('[room-setup] handleJoinRoom member', memberError.message);
        Alert.alert('参加に失敗しました。');
        return;
      }
      await refreshRooms();
      setInviteCode('');
      setCurrentRoomId(roomData.id);
      router.replace('/(tabs)');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyInviteCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setOpenMenuRoomId(null);
    Alert.alert('招待コードをコピーしました。');
  };

  const handleLeaveRoom = async (roomId: string) => {
    if (isLeavingRoomId) return;
    setIsLeavingRoomId(roomId);
    setOpenMenuRoomId(null);
    try {
      if (!user?.id) return;
      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);
      if (error) {
        console.error('[room-setup] handleLeaveRoom', error.message);
        Alert.alert('退出に失敗しました。');
        return;
      }
      await refreshRooms();
    } finally {
      setIsLeavingRoomId(null);
    }
  };

  const handlePasteInviteCode = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setInviteCode(text.trim());
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => { Keyboard.dismiss(); setOpenMenuRoomId(null); }}>
          <Pressable onPress={Keyboard.dismiss}>

            <AuthHeader title="Room Setup" subtitle="ルームを設定しましょう" />

            {/* タブカード */}
            <View style={{
              marginHorizontal: 24,
              backgroundColor: BrownTheme.cardBackground,
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 10,
            }}>

              {/* タブスイッチャー */}
              <View style={{ flexDirection: 'row' }}>
                <Pressable
                  onPress={() => setActiveTab('create')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 14,
                    backgroundColor: activeTab === 'create' ? BrownTheme.buttonBackground : 'transparent',
                  }}>
                  <Text style={{ fontSize: 14 }}>🌿</Text>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: activeTab === 'create' ? 'white' : BrownTheme.mutedText,
                  }}>ルームを作成</Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('join')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 14,
                    backgroundColor: activeTab === 'join' ? BrownTheme.buttonBackground : 'transparent',
                  }}>
                  <Ionicons
                    name="enter-outline"
                    size={16}
                    color={activeTab === 'join' ? 'white' : BrownTheme.mutedText}
                  />
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: activeTab === 'join' ? 'white' : BrownTheme.mutedText,
                  }}>ルームに参加</Text>
                </Pressable>
              </View>

              {/* タブコンテンツ */}
              <View style={{ padding: 20 }}>
                {activeTab === 'create' ? (
                  <View style={{ gap: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14 }}>🌿</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>
                        ルーム名を入力してください
                      </Text>
                    </View>

                    {/* アイコン選択 */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {ROOM_ICONS.map((emoji) => (
                        <Pressable
                          key={emoji}
                          onPress={() => setSelectedIcon(emoji)}
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 12,
                            backgroundColor: 'white',
                            borderWidth: 2,
                            borderColor: selectedIcon === emoji ? BrownTheme.buttonBackground : BrownTheme.contentBorder,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Text style={{ fontSize: 24 }}>{emoji}</Text>
                          {selectedIcon === emoji && (
                            <View style={{
                              position: 'absolute',
                              bottom: -5,
                              right: -5,
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: BrownTheme.buttonBackground,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Ionicons name="checkmark" size={11} color="white" />
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>

                    {/* ルーム名入力 */}
                    <View>
                      <TextInput
                        value={roomName}
                        onChangeText={(text) => setRoomName(text.slice(0, 30))}
                        placeholder="例）読書カフェ、今日の空..."
                        placeholderTextColor={BrownTheme.mutedText}
                        autoCapitalize="none"
                        style={{
                          backgroundColor: 'white',
                          borderRadius: 12,
                          paddingVertical: 13,
                          paddingHorizontal: 14,
                          fontSize: 14,
                          color: BrownTheme.primaryText,
                          marginBottom: 4,
                        }}
                      />
                      <Text style={{ fontSize: 11, color: BrownTheme.mutedText, textAlign: 'right' }}>
                        {roomName.length} / 30
                      </Text>
                    </View>

                    {/* 公開/非公開 */}
                    <View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                          onPress={() => setIsPublic(true)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: isPublic ? BrownTheme.buttonBackground : 'white',
                            borderWidth: isPublic ? 0 : 1,
                            borderColor: BrownTheme.contentBorder,
                          }}>
                          <Ionicons name="globe-outline" size={16} color={isPublic ? 'white' : BrownTheme.mutedText} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: isPublic ? 'white' : BrownTheme.mutedText }}>
                            公開
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setIsPublic(false)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: !isPublic ? BrownTheme.buttonBackground : 'white',
                            borderWidth: !isPublic ? 0 : 1,
                            borderColor: BrownTheme.contentBorder,
                          }}>
                          <Ionicons name="lock-closed-outline" size={16} color={!isPublic ? 'white' : BrownTheme.mutedText} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: !isPublic ? 'white' : BrownTheme.mutedText }}>
                            非公開
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={{ fontSize: 11, color: BrownTheme.mutedText, marginTop: 6 }}>
                        非公開の場合は招待コードで参加できます
                      </Text>
                    </View>

                    {/* 作成ボタン */}
                    <Pressable onPress={handleCreateRoom} disabled={isCreating} style={{ opacity: isCreating ? 0.7 : 1 }}>
                      <View style={{
                        backgroundColor: BrownTheme.buttonBackground,
                        borderRadius: 12,
                        paddingVertical: 15,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}>
                        <Text style={{ fontSize: 15 }}>🌿</Text>
                        <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>ルームを作成する</Text>
                      </View>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14 }}>🌿</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>
                        招待コードを入力してください
                      </Text>
                    </View>

                    <View>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        marginBottom: 6,
                      }}>
                        <TextInput
                          value={inviteCode}
                          onChangeText={setInviteCode}
                          placeholder="招待コードを入力"
                          placeholderTextColor={BrownTheme.mutedText}
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={{
                            flex: 1,
                            paddingVertical: 13,
                            fontSize: 14,
                            color: BrownTheme.primaryText,
                          }}
                        />
                        <Pressable onPress={handlePasteInviteCode} hitSlop={8}>
                          <Ionicons name="clipboard-outline" size={20} color={BrownTheme.mutedText} />
                        </Pressable>
                      </View>
                      <Text style={{ fontSize: 11, color: BrownTheme.mutedText }}>コードは6文字の英数字です</Text>
                    </View>

                    <Pressable onPress={handleJoinRoom} disabled={isJoining} style={{ opacity: isJoining ? 0.7 : 1 }}>
                      <View style={{
                        backgroundColor: BrownTheme.buttonBackground,
                        borderRadius: 12,
                        paddingVertical: 15,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}>
                        <Ionicons name="enter-outline" size={18} color="white" />
                        <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>参加する</Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* 参加中のルーム */}
            <View style={{ marginTop: 28, paddingHorizontal: 24, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14 }}>🌿</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: BrownTheme.primaryText }}>参加中のルーム</Text>
              </View>

              {rooms.length === 0 && (
                <Text style={{ fontSize: 13, color: BrownTheme.mutedText, textAlign: 'center', paddingVertical: 16 }}>
                  まだルームに参加していません
                </Text>
              )}

              {rooms.map((item) => (
                <View key={item.rooms.id} style={{ position: 'relative' }}>
                  <View style={{
                    backgroundColor: BrownTheme.cardBackground,
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 3,
                  }}>
                    {/* アイコン */}
                    <View style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: '#FFF3DC',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 28 }}>⛅</Text>
                    </View>

                    {/* ルーム名 */}
                    <Text
                      style={{ flex: 1, fontSize: 15, fontWeight: '700', color: BrownTheme.primaryText }}
                      numberOfLines={1}>
                      {item.rooms.name}
                    </Text>

                    {/* 開くボタン */}
                    <Pressable
                      onPress={() => { setCurrentRoomId(item.rooms.id); router.replace('/(tabs)'); }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                        borderWidth: 1,
                        borderColor: BrownTheme.contentBorder,
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}>
                      <Text style={{ fontSize: 13, color: BrownTheme.primaryText, fontWeight: '500' }}>開く</Text>
                      <Ionicons name="chevron-forward" size={14} color={BrownTheme.primaryText} />
                    </Pressable>

                    {/* ...メニュートリガー */}
                    <Pressable
                      onPress={() => setOpenMenuRoomId(openMenuRoomId === item.rooms.id ? null : item.rooms.id)}
                      hitSlop={8}>
                      <Ionicons name="ellipsis-horizontal" size={20} color={BrownTheme.mutedText} />
                    </Pressable>
                  </View>

                  {/* ...ドロップダウンメニュー */}
                  {openMenuRoomId === item.rooms.id && (
                    <View style={{
                      position: 'absolute',
                      right: 0,
                      top: 60,
                      backgroundColor: 'white',
                      borderRadius: 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 12,
                      elevation: 8,
                      minWidth: 172,
                      zIndex: 100,
                    }}>
                      <Pressable
                        onPress={() => handleCopyInviteCode(item.rooms.invite_code ?? '')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                        <Ionicons name="copy-outline" size={16} color={BrownTheme.primaryText} />
                        <Text style={{ fontSize: 14, color: BrownTheme.primaryText }}>招待コードをコピー</Text>
                      </Pressable>
                      <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder }} />
                      <Pressable
                        onPress={() => handleLeaveRoom(item.rooms.id)}
                        disabled={isLeavingRoomId === item.rooms.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          padding: 14,
                          opacity: isLeavingRoomId === item.rooms.id ? 0.5 : 1,
                        }}>
                        <Ionicons name="exit-outline" size={16} color="#C0392B" />
                        <Text style={{ fontSize: 14, color: '#C0392B' }}>ルームを退出</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
