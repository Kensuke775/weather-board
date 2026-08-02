import { normalizeConversationUserIds } from './normalizeConversationUserIds';

describe('normalizeConversationUserIds', () => {
  it('文字列として小さい方をuserAIdにする', () => {
    expect(normalizeConversationUserIds('a', 'b')).toEqual({ userAId: 'a', userBId: 'b' });
  });

  it('引数の順番を逆にしても、同じ結果(小さい方がuserAId)になる', () => {
    expect(normalizeConversationUserIds('b', 'a')).toEqual({ userAId: 'a', userBId: 'b' });
  });

  it('引数の順番を入れ替えたら、必ず同じuser_a_id/user_b_idのペアになる', () => {
    const result1 = normalizeConversationUserIds('user-1', 'user-2');
    const result2 = normalizeConversationUserIds('user-2', 'user-1');
    expect(result1).toEqual(result2);
  });
});
