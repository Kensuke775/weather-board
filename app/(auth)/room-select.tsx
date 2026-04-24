import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function RoomSelect() {
  const router = useRouter();
  return (
    <View className="flex justify-center w-full h-full">
      <View>
        <Pressable onPress={() => router.replace('/(auth)/room-create')} className="mb-12">
          <Text>ルームを作る</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/(auth)/room-join')} className="mb-12">
          <Text>招待コードで参加する</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(auth)/login')} className="mb-12">
          <Text>ログイン画面に戻る</Text>
        </Pressable>
      </View>
    </View>
  );
}
