import { Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';

// ホーム画面に1行 <RoomChatFloatingButton /> を追加するだけで使えるセルフコンテインドなFAB。
// トークのハブ画面（/room-chat、ルーム一覧・DM切り替え）を開く。
export default function RoomChatFloatingButton() {
  const router = useRouter();
  const { rooms } = useRoom();
  const tabBarHeight = useBottomTabBarHeight();

  if (rooms.length === 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/room-chat')}
      style={{
        position: 'absolute',
        right: 20,
        bottom: tabBarHeight + 40,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WeatherBoardColors.buttonBackground,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
      }}>
      <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
    </Pressable>
  );
}
