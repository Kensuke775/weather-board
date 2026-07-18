import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';

export default function TalkHubScreen() {
  const router = useRouter();
  const { rooms } = useRoom();
  const [activeTab, setActiveTab] = useState<'room' | 'dm'>('room');

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      {/* ルーム / DM 切り替えピル */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 100, padding: 4, gap: 4 }}>
          <Pressable
            onPress={() => setActiveTab('room')}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 100,
              backgroundColor: activeTab === 'room' ? WeatherBoardColors.buttonBackground : 'transparent',
            }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'room' ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark }}>
              ルーム
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('dm')}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 100,
              backgroundColor: activeTab === 'dm' ? WeatherBoardColors.buttonBackground : 'transparent',
            }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'dm' ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark }}>
              DM
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'dm' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textMutedBlack, textAlign: 'center' }}>
            DMは近日公開予定です
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
          {rooms.length === 0 && (
            <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack, textAlign: 'center', paddingTop: 24 }}>
              まだルームに参加していません
            </Text>
          )}
          {rooms.map(({ rooms: room }) => (
            <Pressable
              key={room.id}
              onPress={() => router.push(`/room-chat/${room.id}`)}
              style={{
                ...CardStyle,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{room.icon_emoji ?? '⛅'}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }} numberOfLines={1}>
                {room.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
