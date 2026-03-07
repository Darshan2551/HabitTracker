import { ArrowRight, CalendarDays, Cloud, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const features = [
  { icon: CalendarDays, title: 'Flexible schedules', body: 'Daily, weekly, monthly, and custom recurrence rules.' },
  { icon: Cloud, title: 'Offline-first sync', body: 'Log completions offline and auto-sync when connection returns.' },
  { icon: Zap, title: 'Real-time streaks', body: 'Track current streaks, best streaks, and progress trends instantly.' },
  { icon: ShieldCheck, title: 'Secure by default', body: 'JWT access tokens, rotating refresh tokens, and CSRF protection.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-text">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.35),transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.25),transparent_40%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="max-w-3xl space-y-6">
            <p className="inline-flex rounded-full bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              PWA-ready habit system
            </p>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              Consistency engine for your daily habits.
            </h1>
            <p className="text-lg text-muted">
              Habit Tracker helps you plan routines, complete tasks, and analyze progress with an
              installable offline-first experience.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <Button className="px-5 py-3 text-base">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" className="px-5 py-3 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 md:grid-cols-2 md:px-6 xl:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title}>
            <feature.icon className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-lg font-bold">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted">{feature.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
