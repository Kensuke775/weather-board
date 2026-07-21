import { useState } from 'react';
import { Alert, Keyboard, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { startOrOpenConversation } from '@/lib/conversations';
import { supabase } from '@/lib/supabase';

const PRIMARY_BROWN = '#624221';

export type ReportBlockMenuProps = {
  targetUserId: string;
  weatherLogId: string;
  commentId?: string;
  onBlocked?: () => void;
  variant?: 'default' | 'compact' | 'header';
};

export const REPORT_REASONS = ['不適切な投稿内容', '嫌がらせ・誹謗中傷', 'その他'] as const;
const OTHER_REASON = 'その他';

export default function ReportBlockMenu({ targetUserId, weatherLogId, commentId, onBlocked, variant = 'default' }: ReportBlockMenuProps) {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomReasonVisible, setIsCustomReasonVisible] = useState(false);
  const [customReasonText, setCustomReasonText] = useState('');
  const isOwnPost = userId === targetUserId;

  const submitReport = async (reason: string) => {
    if (isSubmitting || !userId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: userId,
        reported_user_id: targetUserId,
        weather_log_id: weatherLogId,
        comment_id: commentId ?? null,
        reason,
      });
      if (error) {
        console.error('[ReportBlockMenu] submitReport', error.message);
        Alert.alert('通報の送信に失敗しました。');
        return;
      }
      Alert.alert('通報を受け付けました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBlock = async () => {
    if (isSubmitting || !userId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('blocks').insert({
        blocker_id: userId,
        blocked_id: targetUserId,
      });
      if (error) {
        console.error('[ReportBlockMenu] submitBlock', error.message);
        Alert.alert('ブロックに失敗しました。');
        return;
      }
      Alert.alert('ブロックしました。');
      onBlocked?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCustomReason = async () => {
    if (customReasonText === '') return Alert.alert('理由を入力してください。');
    setIsCustomReasonVisible(false);
    await submitReport(customReasonText);
    setCustomReasonText('');
  };

  const handleReportPress = () => {
    Alert.alert('通報理由を選んでください', '', [
      { text: 'キャンセル', style: 'cancel' },
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: () => (reason === OTHER_REASON ? setIsCustomReasonVisible(true) : submitReport(reason)),
      })),
    ]);
  };

  const handleBlockPress = () => {
    Alert.alert('ブロックしますか？', 'ブロックすると、相手の投稿・コメント・タグが表示されなくなります。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ブロックする', style: 'destructive', onPress: submitBlock },
    ]);
  };

  const handleDmPress = async () => {
    if (isSubmitting || !userId) return;
    setIsSubmitting(true);
    try {
      const conversationId = await startOrOpenConversation(userId, targetUserId);
      if (!conversationId) {
        Alert.alert('DMの開始に失敗しました。');
        return;
      }
      router.push(`/dm-chat/${conversationId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMenuPress = () => {
    Alert.alert('オプション', '', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'DMを送る', onPress: handleDmPress },
      { text: '通報する', onPress: handleReportPress },
      { text: 'ブロックする', onPress: handleBlockPress, style: 'destructive' },
    ]);
  };

  if (isOwnPost) return null;

  return (
    <>
      <Pressable onPress={handleMenuPress} disabled={isSubmitting}>
        {variant === 'compact' ? (
          <Ionicons name="ellipsis-horizontal" size={16} color={PRIMARY_BROWN} />
        ) : variant === 'header' ? (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(255,255,255,0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(98,66,33,0.12)',
            }}>
            <Ionicons name="ellipsis-horizontal" size={18} color={PRIMARY_BROWN} />
          </View>
        ) : (
          <BlurView intensity={40} tint="dark" style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WeatherBoardColors.glassBorder }}>
            <Ionicons name="ellipsis-horizontal" size={20} style={{ color: WeatherBoardColors.textPrimary }} />
          </BlurView>
        )}
      </Pressable>

      <Modal visible={isCustomReasonVisible} transparent={true} animationType="fade">
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="mx-6 p-4" style={{ borderRadius: 16, backgroundColor: 'white' }}>
            <Text className="text-base font-bold mb-3">通報理由を入力してください</Text>
            <TextInput
              value={customReasonText}
              onChangeText={setCustomReasonText}
              placeholder="理由を入力"
              placeholderTextColor={WeatherBoardColors.placeholderDark}
              multiline
              className="px-3 py-2 mb-4"
              style={{ borderRadius: 12, borderWidth: 1, borderColor: WeatherBoardColors.glassBorder, minHeight: 80, textAlignVertical: 'top' }}
            />
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => {
                  setIsCustomReasonVisible(false);
                  setCustomReasonText('');
                }}>
                <Text className="text-base">キャンセル</Text>
              </Pressable>
              <Pressable onPress={handleSubmitCustomReason}>
                <Text className="text-base font-bold" style={{ color: WeatherBoardColors.buttonBackground }}>
                  送信する
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
