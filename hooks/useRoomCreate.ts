import { useState } from 'react';
import { Alert } from 'react-native';

import * as Crypto from 'expo-crypto';

import { useUser } from '@/context/UserContext';
import usePendingAction from '@/hooks/usePendingAction';
import { supabase } from '@/lib/supabase';

export default function useRoomCreate(onSuccess?: (roomId: string) => Promise<void>) {
  const { user } = useUser();
  const [roomName, setRoomName] = useState('');
  const [iconEmoji, setIconEmoji] = useState('☀️');
  const createAction = usePendingAction();
  const userId = user?.id;
  const handleCreateRoom = () =>
    createAction.preventDuplicateRun(async () => {
      if (roomName === '') {
        Alert.alert('ルーム名が空になってます。');
        return;
      }
      if (!userId) {
        Alert.alert('ユーザーが取得出来ませんでした。');
        return;
      }
      const roomId = Crypto.randomUUID();
      const { error: roomError } = await supabase.from('rooms').insert({ id: roomId, name: roomName, invite_code: Math.random().toString(36).slice(2, 8), created_by: userId, icon_emoji: iconEmoji });
      if (roomError) {
        console.error('[useRoomCreate] handleCreateRoom', roomError.message)
        Alert.alert('ルームの記録に失敗しました。');
        return;
      }
      const { error: memberError } = await supabase.from('room_members').insert({ room_id: roomId, user_id: userId });
      if (memberError) {
        console.error('[useRoomCreate] handleCreateRoom', memberError.message)
        Alert.alert('ルームメンバーの記録に失敗しました。');
        return;
      }
      await onSuccess?.(roomId);
    });
  return { handleCreateRoom, setRoomName, roomName, iconEmoji, setIconEmoji, isCreating: createAction.isPending };
}