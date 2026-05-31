import { useState } from 'react';
import { Alert } from 'react-native';

import * as Crypto from 'expo-crypto';

import { useUser } from '@/context/UserContext';
import { generateInviteCode } from '@/lib/generateInviteCode';
import { supabase } from '@/lib/supabase';

export default function useRoomCreate(onSuccess?: () => Promise<void>) {
  const { user } = useUser();
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);

    if (roomName === '') {
      setIsCreating(false);
      Alert.alert('ルーム名が空になってます。');
      return;
    }

    if (!user) {
      setIsCreating(false);
      Alert.alert('ユーザーが取得出来ませんでした。');
      return;
    }
    const roomId = Crypto.randomUUID();
    const { error: roomError } = await supabase.from('rooms').insert({ id: roomId, name: roomName, invite_code: generateInviteCode(), created_by: user.id });
    if (roomError) {
      setIsCreating(false);
      console.error('[useRoomCreate] handleCreateRoom', roomError.message)
      Alert.alert('ルームの記録に失敗しました。');
      return;
    }
    const { error: memberError } = await supabase.from('room_members').insert({ room_id: roomId, user_id: user.id });
    if (memberError) {
      setIsCreating(false);
      console.error('[useRoomCreate] handleCreateRoom', memberError.message)
      Alert.alert('ルームメンバーの記録に失敗しました。');
      return;
    }

    await onSuccess?.();
    setIsCreating(false);
  };

  return {handleCreateRoom, setRoomName, roomName, isCreating}
}