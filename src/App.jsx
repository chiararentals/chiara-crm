import { Routes, Route, Navigate } from 'react-router-dom';
import { MeProvider } from './lib/me';
import { FirmProvider } from './lib/firm';
import Layout from './components/Layout';
import Today from './pages/Today';
import Stays from './pages/Stays';
import Archive from './pages/Archive';
import Todos from './pages/Todos';
import Leads from './pages/Leads';
import Settings from './pages/Settings';

export default function App() {
  return (
    <MeProvider>
      <FirmProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="boravci" element={<Stays />} />
          <Route path="kupci" element={<Leads />} />
          <Route path="arhiva" element={<Archive />} />
          <Route path="zadaci" element={<Todos />} />
          <Route path="postavke" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </FirmProvider>
    </MeProvider>
  );
}
