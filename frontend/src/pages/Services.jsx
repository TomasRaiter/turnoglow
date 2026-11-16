import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import { useAuth } from '../auth.jsx';
import ErrorBox from '../components/ErrorBox.jsx';

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/services').then(setServices).catch(setError);
  }, []);

  const bookLink = (id) => (user ? `/reservar?servicio=${id}` : '/ingresar');

  return (
    <>
      <section className="hero">
        <h1>Uñas y pestañas, con turno online</h1>
        <p>Elegí tu servicio, mirá los horarios libres y reservá en un minuto.</p>
        {!user && <Link className="btn" to="/registro">Crear cuenta y reservar</Link>}
      </section>
      <ErrorBox error={error} />
      {!services && !error && <p className="muted">Cargando servicios… (la primera carga puede tardar unos segundos)</p>}
      {services?.length === 0 && <p className="muted">Todavía no hay servicios cargados.</p>}
      <div className="grid">
        {services?.map((s) => (
          <article className="card" key={s.id}>
            <h2 style={{ marginTop: 0 }}>{s.name}</h2>
            <p className="muted">{s.description}</p>
            <p>⏱ {s.durationMin} min · <span className="price">{money(s.price)}</span></p>
            {user?.role !== 'admin' && <Link className="btn small" to={bookLink(s.id)}>Reservar</Link>}
          </article>
        ))}
      </div>
    </>
  );
}
