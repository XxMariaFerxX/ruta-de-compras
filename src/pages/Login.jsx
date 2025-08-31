import { useState } from 'react';
import { signInWithEmail, signUp } from '../lib/supabaseClient.js';
import { useNavigate } from 'react-router-dom';

export default function Login(){
  const [mode,setMode] = useState('login');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [info,setInfo] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if(mode==='login') {
        await signInWithEmail(email,password);
        navigate('/');
      } else {
        const data = await signUp(email,password,false);
        // Si la confirmación de email está activa, normalmente no hay sesión inmediata
        if(!data.session){
          setInfo('Registro exitoso. Revisa tu correo y haz clic en el enlace para activar tu cuenta. Luego vuelve e inicia sesión.');
        } else {
          navigate('/');
        }
      }
    } catch(err){ setError(err.message); }
    finally{ setLoading(false); }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:480, margin:'40px auto'}}>
        <h2>{mode==='login'?'Ingresar':'Crear cuenta'}</h2>
        <form onSubmit={handleSubmit} className="flex">
          <div className="field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required /></div>
          <div className="field"><label>Contraseña</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" required minLength={6} /></div>
          {error && <div style={{color:'red',width:'100%'}}>{error}</div>}
          {info && <div style={{color:'var(--primary-start)',width:'100%',fontSize:'.85rem',background:'#f0f4ff',padding:8,borderRadius:8}}>{info}</div>}
          <button disabled={loading} className="btn btn-primary" style={{width:'100%'}}>{loading?'Procesando...': (mode==='login'?'Ingresar':'Registrar')}</button>
        </form>
        <div style={{marginTop:12,fontSize:'.85rem'}}>
          {mode==='login'? '¿No tienes cuenta? ': '¿Ya tienes cuenta? '}
          <button type="button" onClick={()=>setMode(mode==='login'?'signup':'login')} style={{background:'none',border:'none',color:'var(--primary-start)',cursor:'pointer',textDecoration:'underline'}}>
            {mode==='login'?'Crear cuenta':'Ingresar'}
          </button>
        </div>
      </div>
    </div>
  );
}
