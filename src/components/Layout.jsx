import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, CalendarCheck, ListChecks, Archive, Settings, BedDouble } from 'lucide-react';
import { useMe } from '../lib/me';
import { TEAM } from '../seed';

const NAV = [
  { to: '/', label: 'Danas', icon: CalendarCheck, end: true },
  { to: '/boravci', label: 'Boravci', icon: BedDouble },
  { to: '/kalendar', label: 'Kalendar', icon: CalendarDays },
  { to: '/zadaci', label: 'Zadaci', icon: ListChecks },
  { to: '/arhiva', label: 'Arhiva', icon: Archive },
  { to: '/postavke', label: 'Postavke', icon: Settings },
];

export default function Layout() {
  const [me, setMe] = useMe();

  return (
    <div className="min-h-screen lg:flex">
      {/* Bočni izbornik – računalo */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col bg-navy p-6 text-white lg:flex">
        <div className="font-serif text-2xl font-semibold leading-tight">Chiara<span className="block text-sm font-normal text-gold">Apartments & Villas</span></div>
        <nav className="mt-10 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-wine text-white' : 'text-white/70 hover:bg-white/10'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Prijavljen/a kao</label>
          <select value={me} onChange={(e) => setMe(e.target.value)} className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white">
            {TEAM.map((n) => <option key={n} className="text-navy">{n}</option>)}
          </select>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Gornja traka – mobitel */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-navy px-4 py-3 text-white lg:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <span className="font-serif text-xl font-semibold">Chiara <span className="text-sm font-normal text-gold">CRM</span></span>
          <select value={me} onChange={(e) => setMe(e.target.value)} className="rounded-lg bg-white/10 px-2 py-1 text-sm font-semibold text-white">
            {TEAM.map((n) => <option key={n} className="text-navy">{n}</option>)}
          </select>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Donja navigacija – mobitel */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-mute/20 bg-white lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-wine' : 'text-mute'}`}>
            <Icon size={21} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
