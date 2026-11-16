import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { addDays, api, formatDate, money, todayLocal } from '../api.js';
import ErrorBox from '../components/ErrorBox.jsx';

export default function Book() {
  const [params] = useSearchParams();
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(params.get('servicio') ? Number(params.get('servicio')) : null);
  const [date, setDate] = useState(todayLocal());
  const [availability, setAvailability] = useState(null);
  const [time, setTime] = useState(null);
  const [error, setError] = useState(null);
  const [booked, setBooked] = useState(null);
  const [busy, setBusy] = useState(false);

  const today = todayLocal();
  const maxDate = addDays(today, 30); // RN-15

  useEffect(() => {
    api.get('/services').then(setServices).catch(setError);
  }, []);

  useEffect(() => {
    if (!serviceId || !date) return;
    setAvailability(null);
    setTime(null);
    api.get(`/availability?serviceId=${serviceId}&date=${date}`).then(setAvailability).catch(setError);
  }, [serviceId, date]);

  const service = services.find((s) => s.id === serviceId);

  const confirm = async () => {
    setError(null);
    setBusy(true);
    try {
      const appt = await api.post('/appointments', { serviceId, date, time });
      setBooked(appt);
    } catch (err) {
      setError(err);
      // Si alguien tomó el horario mientras tanto, recargamos la disponibilidad.
      api.get(`/availability?serviceId=${serviceId}&date=${date}`).then(setAvailability).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setBooked(null);
    setTime(null);
    setAvailability(null);
    api.get(`/availability?serviceId=${serviceId}&date=${date}`).then(setAvailability).catch(setError);
  };

  if (booked) {
    return (
      <section className="card narrow">
        <h1>¡Turno reservado! 🎉</h1>
        <p><strong>{booked.serviceName}</strong></p>
        <p>{formatDate(booked.date)} a las <strong>{booked.time} h</strong></p>
        <p className="muted">Podés cancelarlo desde "Mis turnos" hasta 24 h antes.</p>
        <div className="row">
          <Link className="btn" to="/mis-turnos">Ver mis turnos</Link>
          <button className="btn secondary" onClick={reset}>Reservar otro</button>
        </div>
      </section>
    );
  }

  return (
    <section className="steps">
      <h1>Reservar turno</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>1. Elegí el servicio</h2>
        <div className="services-pick">
          {services.map((s) => (
            <button key={s.id} className={`service-option ${s.id === serviceId ? 'selected' : ''}`} onClick={() => setServiceId(s.id)}>
              <span><strong>{s.name}</strong><br /><small className="muted">{s.durationMin} min</small></span>
              <span className="price">{money(s.price)}</span>
            </button>
          ))}
        </div>
      </div>

      {service && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>2. Elegí el día</h2>
          <div className="row">
            <input type="date" value={date} min={today} max={maxDate} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 200 }} />
            <span className="muted">{date && formatDate(date)}</span>
          </div>
          <p className="muted"><small>Atendemos de lunes a sábado de 9 a 19 h. Se reserva con al menos 2 h y hasta 30 días de anticipación.</small></p>
        </div>
      )}

      {service && date && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>3. Elegí el horario</h2>
          {!availability && <p className="muted">Buscando horarios…</p>}
          {availability && availability.slots.length === 0 && (
            <p className="muted">{availability.reason || 'No quedan horarios libres para ese día.'} Probá con otra fecha.</p>
          )}
          <div className="slots">
            {availability?.slots.map((t) => (
              <button key={t} className={`slot ${t === time ? 'selected' : ''}`} onClick={() => setTime(t)}>{t}</button>
            ))}
          </div>
        </div>
      )}

      {time && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>4. Confirmá</h2>
          <p>{service.name} · {formatDate(date)} a las <strong>{time} h</strong> · <span className="price">{money(service.price)}</span></p>
          <ErrorBox error={error} />
          <button className="btn" onClick={confirm} disabled={busy}>{busy ? 'Reservando…' : 'Confirmar turno'}</button>
        </div>
      )}
      {!time && <ErrorBox error={error} />}
    </section>
  );
}
