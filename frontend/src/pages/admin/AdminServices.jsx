import { useEffect, useState } from 'react';
import { api, money } from '../../api.js';
import ErrorBox from '../../components/ErrorBox.jsx';

const empty = { name: '', description: '', durationMin: 60, price: '', active: true };

export default function AdminServices() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/services/all').then(setItems).catch(setError);
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const run = async (fn, ok) => {
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
      load();
      return true;
    } catch (err) {
      setError(err);
      return false;
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, durationMin: Number(form.durationMin), price: Number(form.price) };
    const done = await run(
      () => (editingId ? api.put(`/services/${editingId}`, body) : api.post('/services', body)),
      editingId ? 'Servicio actualizado.' : 'Servicio creado.',
    );
    if (done) { setForm(empty); setEditingId(null); }
  };

  const edit = (s) => { setEditingId(s.id); setForm({ ...s }); window.scrollTo(0, 0); };
  const toggle = (s) => run(() => api.put(`/services/${s.id}`, { active: !s.active }), s.active ? 'Servicio desactivado.' : 'Servicio activado.');
  const remove = (s) => confirm(`¿Eliminar "${s.name}"?`) && run(() => api.del(`/services/${s.id}`), 'Servicio eliminado.');

  return (
    <section>
      <h1>Servicios</h1>
      <form className="card form" onSubmit={submit}>
        <h2 style={{ margin: 0 }}>{editingId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
        <label>Nombre<input value={form.name} onChange={set('name')} required /></label>
        <label>Descripción<textarea value={form.description} onChange={set('description')} rows={2} /></label>
        <div className="row">
          <label style={{ flex: 1 }}>
            Duración
            <select value={form.durationMin} onChange={set('durationMin')}>
              {[30, 60, 90, 120, 150, 180, 210, 240].map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>
          <label style={{ flex: 1 }}>Precio ($)<input type="number" min="1" value={form.price} onChange={set('price')} required /></label>
        </div>
        <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <input type="checkbox" checked={form.active} onChange={set('active')} style={{ width: 'auto' }} /> Activo (visible para clientas)
        </label>
        <ErrorBox error={error} />
        {msg && <div className="alert ok">{msg}</div>}
        <div className="row">
          <button className="btn">{editingId ? 'Guardar cambios' : 'Crear servicio'}</button>
          {editingId && <button type="button" className="btn secondary" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar edición</button>}
        </div>
      </form>

      <h2>Listado</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Servicio</th><th>Duración</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.durationMin} min</td>
                <td>{money(s.price)}</td>
                <td><span className={`badge ${s.active ? 'completado' : 'cancelado'}`}>{s.active ? 'activo' : 'inactivo'}</span></td>
                <td>
                  <div className="row">
                    <button className="btn secondary small" onClick={() => edit(s)}>Editar</button>
                    <button className="btn secondary small" onClick={() => toggle(s)}>{s.active ? 'Desactivar' : 'Activar'}</button>
                    <button className="btn danger small" onClick={() => remove(s)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
