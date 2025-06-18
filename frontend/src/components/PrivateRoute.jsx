// frontend/src/components/PrivateRoute.jsx
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    // Enquanto valida token/perfil
    return <p className="text-center mt-10">Carregando...</p>;
  }
  if (!user) {
    // Redireciona para login e guarda origem
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
