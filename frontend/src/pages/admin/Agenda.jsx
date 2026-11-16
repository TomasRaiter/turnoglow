import { useEffect, useState } from 'react';
import { addDays, api, formatDate, money, todayLocal } from '../../api.js';
import ErrorBox from '../../components/ErrorBox.jsx';

export default function Agenda() {
  const [date, setDate] = useState(todayLocal());
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setItems(null);
    api.get(`/admin/appointments?date=${date}`).then(setItems).catch(setError);
  };
  useEffect(load, [date]);

  const act = async (fn) => {
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err);
    }
  };
  const cancel = (a) => confirm(`¿Cancelar el turno de ${a.clientName} a las ${a.time}?`) && act(() => api.post(`/appointments/${a.id}/cancel`));
  const mark = (a, status) => act(() => api.post(`/admin/appointments/${a.id}/status`, { status }));

  const started = (a) => new Date(a.start).getTime() <= Date.now();
  const confirmed = items?.filter((a) => a.status === 'confirmado') ?? [];
  const income = items?.filter((a) => a.status !== 'cancelado').reduce((t, a) => t + a.price, 0) ?? 0;

  return (
    <section>
      <h1>Agenda</h1>
      <div className="row">
        <button className="btn secondary small" onClick={() => setDate(addDays(date, -1))}>◀</button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 180 }} />
        <button className="btn secondary small" onClick={() => setDate(addDays(date, 1))}>▶</button>
        <button className="btn secondary small" onClick={() => setDate(todayLocal())}>Hoy</button>
        <strong style={{ textTransform: 'capitalize' }}>{formatDate(date)}</strong>
      </div>
      <p className="muted">{confirmed.length} turno(s) confirmados · Total del día: {money(income)}</p>
      <ErrorBox error={error} />
      {!items && <p className="muted">Cargando…</p>}
      {items?.length === 0 && <p className="muted">No hay turnos para este día.</p>}
      {items?.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Hora</th><th>Clienta</th><th>Servicio</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.time}</strong></td>
                  <td>{a.clientName}<br /><small className="muted">{a.clientEmail}</small></td>
                  <td>{a.serviceName}</td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td>
                    {a.status === 'confirmado' && (
                      <div className="row">
                        {started(a) && <button className="btn small" onClick={() => mark(a, 'completado')}>Completado</button>}
                        {started(a) && <button className="btn secondary small" onClick={() => mark(a, 'ausente')}>Ausente</button>}
                        <button className="btn danger small" onClick={() => cancel(a)}>Cancelar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
