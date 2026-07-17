import { ScrollView, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AvatarItem } from '@/components/AvatarItem';
import { WeatherBoardColors } from '@/constants/theme';

const AVATARS = [
  // 動物
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦉',
  '🐺', '🐴', '🦄', '🐝', '🦋', '🐢', '🐬', '🦭', '🐿️', '🦔',
  // 食べ物・かわいい系
  '🍓', '🍰', '🧁', '🍩', '🍪', '🧸',
  // 自然・植物
  '🌸', '🌼', '🌻', '🍄', '🌈', '⭐', '🌙',
  // キャラ系
  '👻', '🤖', '👾', '🎃',
];

type ProfileFormProps = {
  nickname: string;
  onChangeNickname: (text: string) => void;
  avatar: string;
  onChangeAvatar: (emoji: string) => void;
};

export function ProfileForm({ nickname, onChangeNickname, avatar, onChangeAvatar }: ProfileFormProps) {
  const avatarColumns = AVATARS.reduce<string[][]>((acc, emoji, i) => {
    const colIndex = Math.floor(i / 2);
    if (!acc[colIndex]) acc[colIndex] = [];
    acc[colIndex].push(emoji);
    return acc;
  }, []);

  return (
    <View>
      {/* アバタープレビュー */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: 'white',
          borderWidth: 2,
          borderColor: avatar ? WeatherBoardColors.buttonBackground : WeatherBoardColors.divider,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        }}>
          {avatar ? (
            <Text style={{ fontSize: 50 }}>{avatar}</Text>
          ) : (
            <Ionicons name="person-outline" size={36} color={WeatherBoardColors.textMutedBlack} />
          )}
        </View>
      </View>

      {/* ニックネーム */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Ionicons name="person-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>ニックネームを入力</Text>
        </View>
        <TextInput
          value={nickname}
          onChangeText={onChangeNickname}
          placeholder="ニックネームを入力"
          placeholderTextColor={WeatherBoardColors.textMutedBlack}
          autoCapitalize="none"
          maxLength={6}
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.12)',
            paddingVertical: 13,
            paddingHorizontal: 14,
            fontSize: 14,
            color: WeatherBoardColors.textPrimaryDark,
          }}
        />
      </View>

      {/* アバター選択（2行横スクロール） */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Ionicons name="happy-outline" size={15} color={WeatherBoardColors.textPrimaryDark} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>アバターを選んでください</Text>
        </View>
        <View style={{ position: 'relative' }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingVertical: 4, paddingRight: 28 }}>
            {avatarColumns.map((column, colIndex) => (
              <View key={colIndex} style={{ gap: 10 }}>
                {column.map((emoji) => (
                  <AvatarItem
                    key={emoji}
                    emoji={emoji}
                    isSelected={avatar === emoji}
                    onPress={() => onChangeAvatar(emoji)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.85)',
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
            }}>
            <Ionicons name="chevron-forward" size={14} color={WeatherBoardColors.textMutedBlack} />
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack, marginTop: 16, textAlign: 'center' }}>
        ニックネームとアバターはいつでも変更できます
      </Text>
    </View>
  );
}
