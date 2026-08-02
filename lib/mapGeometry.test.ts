import { clampVb, pinchDist } from './mapGeometry';

const BOUNDS = { x: 0, y: 0, w: 100, h: 50 };

describe('clampVb', () => {
  it('範囲内のviewBoxはそのまま返す', () => {
    expect(clampVb({ x: 10, y: 5, w: 50, h: 25 }, BOUNDS)).toEqual({ x: 10, y: 5, w: 50, h: 25 });
  });

  it('幅がboundsの幅を超える場合はboundsの幅に収める', () => {
    expect(clampVb({ x: 0, y: 0, w: 200, h: 25 }, BOUNDS)).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  it('幅が2未満になる場合は2に収める', () => {
    const result = clampVb({ x: 0, y: 0, w: 0.5, h: 25 }, BOUNDS);
    expect(result.w).toBe(2);
  });

  it('アスペクト比(bounds.w / bounds.h)を保ったまま高さを決める', () => {
    const result = clampVb({ x: 0, y: 0, w: 20, h: 999 }, BOUNDS);
    expect(result.h).toBe(10); // 20 / (100 / 50) = 10
  });

  it('左端をはみ出す場合はboundsの左端に収める', () => {
    const result = clampVb({ x: -50, y: 0, w: 50, h: 25 }, BOUNDS);
    expect(result.x).toBe(0);
  });

  it('右端をはみ出す場合はboundsの右端に収める', () => {
    const result = clampVb({ x: 90, y: 0, w: 50, h: 25 }, BOUNDS);
    expect(result.x).toBe(50); // bounds.x + bounds.w - w = 0 + 100 - 50
  });

  it('上端をはみ出す場合はboundsの上端に収める', () => {
    const result = clampVb({ x: 0, y: -10, w: 50, h: 25 }, BOUNDS);
    expect(result.y).toBe(0);
  });

  it('下端をはみ出す場合はboundsの下端に収める', () => {
    const result = clampVb({ x: 0, y: 40, w: 50, h: 25 }, BOUNDS);
    expect(result.y).toBe(25); // bounds.y + bounds.h - h = 0 + 50 - 25
  });
});

describe('pinchDist', () => {
  it('2点間のユークリッド距離を返す(3-4-5の直角三角形)', () => {
    expect(pinchDist({ pageX: 0, pageY: 0 }, { pageX: 3, pageY: 4 })).toBe(5);
  });

  it('同じ点同士の距離は0を返す', () => {
    expect(pinchDist({ pageX: 10, pageY: 10 }, { pageX: 10, pageY: 10 })).toBe(0);
  });

  it('順番を入れ替えても同じ距離を返す', () => {
    const a = { pageX: 0, pageY: 0 };
    const b = { pageX: 3, pageY: 4 };
    expect(pinchDist(a, b)).toBe(pinchDist(b, a));
  });
});
