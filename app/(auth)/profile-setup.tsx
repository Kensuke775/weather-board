import { useState } from 'react';
import { Alert, ImageBackground, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';

import GlassButton from '@/components/GlassButton';
import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/profile-setup.png');
const AVATARS = [
  // 動物
  '🐶',
  '🐱',
  '🐭',
  '🐹',
  '🐰',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐸',
  '🐵',
  '🐔',
  '🐧',
  '🐦',
  '🦆',
  '🦉',
  '🐺',
  '🐴',
  '🦄',
  '🐝',
  '🦋',
  '🐢',
  '🐬',
  '🦭',
  '🐙',
  '🐿️',
  '🦔',
  // 食べ物・かわいい系
  '🍓',
  '🍑',
  '🍒',
  '🍰',
  '🧁',
  '🍩',
  '🍪',
  '🧸',
  // 自然・植物
  '🌸',
  '🌼',
  '🌻',
  '🍄',
  '🌈',
  '⭐',
  '🌙',
  '☁️',
  // キャラ系
  '👻',
  '🤖',
  '👾',
  '🎃',
];

export default function ProfileSetUp() {
  const { user } = useUser();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userId = user?.id;

  const handleSaveProfile = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!userId) {
        Alert.alert('ユーザーが取得できませんでした。');
        return;
      }
      if (nickname === '') {
        Alert.alert('ニックネームの入力欄が空になっています。');
        return;
      }
      if (avatar === '') {
        Alert.alert('アバターを選んでください。');
        return;
      }
      const { error } = await supabase.from('profiles').upsert({ user_id: userId, nickname, avatar_emoji: avatar }, { onConflict: 'user_id' });
      if (error) {
        console.error('[profile-setup] handleSaveProfile', error.message);
        Alert.alert('プロフィール作成に失敗しました。');
        return;
      }
      router.replace('/(auth)/room-setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
      <ImageBackground source={backgroundImage} className="flex-1 px-10">
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 40, paddingVertical: 40 }}>
          <View className="justify-center flex-1">
            <Text className="text-4xl text-center mb-10" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
              Profile SetUp
            </Text>

            <View className="mb-6">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                ニックネームを入力してください。
              </Text>
              <TextInput value={nickname} onChangeText={setNickname} placeholder="テキストを入力してください。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
            </View>

            <View className="mb-4">
              <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                アバターを選んでください。
              </Text>

              <View className="relative flex items-center p-4 overflow-hidden" style={{ borderRadius: 16 }}>
                <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }} />
                <View className="flex-row gap-2 flex-wrap justify-center mb-4">
                  {AVATARS.map((item) => (
                    <Pressable key={item} onPress={() => setAvatar(item)} style={{ opacity: avatar === item ? 1 : 0.5 }}>
                      <Text className="text-3xl">{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
            <View className="flex gap-4">
              <GlassButton onPress={handleSaveProfile} buttonText="保存する" buttonIcon="checkmark-outline" backgroundColor={WeatherBoardColors.accentBackground} />
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </Pressable>
  );
}
