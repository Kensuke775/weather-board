import { isDaytimeNow, toDateString } from './date';

describe('toDateString', () => {
  it('YYYY-MM-DD形式のローカル日付文字列を返す', () => {
    const date = new Date(2026, 0, 5); // 2026-01-05 ローカル時刻の0時
    expect(toDateString(date)).toBe('2026-01-05');
  });

  it('月・日が1桁の場合も0埋めされる', () => {
    const date = new Date(2026, 8, 3); // 2026-09-03
    expect(toDateString(date)).toBe('2026-09-03');
  });
});

describe('isDaytimeNow', () => {
  it('6時ちょうどは昼と判定する', () => {
    expect(isDaytimeNow(new Date(2026, 0, 1, 6, 0))).toBe(true);
  });

  it('5時59分は夜と判定する', () => {
    expect(isDaytimeNow(new Date(2026, 0, 1, 5, 59))).toBe(false);
  });

  it('17時59分は昼と判定する', () => {
    expect(isDaytimeNow(new Date(2026, 0, 1, 17, 59))).toBe(true);
  });

  it('18時ちょうどは夜と判定する', () => {
    expect(isDaytimeNow(new Date(2026, 0, 1, 18, 0))).toBe(false);
  });

  it('正午は昼と判定する', () => {
    expect(isDaytimeNow(new Date(2026, 0, 1, 12, 0))).toBe(true);
  });

  it('深夜0時は夜と判定する', () => {
    expect(isDaytimeNow(new Date(2026, 0, 1, 0, 0))).toBe(false);
  });
});
