import { useEffect, useState } from 'react';
import { addDays, api, formatDate, todayLocal } from '../../api.js';
import ErrorBox from '../../components/ErrorBox.jsx';

export default function BlockedDays() {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(addDays(todayLocal(), 1));
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  const load = () => api.get('/blocked-days').then(setItems).catch(setError);
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/blocked-days', { date, reason });
      setReason('');
      load();
    } catch (err) {
      setError(err);
    }
  };

  const remove = async (d) => {
    setError(null);
    try {
      await api.del(`/blocked-days/${d}`);
      load();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <section>
      <h1>Días bloqueados</h1>
      <p className="muted">Feriados, vacaciones o días sin atención. Las clientas no pueden reservar en estos días.</p>
      <form className="card form" onSubmit={add}>
        <div className="row">
          <label style={{ flex: 1 }}>Fecha<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label style={{ flex: 2 }}>Motivo<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Feriado nacional" /></label>
        </div>
        <ErrorBox error={error} />
        <button className="btn">Bloquear día</button>
      </form>
      <h2>Próximos días bloqueados</h2>
      {items.length === 0 && <p className="muted">No hay días bloqueados.</p>}
      <div className="table-wrap">
        <table>
          <tbody>
            {items.map((b) => (
              <tr key={b.date}>
                <td style={{ textTransform: 'capitalize' }}>{formatDate(b.date)}</td>
                <td>{b.reason}</td>
                <td><button className="btn danger small" onClick={() => remove(b.date)}>Desbloquear</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
