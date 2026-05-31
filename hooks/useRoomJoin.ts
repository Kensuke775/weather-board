import { useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';


export default function useRoomJoin(onSuccess?: (roomName: string ) => Promise<void>) {
  const { user } = useUser();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = async () => {

    if (isJoining) return;
    setIsJoining(true);
    if (inviteCode === '') {
      setIsJoining(false);
      Alert.alert('招待コードを入力してください。');
      return;
    }
    if (!user) {
      setIsJoining(false);
      Alert.alert('ユーザーが取得出来ませんでした。');
      return;
    }

    const { data: roomData, error: roomError } = await supabase.from('rooms').select('id, name').eq('invite_code', inviteCode).single();
    if (roomError) {
      setIsJoining(false);
      console.error('[useJoinRoom] handleJoinRoom', roomError.message);
      Alert.alert('招待コードが正しくありません。');
      return;
    }
    const { data: roomMembersData, error: roomMembersError } = await supabase.from('room_members').select('user_id').eq('room_id', roomData.id).eq('user_id', user.id);
    if (roomMembersError) {
      setIsJoining(false);
      console.error('[useJoinRoom] handleJoinRoom', roomMembersError.message);
      Alert.alert('ルームメンバーの取得に失敗しました。');
      return;
    }
    if (roomMembersData.length > 0) {
      setIsJoining(false);
      Alert.alert('すでに所属しているルームです。');
      return;
    }

    const { error: memberError } = await supabase.from('room_members').insert({ room_id: roomData.id, user_id: user.id });
    if (memberError) {
      setIsJoining(false);
      console.error('[useJoinRoom] handleJoinRoom', memberError.message);
      Alert.alert('ルームメンバーの記録に失敗しました。');
      return;
    }

    await onSuccess?.(roomData.name)
    setIsJoining(false);
  };

  return { inviteCode, setInviteCode, isJoining, handleJoinRoom };

}
