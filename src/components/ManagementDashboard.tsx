import React, { useState, useEffect } from 'react';
import { Company, Licitacao, Contrato, Orgao, Portal, Parcela, TimelineEvent } from '../types';
import { 
  apiFetchLicitacoes, apiSaveLicitacao, apiDeleteLicitacao,
  apiFetchContratos, apiSaveContrato, apiDeleteContrato,
  apiFetchOrgaos, apiSaveOrgao, apiDeleteOrgao,
  apiFetchPortais, apiSavePortal, apiDeletePortal
} from '../lib/db';
import { 
  TrendingUp, Calendar, AlertTriangle, Users, Search, Plus, Trash2, Edit3, 
  MapPin, Clock, ExternalLink, Award, DollarSign, Archive, FileText, CheckCircle, ListPlus, X 
} from 'lucide-react';
import CountdownTimer from './CountdownTimer';

interface ManagementDashboardProps {
  companies: Company[];
  showToast: (msg: string, isError?: boolean) => void;
  refreshTrigger?: number;
}

export default function ManagementDashboard({ companies, showToast, refreshTrigger }: ManagementDashboardProps) {
  // Tab control inside Management Panel
  const [subTab, setSubTab] = useState<'monitoramento' | 'contratos' | 'orgaos' | 'portais'>('monitoramento');

  // DB States
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [orgaos, setOrgaos] = useState<Orgao[]>([]);
  const [portais, setPortais] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [portalFilter, setPortalFilter] = useState('');

  // Modals Controller
  const [activeBidModal, setActiveBidModal] = useState<Licitacao | null>(null);
  const [activeContractModal, setActiveContractModal] = useState<Contrato | null>(null);
  const [activeInstallmentModal, setActiveInstallmentModal] = useState<{ contrato: Contrato, index: number } | null>(null);

  // Quick Inline Creators values
  const [newOrgao, setNewOrgao] = useState({ nome: '', cnpj: '', cidade: '', categoria: 'municipal' as any });
  const [newPortal, setNewPortal] = useState({ nome: '', url: '' });

  // Log details
  const [newLogType, setNewLogType] = useState<'obs' | 'alerta' | 'doc' | 'ligacao' | 'sessao'>('obs');
  const [newLogMsg, setNewLogMsg] = useState('');

  // Installment registry
  const [pagoValor, setPagoValor] = useState('');
  const [pagoData, setPagoData] = useState('');
  const [pagoObs, setPagoObs] = useState('');

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [refreshTrigger]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [l, c, o, p] = await Promise.all([
        apiFetchLicitacoes(),
        apiFetchContratos(),
        apiFetchOrgaos(),
        apiFetchPortais()
      ]);
      setLicitacoes(l);
      setContratos(c);
      setOrgaos(o);
      setPortais(p);
    } catch (e: any) {
      showToast('Erro ao ler tabelas no banco: ' + e.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Helper date conversions
  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return 'Sem agendamento';
    const date = new Date(isoStr);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    const date = new Date(isoStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Urgent bids countdown (Reopening within next 24h)
  const getUrgentBids = () => {
    const now = Date.now();
    return licitacoes.filter(l => {
      if (!l.reabertura || l.status !== 'aberta') return false;
      const hoursLeft = (new Date(l.reabertura).getTime() - now) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 24;
    });
  };

  // Statistics Computations
  const getStats = () => {
    const activeContracts = contratos.filter(c => c.status === 'em_andamento');
    const totalContractValue = activeContracts.reduce((sum, c) => sum + c.valor, 0);
    const totalComissoes = activeContracts.reduce((sum, c) => sum + (c.valor * c.perc_comissao / 100), 0);
    
    // received this month
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const paidThisMonth = contratos.reduce((sum, c) => {
      const montlySum = c.parcelas
        .filter(p => {
          if (p.status !== 'pag_registrado' || !p.dt_recebimento) return false;
          const rDate = new Date(p.dt_recebimento);
          return rDate.getMonth() === thisMonth && rDate.getFullYear() === thisYear;
        })
        .reduce((s, p) => s + p.valor, 0);
      return sum + montlySum;
    }, 0);

    return {
      totalBids: licitacoes.length,
      bidsOpen: licitacoes.filter(l => l.status === 'aberta').length,
      bidsSuspended: licitacoes.filter(l => l.status === 'suspensa').length,
      bidsClosed: licitacoes.filter(l => l.status === 'encerrada' || l.status === 'concluida').length,
      activeContractsCount: activeContracts.length,
      totalContractValue,
      totalComissoes,
      paidThisMonth
    };
  };

  const stats = getStats();

  // ==========================================
  // BIDS CRUD
  // ==========================================
  const handleOpenBidModal = (bid?: Licitacao) => {
    if (bid) {
      let parsedTimeline: any[] = [];
      try {
        if (bid.timeline) {
          parsedTimeline = typeof bid.timeline === 'string'
            ? JSON.parse(bid.timeline)
            : bid.timeline;
        }
      } catch (e) {
        console.error('Erro ao converter timeline:', e);
      }

      if (!Array.isArray(parsedTimeline)) {
        parsedTimeline = [];
      }

      setActiveBidModal({
        ...bid,
        timeline: parsedTimeline
      });
    } else {
      setActiveBidModal({
        id: 'lc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        empresa: companies[0]?.razao_social || '',
        orgao_nome: '',
        processo: '',
        portal: portais[0]?.nome || 'Licitações-e',
        status: 'aberta',
        objeto: '',
        valor_est: 0,
        valor_prop: 0,
        timeline: []
      } as any);
    }
    setNewLogMsg('');
  };

  const handleSaveBid = async () => {
    if (!activeBidModal) return;
    if (!activeBidModal.empresa || !activeBidModal.orgao_nome) {
      showToast('Selecione uma empresa e digite o órgão licitante.', true);
      return;
    }

    try {
      // Grab company ID or details if needed
      await apiSaveLicitacao(activeBidModal);
      showToast('Licitação salva com sucesso!');
      setActiveBidModal(null);
      loadAllData();
    } catch (e: any) {
      showToast('Erro ao salvar licitação: ' + e.message, true);
    }
  };

  const handleDeleteBid = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja deletar este processo licitatório?')) return;
    try {
      await apiDeleteLicitacao(id);
      showToast('Licitação deletada.');
      loadAllData();
    } catch (e: any) {
      showToast('Erro de exclusão: ' + e.message, true);
    }
  };

  // Reactive Event log / timeline in active bid modal
  const handleAddTimelineEvent = async () => {
    if (!activeBidModal || !newLogMsg.trim()) return;
    
    // Add logic
    const newEvent: TimelineEvent = {
      id: 'log_' + Date.now(),
      tipo: newLogType,
      msg: newLogMsg,
      autor: 'Assessor Geral',
      dt: new Date().toISOString()
    };

    const updatedBid = {
      ...activeBidModal,
      timeline: [...(activeBidModal.timeline || []), newEvent]
    };

    setActiveBidModal(updatedBid);
    setNewLogMsg('');
    showToast('Anotação registrada temporariamente. Lembre de "Salvar" a licitação para persistir na nuvem.');
  };

  const handleDeleteTimelineEvent = (eventId: string) => {
    if (!activeBidModal) return;
    const updatedEvents = activeBidModal.timeline.filter(e => e.id !== eventId);
    setActiveBidModal({ ...activeBidModal, timeline: updatedEvents });
  };

  // Convert won bid to contract
  const handleRegisterContractFromBid = (bid: Licitacao) => {
    // Generate empty default monthly contract
    setActiveContractModal({
      id: 'ct_' + Date.now().toString(36),
      empresa: bid.empresa,
      numero: 'A definir',
      licit_id: bid.id,
      status: 'em_andamento',
      objeto: bid.objeto,
      valor: bid.valor_prop > 0 ? bid.valor_prop : bid.valor_est,
      perc_comissao: 1.5, // 1.5% commission default
      inicio: new Date().toISOString().split('T')[0],
      num_parcelas: 12,
      periodo: 'mensal',
      dt_inicio_parcela: new Date().toISOString().split('T')[0],
      parcelas: []
    } as any);
    setSubTab('contratos');
    showToast('Ficha de Contrato pré-renderizada baseada na licitação GANHA!');
  };

  // ==========================================
  // CONTRACTS CRUD & FREQUENCY PARTITIONS
  // ==========================================
  const handleOpenContractModal = (ct?: Contrato) => {
    if (ct) {
      setActiveContractModal(ct);
    } else {
      setActiveContractModal({
        id: 'ct_' + Date.now().toString(36),
        empresa: companies[0]?.razao_social || '',
        numero: '',
        status: 'em_andamento',
        objeto: '',
        valor: 0,
        perc_comissao: 1.5,
        num_parcelas: 12,
        periodo: 'mensal',
        parcelas: []
      } as any);
    }
  };

  const handleSaveContract = async () => {
    if (!activeContractModal) return;
    if (!activeContractModal.empresa || !activeContractModal.objeto) {
      showToast('Selecione a empresa proponente e preencha descrição do objeto.', true);
      return;
    }

    try {
      let finalCt = { ...activeContractModal };
      
      // Auto-generate installments if empty
      if (!finalCt.parcelas || finalCt.parcelas.length === 0) {
        const generated: Parcela[] = [];
        const num = finalCt.num_parcelas || 1;
        const totalCommissionVal = (finalCt.valor * finalCt.perc_comissao / 100);
        const installmentCommission = totalCommissionVal / num;
        
        let currentDate = finalCt.dt_inicio_parcela 
          ? new Date(finalCt.dt_inicio_parcela + 'T12:00:00') 
          : new Date();

        for (let i = 0; i < num; i++) {
          generated.push({
            idx: i,
            label: num === 1 ? 'Taxa Única' : `Parcela ${i + 1}/${num}`,
            valor: installmentCommission,
            dt_prevista: currentDate.toISOString().split('T')[0],
            status: 'pendente'
          });

          // advance frequency
          if (finalCt.periodo === 'mensal') currentDate.setMonth(currentDate.getMonth() + 1);
          else if (finalCt.periodo === 'bimestral') currentDate.setMonth(currentDate.getMonth() + 2);
          else if (finalCt.periodo === 'trimestral') currentDate.setMonth(currentDate.getMonth() + 3);
          else if (finalCt.periodo === 'anual') currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
        finalCt.parcelas = generated;
      }

      await apiSaveContrato(finalCt);
      showToast('Contrato registrado!');
      setActiveContractModal(null);
      loadAllData();
    } catch (e: any) {
      showToast('Erro ao salvar contrato: ' + e.message, true);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Deseja arquivar este contrato e suas respectivas comissões?')) return;
    try {
      await apiDeleteContrato(id);
      showToast('Contrato excluído.');
      loadAllData();
    } catch (e: any) {
      showToast('Erro de exclusão: ' + e.message, true);
    }
  };

  const handleOpenInstallmentReceiptModal = (contrato: Contrato, index: number) => {
    const p = contrato.parcelas[index];
    setActiveInstallmentModal({ contrato, index });
    setPagoValor(p.valor.toString());
    setPagoData(new Date().toISOString().split('T')[0]);
    setPagoObs('');
  };

  const handleConfirmInstallmentPayment = async () => {
    if (!activeInstallmentModal) return;
    const { contrato, index } = activeInstallmentModal;
    
    try {
      const updatedParcelas = [...contrato.parcelas];
      updatedParcelas[index] = {
        ...updatedParcelas[index],
        status: 'pag_registrado',
        valor: parseFloat(pagoValor) || updatedParcelas[index].valor,
        dt_recebimento: pagoData,
        obs: pagoObs
      };

      const updatedContract = {
        ...contrato,
        parcelas: updatedParcelas
      };

      await apiSaveContrato(updatedContract);
      showToast(`Pagamento da ${updatedParcelas[index].label} registrado!`);
      setActiveInstallmentModal(null);
      loadAllData();
    } catch (e: any) {
      showToast('Erro ao registrar recebimento: ' + e.message, true);
    }
  };

  const handleUndoInstallmentPayment = async (contrato: Contrato, index: number) => {
    if (!confirm(`Deseja desmarcar o pagamento da parcela ${index + 1}?`)) return;
    try {
      const updatedParcelas = [...contrato.parcelas];
      updatedParcelas[index] = {
        ...updatedParcelas[index],
        status: 'pendente',
        dt_recebimento: undefined,
        obs: ''
      };

      const updatedContract = {
        ...contrato,
        parcelas: updatedParcelas
      };

      await apiSaveContrato(updatedContract);
      showToast('Pagamento da parcela estornado.');
      loadAllData();
    } catch (e: any) {
      showToast('Erro ao estornar: ' + e.message, true);
    }
  };

  // ==========================================
  // INLINE REGISTRY FOR SUPPORT ELEMENTS
  // ==========================================
  const handleAddOrgao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgao.nome) return;
    try {
      await apiSaveOrgao({
        id: 'org_' + Date.now().toString(36),
        nome: newOrgao.nome,
        cnpj: newOrgao.cnpj,
        cidade: newOrgao.cidade,
        categoria: newOrgao.categoria
      });
      setNewOrgao({ nome: '', cnpj: '', cidade: '', categoria: 'municipal' });
      showToast('Órgão adicionado à base municipal!');
      loadAllData();
    } catch (e: any) {
      showToast('Erro ao salvar órgão: ' + e.message, true);
    }
  };

  const handleDeleteOrgao = async (id: string) => {
    if (!confirm('Deseja excluir este órgão licitante?')) return;
    try {
      await apiDeleteOrgao(id);
      showToast('Órgão excluído.');
      loadAllData();
    } catch (e: any) {
      showToast('Erro ao excluir: ' + e.message, true);
    }
  };

  const handleAddPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortal.nome) return;
    try {
      await apiSavePortal({
        id: 'port_' + Date.now().toString(36),
        nome: newPortal.nome,
        url: newPortal.url
      });
      setNewPortal({ nome: '', url: '' });
      showToast('Portal de compras cadastrado!');
      loadAllData();
    } catch (e: any) {
      showToast('Erro ao salvar portal: ' + e.message, true);
    }
  };

  const handleDeletePortal = async (id: string) => {
    if (!confirm('Excluir portal?')) return;
    try {
      await apiDeletePortal(id);
      showToast('Portal removido da lista base.');
      loadAllData();
    } catch (e: any) {
      showToast('Erro: ' + e.message, true);
    }
  };

  // Filtered licitacoes table array
  const getFilteredBids = () => {
    return licitacoes.filter(l => {
      const matchSearch = !searchQuery || 
        l.empresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.orgao_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.objeto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.processo.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchStatus = !statusFilter || l.status === statusFilter;
      const matchPortal = !portalFilter || l.portal === portalFilter;
      
      return matchSearch && matchStatus && matchPortal;
    });
  };

  const listBids = getFilteredBids();

  return (
    <div className="space-y-6 text-[#e8ebf0]">
      
      {/* Sub Tabs controller */}
      <div className="flex border-b border-[#2d3548] pb-1 space-x-1.5 overflow-x-auto">
        <button
          onClick={() => setSubTab('monitoramento')}
          className={`py-2.5 px-4 font-mono text-xs uppercase tracking-wider rounded-t-lg transition-colors border-b-2 font-semibold cursor-pointer ${
            subTab === 'monitoramento' ? 'border-[#d4a574] text-[#d4a574]' : 'border-transparent text-[#8892a6] hover:text-[#e8ebf0]'
          }`}
        >
          Pesquisa e Monitoramento
        </button>
        <button
          onClick={() => setSubTab('contratos')}
          className={`py-2.5 px-4 font-mono text-xs uppercase tracking-wider rounded-t-lg transition-colors border-b-2 font-semibold cursor-pointer ${
            subTab === 'contratos' ? 'border-[#d4a574] text-[#d4a574]' : 'border-transparent text-[#8892a6] hover:text-[#e8ebf0]'
          }`}
        >
          Contratos e Comissão
        </button>
        <button
          onClick={() => setSubTab('orgaos')}
          className={`py-2.5 px-4 font-mono text-xs uppercase tracking-wider rounded-t-lg transition-colors border-b-2 font-semibold cursor-pointer ${
            subTab === 'orgaos' ? 'border-[#d4a574] text-[#d4a574]' : 'border-transparent text-[#8892a6] hover:text-[#e8ebf0]'
          }`}
        >
          Órgãos Públicos
        </button>
        <button
          onClick={() => setSubTab('portais')}
          className={`py-2.5 px-4 font-mono text-xs uppercase tracking-wider rounded-t-lg transition-colors border-b-2 font-semibold cursor-pointer ${
            subTab === 'portais' ? 'border-[#d4a574] text-[#d4a574]' : 'border-transparent text-[#8892a6] hover:text-[#e8ebf0]'
          }`}
        >
          Portais Licitatórios
        </button>
      </div>

      {subTab === 'monitoramento' && (
        <div className="space-y-6">
          {/* Urgent / Alert banner */}
          {getUrgentBids().length > 0 && (
            <div className="p-4 bg-[rgba(217,119,87,0.12)] border border-[#d97757]/30 rounded-xl space-y-2 animate-pulse-glow">
              <div className="text-xs uppercase tracking-widest text-[#d97757] font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Urgente: Sessões Reabrindo Breve (Próximas 24 Horas)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getUrgentBids().map(ub => (
                  <div key={ub.id} className="p-3 bg-[#1a2030]/60 border border-[#2d3548] rounded-xl text-xs space-y-2">
                    <div className="font-bold text-[#e8ebf0]">{ub.empresa}</div>
                    <div className="text-[#8892a6]">{ub.orgao_nome} • Proc: {ub.processo}</div>
                    <CountdownTimer dataSessao={ub.reabertura} />
                    <div className="text-[#8892a6]/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(ub.reabertura)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytical Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-4 shadow-md">
              <span className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block mb-1">Total de Certames</span>
              <span className="text-2xl font-bold font-mono text-[#e8ebf0]">{stats.totalBids}</span>
              <span className="text-[10px] text-[#8892a6] block mt-1">{stats.bidsOpen} abertas atualmente</span>
            </div>
            <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-4 shadow-md">
              <span className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block mb-1">Suspensas pelo Ente</span>
              <span className="text-2xl font-bold font-mono text-amber-400">{stats.bidsSuspended}</span>
              <span className="text-[10px] text-[#8892a6] block mt-1">Aguardando correção de edital</span>
            </div>
            <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-4 shadow-md">
              <span className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block mb-1">Valor Contratado Ativo</span>
              <span className="text-xl font-bold font-mono text-[#7cb380]">{formatCurrency(stats.totalContractValue)}</span>
              <span className="text-[10px] text-[#8892a6] block mt-1">{stats.activeContractsCount} contratos faturando</span>
            </div>
            <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-4 shadow-md">
              <span className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block mb-1">Comissões Recebidas no Mês</span>
              <span className="text-xl font-bold font-mono text-[#d4a574]">{formatCurrency(stats.paidThisMonth)}</span>
              <span className="text-[10px] text-[#8892a6] block mt-1">Comissões quitadas pelos clientes</span>
            </div>
          </div>

          {/* Search tools and bids tables */}
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[#2d3548] pb-3 mb-2">
              <h3 className="text-md font-serif font-bold text-[#d4a574] flex items-center gap-1.5">
                <ListPlus className="w-4 h-4 text-[#d4a574]" />
                <span>Certames em Processamento</span>
              </h3>
              <button
                onClick={() => handleOpenBidModal()}
                className="py-2 px-4 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                + Nova Licitação
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#8892a6]">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por processo, objeto..."
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e8ebf0] placeholder-[#8892a6]/40 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#232a3d] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none height-[31px]"
              >
                <option value="">Filtro: Todos os Status</option>
                <option value="aberta">Aberta</option>
                <option value="aguardando">Aguardando Reabertura</option>
                <option value="suspensa">Suspensa</option>
                <option value="encerrada">Encerrada</option>
                <option value="concluida">Concluída</option>
              </select>

              <select
                value={portalFilter}
                onChange={(e) => setPortalFilter(e.target.value)}
                className="bg-[#232a3d] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none height-[31px]"
              >
                <option value="">Filtro: Todos os Portais</option>
                {portais.map(p => (
                  <option key={p.id} value={p.nome}>{p.nome}</option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="overflow-auto min-h-[300px] max-h-[600px] relative">
              <table className="w-full text-xs text-[#e8ebf0] text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[#232a3d] shadow-md">
                  <tr className="border-b border-[#2d3548]">
                    <th className="sticky top-0 p-3 bg-[#232a3d] text-[#d4a574] z-10">Empresa Licitante</th>
                    <th className="sticky top-0 p-3 bg-[#232a3d] z-10">Processo</th>
                    <th className="sticky top-0 p-3 bg-[#232a3d] z-10">Órgão Licitante</th>
                    <th className="sticky top-0 p-3 bg-[#232a3d] z-10">Portal de Compras</th>
                    <th className="sticky top-0 p-3 bg-[#232a3d] font-semibold text-center z-10">Status</th>
                    <th className="sticky top-0 p-3 bg-[#232a3d] text-center z-10">Sessão / Abertura</th>
                    <th className="sticky top-0 p-3 bg-[#232a3d] text-right z-10">Valor Est.</th>
                    <th className="sticky top-0 p-3 bg-[#232a3d] text-center z-10">Ganhos</th>
                    <th className="sticky top-0 p-3 bg-[#232a3d] text-center z-10">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listBids.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto py-6 space-y-4">
                          <div className="p-4 bg-[#232a3d]/50 border border-[#2d3548] rounded-full text-[#8892a6]">
                            <Archive className="w-8 h-8" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-[#e8ebf0]">Nenhum certame cadastrado</h4>
                            <p className="text-xs text-[#8892a6] mt-1">
                              Comece cadastrando suas licitações para acompanhar prazos, valores e comissões de forma centralizada.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenBidModal()}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4a574]/10 hover:bg-[#d4a574]/20 border border-[#d4a574]/30 hover:border-[#d4a574]/50 text-[#d4a574] text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm shadow-[#d4a574]/5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Clique aqui para cadastrar sua primeira licitação</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    listBids.map(b => {
                      const isUrgent = b.reabertura && (new Date(b.reabertura).getTime() - Date.now()) < 24 * 60 * 60 * 1000 && (new Date(b.reabertura).getTime() - Date.now()) > 0;
                      return (
                        <tr key={b.id} className="border-b border-[#2d3548] hover:bg-[#232a3d]/20 transition-colors">
                          <td className="p-3 font-semibold text-[#e8ebf0]">{b.empresa}</td>
                          <td className="p-3 font-mono text-[11px]">{b.processo || '—'}</td>
                          <td className="p-3">{b.orgao_nome}</td>
                          <td className="p-3">{b.portal}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'aberta' ? 'bg-emerald-950/40 text-[#7cb380] border border-emerald-500/20' :
                              b.status === 'aguardando' ? 'bg-sky-950/40 text-sky-400 border border-sky-400/20' :
                              b.status === 'suspensa' ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' :
                              'bg-zinc-900 border border-[#2d3548] text-[#8892a6]'
                            }`}>
                              {b.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <CountdownTimer dataSessao={b.reabertura} />
                              <span className={isUrgent ? 'text-[#d97757] font-bold text-xs' : 'text-xs'}>
                                {b.reabertura ? formatDateTime(b.reabertura) : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right text-emerald-400 font-semibold">{formatCurrency(b.valor_est)}</td>
                          <td className="p-3 text-center">
                            {b.resultado === 'ganhou' ? (
                              <button
                                onClick={() => handleRegisterContractFromBid(b)}
                                className="px-2 py-0.5 rounded bg-emerald-[#7cb380]/15 text-[#7cb380] border border-[#7cb380]/20 text-[10px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                              >
                                <Award className="w-3 h-3" />
                                <span>Ganho!</span>
                              </button>
                            ) : b.resultado === 'perdeu' ? (
                              <span className="text-red-400 font-semibold">Perdeu</span>
                            ) : (
                              <span className="text-[#8892a6]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleOpenBidModal(b)}
                                className="p-1 px-2 border border-[#2d3548] hover:border-[#d4a574] rounded text-emerald-400 font-bold transition-all cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                onClick={(e) => handleDeleteBid(b.id, e)}
                                className="p-1 px-1 bg-red-950/20 text-red-400 border border-red-500/10 hover:border-red-500/35 rounded transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'contratos' && (
        <div className="space-y-6">
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2d3548] pb-3 mb-2 flex-wrap gap-2">
              <h3 className="text-md font-serif font-bold text-[#d4a574] flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-[#d4a574]" />
                <span>Gestão de Contratos de Comissão</span>
              </h3>
              <button
                onClick={() => handleOpenContractModal()}
                className="py-2 px-4 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                + Novo Contrato de Comissão
              </button>
            </div>

            <div className="space-y-4">
              {contratos.length === 0 ? (
                <p className="text-sm text-[#8892a6] italic text-center py-12">
                  Nenhum contrato ativo cadastrado. Quando ganhar um certame, clique em "Ganho!" para converter em contrato automaticamente.
                </p>
              ) : (
                contratos.map(ct => {
                  const comTotal = (ct.valor * ct.perc_comissao / 100);
                  const comRecebida = ct.parcelas
                    ?.filter(p => p.status === 'pag_registrado')
                    ?.reduce((sum, p) => sum + p.valor, 0) || 0;
                  const comPendente = comTotal - comRecebida;

                  return (
                    <div key={ct.id} className="bg-[#232a3d]/40 border border-[#2d3548] rounded-xl p-5 space-y-4">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                          <h4 className="text-sm font-bold text-[#e8ebf0]">{ct.empresa}</h4>
                          <p className="text-xs text-[#8892a6] mt-0.5">
                            Contrato / Lic: <span className="font-mono text-[#d4a574] font-semibold">{ct.numero}</span> • Objeto: {ct.objeto}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenContractModal(ct)}
                            className="p-1 py-0.5 text-xs text-[#d4a574] border border-[#2d3548] hover:border-[#d4a574] rounded cursor-pointer transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteContract(ct.id)}
                            className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Stats brief */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-[#2d3548]/60 pt-3 text-xs">
                        <div>
                          <span className="text-[#8892a6] block">Valor Faturado</span>
                          <strong className="text-emerald-400 text-sm font-mono">{formatCurrency(ct.valor)}</strong>
                        </div>
                        <div>
                          <span className="text-[#8892a6] block">% Comissão</span>
                          <strong className="text-sky-400 text-sm font-mono">{ct.perc_comissao}%</strong>
                        </div>
                        <div>
                          <span className="text-[#8892a6] block">Comissão Esperada</span>
                          <strong className="text-purple-400 text-sm font-mono">{formatCurrency(comTotal)}</strong>
                        </div>
                        <div>
                          <span className="text-[#8892a6] block">Total Pago</span>
                          <strong className="text-emerald-400 text-sm font-mono">{formatCurrency(comRecebida)}</strong>
                        </div>
                        <div>
                          <span className="text-[#8892a6] block">Total Pendente</span>
                          <strong className="text-amber-400 text-sm font-mono">{formatCurrency(comPendente)}</strong>
                        </div>
                      </div>

                      {/* Partitioned installments list */}
                      <div className="border-t border-[#2d3548]/40 pt-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8892a6] block mb-2">Comissões Emitidas</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                          {ct.parcelas?.map((p, pIdx) => {
                            const isVencida = p.status === 'pendente' && p.dt_prevista && new Date(p.dt_prevista) < new Date();
                            return (
                              <div 
                                key={pIdx} 
                                className={`p-2.5 rounded-lg border text-xs space-y-1 relative ${
                                  p.status === 'pag_registrado' 
                                    ? 'bg-emerald-950/20 border-emerald-500/20 text-[#e8ebf0]' 
                                    : isVencida 
                                      ? 'bg-red-950/15 border-red-500/20 text-[#e8ebf0]' 
                                      : 'bg-[#1a2030] border-[#2d3548] text-[#8892a6]'
                                }`}
                              >
                                <div className="font-semibold text-[11px] text-[#e8ebf0]">{p.label}</div>
                                <div className="text-[10px] font-mono text-[#8892a6]">Venc: {formatDate(p.dt_prevista)}</div>
                                <div className="font-bold text-[#d4a574]">{formatCurrency(p.valor)}</div>
                                
                                {p.status === 'pag_registrado' ? (
                                  <div className="pt-1.5 space-y-1">
                                    <span className="text-[10px] text-[#7cb380] font-bold block">✓ Pago em {formatDate(p.dt_recebimento)}</span>
                                    <button
                                      onClick={() => handleUndoInstallmentPayment(ct, pIdx)}
                                      className="w-full text-center text-[9px] text-[#8892a6] hover:text-red-400 underline cursor-pointer"
                                    >
                                      Estornar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleOpenInstallmentReceiptModal(ct, pIdx)}
                                    className={`w-full py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                      isVencida ? 'bg-[#d97757] text-[#0f1419]' : 'bg-[#2d3548] hover:bg-[#d4a574] hover:text-[#0f1419] text-[#d4a574]'
                                    }`}
                                  >
                                    Registrar Pago
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'orgaos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl h-fit">
            <h4 className="text-sm font-bold text-[#d4a574] border-b border-[#2d3548] pb-3 mb-4">Adicionar Órgão Licitante</h4>
            <form onSubmit={handleAddOrgao} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-[#8892a6] mb-1">Nome Oficial *</label>
                <input
                  type="text"
                  required
                  value={newOrgao.nome}
                  onChange={(e) => setNewOrgao(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Prefeitura Municipal de Arroio do Sal"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase text-[#8892a6] mb-1">CNPJ</label>
                <input
                  type="text"
                  value={newOrgao.cnpj}
                  onChange={(e) => setNewOrgao(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase text-[#8892a6] mb-1">Cidade/UF</label>
                  <input
                    type="text"
                    value={newOrgao.cidade}
                    onChange={(e) => setNewOrgao(prev => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Arroio do Sal/RS"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[#8892a6] mb-1">Esfera</label>
                  <select
                    value={newOrgao.categoria}
                    onChange={(e) => setNewOrgao(prev => ({ ...prev, categoria: e.target.value as any }))}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2 py-1.5 text-xs text-[#e8ebf0] focus:outline-none height-[28px]"
                  >
                    <option value="municipal">Municipal</option>
                    <option value="estadual">Estadual</option>
                    <option value="federal">Federal</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg cursor-pointer"
              >
                Cadastrar Órgão
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl">
            <h4 className="text-sm font-bold text-[#d4a574] border-b border-[#2d3548] pb-3 mb-4">Lista de Entidades Licitatórias ({orgaos.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
              {orgaos.map(o => (
                <div key={o.id} className="p-4 bg-[#232a3d] border border-[#2d3548] rounded-xl flex justify-between items-start gap-4">
                  <div>
                    <h5 className="font-bold text-xs text-[#e8ebf0]">{o.nome}</h5>
                    <p className="text-[11px] text-[#8892a6] mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{o.cidade || 'Sem localidade'}</span>
                    </p>
                    {o.cnpj && <p className="text-[10px] text-[#8892a6]/80 font-mono mt-0.5">CNPJ: {o.cnpj}</p>}
                    <span className="inline-block mt-2 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#1a2030] text-[#d4a574] border border-[#2d3548]">
                      {o.categoria}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteOrgao(o.id)}
                    className="text-[#8892a6] hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'portais' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl h-fit">
            <h4 className="text-sm font-bold text-[#d4a574] border-b border-[#2d3548] pb-3 mb-4">Adicionar Portal de Compras</h4>
            <form onSubmit={handleAddPortal} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-[#8892a6] mb-1">Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  value={newPortal.nome}
                  onChange={(e) => setNewPortal(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Portal de Compras Públicas"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase text-[#8892a6] mb-1">URL (endereço web)</label>
                <input
                  type="url"
                  value={newPortal.url}
                  onChange={(e) => setNewPortal(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://www.portaldecompraspublicas.com.br"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg cursor-pointer"
              >
                Cadastrar Portal
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl">
            <h4 className="text-sm font-bold text-[#d4a574] border-b border-[#2d3548] pb-3 mb-4">Portais Homologados ({portais.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
              {portais.map(p => (
                <div key={p.id} className="p-4 bg-[#232a3d] border border-[#2d3548] rounded-xl flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-xs text-[#e8ebf0]">{p.nome}</h5>
                    {p.url && (
                      <a 
                        href={p.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5 mt-1"
                      >
                        <span>{p.url}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePortal(p.id)}
                    className="text-[#8892a6] hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS IMPLEMENTATIONS
          ========================================== */}
      {/* 1. Bid detail & timeline editor modal */}
      {activeBidModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#2d3548] flex justify-between items-center text-[#e8ebf0]">
              <h3 className="font-serif font-bold text-lg text-[#d4a574]">Detalhes do Certame</h3>
              <button onClick={() => setActiveBidModal(null)} className="text-[#8892a6] hover:text-[#e8ebf0] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form inside modal */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Empresa Licitante *</label>
                  <select
                    value={activeBidModal.empresa}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, empresa: e.target.value })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  >
                    <option value="">— Selecione a proponente —</option>
                    {companies.map(c => <option key={c.cnpj} value={c.razao_social}>{c.razao_social}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Órgão Público Promotor *</label>
                  <input
                    type="text"
                    value={activeBidModal.orgao_nome}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, orgao_nome: e.target.value })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Número do Processo</label>
                  <input
                    type="text"
                    value={activeBidModal.processo}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, processo: e.target.value })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Portal de Pregão</label>
                  <select
                    value={activeBidModal.portal}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, portal: e.target.value })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none height-[28px]"
                  >
                    {portais.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Situação / Status</label>
                  <select
                    value={activeBidModal.status}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, status: e.target.value as any })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none height-[28px]"
                  >
                    <option value="aberta">Aberta</option>
                    <option value="aguardando">Aguardando Reabertura</option>
                    <option value="suspensa">Suspensa</option>
                    <option value="encerrada">Encerrada</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Data/Hora Reabertura</label>
                  <input
                    type="datetime-local"
                    value={activeBidModal.reabertura || ''}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, reabertura: e.target.value })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={activeBidModal.valor_est || ''}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, valor_est: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Assessor / Responsável</label>
                  <input
                    type="text"
                    value={activeBidModal.resp || ''}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, resp: e.target.value })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Objeto da Licitação</label>
                <textarea
                  value={activeBidModal.objeto}
                  onChange={(e) => setActiveBidModal({ ...activeBidModal, objeto: e.target.value })}
                  placeholder="Sumário convocatório"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none h-14"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Julgamento de Resultado</label>
                  <select
                    value={activeBidModal.resultado || ''}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, resultado: e.target.value as any })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  >
                    <option value="">Ainda em disputa / Indefinido</option>
                    <option value="ganhou">Arrematamos (Ganhou! ✓)</option>
                    <option value="perdeu">Licitante concorrente ganhou</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Valor Final da Proposta (R$)</label>
                  <input
                    type="number"
                    value={activeBidModal.valor_prop || ''}
                    onChange={(e) => setActiveBidModal({ ...activeBidModal, valor_prop: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
              </div>

              {/* TIMELINE LOGGER SECTION */}
              <div className="border-t border-[#2d3548] pt-4 mt-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#d4a574] block mb-2">Cronologia de Eventos / Ocorrências</span>
                
                <div className="flex gap-2 mb-3">
                  <select
                    value={newLogType}
                    onChange={(e) => setNewLogType(e.target.value as any)}
                    className="bg-[#232a3d] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none height-[28px]"
                  >
                    <option value="obs">Anote / Obs</option>
                    <option value="alerta">Alerta</option>
                    <option value="doc">Documental</option>
                    <option value="ligacao">Ligação</option>
                    <option value="sessao">Sessão</option>
                  </select>
                  <input
                    type="text"
                    value={newLogMsg}
                    onChange={(e) => setNewLogMsg(e.target.value)}
                    placeholder="Adicione uma nota sobre o certame (Ex: Pregoeiro abriu recursos...)"
                    className="flex-1 bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1 text-xs text-[#e8ebf0] placeholder-[#8892a6]/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTimelineEvent}
                    className="px-3 bg-[#2d3548] hover:bg-[#d4a574] hover:text-[#0f1419] border border-[#2d3548] font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Registrar
                  </button>
                </div>

                {/* Timeline Render */}
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {!activeBidModal.timeline || activeBidModal.timeline.length === 0 ? (
                    <p className="text-[11px] text-[#8892a6] italic text-center py-4 bg-[#232a3d]/20 rounded-lg">
                      Nenhuma anotação gravada neste certame.
                    </p>
                  ) : (
                    activeBidModal.timeline.slice().reverse().map((e: any, idx: number) => (
                      <div key={e?.id || `ev-${idx}`} className="p-2.5 bg-[#232a3d]/40 border border-[#2d3548] rounded-lg flex justify-between items-start gap-3">
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-bold text-[#e8ebf0] block">
                            {(e?.tipo || e?.title || 'Anotação').toUpperCase()} • {e?.autor || 'Sistema'} <span className="text-[10px] text-[#8892a6] font-normal font-mono">({formatDateTime(e?.dt || e?.date || new Date().toISOString())})</span>
                          </span>
                          <span className="text-[#8892a6] mt-0.5 block">{e?.msg || e?.description || ''}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTimelineEvent(e?.id || '')}
                          className="text-red-400 hover:text-red-300 px-1.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#2d3548] bg-[#232a3d]/15 flex justify-end gap-2">
              <button
                onClick={() => setActiveBidModal(null)}
                className="py-1.5 px-4 bg-transparent border border-[#2d3548] hover:border-[#8892a6] text-[#8892a6] hover:text-[#e4e7eb] font-semibold text-xs rounded-lg cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleSaveBid}
                className="py-1.5 px-5 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg cursor-pointer"
              >
                Salvar Certame
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Contract editor modal */}
      {activeContractModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#2d3548] flex justify-between items-center text-[#e8ebf0]">
              <h3 className="font-serif font-bold text-lg text-[#d4a574]">Visualizar Contrato de Comissão</h3>
              <button onClick={() => setActiveContractModal(null)} className="text-[#8892a6] hover:text-[#e8ebf0] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Empresa Cliente *</label>
                  <select
                    value={activeContractModal.empresa}
                    onChange={(e) => setActiveContractModal({ ...activeContractModal, empresa: e.target.value })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  >
                    <option value="">— Selecione a proponente —</option>
                    {companies.map(c => <option key={c.cnpj} value={c.razao_social}>{c.razao_social}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Identificação / Nº Contrato</label>
                  <input
                    type="text"
                    value={activeContractModal.numero}
                    onChange={(e) => setActiveContractModal({ ...activeContractModal, numero: e.target.value })}
                    placeholder="Ex: Contrato Administrativo 239/2026"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Valor Contratado (R$)</label>
                  <input
                    type="number"
                    value={activeContractModal.valor || ''}
                    onChange={(e) => setActiveContractModal({ ...activeContractModal, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">% Taxa Comissão</label>
                  <input
                    type="number"
                    step="0.1"
                    value={activeContractModal.perc_comissao || ''}
                    onChange={(e) => setActiveContractModal({ ...activeContractModal, perc_comissao: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Status Contrato</label>
                  <select
                    value={activeContractModal.status}
                    onChange={(e) => setActiveContractModal({ ...activeContractModal, status: e.target.value as any })}
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none height-[28px]"
                  >
                    <option value="em_andamento">Em Execução</option>
                    <option value="encerrado_contrato">Encerrado / Arquivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Objeto do Faturamento</label>
                <textarea
                  value={activeContractModal.objeto}
                  onChange={(e) => setActiveContractModal({ ...activeContractModal, objeto: e.target.value })}
                  placeholder="Escrita da licitação correspondente..."
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none h-14"
                />
              </div>

              {/* Installments automated partition algorithm parameters */}
              <div className="border-t border-[#2d3548] pt-4 mt-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#d4a574] block mb-3">Emitir Parcelas Cronológicas de Comissão</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Frequência</label>
                    <select
                      value={activeContractModal.periodo}
                      onChange={(e) => setActiveContractModal({ ...activeContractModal, periodo: e.target.value as any })}
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none height-[28px]"
                    >
                      <option value="mensal">Mensal</option>
                      <option value="bimestral">Bimestral</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="anual">Anual</option>
                      <option value="unico">Taxa Única</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Nº Parcelas</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={activeContractModal.num_parcelas}
                      onChange={(e) => setActiveContractModal({ ...activeContractModal, num_parcelas: parseInt(e.target.value) || 1 })}
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Dia do 1º Vencimento</label>
                    <input
                      type="date"
                      value={activeContractModal.dt_inicio_parcela || ''}
                      onChange={(e) => setActiveContractModal({ ...activeContractModal, dt_inicio_parcela: e.target.value })}
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#8892a6] italic mt-2">
                  Atenção: Ao clicar em salvar, se houver alteração de parcelas ou se o contrato for novo, o sistema irá recriar a lista de parcelas automaticamente.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-[#2d3548] bg-[#232a3d]/15 flex justify-end gap-2">
              <button
                onClick={() => setActiveContractModal(null)}
                className="py-1.5 px-4 bg-transparent border border-[#2d3548] hover:border-[#8892a6] text-[#8892a6] hover:text-[#e4e7eb] font-semibold text-xs rounded-lg cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleSaveContract}
                className="py-1.5 px-5 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg cursor-pointer"
              >
                Salvar Contrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Installment receipt pay modal */}
      {activeInstallmentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#2d3548] flex justify-between items-center text-[#e8ebf0]">
              <h3 className="font-serif font-bold text-md text-[#d4a574]">Recebimento de Comissão</h3>
              <button onClick={() => setActiveInstallmentModal(null)} className="text-[#8892a6] hover:text-[#e8ebf0]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Identificação da Parcela</label>
                <div className="bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 font-semibold text-[#e8ebf0]">
                  {activeInstallmentModal.contrato.parcelas[activeInstallmentModal.index].label} — {activeInstallmentModal.contrato.empresa}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Valor Quitados (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pagoValor}
                  onChange={(e) => setPagoValor(e.target.value)}
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Data Quitados</label>
                <input
                  type="date"
                  value={pagoData}
                  onChange={(e) => setPagoData(e.target.value)}
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Anotações / Notas de Crédito</label>
                <input
                  type="text"
                  value={pagoObs}
                  onChange={(e) => setPagoObs(e.target.value)}
                  placeholder="Opcional. Ex: Pago via pix BB"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#2d3548] bg-[#232a3d]/15 flex justify-end gap-2">
              <button
                onClick={() => setActiveInstallmentModal(null)}
                className="py-1 px-3 bg-transparent border border-[#2d3548] text-[#8892a6] hover:text-[#e4e7eb] font-semibold text-xs rounded-lg cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmInstallmentPayment}
                className="py-1 px-4 bg-[#7cb380] hover:bg-emerald-400 text-[#0f1419] font-bold text-xs rounded-lg cursor-pointer"
              >
                Receber Parcelas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
