import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <NavLink to="/" className="brand">💅 TurnoGlow</NavLink>
      <nav>
        <NavLink to="/" end>Servicios</NavLink>
        {user?.role === 'cliente' && <NavLink to="/reservar">Reservar</NavLink>}
        {user?.role === 'cliente' && <NavLink to="/mis-turnos">Mis turnos</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin/agenda">Agenda</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin/servicios">Servicios (admin)</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin/dias">Días bloqueados</NavLink>}
        {user ? (
          <button className="link" onClick={() => { logout(); navigate('/'); }}>Salir ({user.name})</button>
        ) : (
          <NavLink to="/ingresar">Ingresar</NavLink>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<p>Próximamente: catálogo de servicios.</p>} />
          <Route path="/ingresar" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="*" element={<p>Página no encontrada.</p>} />
        </Routes>
      </main>
      <footer className="footer">TurnoGlow · Lun a Sáb 9 a 19 h</footer>
    </>
  );
}
