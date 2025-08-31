import { useSession } from '../hooks/useSession.jsx';

export default function Profile(){
  const { session, profile, loading } = useSession();

  if(!session && !loading) return <div className="container"><div className="card"><p>No has iniciado sesión.</p></div></div>;
  return (
    <div className="container">
      <div className="card" style={{maxWidth:600, margin:'0 auto'}}>
        <h2>Perfil</h2>
        {loading && <p>Cargando...</p>}
        {!loading && session && (
          <ul style={{listStyle:'none',padding:0,display:'grid',gap:8}}>
            <li><strong>Email:</strong> {session.user.email}</li>
            <li><strong>Role:</strong> {profile?.role || 'user'}</li>
            <li><strong>Creado:</strong> {new Date(session.user.created_at).toLocaleString()}</li>
            <li><strong>ID:</strong> <code style={{fontSize:'.7rem'}}>{session.user.id}</code></li>
          </ul>
        )}
      </div>
    </div>
  );
}