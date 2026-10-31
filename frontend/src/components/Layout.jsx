import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useData } from '../lib/DataContext.jsx';

export const NAV = [
  { to: '/overview', label: 'Overview' },
  { to: '/team-a', label: 'Team A' },
  { to: '/team-b', label: 'Team B' },
  { to: '/messages', label: 'Messages' },
  { to: '/settings', label: 'Settings' },
];

function ModeBadge() {
  const { isDemo, connection } = useData();

  if (isDemo) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
        DEMO · simulated data
      </span>
    );
  }

  const connected = connection.state === 'connected';
  const classes = connected ? 'bg-ok/10 text-ok' : connection.state === 'error' ? 'bg-emergency/10 text-emergency' : 'bg-warn/10 text-warn';
  const text = connected ? 'hardware backend connected' : connection.state === 'error' ? 'disconnected' : 'connecting';

  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>LIVE · {text}</span>;
}

export default function Layout() {
  const { pathname } = useLocation();
  const current = NAV.find((item) => pathname.startsWith(item.to));

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-black/5 bg-white/60 p-4 backdrop-blur-xl md:flex dark:border-white/10 dark:bg-zinc-950/60">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold tracking-tight">SkyBridge</p>
          <p className="text-xs text-zinc-500">Relay communication</p>
        </div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 text-sm transition duration-200 ${
                isActive
                  ? 'bg-accent text-white shadow-soft'
                  : 'text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </aside>

      <main className="flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-black/5 bg-white/70 px-5 py-3 backdrop-blur-xl md:px-8 dark:border-white/10 dark:bg-zinc-950/70">
          <h1 className="text-base font-semibold">{current?.label ?? 'SkyBridge'}</h1>
          <ModeBadge />
        </header>
        <div className="mx-auto max-w-5xl p-5 md:p-8">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-black/5 bg-white/80 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-zinc-950/80">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-2 py-1 text-[11px] font-medium transition duration-200 ${isActive ? 'text-accent' : 'text-zinc-500'}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
