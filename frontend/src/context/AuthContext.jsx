// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { getProfile } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Tenta ler user salvo
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [loading, setLoading] = useState(!user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Verifica /auth/me para dados atualizados e token válido
      (async () => {
        try {
          const res = await getProfile();
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Erro ao atualizar perfil:', err.response?.data || err.message);
          // Se token inválido, limpa e redireciona
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          navigate('/login');
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
