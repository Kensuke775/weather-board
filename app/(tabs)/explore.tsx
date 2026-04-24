import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function TabTwoScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('ログアウトに失敗しました。');
    else router.replace('/(auth)/login');
  };
  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={<IconSymbol size={310} color="#808080" name="chevron.left.forwardslash.chevron.right" style={styles.headerImage} />}>
      <Pressable onPress={handleLogout} className="mb-12">
        <Text>ログアウト</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(auth)/room-create')} className="mb-12">
        <Text>ルームを作成する</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(auth)/room-join')} className="mb-12">
        <Text>ルームに参加する</Text>
      </Pressable>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
