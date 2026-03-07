import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { socialApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';

export function ShareSnapshotPage() {
  const { snapshotId = '' } = useParams();
  const query = useQuery({
    queryKey: ['snapshot', snapshotId],
    queryFn: () => socialApi.getSnapshot(snapshotId),
    enabled: Boolean(snapshotId),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <Card>Loading snapshot...</Card>
      </div>
    );
  }

  if (query.isError || !query.data?.snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <Card>Snapshot not found or expired.</Card>
      </div>
    );
  }

  const snapshot = query.data.snapshot as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-canvas p-4 text-text">
      <div className="mx-auto max-w-2xl">
        <Card>
          <h1 className="text-2xl font-bold">{String(snapshot.title)}</h1>
          <p className="mt-2 text-sm text-muted">Shared habit progress snapshot</p>
          <pre className="mt-4 overflow-auto rounded-xl bg-canvas p-4 text-xs">
            {JSON.stringify(snapshot.payload, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
}
