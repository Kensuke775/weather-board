import { useState } from 'react';
import { Alert } from 'react-native';

import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export default function useRoomJoin(onSuccess?: (roomName: string, roomId: string) => Promise<void>) {
  const { user } = useUser();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const userId = user?.id;
  const handleJoinRoom = async () => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      if (inviteCode === '') {
        Alert.alert('招待コードを入力してください。');
        return;
      }
      if (!userId) {
        Alert.alert('ユーザーが取得出来ませんでした。');
        return;
      }
      const { data: roomData, error: roomError } = await supabase.from('rooms').select('id, name').eq('invite_code', inviteCode).single();
      if (roomError) {
        console.error('[useJoinRoom] handleJoinRoom', roomError.message);
        Alert.alert('招待コードが正しくありません。');
        return;
      }
      const { data: roomMembersData, error: roomMembersError } = await supabase.from('room_members').select('user_id').eq('room_id', roomData.id).eq('user_id', userId);
      if (roomMembersError) {
        console.error('[useJoinRoom] handleJoinRoom', roomMembersError.message);
        Alert.alert('ルームメンバーの取得に失敗しました。');
        return;
      }
      if (roomMembersData.length > 0) {
        Alert.alert('すでに所属しているルームです。');
        return;
      }
      const { error: memberError } = await supabase.from('room_members').insert({ room_id: roomData.id, user_id: userId });
      if (memberError) {
        console.error('[useJoinRoom] handleJoinRoom', memberError.message);
        Alert.alert('ルームメンバーの記録に失敗しました。');
        return;
      }
      await onSuccess?.(roomData.name, roomData.id);
    } finally {
      setIsJoining(false);
    }
  };

  return { inviteCode, setInviteCode, isJoining, handleJoinRoom };

}
