import { Alert, ImageBackground, Pressable, Text, View } from 'react-native';

import { WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function TabTwoScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('ログアウトに失敗しました。');
    else router.replace('/(auth)/login');
  };

  const backgroundImage = require('@/assets/images/weather/explore.png');
  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center gap-12 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <Pressable
        className="w-full py-6 px-2 rounded-xl flex justify-center items-center border"
        onPress={() => router.push('/(auth)/room-create')}
        style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルームを作成する
        </Text>
      </Pressable>

      <Pressable
        className="w-full py-6 px-2 rounded-xl flex justify-center items-center border"
        onPress={() => router.push('/(auth)/room-join')}
        style={{ backgroundColor: WeatherBoardColors.tertiaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          ルームに参加する
        </Text>
      </Pressable>

      <Pressable onPress={handleLogout} className="w-full py-6 px-2 rounded-xl flex justify-center items-center border"  style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          ログアウト
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/profile-edit')} className="w-full py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
        <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
          プロフィール編集
        </Text>
      </Pressable>

    </ImageBackground>
  );
}
