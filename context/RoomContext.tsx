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
};

const RoomContext = createContext<RoomProviderType>(null!);

const fetchRoomsData = async (userId: string, setterRoom: (roomData: RoomItem[]) => void, setterCurrentRoomId: (rooIdData: string | null) => void) => {
  const { data: roomsData, error: roomsError } = await supabase.from('room_members').select('rooms(id, name, invite_code)').eq('user_id', userId);
  if (roomsError) {
    console.error('[RoomContext] fetchRoomsData', roomsError.message);
    Alert.alert('ロームメンバー取得に失敗しました。');
    return;
  }
  const formattedRoomData = roomsData.map((item) => {
    const room = Array.isArray(item.rooms) ? item.rooms[0] : item.rooms;
    return { rooms: room as { id: string; name: string; invite_code?: string } };
  });
  setterRoom(formattedRoomData);
  setterCurrentRoomId(formattedRoomData[0]?.rooms.id ?? null);
};

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const { user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    fetchRoomsData(userId, setRooms, setCurrentRoomId);
  }, [userId]);

  const refreshRooms = async () => {
    if (!userId) return;
    await fetchRoomsData(userId, setRooms, setCurrentRoomId);
  };

  return <RoomContext.Provider value={{ currentRoomId, setCurrentRoomId, rooms, refreshRooms }}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  return useContext(RoomContext);
}
