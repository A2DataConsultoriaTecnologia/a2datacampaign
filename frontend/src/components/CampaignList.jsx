// src/components/CampaignList.jsx
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
  const [mediaFilter, setMediaFilter] = useState('all'); // Novo filtro para mídia
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
      console.log('🚀 Campanhas carregadas:', res.data); // DEBUG: ver estrutura dos dados
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

  // Efeito para aplicar filtros e ordenação
  useEffect(() => {
    let filtered = [...campaigns];

    // Filtro por título
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c =>
        c.status?.toUpperCase() === statusFilter.toUpperCase()
      );
    }

    // Filtro por mídia
    if (mediaFilter !== 'all') {
      if (mediaFilter === 'with-media') {
        filtered = filtered.filter(c => c.media && c.media.length > 0);
      } else if (mediaFilter === 'without-media') {
        filtered = filtered.filter(c => !c.media || c.media.length === 0);
      }
    }

    // Filtro por data
    if (dateFilter === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter(c => {
        const d = new Date(c.scheduled_at);
        return d >= start && d <= end;
      });
    } else if (dateFilter === 'today') {
      const t0 = new Date(); t0.setHours(0,0,0,0);
      const t1 = new Date(t0); t1.setDate(t1.getDate()+1);

      filtered = filtered.filter(c => {
        const d = new Date(c.scheduled_at);
        return d >= t0 && d < t1;
      });
    } else if (dateFilter === 'week') {
      const t = new Date();
      const weekAgo = new Date(t); weekAgo.setDate(weekAgo.getDate()-7);

      filtered = filtered.filter(c => {
        const d = new Date(c.scheduled_at);
        return d >= weekAgo && d <= t;
      });
    } else if (dateFilter === 'month') {
      const t = new Date();
      const monthAgo = new Date(t); monthAgo.setMonth(monthAgo.getMonth()-1);

      filtered = filtered.filter(c => {
        const d = new Date(c.scheduled_at);
        return d >= monthAgo && d <= t;
      });
    }

    // Ordenação
    switch (sortBy) {
      case 'newest':
        filtered.sort((a,b)=>new Date(b.scheduled_at)-new Date(a.scheduled_at));
        break;
      case 'oldest':
        filtered.sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));
        break;
      case 'title':
        filtered.sort((a,b)=>a.title.localeCompare(b.title));
        break;
      case 'status':
        filtered.sort((a,b)=>(a.status||'').localeCompare(b.status||''));
        break;
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchTerm, statusFilter, dateFilter, mediaFilter, startDate, endDate, sortBy]);

  const handleDelete = async id => {
    if (!window.confirm('Tem certeza que deseja deletar esta campanha?')) return;
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

  const getStatusInfo = status => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED': return { class: styles.statusScheduled, icon: '📅', text: 'Agendada' };
      case 'SENDING':   return { class: styles.statusSending,   icon: '⏳', text: 'Enviando' };
      case 'SENT':      return { class: styles.statusSent,      icon: '✅', text: 'Enviada' };
      case 'FAILED':    return { class: styles.statusFailed,    icon: '❌', text: 'Falha'   };
      default:          return { class: styles.statusScheduled, icon: '📅', text: 'Agendada' };
    }
  };

  const formatDate = dateStr => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day:'2-digit', month:'2-digit', year:'numeric',
        hour:'2-digit', minute:'2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getNumbersStats = numbers => {
    if (!numbers || !Array.isArray(numbers)) {
      console.warn('⚠️ Numbers não é array:', numbers);
      return { total: 0, sent: 0, pending: 0 };
    }
    const sent = numbers.filter(n=>n.sent_at).length;
    return { total: numbers.length, sent, pending: numbers.length - sent };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setMediaFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
  };

  const openImageModal = url => { setSelectedImage(url); setShowImageModal(true); };
  const closeImageModal = () => { setSelectedImage(null); setShowImageModal(false); };

  const hasMedia = campaign => campaign.media && campaign.media.length > 0;

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p className={styles.loadingMessage}>Carregando campanhas...</p>
    </div>
  );

  if (error) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <p className={styles.errorMessage}>{error}</p>
      <button onClick={loadCampaigns} className={styles.retryButton}>
        <span className={styles.retryIcon}>🔄</span>
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.mainTitle}>Gerenciar Campanhas</h1>
          <p className={styles.subtitle}>
            {campaigns.length} {campaigns.length === 1 ? 'campanha encontrada' : 'campanhas encontradas'}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersContainer}>
        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>🔍</span>
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={e=>setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>📊</span>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={e=>setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todos os Status</option>
              <option value="scheduled">Agendadas</option>
              <option value="sending">Enviando</option>
              <option value="sent">Enviadas</option>
              <option value="failed">Falharam</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>🖼️</span>
              Mídia
            </label>
            <select
              value={mediaFilter}
              onChange={e=>setMediaFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todas</option>
              <option value="with-media">Com Imagem</option>
              <option value="without-media">Sem Imagem</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>📅</span>
              Período
            </label>
            <select
              value={dateFilter}
              onChange={e=>setDateFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todo período</option>
              <option value="today">Hoje</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className={styles.filterIcon}>🔄</span>
              Ordenar
            </label>
            <select
              value={sortBy}
              onChange={e=>setSortBy(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="title">Alfabética</option>
              <option value="status">Por status</option>
            </select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className={styles.customDateContainer}>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={e=>setStartDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={e=>setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </div>
        )}

        {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all' || mediaFilter !== 'all' || sortBy !== 'newest') && (
          <div className={styles.clearFiltersContainer}>
            <button onClick={clearFilters} className={styles.clearFiltersButton}>
              <span className={styles.clearIcon}>✖</span>
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de Campanhas */}
      {filteredCampaigns.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>📭</div>
          <h2 className={styles.emptyMessage}>
            {campaigns.length === 0
              ? 'Nenhuma campanha encontrada'
              : 'Nenhuma campanha corresponde aos filtros'}
          </h2>
          <p className={styles.emptySubtext}>
            {campaigns.length === 0
              ? 'Crie sua primeira campanha para começar'
              : 'Tente ajustar os filtros para encontrar suas campanhas'}
          </p>
        </div>
      ) : (
        <div className={styles.campaignGrid}>
          {filteredCampaigns.map(campaign => {
            const { class: statusClass, icon, text } = getStatusInfo(campaign.status);
            const { total, sent, pending } = getNumbersStats(campaign.numbers);
            const campaignHasMedia = hasMedia(campaign);
            
            return (
              <div key={campaign.id} className={styles.campaignCard}>
                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <h3 className={styles.campaignTitle}>{campaign.title}</h3>
                    <div className={styles.cardMeta}>
                      <span className={styles.campaignId}>ID: {campaign.id}</span>
                      <span className={styles.metaDivider}>•</span>
                      <span className={styles.campaignDate}>{formatDate(campaign.scheduled_at)}</span>
                    </div>
                  </div>
                  <div className={`${styles.statusBadge} ${statusClass}`}>
                    <span className={styles.statusIcon}>{icon}</span>
                    <span className={styles.statusText}>{text}</span>
                  </div>
                </div>

                {/* Imagem da Campanha */}
                {campaignHasMedia && (
                  <div className={styles.campaignImageContainer}>
                    <img
                      src={campaign.media[0].url}
                      alt={`Imagem da campanha ${campaign.title}`}
                      className={styles.campaignImage}
                      onClick={() => openImageModal(campaign.media[0].url)}
                    />
                    <div className={styles.imageOverlay}>
                      <span className={styles.expandIcon}>🔍</span>
                    </div>
                  </div>
                )}

                {/* Indicador de Campanha sem Imagem */}
                {!campaignHasMedia && (
                  <div className={styles.noImageContainer}>
                    <div className={styles.noImageIcon}>📝</div>
                    <span className={styles.noImageText}>Campanha apenas com texto</span>
                  </div>
                )}

                {/* Conteúdo do Card */}
                <div className={styles.cardContent}>
                  {/* Mensagem */}
                  <div className={styles.messageSection}>
                    <h4 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>💬</span>
                      Mensagem
                    </h4>
                    <p className={styles.messageText}>{campaign.message}</p>
                  </div>

                  {/* Estatísticas */}
                  <div className={styles.statsSection}>
                    <h4 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>📊</span>
                      Estatísticas
                    </h4>
                    <div className={styles.statsGrid}>
                      <div className={styles.statCard}>
                        <span className={styles.statNumber}>{total}</span>
                        <span className={styles.statLabel}>Total</span>
                      </div>
                      <div className={styles.statCard}>
                        <span className={styles.statNumber}>{sent}</span>
                        <span className={styles.statLabel}>Enviadas</span>
                      </div>
                      <div className={styles.statCard}>
                        <span className={styles.statNumber}>{pending}</span>
                        <span className={styles.statLabel}>Pendentes</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes dos Números */}
                  <div className={styles.numbersSection}>
                    <details className={styles.numbersDetails}>
                      <summary className={styles.numbersSummary}>
                        <span className={styles.summaryIcon}>📱</span>
                        Números de Telefone ({campaign.numbers?.length || 0})
                        <span className={styles.summaryArrow}>▼</span>
                      </summary>
                      <div className={styles.numbersContent}>
                        {campaign.numbers && campaign.numbers.length > 0 ? (
                          <ul className={styles.numbersList}>
                            {campaign.numbers.map((number, index) => (
                              <li key={number.id || index} className={styles.numberItem}>
                                <span className={styles.phoneNumber}>
                                  {number.phone_number || number.phone || 'Número não encontrado'}
                                </span>
                                <div className={styles.numberStatus}>
                                  {number.sent_at ? (
                                    <div className={styles.sentStatus}>
                                      <span className={styles.statusDot}></span>
                                      Enviada
                                      <small>{formatDate(number.sent_at)}</small>
                                    </div>
                                  ) : (
                                    <div className={styles.pendingStatus}>
                                      <span className={styles.statusDot}></span>
                                      Pendente
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className={styles.emptyNumbers}>
                            <p>Nenhum número cadastrado para esta campanha</p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>

                {/* Ações do Card */}
                {campaign.status === 'SCHEDULED' && (
                  <div className={styles.cardActions}>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      disabled={deleteLoading === campaign.id}
                      className={styles.deleteButton}
                    >
                      {deleteLoading === campaign.id ? (
                        <>
                          <div className={styles.buttonSpinner}></div>
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

      {/* Modal de Imagem */}
      {showImageModal && (
        <div className={styles.imageModal} onClick={closeImageModal}>
          <div className={styles.imageModalContent} onClick={e => e.stopPropagation()}>
            <button onClick={closeImageModal} className={styles.closeModalButton}>
              ✖
            </button>
            <img src={selectedImage} alt="" className={styles.modalImage} />
          </div>
        </div>
      )}
    </div>
  );
}