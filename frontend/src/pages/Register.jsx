import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import ErrorBox from '../components/ErrorBox.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/reservar');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card narrow">
      <h1>Crear cuenta</h1>
      <form onSubmit={submit} className="form">
        <label>Nombre<input value={form.name} onChange={set('name')} required autoComplete="name" /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>
          Contraseña
          <input type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
          <small className="muted">Mínimo 8 caracteres.</small>
        </label>
        <ErrorBox error={error} />
        <button className="btn" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p className="muted">¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link></p>
    </section>
  );
}
