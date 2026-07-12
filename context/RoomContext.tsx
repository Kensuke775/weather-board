import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { RoomItem } from '@/lib/types';

type RoomProviderType = {
  currentRoomId: string | null;
  setCurrentRoomId: (id: string | null) => void;
  rooms: RoomItem[];
  refreshRooms: () => Promise<void>;
  isLoading: boolean;
};

const RoomContext = createContext<RoomProviderType>(null!);

const fetchRoomsData = async (userId: string, setterRoom: (roomData: RoomItem[]) => void, setterCurrentRoomId: (rooIdData: string | null) => void, setterLoding: (value: boolean) => void) => {
  const { data: roomsData, error: roomsError } = await supabase.from('room_members').select('rooms(id, name, invite_code, icon_emoji)').eq('user_id', userId);
  if (roomsError) {
    console.error('[RoomContext] fetchRoomsData', roomsError.message);
    Alert.alert('ロームメンバー取得に失敗しました。');
    return;
  }
  const formattedRoomData = roomsData.map((item) => {
    const room = Array.isArray(item.rooms) ? item.rooms[0] : item.rooms;
    return { rooms: room as { id: string; name: string; invite_code?: string; icon_emoji?: string } };
  });
  setterRoom(formattedRoomData);
  setterCurrentRoomId(formattedRoomData[0]?.rooms.id ?? null);
  setterLoding(false);
};

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const userId = user?.id;
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchRoomsData(userId, setRooms, setCurrentRoomId, setIsLoading);
  }, [userId]);

  const refreshRooms = async () => {
    if (!userId) return;
    await fetchRoomsData(userId, setRooms, setCurrentRoomId, setIsLoading);
  };

  return <RoomContext.Provider value={{ currentRoomId, setCurrentRoomId, rooms, refreshRooms, isLoading }}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  return useContext(RoomContext);
}
