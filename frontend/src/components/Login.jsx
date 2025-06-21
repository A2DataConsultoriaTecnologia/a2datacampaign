// frontend/src/components/Login.jsx
import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/api';
import '../styles/Login.css'; // seu CSS existente
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useContext(AuthContext);

  // Se veio de rota protegida, redirecionar de volta após login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const resp = await login({ email, password });
      const { token, user } = resp.data;

      // Salva token
      localStorage.setItem('token', token);

      // Salva user no contexto e localStorage, se retornado
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
      }

      // Redireciona para a rota original ou raiz
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Erro no login:', err.response?.data || err.message);
      setError(
        err.response?.data?.error ||
        'Credenciais inválidas. Verifique seus dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="animated-bg" />
      <div className="floating-shapes">
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
      </div>

      <div className="login-wrapper">
        <div className="login-card">
          <header className="welcome-header">
            <h1 className="welcome-title">Bem-vindo</h1>
            <p className="welcome-subtitle">
              Entre com suas credenciais para continuar
            </p>
          </header>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder=" "
                disabled={loading}
                required
                autoComplete="email"
              />
              <label className="input-label">Email</label>
            </div>

            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder=" "
                disabled={loading}
                required
                autoComplete="current-password"
              />
              <label className="input-label">Senha</label>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
              >
                {showPassword ? (
                  // ícone “mostrar”
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  // ícone “ocultar”
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M1 1l22 22" />
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  </svg>
                )}
              </button>
            </div>

            <button className="btn-login" type="submit" disabled={loading}>
              {loading 
                ? <><span className="spinner" />Entrando...</> 
                : 'Entrar'}
            </button>
          </form>
          <div className="version-label">v1.0</div>
        </div>
      </div>
    </>
  );
}
