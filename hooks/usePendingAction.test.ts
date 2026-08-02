import { act, renderHook, waitFor } from '@testing-library/react-native';

import usePendingAction from '@/hooks/usePendingAction';

const createDeferredAction = () => {
  let resolveAction!: () => void;
  const action = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveAction = resolve;
      }),
  );
  return { action, resolveAction: () => resolveAction() };
};

describe('usePendingAction', () => {
  it('初期状態ではisPendingがfalseである', () => {
    const { result } = renderHook(() => usePendingAction());
    expect(result.current.isPending).toBe(false);
  });

  it('actionの実行中はisPendingがtrueになり、完了後にfalseに戻る', async () => {
    const { result } = renderHook(() => usePendingAction());
    const { action, resolveAction } = createDeferredAction();

    act(() => {
      result.current.preventDuplicateRun(action);
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => {
      resolveAction();
    });
    expect(result.current.isPending).toBe(false);
  });

  it('前回のactionが実行中の場合、2回目の呼び出しは無視される', async () => {
    const { result } = renderHook(() => usePendingAction());
    const { action, resolveAction } = createDeferredAction();

    act(() => {
      result.current.preventDuplicateRun(action);
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));

    act(() => {
      result.current.preventDuplicateRun(action);
    });
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAction();
    });
  });

  it('前回のactionが完了していれば、再度呼び出しを受け付ける', async () => {
    const { result } = renderHook(() => usePendingAction());
    const first = createDeferredAction();

    act(() => {
      result.current.preventDuplicateRun(first.action);
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    await act(async () => {
      first.resolveAction();
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    const second = createDeferredAction();
    act(() => {
      result.current.preventDuplicateRun(second.action);
    });
    expect(second.action).toHaveBeenCalledTimes(1);

    await act(async () => {
      second.resolveAction();
    });
  });

  it('actionが例外を投げてもisPendingはfalseに戻る', async () => {
    const { result } = renderHook(() => usePendingAction());
    const action = jest.fn(() => Promise.reject(new Error('boom')));

    await act(async () => {
      await expect(result.current.preventDuplicateRun(action)).rejects.toThrow('boom');
    });
    expect(result.current.isPending).toBe(false);
  });
});
