import { normalizeConversationUserIds } from '@/lib/normalizeConversationUserIds';
import { supabase } from '@/lib/supabase';

export const startOrOpenConversation = async (myUserId: string, otherUserId: string): Promise<string | null> => {
  const { userAId, userBId } = normalizeConversationUserIds(myUserId, otherUserId);

  const { data: existing, error: selectError } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a_id', userAId)
    .eq('user_b_id', userBId)
    .maybeSingle();
  if (selectError) {
    console.error('[conversations] startOrOpenConversation(select)', selectError.message);
    return null;
  }
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({ user_a_id: userAId, user_b_id: userBId })
    .select('id')
    .single();
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: retry } = await supabase.from('conversations').select('id').eq('user_a_id', userAId).eq('user_b_id', userBId).single();
      return retry?.id ?? null;
    }
    console.error('[conversations] startOrOpenConversation(insert)', insertError.message);
    return null;
  }
  return created.id;
};
