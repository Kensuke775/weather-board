import { decideReactionOperation } from './decideReactionOperation';

describe('decideReactionOperation', () => {
  it('今と同じ種類を押したら削除(delete)と判定する', () => {
    expect(decideReactionOperation('like', 'like')).toBe('delete');
  });

  it('別の種類を押したら更新(update)と判定する', () => {
    expect(decideReactionOperation('like', 'heart')).toBe('update');
  });

  it('まだ何もリアクションしていなければ追加(insert)と判定する', () => {
    expect(decideReactionOperation(null, 'like')).toBe('insert');
  });

  it.each([
    ['like', 'heart'],
    ['heart', 'cheer'],
    ['cheer', 'like'],
  ] as const)('%sから%sへの切り替えも更新(update)と判定する', (existing, next) => {
    expect(decideReactionOperation(existing, next)).toBe('update');
  });
});
