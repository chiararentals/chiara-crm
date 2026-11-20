import { NavLink, Outlet } from 'react-router-dom';
import { CalendarCheck, ListChecks, Archive, Settings, BedDouble, Users, BarChart3, KeyRound, ChevronsUpDown } from 'lucide-react';
import { useMe } from '../lib/me';
import { useFirm } from '../lib/firm';
import { useAuth } from '../lib/auth';
import { useSync } from '../data';
import { TEAM, FIRMS } from '../seed';

// firms: na kojim prikazima firme se stavka vidi (boravci/gosti su samo Chiara)
const NAV = [
  { to: '/', label: 'Danas', icon: CalendarCheck, end: true },
  { to: '/zadaci', label: 'Zadaci', icon: ListChecks },
  { to: '/kupci', label: 'Kupci', icon: Users, firms: ['', 'dux', 'bonvia'] },
  { to: '/vlasnici', label: 'Vlasnici', icon: KeyRound, firms: ['', 'dux', 'bonvia'] },
  { to: '/boravci', label: 'Boravci', icon: BedDouble, firms: ['', 'chiara'] },
  { to: '/pregled', label: 'Pregled', icon: BarChart3 },
  { to: '/arhiva', label: 'Arhiva', icon: Archive },
  { to: '/postavke', label: 'Postavke', icon: Settings },
];

function FirmSelect({ className = '' }) {
  const [firm, setFirm] = useFirm();
  const dot = firm ? FIRMS[firm].color : '#9A9A94';
  return (
    <label className={`relative flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold ${className}`}>
      <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: dot }} />
      <select value={firm} onChange={(e) => setFirm(e.target.value)} aria-label="Prikaz firme"
        className="w-full appearance-none bg-transparent pr-5 outline-none">
        <option value="">Sve firme</option>
        {Object.entries(FIRMS).map(([k, f]) => <option key={k} value={k}>{f.name}</option>)}
      </select>
      <ChevronsUpDown size={14} className="pointer-events-none absolute right-3 text-mute" />
    </label>
  );
}

export default function Layout() {
  const [me, setMe] = useMe();
  const [firm] = useFirm();
  const auth = useAuth();
  const { error } = useSync();
  const nav = NAV.filter((n) => !n.firms || n.firms.includes(firm));

  return (
    <div className="min-h-screen lg:flex">
      {/* Bočni izbornik – računalo */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-black/5 bg-white p-5 lg:flex">
        <div className="px-1 text-2xl font-bold tracking-tight">CRM</div>
        <div className="mb-4 px-1 text-xs text-mute">Chiara · Bonvia · Dux</div>
        <FirmSelect />
        <nav className="mt-6 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-ink text-white' : 'text-soft hover:bg-black/5'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mute">Prijavljen/a kao</label>
          {auth && !auth.shared ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm">
              <span className="font-semibold">{me}</span>
              <button onClick={auth.signOut} className="text-xs font-semibold text-mute hover:text-navy">Odjava</button>
            </div>
          ) : (
            <>
              <select value={me} onChange={(e) => setMe(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold">
                {TEAM.map((n) => <option key={n}>{n}</option>)}
              </select>
              {auth && <button onClick={auth.signOut} className="mt-2 w-full text-center text-xs font-semibold text-mute hover:text-navy">Odjava</button>}
            </>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Gornja traka – mobitel */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-black/5 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <span className="text-lg font-bold tracking-tight">CRM</span>
          <FirmSelect className="ml-2 flex-1 !py-1.5" />
          {auth && !auth.shared ? (
            <button onClick={auth.signOut} className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold" aria-label="Odjava">{me} ⎋</button>
          ) : (
            <select value={me} onChange={(e) => setMe(e.target.value)} aria-label="Tko si ti" className="rounded-xl border border-black/10 bg-white px-2 py-1.5 text-sm font-semibold">
              {TEAM.map((n) => <option key={n}>{n}</option>)}
            </select>
          )}
        </header>

        {error && <div className="bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700">{error}</div>}
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Donja navigacija – mobitel */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/5 bg-white lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-navy' : 'text-mute'}`}>
            <Icon size={21} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
