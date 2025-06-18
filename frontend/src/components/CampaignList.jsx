import { useEffect, useState } from 'react';
import { fetchCampaigns, deleteCampaign } from '../services/api';
import styles from '../styles/CampaignList.module.css';

export default function CampaignList({ reloadFlag }) {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Estado para modal de imagem
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCampaigns();
      setCampaigns(res.data);
      setFilteredCampaigns(res.data);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
      setError('Erro ao buscar campanhas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [reloadFlag]);

  // Efeito para aplicar filtros
  useEffect(() => {
    let filtered = [...campaigns];

    // Filtro por termo de busca (título)
    if (searchTerm) {
      filtered = filtered.filter(campaign =>
        campaign.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign =>
        campaign.status?.toUpperCase() === statusFilter.toUpperCase()
      );
    }

    // Filtro por data
    if (dateFilter === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Final do dia
      
      filtered = filtered.filter(campaign => {
        const campaignDate = new Date(campaign.scheduled_at);
        return campaignDate >= start && campaignDate <= end;
      });
    } else if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      filtered = filtered.filter(campaign => {
        const campaignDate = new Date(campaign.scheduled_at);
        return campaignDate >= today && campaignDate < tomorrow;
      });
    } else if (dateFilter === 'week') {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      filtered = filtered.filter(campaign => {
        const campaignDate = new Date(campaign.scheduled_at);
        return campaignDate >= weekAgo && campaignDate <= today;
      });
    } else if (dateFilter === 'month') {
      const today = new Date();
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      filtered = filtered.filter(campaign => {
        const campaignDate = new Date(campaign.scheduled_at);
        return campaignDate >= monthAgo && campaignDate <= today;
      });
    }

    // Ordenação
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'status':
        filtered.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
        break;
      default:
        break;
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchTerm, statusFilter, dateFilter, startDate, endDate, sortBy]);

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta campanha? Esta ação não pode ser desfeita.')) return;
    
    setDeleteLoading(id);
    try {
      await deleteCampaign(id);
      loadCampaigns();
    } catch (err) {
      console.error('Erro ao deletar campanha:', err);
      alert('Falha ao deletar campanha. Tente novamente.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const getStatusInfo = (status) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return {
          class: styles.statusScheduled,
          text: 'Agendada',
          icon: '📅'
        };
      case 'SENT':
        return {
          class: styles.statusSent,
          text: 'Enviada',
          icon: '✅'
        };
      case 'FAILED':
        return {
          class: styles.statusFailed,
          text: 'Falha',
          icon: '❌'
        };
      case 'SENDING':
        return {
          class: styles.statusSending,
          text: 'Enviando',
          icon: '⏳'
        };
      default:
        return {
          class: styles.statusScheduled,
          text: 'Agendada',
          icon: '📅'
        };
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getNumbersStats = (numbers) => {
    const sent = numbers.filter(n => n.sent_at).length;
    const pending = numbers.length - sent;
    return { sent, pending, total: numbers.length };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingMessage}>Carregando campanhas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <p className={styles.errorMessage}>{error}</p>
        <button onClick={loadCampaigns} className={styles.retryButton}>
          <span className={styles.retryIcon}>🔄</span>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.mainTitle}>Gerenciar Campanhas</h1>
          <p className={styles.subtitle}>
            {filteredCampaigns.length} de {campaigns.length} campanhas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersContainer}>
        <div className={styles.filtersGrid}>
          {/* Busca por título */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>🔍</span>
              Buscar por título
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o título da campanha..."
              className={styles.searchInput}
            />
          </div>

          {/* Filtro por status */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>📊</span>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todos os status</option>
              <option value="scheduled">Agendadas</option>
              <option value="sending">Enviando</option>
              <option value="sent">Enviadas</option>
              <option value="failed">Falharam</option>
            </select>
          </div>

          {/* Filtro por período */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>📅</span>
              Período
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todos os períodos</option>
              <option value="today">Hoje</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="custom">Período personalizado</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>↕️</span>
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="title">Título (A-Z)</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* Filtro de data personalizado */}
        {dateFilter === 'custom' && (
          <div className={styles.customDateContainer}>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>Data inicial:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>Data final:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </div>
        )}

        {/* Botão limpar filtros */}
        {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all' || sortBy !== 'newest') && (
          <div className={styles.clearFiltersContainer}>
            <button onClick={clearFilters} className={styles.clearFiltersButton}>
              <span className={styles.clearIcon}>✖️</span>
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de campanhas */}
      {filteredCampaigns.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>
            {campaigns.length === 0 ? '📱' : '🔍'}
          </div>
          <p className={styles.emptyMessage}>
            {campaigns.length === 0 
              ? 'Nenhuma campanha cadastrada ainda.' 
              : 'Nenhuma campanha encontrada com os filtros aplicados.'}
          </p>
          <p className={styles.emptySubtext}>
            {campaigns.length === 0 
              ? 'Crie sua primeira campanha para começar!' 
              : 'Tente ajustar os filtros para encontrar campanhas.'}
          </p>
          {campaigns.length > 0 && (
            <button onClick={clearFilters} className={styles.emptyActionButton}>
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className={styles.campaignGrid}>
          {filteredCampaigns.map(c => {
            const statusInfo = getStatusInfo(c.status);
            const numbersStats = getNumbersStats(c.numbers);
            
            return (
              <div key={c.id} className={styles.campaignCard}>
                {/* Cabeçalho do card */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <h2 className={styles.campaignTitle}>{c.title}</h2>
                    <div className={styles.cardMeta}>
                      <span className={styles.campaignId}>ID: {c.id}</span>
                      <span className={styles.metaDivider}>•</span>
                      <span className={styles.campaignDate}>
                        {formatDate(c.scheduled_at)}
                      </span>
                    </div>
                  </div>
                  <div className={`${styles.statusBadge} ${statusInfo.class}`}>
                    <span className={styles.statusIcon}>{statusInfo.icon}</span>
                    <span className={styles.statusText}>{statusInfo.text}</span>
                  </div>
                </div>

                {/* Imagem da campanha (se existir) */}
                {c.image_url && (
                  <div className={styles.campaignImageContainer}>
                    <img
                      src={c.image_url}
                      alt={`Imagem da campanha ${c.title}`}
                      className={styles.campaignImage}
                      onClick={() => openImageModal(c.image_url)}
                    />
                    <div className={styles.imageOverlay}>
                      <span className={styles.expandIcon}>🔍</span>
                    </div>
                  </div>
                )}

                {/* Conteúdo do card */}
                <div className={styles.cardContent}>
                  {/* Mensagem */}
                  <div className={styles.messageSection}>
                    <h3 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>💬</span>
                      Mensagem
                    </h3>
                    <p className={styles.messageText}>{c.message}</p>
                  </div>

                  {/* Estatísticas */}
                  <div className={styles.statsSection}>
                    <h3 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>📊</span>
                      Estatísticas
                    </h3>
                    <div className={styles.statsGrid}>
                      <div className={styles.statCard}>
                        <div className={styles.statNumber}>{numbersStats.total}</div>
                        <div className={styles.statLabel}>Total</div>
                      </div>
                      <div className={styles.statCard}>
                        <div className={styles.statNumber}>{numbersStats.sent}</div>
                        <div className={styles.statLabel}>Enviadas</div>
                      </div>
                      <div className={styles.statCard}>
                        <div className={styles.statNumber}>{numbersStats.pending}</div>
                        <div className={styles.statLabel}>Pendentes</div>
                      </div>
                    </div>
                  </div>

                  {/* Lista de números */}
                  <div className={styles.numbersSection}>
                    <details className={styles.numbersDetails}>
                      <summary className={styles.numbersSummary}>
                        <span className={styles.summaryIcon}>📱</span>
                        <span>Números ({c.numbers.length})</span>
                        <span className={styles.summaryArrow}>▼</span>
                      </summary>
                      <div className={styles.numbersContent}>
                        <div className={styles.numbersList}>
                          {c.numbers.map(n => (
                            <div key={n.id} className={styles.numberItem}>
                              <span className={styles.phoneNumber}>{n.phone_number}</span>
                              <div className={styles.numberStatus}>
                                {n.sent_at ? (
                                  <span className={styles.sentStatus}>
                                    <span className={styles.statusDot}></span>
                                    Enviado
                                    <small>{formatDate(n.sent_at)}</small>
                                  </span>
                                ) : (
                                  <span className={styles.pendingStatus}>
                                    <span className={styles.statusDot}></span>
                                    Pendente
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Ações do card */}
                {c.status === 'SCHEDULED' && (
                  <div className={styles.cardActions}>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleteLoading === c.id}
                      className={styles.deleteButton}
                    >
                      {deleteLoading === c.id ? (
                        <>
                          <span className={styles.buttonSpinner}></span>
                          Deletando...
                        </>
                      ) : (
                        <>
                          <span className={styles.deleteIcon}>🗑️</span>
                          Deletar Campanha
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de imagem */}
      {showImageModal && selectedImage && (
        <div className={styles.imageModal} onClick={closeImageModal}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalButton} onClick={closeImageModal}>
              ✖️
            </button>
            <img src={selectedImage} alt="Imagem ampliada" className={styles.modalImage} />
          </div>
        </div>
      )}
    </div>
  );
}