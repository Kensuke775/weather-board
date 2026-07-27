import {
  dateSectionLabel,
  getGroupedNotificationBody,
  getNavigationTarget,
  getNotificationBody,
  groupKeyFor,
  isRoomNotification,
  matchesFilter,
} from './notifications.helpers';
import { Notification } from '@/lib/types';

const makeNotification = (overrides: Partial<Notification>): Notification => ({
  id: 'notification-1',
  to_user_id: 'to-user-1',
  type: 'comment',
  from_user_id: 'from-user-1',
  weather_log_id: null,
  room_id: null,
  conversation_id: null,
  comment_id: null,
  direct_message_id: null,
  is_read: false,
  created_at: '2026-01-01T00:00:00.000Z',
  profiles: { nickname: 'テストユーザー', avatar_emoji: '😊' },
  weather: null,
  comment_body: null,
  direct_message_body: null,
  ...overrides,
});

describe('getNavigationTarget', () => {
  it('room_messageはroom-chatへのパスを返す', () => {
    const item = makeNotification({ type: 'room_message', room_id: 'room-1' });
    expect(getNavigationTarget(item)).toBe('/room-chat/room-1');
  });

  it('direct_messageはdm-chatへのパスを返す', () => {
    const item = makeNotification({ type: 'direct_message', conversation_id: 'conv-1' });
    expect(getNavigationTarget(item)).toBe('/dm-chat/conv-1');
  });

  it('commentはweather-logへのパスを返す', () => {
    const item = makeNotification({ type: 'comment', weather_log_id: 'log-1' });
    expect(getNavigationTarget(item)).toBe('/weather-log/log-1');
  });

  it('followはweather_log_idがあっても遷移先を持たない', () => {
    const item = makeNotification({ type: 'follow', weather_log_id: 'log-1' });
    expect(getNavigationTarget(item)).toBeNull();
  });

  it('room_joinは遷移先を持たない', () => {
    const item = makeNotification({ type: 'room_join', weather_log_id: 'log-1', room_id: null });
    expect(getNavigationTarget(item)).toBeNull();
  });
});

describe('isRoomNotification', () => {
  it.each(['room_message', 'room_join', 'room_invite'] as const)('%sはルーム通知と判定する', (type) => {
    expect(isRoomNotification(type)).toBe(true);
  });

  it.each(['comment', 'reaction', 'follow', 'direct_message', 'talk'] as const)('%sはルーム通知ではない', (type) => {
    expect(isRoomNotification(type)).toBe(false);
  });
});

describe('getNotificationBody', () => {
  it('followは固定文言を返す', () => {
    expect(getNotificationBody(makeNotification({ type: 'follow' }))).toBe('あなたをフォローしました');
  });

  it('commentはcomment_bodyをそのまま返す', () => {
    expect(getNotificationBody(makeNotification({ type: 'comment', comment_body: 'いいね！' }))).toBe('いいね！');
  });

  it('direct_messageはdirect_message_bodyをそのまま返す', () => {
    expect(getNotificationBody(makeNotification({ type: 'direct_message', direct_message_body: 'こんにちは' }))).toBe('こんにちは');
  });

  it('comment_bodyがnullの場合は空文字を返す', () => {
    expect(getNotificationBody(makeNotification({ type: 'comment', comment_body: null }))).toBe('');
  });
});

describe('groupKeyFor', () => {
  it('reactionは投稿IDベースのキーを返す', () => {
    const item = makeNotification({ type: 'reaction', weather_log_id: 'log-1' });
    expect(groupKeyFor(item)).toBe('reaction:log-1');
  });

  it('room_messageはルームIDベースのキーを返す', () => {
    const item = makeNotification({ type: 'room_message', room_id: 'room-1' });
    expect(groupKeyFor(item)).toBe('room_message:room-1');
  });

  it('commentはグルーピング対象外でnullを返す', () => {
    expect(groupKeyFor(makeNotification({ type: 'comment' }))).toBeNull();
  });
});

describe('getGroupedNotificationBody', () => {
  it('1件のみの場合は通常の本文を返す', () => {
    const items = [makeNotification({ type: 'follow' })];
    expect(getGroupedNotificationBody(items)).toBe('あなたをフォローしました');
  });

  it('reactionが複数件まとまった場合は件数付きの文言になる', () => {
    const items = [
      makeNotification({ type: 'reaction', weather_log_id: 'log-1' }),
      makeNotification({ type: 'reaction', weather_log_id: 'log-1' }),
      makeNotification({ type: 'reaction', weather_log_id: 'log-1' }),
    ];
    expect(getGroupedNotificationBody(items)).toBe('3件のリアクションが届きました');
  });

  it('room_messageが複数件まとまった場合は新着メッセージの文言になる', () => {
    const items = [
      makeNotification({ type: 'room_message', room_id: 'room-1' }),
      makeNotification({ type: 'room_message', room_id: 'room-1' }),
    ];
    expect(getGroupedNotificationBody(items)).toBe('2件の新着メッセージがあります');
  });
});

describe('matchesFilter', () => {
  it('allはどのtypeでもtrue', () => {
    expect(matchesFilter('comment', 'all')).toBe(true);
    expect(matchesFilter('follow', 'all')).toBe(true);
  });

  it('commentフィルタはcommentのみtrue', () => {
    expect(matchesFilter('comment', 'comment')).toBe(true);
    expect(matchesFilter('reaction', 'comment')).toBe(false);
  });

  it('dmフィルタはdirect_messageのみtrue', () => {
    expect(matchesFilter('direct_message', 'dm')).toBe(true);
    expect(matchesFilter('comment', 'dm')).toBe(false);
  });

  it('roomフィルタはroom系typeのみtrue', () => {
    expect(matchesFilter('room_join', 'room')).toBe(true);
    expect(matchesFilter('room_invite', 'room')).toBe(true);
    expect(matchesFilter('room_message', 'room')).toBe(true);
    expect(matchesFilter('follow', 'room')).toBe(false);
  });
});

describe('dateSectionLabel', () => {
  const now = new Date(2026, 0, 10, 12, 0);

  it('基準日と同じ日付なら「今日」を返す', () => {
    expect(dateSectionLabel(new Date(2026, 0, 10, 8, 0).toISOString(), now)).toBe('今日');
  });

  it('基準日の前日なら「昨日」を返す', () => {
    expect(dateSectionLabel(new Date(2026, 0, 9, 23, 0).toISOString(), now)).toBe('昨日');
  });

  it('2日以上前ならMM/DD形式を返す', () => {
    expect(dateSectionLabel(new Date(2026, 0, 5, 12, 0).toISOString(), now)).toBe('01/05');
  });
});
