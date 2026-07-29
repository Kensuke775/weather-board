import { ReactionType } from '@/lib/types';

// 今の自分のリアクション(myExistingType)と、押した種類(type)から、
// 削除/更新/追加のどれをすべきかを決めるだけの純粋関数。Supabaseには一切触れない。
export function decideReactionOperation(myExistingType: ReactionType | null, type: ReactionType): 'delete' | 'update' | 'insert' {
  if (myExistingType === type) return 'delete';
  if (myExistingType) return 'update';
  return 'insert';
}
