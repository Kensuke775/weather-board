import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { PREFECTURES } from '@/constants/prefectures';
import { WeatherBoardColors } from '@/constants/theme';

const ROOM_ICONS = ['☀️', '⛅', '🌧️', '🌈', '❄️', '🌙'];

type RoomSetupFormProps = {
  activeTab: 'create' | 'join';
  onChangeTab: (tab: 'create' | 'join') => void;
  selectedIcon: string;
  onChangeIcon: (emoji: string) => void;
  roomName: string;
  onChangeRoomName: (text: string) => void;
  prefecture: string | null;
  onChangePrefecture: (prefecture: string | null) => void;
  inviteCode: string;
  onChangeInviteCode: (text: string) => void;
  onPasteInviteCode: () => void;
};

export function RoomSetupForm({
  activeTab,
  onChangeTab,
  selectedIcon,
  onChangeIcon,
  roomName,
  onChangeRoomName,
  prefecture,
  onChangePrefecture,
  inviteCode,
  onChangeInviteCode,
  onPasteInviteCode,
}: RoomSetupFormProps) {
  const [isPrefecturePickerOpen, setIsPrefecturePickerOpen] = useState(false);
  return (
    <View style={{ gap: 20 }}>
      {/* タブスイッチャー */}
      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 100, padding: 4, gap: 4 }}>
        <Pressable
          onPress={() => onChangeTab('create')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: 100,
            backgroundColor: activeTab === 'create' ? WeatherBoardColors.buttonBackground : 'transparent',
          }}>
          <Ionicons name="add-circle-outline" size={16} color={activeTab === 'create' ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'create' ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark }}>
            ルームを作成
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeTab('join')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: 100,
            backgroundColor: activeTab === 'join' ? WeatherBoardColors.buttonBackground : 'transparent',
          }}>
          <Ionicons name="enter-outline" size={16} color={activeTab === 'join' ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'join' ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark }}>
            ルームに参加
          </Text>
        </Pressable>
      </View>

      {activeTab === 'create' ? (
        <View style={{ gap: 20 }}>
          {/* アイコン選択 */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
              ルームのアイコンを設定してください
            </Text>
            <View style={{ position: 'relative' }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 28, paddingVertical: 8 }}>
                {ROOM_ICONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => onChangeIcon(emoji)}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      backgroundColor: 'white',
                      borderWidth: 2,
                      borderColor: selectedIcon === emoji ? WeatherBoardColors.buttonBackground : WeatherBoardColors.divider,
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
                        backgroundColor: WeatherBoardColors.buttonBackground,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Ionicons name="checkmark" size={11} color="white" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                }}>
                <Ionicons name="chevron-forward" size={14} color={WeatherBoardColors.textMutedBlack} />
              </View>
            </View>
          </View>

          {/* ルーム名入力 */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
              ルーム名を入力してください
            </Text>
            <TextInput
              value={roomName}
              onChangeText={onChangeRoomName}
              placeholder="例）読書カフェ、今日の空..."
              placeholderTextColor={WeatherBoardColors.textMutedBlack}
              autoCapitalize="none"
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.12)',
                paddingVertical: 13,
                paddingHorizontal: 14,
                fontSize: 14,
                color: WeatherBoardColors.textPrimaryDark,
                marginBottom: 4,
              }}
            />
            <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack, textAlign: 'right' }}>
              {roomName.length} / 30
            </Text>
          </View>

          {/* 都道府県（任意） */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
              都道府県(任意)
            </Text>
            <Pressable
              onPress={() => setIsPrefecturePickerOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'white',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.12)',
                paddingHorizontal: 14,
                paddingVertical: 13,
              }}>
              <Text style={{ fontSize: 14, color: prefecture ? WeatherBoardColors.textPrimaryDark : WeatherBoardColors.textMutedBlack }}>
                {prefecture ?? '未設定'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={WeatherBoardColors.textMutedBlack} />
            </Pressable>
          </View>

          <Modal visible={isPrefecturePickerOpen} animationType="slide" presentationStyle="pageSheet">
            <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: WeatherBoardColors.divider }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>都道府県を選択</Text>
                <Pressable onPress={() => setIsPrefecturePickerOpen(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={WeatherBoardColors.textPrimaryDark} />
                </Pressable>
              </View>
              <FlatList
                data={PREFECTURES}
                keyExtractor={(item) => item}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider }} />}
                ListHeaderComponent={
                  <Pressable
                    onPress={() => { onChangePrefecture(null); setIsPrefecturePickerOpen(false); }}
                    style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 15, color: WeatherBoardColors.textMutedBlack }}>未設定に戻す</Text>
                    {prefecture === null && <Ionicons name="checkmark" size={18} color={WeatherBoardColors.buttonBackground} />}
                  </Pressable>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { onChangePrefecture(item); setIsPrefecturePickerOpen(false); }}
                    style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 15, color: WeatherBoardColors.textPrimaryDark }}>{item}</Text>
                    {prefecture === item && <Ionicons name="checkmark" size={18} color={WeatherBoardColors.buttonBackground} />}
                  </Pressable>
                )}
              />
            </View>
          </Modal>
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
            招待コードを入力してください
          </Text>

          <View>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.12)',
              paddingHorizontal: 14,
              marginBottom: 6,
            }}>
              <TextInput
                value={inviteCode}
                onChangeText={onChangeInviteCode}
                placeholder="招待コードを入力"
                placeholderTextColor={WeatherBoardColors.textMutedBlack}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  fontSize: 14,
                  color: WeatherBoardColors.textPrimaryDark,
                }}
              />
              <Pressable onPress={onPasteInviteCode} hitSlop={8}>
                <Ionicons name="clipboard-outline" size={20} color={WeatherBoardColors.textMutedBlack} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>コードは6文字の英数字です</Text>
          </View>
        </View>
      )}
    </View>
  );
}
