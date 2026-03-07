import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { syncQueuedOperations } from '@/lib/offline-sync';

export function useOfflineSync(): void {
  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    async function runSync() {
      if (!mounted) return;
      try {
        const result = await syncQueuedOperations();
        if (result.sent > 0) {
          toast.success(
            `Synced ${result.sent} pending change${result.sent === 1 ? '' : 's'}${
              result.conflicts > 0 ? ` (${result.conflicts} conflict)` : ''
            }`,
          );
        }
      } catch {
        // noop
      }
    }

    void runSync();
    const onOnline = () => {
      void runSync();
    };
    window.addEventListener('online', onOnline);
    timer = window.setInterval(() => {
      void runSync();
    }, 45_000);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      if (timer) window.clearInterval(timer);
    };
  }, []);
}
