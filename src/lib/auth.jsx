import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, remoteEnabled } from './supabase';
import { initRemote, stopRemote, useSync } from '../data';

// null = lokalni način (bez prijave). Inače { name, email, signOut }.
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist p-4">
      <div className="card w-full max-w-sm p-6">{children}</div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError('Prijava nije uspjela. Provjeri email i lozinku.');
    setBusy(false);
  };
  return (
    <Shell>
      <h1 className="text-2xl font-bold">CRM</h1>
      <p className="mb-5 text-sm text-soft">Chiara · Bonvia · Dux</p>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Email</label><input type="email" autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
        <div><label className="label">Lozinka</label><input type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="text-sm text-wine">{error}</p>}
        <button className="btn-primary w-full" disabled={busy || !email || !password}>{busy ? 'Prijava…' : 'Prijava'}</button>
      </form>
    </Shell>
  );
}

export function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = još se provjerava
  const [name, setName] = useState(null);
  const [denied, setDenied] = useState(false);
  const { ready, error } = useSync();

  useEffect(() => {
    if (!remoteEnabled) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!remoteEnabled || !session) { setName(null); setDenied(false); return undefined; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('team').select('name').maybeSingle();
      if (cancelled) return;
      if (!data) { setDenied(true); return; }
      setName(data.name);
      initRemote();
    })();
    return () => { cancelled = true; };
  }, [session]);

  if (!remoteEnabled) return children; // lokalni način

  const signOut = async () => { stopRemote(); await supabase.auth.signOut(); window.location.reload(); };

  if (session === undefined) return <Shell><p className="text-sm text-soft">Učitavanje…</p></Shell>;
  if (!session) return <LoginForm />;
  if (denied) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">Nemaš pristup</h1>
        <p className="my-3 text-sm text-soft">Ovaj email ({session.user.email}) nije na popisu tima. Javi Marku da te doda.</p>
        <button className="btn-outline w-full" onClick={signOut}>Odjava</button>
      </Shell>
    );
  }
  if (!ready) {
    return (
      <Shell>
        {error
          ? <><p className="mb-3 text-sm text-wine">{error}</p><button className="btn-outline w-full" onClick={() => window.location.reload()}>Pokušaj ponovno</button></>
          : <p className="text-sm text-soft">Učitavam podatke…</p>}
      </Shell>
    );
  }
  return <AuthContext.Provider value={{ name, email: session.user.email, signOut }}>{children}</AuthContext.Provider>;
}
