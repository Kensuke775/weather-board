import { useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';

import { useUser } from '@/context/UserContext';
import { Fonts, WeatherBoardColors } from '@/constants/theme';
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
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  const handleSaveProfile = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!user) {
      setIsSubmitting(false);
      Alert.alert('ユーザーが取得できませんでした。');
      return;
    }
    if (nickname === '') {
      setIsSubmitting(false);
      Alert.alert('ニックネームの入力欄が空になっています。');
      return;
    }
    if (avatar === '') {
      setIsSubmitting(false);
      Alert.alert('アバターを選んでください。');
      return;
    }
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, nickname, avatar_emoji: avatar }, { onConflict: 'user_id' });
    if (error) {
      setIsSubmitting(false);
      console.error('[profile-setup] handleSaveProfile', error.message);
      Alert.alert('プロフィール作成に失敗しました。');
      return;
    }
    router.replace('/(auth)/room-setup');
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} className="flex-1 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}/>
      <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 40, paddingVertical: 40 }}>
        <View className="justify-center flex-1 gap-10">
          <Text className="text-4xl text-center" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
            Profile SetUp
          </Text>

          <View>
            <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              ニックネームを考えてください。
            </Text>
            <TextInput value={nickname} onChangeText={setNickname} placeholder="テキストを入力してください。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
          </View>

          <View>
            <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              アバターを選んでください。
            </Text>

            <View className="relative flex items-center p-4 overflow-hidden" style={{ borderRadius: 16 }}>
              <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}/>
              <View className="flex-row gap-3 flex-wrap justify-center mb-4">
                {isExpanded
                  ? AVATARS.map((item) => (
                      <Pressable key={item} onPress={() => setAvatar(item)} style={{ opacity: avatar === item ? 1 : 0.6 }}>
                        <Text className="text-4xl">{item}</Text>
                      </Pressable>
                    ))
                  : AVATARS.slice(0, 10).map((item) => (
                      <Pressable key={item} onPress={() => setAvatar(item)} style={{ opacity: avatar === item ? 1 : 0.6 }}>
                        <Text className="text-4xl">{item}</Text>
                      </Pressable>
                    ))}
              </View>
              <Pressable onPress={() => setIsExpanded(!isExpanded)}>
                <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                  さらに表示
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={handleSaveProfile} className="py-6 px-2 rounded-xl flex justify-center items-center border" style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
              保存する
            </Text>
          </Pressable>

          <Pressable
            className="py-6 px-2 rounded-xl flex justify-center items-center border"
            onPress={() => router.replace('/(auth)/login')}
            style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              ログイン画面に戻る
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
