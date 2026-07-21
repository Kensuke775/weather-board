import { supabase } from '@/lib/supabase';

export const MESSAGE_REPORT_REASONS = ['不適切なメッセージ内容', '嫌がらせ・誹謗中傷', 'その他'] as const;

export const reportUser = (reporterId: string, reportedUserId: string, reason: string) => {
  return supabase.from('reports').insert({ reporter_id: reporterId, reported_user_id: reportedUserId, reason });
};

export const blockUser = (blockerId: string, blockedUserId: string) => {
  return supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedUserId });
};
