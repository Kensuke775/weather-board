import { Animated, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { BlurView } from 'expo-blur';

import { WeatherBoardColors } from '@/constants/theme';
import { RoomMember } from '@/lib/types';

type RoomMemberPanelProps = {
  roomMember: RoomMember[];
  userId: string | undefined;
  visible: boolean;
  slideAnim: Animated.Value;
  onClose: () => void;
};

const truncateName = (name: string | undefined | null, maxLength = 5) => {
  if (!name) return '';
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
};

export default function RoomMemberPanel({ roomMember, userId, visible, slideAnim, onClose }: RoomMemberPanelProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="none">
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: 200, height: '100%', transform: [{ translateX: slideAnim }] }}>
        <BlurView intensity={40} tint="dark" className="pt-40 pb-20 pl-8 flex-1" style={{ backgroundColor: Platform.OS === 'ios' ? undefined : 'rgba(0, 0, 0, 0.8)', borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
          <Text className="font-bold pb-4" style={{ color: WeatherBoardColors.textPrimary }}>
            ✨Room Member✨
          </Text>
          <ScrollView>
            {roomMember.map((item) => (
              <View key={item.user_id} className="flex flex-row items-center gap-3 mb-4">
                <Text className="text-xl">{item.avatar_emoji}</Text>
                <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={1}>
                  {truncateName(item.nickname, 8)}
                </Text>
                <Text className="text-[6px] font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
                  {userId === item.user_id ? '←YOU' : ''}
                </Text>
              </View>
            ))}
          </ScrollView>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}
