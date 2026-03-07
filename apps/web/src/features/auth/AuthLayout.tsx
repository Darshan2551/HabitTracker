import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas md:grid-cols-2">
      <div className="hidden bg-[radial-gradient(circle_at_top,_#0ea5e9,_#0f172a_60%)] p-10 text-white md:block">
        <h1 className="text-4xl font-black">Habit Tracker</h1>
        <p className="mt-3 max-w-sm text-base text-sky-100">
          Build routines with reminders, streaks, analytics, and offline sync.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-block text-sm font-semibold text-accent hover:underline">
            Back to home
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
