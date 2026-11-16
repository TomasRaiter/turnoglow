import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (path, body) => {
    const { token, user: u } = await api.post(path, body);
    setToken(token);
    setUser(u);
    return u;
  };

  const value = {
    user,
    loading,
    login: (email, password) => signIn('/auth/login', { email, password }),
    register: (name, email, password) => signIn('/auth/register', { name, email, password }),
    logout: () => { setToken(null); setUser(null); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Cargando…</p>;
  if (!user) return <Navigate to="/ingresar" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}
