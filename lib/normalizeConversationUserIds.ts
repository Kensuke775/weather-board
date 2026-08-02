// 2人のユーザーIDを常に同じ順番(文字列として小さい方をuser_a_id)に正規化する。
// どちらから話しかけても同じ会話行を指すようにするための前提条件。
export const normalizeConversationUserIds = (userA: string, userB: string): { userAId: string; userBId: string } => {
  return userA < userB ? { userAId: userA, userBId: userB } : { userAId: userB, userBId: userA };
};
