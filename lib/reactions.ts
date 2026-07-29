import { decideReactionOperation } from '@/lib/decideReactionOperation';
import { supabase } from '@/lib/supabase';
import { ReactionType } from '@/lib/types';

type ToggleReactionParams = {
  table: 'comment_reactions' | 'post_reactions';
  matchColumn: 'comment_id' | 'weather_log_id';
  matchValue: string; // commentId または weatherLogId
  userId: string;
  type: ReactionType;
  myExistingType: ReactionType | null;
  notifyToUserId: string | null; // 自分自身へのリアクションならnullを渡して通知をスキップ
  weatherLogId: string;
};

// comment_reactions・post_reactions共通のトグル処理（削除/切り替え/新規追加＋初回のみ通知）。
// 連打防止（pendingのSet管理）と再取得は呼び出し元の責務として、ここには含めない。
export async function toggleReaction(params: ToggleReactionParams): Promise<void> {
  const { table, matchColumn, matchValue, userId, type, myExistingType, notifyToUserId, weatherLogId } = params;
  const operation = decideReactionOperation(myExistingType, type);

  if (operation === 'delete') {
    const { error } = await supabase.from(table).delete().eq('from_user_id', userId).eq(matchColumn, matchValue);
    if (error) console.error(`[toggleReaction] delete(${table})`, error.message);
    return;
  }

  if (operation === 'update') {
    const { error } = await supabase.from(table).update({ reaction_type: type }).eq('from_user_id', userId).eq(matchColumn, matchValue);
    if (error) console.error(`[toggleReaction] update(${table})`, error.message);
    return;
  }

  // まだ反応していない → 新規追加
  const { error } = await supabase.from(table).insert({ from_user_id: userId, [matchColumn]: matchValue, reaction_type: type });
  if (error) {
    if (error.code !== '23505') console.error(`[toggleReaction] insert(${table})`, error.message);
    return; // 23505 = 既に同じ行がある（重複挿入、通知不要）
  }

  if (notifyToUserId) {
    const { error: notifyError } = await supabase.from('notifications').insert({
      to_user_id: notifyToUserId,
      from_user_id: userId,
      type: 'reaction',
      weather_log_id: weatherLogId,
      is_read: false,
    });
    if (notifyError) console.error(`[toggleReaction] notify(${table})`, notifyError.message);
  }
}
