import React, { createContext, useContext, useState } from 'react';

type RoomProviderType = {
  currentRoomId: string | null;
  setCurrentRoomId: (id: string | null) => void;
};

const RoomContext = createContext<RoomProviderType>(null!);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  return <RoomContext.Provider value={{ currentRoomId, setCurrentRoomId }}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  return useContext(RoomContext);
}
