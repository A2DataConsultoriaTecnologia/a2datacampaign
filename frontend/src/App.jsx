// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CampaignForm from './components/CampaignForm';
import CampaignList from './components/CampaignList';
import Header from './components/Header';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header sempre visível quando autenticado */}
      <Header />

      {/* Conteúdo principal */}
      <main className="max-w-2xl mx-auto p-4">
        <Routes>
          {/* Redireciona raiz para /campaign */}
          <Route path="/" element={<Navigate to="/campaign" replace />} />

          {/* Formulário de criar nova campanha */}
          <Route path="/campaign" element={<CampaignFormWrapper />} />

          {/* Lista de agendamentos */}
          <Route path="/agendamentos" element={<CampaignListWrapper />} />

          {/* Fallback: qualquer rota desconhecida redireciona para /campaign */}
          <Route path="*" element={<Navigate to="/campaign" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// Wrapper para o CampaignForm: ao criar, navega para lista
function CampaignFormWrapper() {
  const navigate = useNavigate();

  const handleCreated = () => {
    // Após criar, vai para lista
    navigate('/agendamentos');
  };

  return <CampaignForm onCreated={handleCreated} />;
}

// Wrapper para o CampaignList: ao montar, faz fetch normalmente
function CampaignListWrapper() {
  // Se quiser passar reloadFlag, poderia usar estado local
  // Mas como navegamos para essa rota após criar, basta montar e fetch ocorrerá
  return <CampaignList />;
}

export default App;
