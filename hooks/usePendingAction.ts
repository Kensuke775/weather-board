import { useState } from 'react';

export default function usePendingAction() {
  const [isPending, setIsPending] = useState(false);

  const preventDuplicateRun = async (action: () => Promise<void>) => {
    if (isPending) return;
    setIsPending(true);
    try {
      await action();
    } finally {
      setIsPending(false);
    }
  };

  return { isPending, preventDuplicateRun };
}
