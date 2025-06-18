// frontend/src/components/Header.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Header.css';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Refs para nav items e container
  const navRef = useRef(null);
  const campaignRef = useRef(null);
  const agendRef = useRef(null);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  // Determinar rota ativa: retorna 'campaign' ou 'agendamentos'
  const getActiveRoute = () => {
    if (location.pathname.startsWith('/campaign')) return 'campaign';
    if (location.pathname.startsWith('/agendamentos')) return 'agendamentos';
    return 'campaign';
  };
  const activeRoute = getActiveRoute();

  // Atualiza posição do slider sempre que a rota muda ou janela redimensiona
  useEffect(() => {
    const updateSlider = () => {
      let refEl = null;
      if (activeRoute === 'campaign') {
        refEl = campaignRef.current;
      } else if (activeRoute === 'agendamentos') {
        refEl = agendRef.current;
      }
      if (refEl && navRef.current) {
        const parentRect = navRef.current.getBoundingClientRect();
        const rect = refEl.getBoundingClientRect();
        setSliderStyle({
          left: rect.left - parentRect.left,
          width: rect.width
        });
      }
    };
    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [activeRoute]);

  const handleLogout = () => {
    logout();
    // navigate('/login') já feito no logout do contexto
  };

  return (
    <header className="modern-header">
      <div className="header-container">
        {/* Logo e Título */}
        <div className="header-brand">
          <div className="brand-text">
            <h1 className="brand-title">A2DataAutomate</h1>
            <span className="brand-subtitle">Sistema de Campanhas</span>
          </div>
        </div>

        {/* Navegação */}
        <nav className="header-nav" ref={navRef}>
          {/* Slider */}
          <div
            className="nav-slider"
            style={{
              left: sliderStyle.left,
              width: sliderStyle.width
            }}
          ></div>

          <button
            ref={campaignRef}
            className={`nav-item ${activeRoute === 'campaign' ? 'active' : ''}`}
            onClick={() => navigate('/campaign')}
          >
            <span className="nav-text">Campanhas</span>
          </button>
          <button
            ref={agendRef}
            className={`nav-item ${activeRoute === 'agendamentos' ? 'active' : ''}`}
            onClick={() => navigate('/agendamentos')}
          >
            <span className="nav-text">Agendamentos</span>
          </button>
        </nav>

        {/* Perfil e Logout */}
        <div className="header-actions">
          {user ? (
            <>
              <div className="user-profile">
                <div className="user-avatar">
                  <span>👤</span>
                </div>
                <div className="user-info">
                  <span className="user-name">
                    {user.name ? user.name : user.email}
                  </span>
                  <span className="user-role">
                    {user.role ? user.role.toUpperCase() : ''}
                  </span>
                </div>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Sair do sistema">
                <span className="logout-icon">⏻</span>
                <span className="logout-text">Sair</span>
              </button>
            </>
          ) : (
            // Se não houver user, você pode exibir login/link ou nada
            <></>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
