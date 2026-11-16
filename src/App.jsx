import { Routes, Route, Navigate } from 'react-router-dom';
import { MeProvider } from './lib/me';
import Layout from './components/Layout';
import Today from './pages/Today';
import Stays from './pages/Stays';
import Calendar from './pages/Calendar';
import Archive from './pages/Archive';
import Todos from './pages/Todos';
import Leads from './pages/Leads';
import Settings from './pages/Settings';

export default function App() {
  return (
    <MeProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="boravci" element={<Stays />} />
          <Route path="kalendar" element={<Calendar />} />
          <Route path="kupci" element={<Leads />} />
          <Route path="arhiva" element={<Archive />} />
          <Route path="zadaci" element={<Todos />} />
          <Route path="postavke" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MeProvider>
  );
}
