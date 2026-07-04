import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Picker } from '@react-native-picker/picker';
import { Modal, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { WeatherBoardColors } from '@/constants/theme';
import { ROOM_HEADER_COLUMN_WIDTH, TOAST_DURATION } from '@/constants/ui';
import { RoomItem } from '@/lib/types';

type RoomSelectorHeaderProps = {
  rooms: RoomItem[];
  currentRoomId: string | null;
  setCurrentRoomId: (id: string) => void;
  inviteCode: string | undefined;
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  onMemberPanelOpen: () => void;
};

const truncateName = (name: string | undefined | null, maxLength = 5) => {
  if (!name) return '';
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
};

export default function RoomSelectorHeader({ rooms, currentRoomId, setCurrentRoomId, inviteCode, isModalVisible, setIsModalVisible, onMemberPanelOpen }: RoomSelectorHeaderProps) {
  return (
    <View className="flex-row justify-center mb-10 relative">
      <View className="flex-row justify-between bg-black/30 rounded-xl border gap-4" style={{ borderColor: WeatherBoardColors.glassBorder }}>
        <Pressable onPress={() => setIsModalVisible(true)} className="py-3 px-2">
          <View className="flex-row items-center gap-2">
            <View style={{ width: ROOM_HEADER_COLUMN_WIDTH }}>
              <Text className="text-[6px]" style={{ color: WeatherBoardColors.textMuted }}>
                ルーム名
              </Text>
              <Text numberOfLines={1} ellipsizeMode="tail" className="font-sm font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                {truncateName(rooms.find((data) => data.rooms.id === currentRoomId)?.rooms.name, 6)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="white" />
          </View>
        </Pressable>
        <Pressable
          onPress={async () => {
            if (inviteCode) await Clipboard.setStringAsync(inviteCode);
            Toast.show({ type: 'success', text1: 'コピーしました。', visibilityTime: TOAST_DURATION.short });
          }}
          style={{ width: ROOM_HEADER_COLUMN_WIDTH }}
          className="py-3 pr-3">
          <View className="flex-row items-center gap-2 justify-between">
            <View>
              <Text className="text-[6px]" style={{ color: WeatherBoardColors.textMuted }}>
                招待コード
              </Text>
              <Text className="font-sm font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                {inviteCode}
              </Text>
            </View>
            <Ionicons name="copy-outline" size={16} color="white" />
          </View>
        </Pressable>
      </View>
      <Pressable onPress={onMemberPanelOpen} className="absolute right-5 top-1/2 -translate-y-1/2">
        <Ionicons name="people-outline" size={24} color="white" />
      </Pressable>
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <Pressable style={{ flex: 1 }} onPress={() => setIsModalVisible(false)}>
          <View onStartShouldSetResponder={() => true} className="pb-32 border-t" style={{ position: 'absolute', bottom: 0, width: '100%', borderTopColor: WeatherBoardColors.glassBorder, backgroundColor: 'white' }}>
            <Text className="text-center font-bold pt-8 text-base">部屋を選んでください</Text>
            <Picker
              selectedValue={currentRoomId}
              onValueChange={(value) => value !== null && setCurrentRoomId(value)}
              style={{ width: '100%', textAlign: 'center' } as any}>
              {rooms.map((room) => (
                <Picker.Item key={room.rooms.id} label={room.rooms.name} value={room.rooms.id} style={{ textAlign: 'center' }} />
              ))}
            </Picker>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
