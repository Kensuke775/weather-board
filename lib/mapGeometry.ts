export type Vb = { x: number; y: number; w: number; h: number };

// viewBoxを、指定した範囲(bounds)からはみ出さないようにクランプする。
// 幅は2〜bounds.wの範囲に収め、アスペクト比(bounds.w / bounds.h)を保ったまま高さを決める。
export function clampVb(vb: Vb, bounds: Vb): Vb {
  const aspect = bounds.w / bounds.h;
  const w = Math.max(2, Math.min(bounds.w, vb.w));
  const h = w / aspect;
  const x = Math.max(bounds.x, Math.min(bounds.x + bounds.w - w, vb.x));
  const y = Math.max(bounds.y, Math.min(bounds.y + bounds.h - h, vb.y));
  return { x, y, w, h };
}

export function pinchDist(t0: { pageX: number; pageY: number }, t1: { pageX: number; pageY: number }): number {
  return Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
}
