import { ImageBackground, ScrollView, Text, View } from 'react-native';

import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';

import GlassButton from '@/components/GlassButton';
import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const backgroundImage = require('@/assets/images/weather/signup.png');

export default function AuthEula() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[eula] handleLogout', error.message);
      return;
    }
    router.replace('/(auth)/login');
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center px-6 pt-20 pb-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
      <Text className="text-4xl text-center mb-6" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
        Terms of Use
      </Text>

      <View className="flex-1 mb-6 p-4 rounded-xl bg-white">
        <ScrollView showsVerticalScrollIndicator={true}>
          <Text className="text-base font-bold mb-2">利用規約</Text>
          <Text className="text-sm mb-4">Weather Board（以下「本アプリ」）をご利用いただく前に、以下の内容をご確認のうえ同意してください。</Text>

          <Text className="text-sm font-bold mb-1">1. 禁止事項</Text>
          <Text className="text-sm mb-4">本アプリでは、以下に該当する投稿・コメント・行為を禁止します。違反が確認された場合、該当コンテンツの削除やアカウントの利用停止・削除を行うことがあります。{'\n'}・誹謗中傷、嫌がらせ、差別的な表現{'\n'}・暴力的、わいせつ、その他不適切な内容{'\n'}・他者になりすます行為、第三者の権利を侵害する行為{'\n'}・その他、法令や公序良俗に反する行為</Text>

          <Text className="text-sm font-bold mb-1">2. 通報・ブロック機能</Text>
          <Text className="text-sm mb-4">本アプリには、不適切な投稿・コメント・ユーザーを通報する機能、および迷惑なユーザーをブロックする機能があります。通報内容は運営者が確認し、必要に応じて対応します。</Text>

          <Text className="text-sm font-bold mb-1">3. アカウントの停止・削除</Text>
          <Text className="text-sm mb-4">本規約に違反したユーザーに対して、運営者は事前の通知なくコンテンツの削除、アカウントの利用停止または削除を行うことができます。</Text>

          <Text className="text-sm font-bold mb-1">4. 規約の変更</Text>
          <Text className="text-sm mb-4">本規約は必要に応じて変更することがあります。重要な変更がある場合は、アプリ内でお知らせします。</Text>

          <Text className="text-sm font-bold mb-1">5. お問い合わせ</Text>
          <Text className="text-sm mb-2">本規約に関するご質問は t.ypebob96@gmail.com までご連絡ください。</Text>
        </ScrollView>
      </View>

      <View className="flex gap-4">
        <GlassButton onPress={() => router.replace('/(auth)/profile-setup')} buttonText="同意して登録する" buttonIcon="checkmark-circle-outline" backgroundColor={WeatherBoardColors.accentBackground} />
        <GlassButton onPress={handleLogout} buttonText="同意しない（ログアウト）" buttonIcon="log-out-outline" backgroundColor={WeatherBoardColors.secondaryBackground} />
      </View>
    </ImageBackground>
  );
}
