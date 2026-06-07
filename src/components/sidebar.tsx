import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Mic, Scissors, Settings, LogOut, Activity } from 'lucide-react';
import { BrandLockup } from './brand';
import { signOut } from '@/lib/auth';

const nav = [
  { to: '/dashboard',            label: 'Visão geral', icon: LayoutDashboard },
  { to: '/dashboard/recordings', label: 'Gravações',   icon: Mic             },
  { to: '/dashboard/clips',      label: 'Clipes',      icon: Scissors        },
  { to: '/dashboard/live',       label: 'Ao vivo',     icon: Activity        },
  { to: '/dashboard/settings',   label: 'Configurações', icon: Settings      },
] as const;

export function Sidebar() {
  const navigate  = useNavigate();
  const pathname  = useRouterState({ select: s => s.location.pathname });

  async function handleLogout() {
    await signOut();
    navigate({ to: '/login', replace: true });
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="px-5 py-5">
        <BrandLockup />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map(item => {
          const active = item.to === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <Icon size={16} className={active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground'} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand/40 text-sm font-semibold text-brand-foreground">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">Admin</div>
            <div className="truncate text-xs text-muted-foreground">Administrador</div>
          </div>
          <button
            onClick={handleLogout}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
