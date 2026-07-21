import { Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { WeatherBoardColors } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';

export default function JapanMapFloatingButton() {
  const router = useRouter();
  const tabBarTop = useTabBarSpace(16);

  return (
    <Pressable
      onPress={() => router.push('/japan-map')}
      style={{
        position: 'absolute',
        left: 20,
        bottom: tabBarTop,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.92)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
      }}>
      <Ionicons name="map-outline" size={24} color={WeatherBoardColors.textPrimaryDark} />
    </Pressable>
  );
}
