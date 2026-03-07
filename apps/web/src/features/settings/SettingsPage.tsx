import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { exportApi, settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useThemeStore } from '@/store/theme-store';

const palettes = ['ocean', 'forest', 'sunset'] as const;

export function SettingsPage() {
  const themeStore = useThemeStore();
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [locale, setLocale] = useState('en-US');

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    onSuccess: (data) => {
      const settings = data.settings as Record<string, unknown>;
      setTimezone(String(settings.timezone ?? 'Asia/Kolkata'));
      setLocale(String(settings.locale ?? 'en-US'));
      themeStore.setTheme({
        mode: String(settings.themeMode ?? themeStore.mode) as typeof themeStore.mode,
        palette: String(settings.palette ?? themeStore.palette) as typeof themeStore.palette,
        accentColor: String(settings.accentColor ?? themeStore.accentColor),
        fontScale: Number(settings.fontScale ?? themeStore.fontScale),
        reduceMotion: Boolean(settings.accessibilityReduceMotion ?? themeStore.reduceMotion),
        highContrast: Boolean(settings.accessibilityHighContrast ?? themeStore.highContrast),
      });
    },
  });

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast.success('Settings saved');
    },
    onError: () => toast.error('Could not save settings'),
  });

  const importMutation = useMutation({
    mutationFn: exportApi.importJson,
    onSuccess: () => toast.success('Backup restored'),
    onError: () => toast.error('Invalid backup payload'),
  });

  useEffect(() => {
    themeStore.applyTheme();
  }, [themeStore]);

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-xl font-bold">Theme and appearance</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Theme mode</span>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={themeStore.mode}
              onChange={(event) =>
                themeStore.setTheme({
                  mode: event.target.value as typeof themeStore.mode,
                })
              }
            >
              <option value="LIGHT">Light</option>
              <option value="DARK">Dark</option>
              <option value="SYSTEM">System</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Palette</span>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={themeStore.palette}
              onChange={(event) =>
                themeStore.setTheme({
                  palette: event.target.value as typeof themeStore.palette,
                })
              }
            >
              {palettes.map((palette) => (
                <option key={palette} value={palette}>
                  {palette}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Custom accent color</span>
            <input
              type="color"
              className="h-10 w-full rounded-lg border border-border bg-surface p-1"
              value={themeStore.accentColor}
              onChange={(event) => themeStore.setTheme({ accentColor: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Font scale ({themeStore.fontScale.toFixed(2)}x)</span>
            <input
              type="range"
              min={0.8}
              max={1.4}
              step={0.05}
              value={themeStore.fontScale}
              onChange={(event) => themeStore.setTheme({ fontScale: Number(event.target.value) })}
              className="w-full"
            />
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Locale and accessibility</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          <Input label="Locale" value={locale} onChange={(event) => setLocale(event.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={themeStore.reduceMotion}
              onChange={(event) => themeStore.setTheme({ reduceMotion: event.target.checked })}
            />
            Reduce motion
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={themeStore.highContrast}
              onChange={(event) => themeStore.setTheme({ highContrast: event.target.checked })}
            />
            High contrast
          </label>
        </div>
        <Button
          className="mt-5"
          loading={mutation.isPending || settingsQuery.isLoading}
          onClick={() =>
            mutation.mutate({
              themeMode: themeStore.mode,
              palette: themeStore.palette,
              accentColor: themeStore.accentColor,
              fontScale: themeStore.fontScale,
              timezone,
              locale,
              accessibilityReduceMotion: themeStore.reduceMotion,
              accessibilityHighContrast: themeStore.highContrast,
            })
          }
        >
          Save settings
        </Button>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Backup and export</h2>
        <p className="text-sm text-muted">Export your history as CSV or restore from JSON backup.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={async () => {
              const blob = await exportApi.downloadCsv();
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `habit-history-${Date.now()}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold">
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                importMutation.mutate(JSON.parse(text) as Record<string, unknown>);
              }}
            />
          </label>
        </div>
      </Card>
    </div>
  );
}
