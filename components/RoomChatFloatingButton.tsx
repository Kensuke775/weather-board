import { Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { WeatherBoardColors } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';

// ホーム画面に1行 <RoomChatFloatingButton /> を追加するだけで使えるセルフコンテインドなFAB。
// トークのハブ画面（/room-chat、ルーム一覧・DM切り替え）を開く。
// ルーム未参加でもDMタブは使えるため、ルーム数に関わらず常に表示する。
export default function RoomChatFloatingButton() {
  const router = useRouter();
  const tabBarTop = useTabBarSpace(16);

  return (
    <Pressable
      onPress={() => router.push('/room-chat')}
      style={{
        position: 'absolute',
        right: 20,
        bottom: tabBarTop,
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
