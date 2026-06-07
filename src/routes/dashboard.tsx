import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { hasSessionSync, checkSession } from '@/lib/auth';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    if (typeof window !== 'undefined' && !hasSessionSync()) {
      throw redirect({ to: '/login' });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkSession().then(ok => {
      if (!ok) navigate({ to: '/login', replace: true });
      else setReady(true);
    });
  }, [navigate]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
