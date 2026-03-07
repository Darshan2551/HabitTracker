import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { settingsApi, templatesApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useThemeStore } from '@/store/theme-store';

export function OnboardingPage() {
  const navigate = useNavigate();
  const themeStore = useThemeStore();
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (selectedTemplates.length > 0) {
        await templatesApi.apply(selectedTemplates);
      }
      await settingsApi.update({
        themeMode: themeStore.mode,
        palette: themeStore.palette,
        accentColor: themeStore.accentColor,
        fontScale: themeStore.fontScale,
      });
    },
    onSuccess: () => {
      toast.success('Onboarding completed');
      navigate('/app');
    },
    onError: () => toast.error('Unable to finish onboarding'),
  });

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-xl font-bold">Pick starter templates</h2>
        <p className="text-sm text-muted">Choose habits to bootstrap your first week.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(templatesQuery.data?.templates ?? []).map((template: Record<string, unknown>) => {
            const slug = String(template.slug);
            const selected = selectedTemplates.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                className={`rounded-xl border p-4 text-left transition ${
                  selected ? 'border-accent bg-canvas' : 'border-border bg-surface hover:border-accent'
                }`}
                onClick={() =>
                  setSelectedTemplates((prev) =>
                    prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug],
                  )
                }
              >
                <p className="font-semibold">{String(template.title)}</p>
                <p className="mt-1 text-sm text-muted">{String(template.description ?? '')}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Set your visual theme</h2>
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
              <option value="ocean">Ocean</option>
              <option value="forest">Forest</option>
              <option value="sunset">Sunset</option>
            </select>
          </label>
        </div>
        <Button className="mt-4" onClick={() => applyMutation.mutate()} loading={applyMutation.isPending}>
          Finish onboarding
        </Button>
      </Card>
    </div>
  );
}
