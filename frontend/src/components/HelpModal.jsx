import React, { useState } from 'react';
import axios from 'axios';
import '../styles/HelpModal.css';

const FeedbackModal = ({ onClose }) => {
  const [reportType, setReportType] = useState('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const reportTypes = [
    { id: 'bug', label: 'Reportar Bug', icon: '🐛', description: 'Encontrou algum problema ou erro?', placeholder: 'Descreva o problema...' },
    { id: 'feature', label: 'Nova Funcionalidade', icon: '💡', description: 'Sugira melhorias', placeholder: 'Descreva a funcionalidade...' },
    { id: 'praise', label: 'Elogio', icon: '❤️', description: 'Compartilhe sua experiência', placeholder: 'Conte-nos o que você mais gosta...' },
  ];

  const selectedType = reportTypes.find(t => t.id === reportType);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!message.trim() || message.trim().length < 10) {
      setError('Por favor, forneça mais detalhes (mínimo 10 caracteres).');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/feedback`, {
        type: reportType,
        message: message.trim(),
        email: email.trim() || null,
      });

      setSuccess('Feedback enviado com sucesso!');
      setTimeout(() => {
        setMessage('');
        setEmail('');
        setReportType('bug');
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal-content" onClick={e => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <div className="feedback-modal-title-section">
            <h2 className="feedback-modal-title">Enviar Feedback</h2>
            <p className="feedback-modal-subtitle">
              Sua opinião é muito importante para melhorarmos nossa plataforma
            </p>
          </div>
          <button className="feedback-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="feedback-modal-body">
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="feedback-type-section">
              <label className="feedback-section-label">Tipo de Feedback</label>
              <div className="feedback-type-grid">
                {reportTypes.map(type => (
                  <div
                    key={type.id}
                    className={`feedback-type-card ${reportType === type.id ? 'active' : ''}`}
                    onClick={() => setReportType(type.id)}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={type.id}
                      checked={reportType === type.id}
                      onChange={() => setReportType(type.id)}
                      className="feedback-type-radio"
                    />
                    <div className="feedback-type-icon">{type.icon}</div>
                    <div className="feedback-type-info">
                      <h3 className="feedback-type-title">{type.label}</h3>
                      <p className="feedback-type-description">{type.description}</p>
                    </div>
                    <div className="feedback-type-indicator" />
                  </div>
                ))}
              </div>
            </div>

            <div className="feedback-form-group">
              <label className="feedback-label">
                E-mail (opcional)
                <span className="feedback-label-hint">Para que possamos responder se necessário</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="feedback-input"
                placeholder="seu.email@exemplo.com"
                disabled={loading}
              />
            </div>

            <div className="feedback-form-group">
              <label className="feedback-label">
                Descrição<span className="feedback-label-required">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="feedback-textarea"
                rows={6}
                placeholder={selectedType.placeholder}
                disabled={loading}
              />
              <div className="feedback-char-count">{message.length} caracteres</div>
            </div>

            {error && <div className="feedback-message feedback-error">❌ {error}</div>}
            {success && <div className="feedback-message feedback-success">✅ {success}</div>}
          </form>
        </div>

        <div className="feedback-modal-footer">
          <div className="feedback-form-actions">
            <button type="button" onClick={onClose} className="feedback-button feedback-button-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" onClick={handleSubmit} className="feedback-button feedback-button-primary" disabled={loading || !message.trim()}>
              {loading ? 'Enviando...' : 'Enviar Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
