import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type ProfileEdit = {
  nickname: string;
  avatar_emoji: string;
};

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
  const [profileData, setProfileData] = useState<ProfileEdit | null>();
  const [inputText, setInputText] = useState(profileData?.nickname);
  const [selectedAvatar, setSelectedAvatar] = useState(profileData?.avatar_emoji);
  const router = useRouter();

  const fetchProfileData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーが取得できませんでした。');

    const { data: profileData, error: profileError } = await supabase.from('profiles').select('nickname, avatar_emoji').eq('user_id', user.id).single();
    if (profileError) Alert.alert(profileError.message);
    setProfileData(profileData);
    setSelectedAvatar(profileData?.avatar_emoji);
    setInputText(profileData?.nickname);
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSaveProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーが取得できませんでした。');
    const { error: profileUpsertError } = await supabase.from('profiles').update({ nickname: inputText, avatar_emoji: selectedAvatar }).eq('user_id', user.id);
    if (profileUpsertError) return Alert.alert(profileUpsertError.message);
  };

  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  if (!fontsLoaded) return null;
  return (
    <ImageBackground source={backgroundImage} className="flex-1 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 40, paddingVertical: 100 }}>
        <View className="justify-center flex-1 gap-10">
          <Text className="text-4xl text-center" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
            Profile Edit
          </Text>

          <View>
            <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              ニックネームを変更してください。
            </Text>
            <TextInput value={inputText} onChangeText={setInputText} placeholder="テキストを入力してください。" autoCapitalize="none" className="bg-white py-4 px-2 rounded-xl" />
          </View>

          <View>
            <Text className="mb-2 text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              アバターを変更してください。
            </Text>

            <View className="relative flex items-center p-4 overflow-hidden" style={{ borderRadius: 16 }}>
              <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}></View>
              <View className="flex-row gap-3 flex-wrap justify-center mb-4">
                {AVATARS.map((item) => (
                  <Pressable key={item} onPress={() => setSelectedAvatar(item)} style={{ opacity: selectedAvatar === item ? 1 : 0.6 }}>
                    <Text className="text-4xl">{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => {
              handleSaveProfile();
              router.replace('/(tabs)/settings');
            }}
            className="py-6 px-2 rounded-xl flex justify-center items-center border"
            style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-base font-bold " style={{ color: WeatherBoardColors.textPrimary }}>
              保存する
            </Text>
          </Pressable>

          <Pressable
            className="py-6 px-2 rounded-xl flex justify-center items-center border"
            onPress={() => router.replace('/(tabs)/settings')}
            style={{ backgroundColor: WeatherBoardColors.secondaryBackground, borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              設定画面に戻る
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
