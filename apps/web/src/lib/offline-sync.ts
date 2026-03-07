import { nanoid } from 'nanoid';
import { openDB } from 'idb';
import { syncApi } from './api';

type SyncOperation = {
  id: string;
  type: 'create_habit' | 'update_habit' | 'delete_habit' | 'complete_habit';
  entityId?: string;
  payload: Record<string, unknown>;
  clientUpdatedAt: string;
};

const DB_NAME = 'habittracker-offline';
const STORE_NAME = 'operations';

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function queueOperation(
  operation: Omit<SyncOperation, 'id' | 'clientUpdatedAt'>,
): Promise<void> {
  const database = await db();
  await database.put(STORE_NAME, {
    id: nanoid(),
    clientUpdatedAt: new Date().toISOString(),
    ...operation,
  } satisfies SyncOperation);
}

export async function getQueuedOperations(): Promise<SyncOperation[]> {
  const database = await db();
  return database.getAll(STORE_NAME);
}

export async function clearQueuedOperation(id: string): Promise<void> {
  const database = await db();
  await database.delete(STORE_NAME, id);
}

export async function syncQueuedOperations(): Promise<{
  sent: number;
  conflicts: number;
  errors: number;
}> {
  if (!navigator.onLine) {
    return { sent: 0, conflicts: 0, errors: 0 };
  }

  const queued = await getQueuedOperations();
  if (queued.length === 0) {
    return { sent: 0, conflicts: 0, errors: 0 };
  }

  const payload = queued.map((item) => ({
    operationId: item.id,
    type: item.type,
    entityId: item.entityId,
    payload: item.payload,
    clientUpdatedAt: item.clientUpdatedAt,
  }));

  const response = await syncApi.syncOperations(payload);
  let sent = 0;
  let conflicts = 0;
  let errors = 0;

  for (const result of response.results ?? []) {
    const operationId = String(result.operationId ?? '');
    const status = String(result.status ?? '');
    const conflict = Boolean(result.conflict);
    if (!operationId) continue;

    if (status === 'ok') {
      await clearQueuedOperation(operationId);
      sent += 1;
      if (conflict) conflicts += 1;
    } else {
      errors += 1;
    }
  }

  return { sent, conflicts, errors };
}
