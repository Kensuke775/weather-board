import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Picker } from '@react-native-picker/picker';
import { Modal, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { TOAST_DURATION } from '@/constants/ui';
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

const truncateName = (name: string | undefined | null, maxLength = 8) => {
  if (!name) return '';
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
};

const cardStyle = {
  backgroundColor: 'rgba(255,255,255,0.92)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
} as const;

export default function RoomSelectorHeader({ rooms, currentRoomId, setCurrentRoomId, inviteCode, isModalVisible, setIsModalVisible, onMemberPanelOpen }: RoomSelectorHeaderProps) {
  return (
    <View className="flex-row items-center mb-8 gap-3">
      <View className="flex-1 flex-row rounded-2xl overflow-hidden" style={cardStyle}>
        <Pressable onPress={() => setIsModalVisible(true)} className="flex-1 py-3 px-4">
          <Text className="text-[9px] font-medium mb-0.5" style={{ color: 'rgba(98,66,33,0.5)' }}>
            ルーム名
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Text numberOfLines={1} className="text-sm font-bold flex-1" style={{ color: '#624221' }}>
              {truncateName(rooms.find((data) => data.rooms.id === currentRoomId)?.rooms.name)}
            </Text>
            <Ionicons name="chevron-down" size={14} color="rgba(98,66,33,0.55)" />
          </View>
        </Pressable>

        <View style={{ width: 1, backgroundColor: 'rgba(98,66,33,0.12)', marginVertical: 8 }} />

        <Pressable
          onPress={async () => {
            if (inviteCode) await Clipboard.setStringAsync(inviteCode);
            Toast.show({ type: 'success', text1: 'コピーしました。', visibilityTime: TOAST_DURATION.short });
          }}
          className="flex-1 py-3 px-4">
          <Text className="text-[9px] font-medium mb-0.5" style={{ color: 'rgba(98,66,33,0.5)' }}>
            招待コード
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-bold flex-1" style={{ color: '#624221' }}>
              {inviteCode}
            </Text>
            <Ionicons name="copy-outline" size={14} color="rgba(98,66,33,0.55)" />
          </View>
        </Pressable>
      </View>

      <Pressable
        onPress={onMemberPanelOpen}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          ...cardStyle,
        }}>
        <Ionicons name="people-outline" size={22} color="rgba(98,66,33,0.7)" />
      </Pressable>

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <Pressable style={{ flex: 1 }} onPress={() => setIsModalVisible(false)}>
          <View
            onStartShouldSetResponder={() => true}
            className="pb-32"
            style={{ position: 'absolute', bottom: 0, width: '100%', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
            <Text className="text-center font-bold pt-8 text-base">部屋を選んでください</Text>
            <Picker
              selectedValue={currentRoomId}
              onValueChange={(value) => value !== null && setCurrentRoomId(value)}
              style={{ width: '100%' }}>
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
