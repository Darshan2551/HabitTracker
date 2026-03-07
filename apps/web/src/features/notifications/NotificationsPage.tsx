import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { notificationsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationsPage() {
  const [preferences, setPreferences] = useState({ email: true, push: false, sms: false });
  const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY ?? '';

  useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: notificationsApi.getPreferences,
    onSuccess: (data) => setPreferences(data.preferences),
  });

  const saveMutation = useMutation({
    mutationFn: notificationsApi.updatePreferences,
    onSuccess: () => toast.success('Notification preferences updated'),
  });

  const testMutation = useMutation({
    mutationFn: notificationsApi.sendTest,
    onSuccess: () => toast.success('Test notification sent'),
    onError: () => toast.error('Could not send test notification'),
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported in this browser.');
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const json = existing.toJSON();
        await notificationsApi.subscribePush({
          endpoint: json.endpoint ?? '',
          keys: {
            p256dh: json.keys?.p256dh ?? '',
            auth: json.keys?.auth ?? '',
          },
        });
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      await notificationsApi.subscribePush({
        endpoint: json.endpoint ?? '',
        keys: {
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
        },
      });
    },
    onSuccess: () => {
      setPreferences((prev) => ({ ...prev, push: true }));
      toast.success('Push notifications enabled');
    },
    onError: () => toast.error('Could not enable push notifications'),
  });

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-xl font-bold">Notification center</h2>
        <p className="text-sm text-muted">Manage reminders for email, push, and SMS channels.</p>

        <div className="mt-4 space-y-3">
          {(
            [
              ['email', 'Email reminders'],
              ['push', 'Web push notifications'],
              ['sms', 'SMS reminders (pluggable)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    [key]: event.target.checked,
                  }))
                }
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={() => saveMutation.mutate(preferences)}
            loading={saveMutation.isPending}
          >
            Save preferences
          </Button>
          <Button
            variant="secondary"
            onClick={() => testMutation.mutate(preferences.push ? ['email', 'push'] : ['email'])}
            loading={testMutation.isPending}
          >
            Send test notification
          </Button>
          <Button
            variant="ghost"
            onClick={() => pushMutation.mutate()}
            loading={pushMutation.isPending}
            disabled={!vapidPublicKey}
          >
            Enable web push
          </Button>
        </div>
      </Card>
    </div>
  );
}
