// frontend/src/components/Header.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import HelpModal from './HelpModal';
import '../styles/Header.css';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Refs para nav items e container
  const navRef = useRef(null);
  const campaignRef = useRef(null);
  const agendRef = useRef(null);
  const dropdownRef = useRef(null);

  // Slider de navegação
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  // Dropdown e modal de feedback
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Determinar rota ativa
  const getActiveRoute = () => {
    if (location.pathname.startsWith('/campaign')) return 'campaign';
    if (location.pathname.startsWith('/agendamentos')) return 'agendamentos';
    return 'campaign';
  };
  const activeRoute = getActiveRoute();

  // Atualiza posição do slider sempre que a rota muda ou janela redimensiona
  useEffect(() => {
    const updateSlider = () => {
      let refEl = activeRoute === 'campaign' ? campaignRef.current : agendRef.current;
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

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowHelpMenu(false);
      }
    };
    if (showHelpMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHelpMenu]);

  const toggleHelpMenu = () => setShowHelpMenu(prev => !prev);
  const handleFeedbackClick = () => {
    setShowHelpModal(true);
    setShowHelpMenu(false);
  };

  const handleLogout = () => {
    logout();
    // O redirecionamento para /login já é tratado pelo contexto
  };

  return (
    <>
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
            <div className="nav-slider" style={sliderStyle} />
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

          {/* Perfil e Ações */}
          <div className="header-actions">
            {user && (
              <>
                <div className="profile-dropdown-container" ref={dropdownRef}>
                  <div
                    className={`user-profile ${showHelpMenu ? 'active' : ''}`}
                    onClick={toggleHelpMenu}
                  >
                    <div className="user-avatar">👤</div>
                    <div className="user-info">
                      <span className="user-name">{user.name || user.email}</span>
                      <span className="user-role">{user.role?.toUpperCase()}</span>
                    </div>
                    <div className={`profile-arrow ${showHelpMenu ? 'rotated' : ''}`}>⌄</div>
                  </div>

                  {showHelpMenu && (
                    <div className="help-dropdown">
                      <div className="dropdown-arrow" />
                      <div className="dropdown-content">
                        <button className="help-item" onClick={handleFeedbackClick}>
                          <span className="help-icon">💬</span>
                          <div className="help-text">
                            <span className="help-title">Enviar Feedback</span>
                            <span className="help-subtitle">Reporte bugs ou sugestões</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="logout-btn"
                  onClick={handleLogout}
                  title="Sair do sistema"
                >
                  <span className="logout-icon">⏻</span>
                  <span className="logout-text">Sair</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
    </>
  );
};

export default Header;
