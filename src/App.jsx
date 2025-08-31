import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Store from './pages/Store.jsx';
import Admin from './pages/Admin.jsx';
import RoutePlanner from './pages/RoutePlanner.jsx';
import Profile from './pages/Profile.jsx';
import SavedRoutes from './pages/SavedRoutes.jsx';
import RouteDetail from './pages/RouteDetail.jsx';
import Header from './components/Header.jsx';
import { SessionProvider } from './hooks/useSession.jsx';

export default function App() {
  return (
    <SessionProvider>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/stores/:id" element={<Store />} />
        <Route path="/admin" element={<Admin />} />
  <Route path="/stores/:id/route" element={<RoutePlanner />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/routes" element={<SavedRoutes />} />
  <Route path="/routes/:routeId" element={<RouteDetail />} />
      </Routes>
    </SessionProvider>
  );
}
