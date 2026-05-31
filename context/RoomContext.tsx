import { supabase } from '@/lib/supabase';
import { RoomItem } from '@/lib/types';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

type RoomProviderType = {
  currentRoomId: string | null;
  setCurrentRoomId: (id: string | null) => void;
  rooms: RoomItem[];
  refreshRooms: () => Promise<void>;
};

const RoomContext = createContext<RoomProviderType>(null!);

const fetchRoomsData = async (setterRoom: (roomData: RoomItem[]) => void, setterCurrentRoomId: (rooIdData: string | null) => void) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Alert.alert('ユーザーの取得がでいませんでした。');
  const { data: roomsData, error: roomsError } = await supabase.from('room_members').select('rooms(id, name, invite_code)').eq('user_id', user.id);
  if (roomsError) return Alert.alert(roomsError.message);
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
  useEffect(() => {
    fetchRoomsData(setRooms, setCurrentRoomId);
  }, []);

  const refreshRooms = async() => {
    await fetchRoomsData(setRooms, setCurrentRoomId);
  };

  return <RoomContext.Provider value={{ currentRoomId, setCurrentRoomId, rooms, refreshRooms }}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  return useContext(RoomContext);
}
