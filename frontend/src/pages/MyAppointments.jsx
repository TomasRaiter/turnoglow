import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, money } from '../api.js';
import ErrorBox from '../components/ErrorBox.jsx';

export default function MyAppointments() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/appointments/mine').then(setItems).catch(setError);
  useEffect(() => { load(); }, []);

  const cancel = async (a) => {
    if (!confirm(`¿Cancelar ${a.serviceName} del ${formatDate(a.date)} a las ${a.time}?`)) return;
    setError(null);
    setMsg(null);
    try {
      await api.post(`/appointments/${a.id}/cancel`);
      setMsg('Turno cancelado.');
      load();
    } catch (err) {
      setError(err);
    }
  };

  const now = Date.now();
  const upcoming = items?.filter((a) => a.status === 'confirmado' && new Date(a.start).getTime() > now).reverse() ?? [];
  const history = items?.filter((a) => !upcoming.includes(a)) ?? [];

  return (
    <section>
      <h1>Mis turnos</h1>
      <ErrorBox error={error} />
      {msg && <div className="alert ok">{msg}</div>}
      {!items && !error && <p className="muted">Cargando…</p>}

      <h2>Próximos</h2>
      {items && upcoming.length === 0 && <p className="muted">No tenés turnos próximos. <Link to="/reservar">Reservá uno</Link>.</p>}
      <div className="grid">
        {upcoming.map((a) => (
          <article className="card" key={a.id}>
            <strong>{a.serviceName}</strong>
            <p>{formatDate(a.date)}<br />{a.time} h · <span className="price">{money(a.price)}</span></p>
            <button className="btn danger small" onClick={() => cancel(a)}>Cancelar</button>
          </article>
        ))}
      </div>

      <h2>Historial</h2>
      {items && history.length === 0 && <p className="muted">Sin turnos anteriores.</p>}
      {history.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Hora</th><th>Servicio</th><th>Estado</th></tr></thead>
            <tbody>
              {history.map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.date)}</td>
                  <td>{a.time}</td>
                  <td>{a.serviceName}</td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
