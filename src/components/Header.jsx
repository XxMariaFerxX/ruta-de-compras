import { NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession.jsx';
import { signOut } from '../lib/supabaseClient.js';

export default function Header(){
  const { session, profile } = useSession();
  const navigate = useNavigate();
  return (
    <header>
      <div className="logo">Ruta de Compras</div>
      <nav>
        <NavLink to="/">Inicio</NavLink>
  {profile?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
  {session && <NavLink to="/profile">Perfil</NavLink>}
  {session && <NavLink to="/routes">Rutas</NavLink>}
        {session ? (
          <button className="btn btn-secondary" onClick={async ()=>{ await signOut(); navigate('/'); }}>Salir</button>
        ) : (
          <NavLink to="/login" className="btn btn-primary">Ingresar</NavLink>
        )}
      </nav>
    </header>
  );
}
