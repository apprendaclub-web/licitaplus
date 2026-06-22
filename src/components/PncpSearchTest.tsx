import React, { useState } from 'react';
import { Search, Calendar, MapPin, ExternalLink, Database, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PncpSearchTestProps {
  userId?: string;
  showToast?: (msg: string, isError?: boolean) => void;
  onBidSaved?: () => void;
}

export default function PncpSearchTest({ userId, showToast, onBidSaved }: PncpSearchTestProps) {
  const [dataInicial, setDataInicial] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15); // Default to last 15 days
    return d.toISOString().split('T')[0];
  });
  const [dataFinal, setDataFinal] = useState(() => new Date().toISOString().split('T')[0]);
  const [uf, setUf] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search function connecting to PNCP API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResults([]);

    const baseUrl = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
    
    // Formatting dates to AAAAMMDD as required by PNCP
    const formatToPncpDate = (dateStr: string) => dateStr.replace(/-/g, '');

    const params = new URLSearchParams({
      dataInicial: formatToPncpDate(dataInicial),
      dataFinal: formatToPncpDate(dataFinal),
      codigoModalidadeContratacao: '5', // 5 = Pregão (most common)
      pagina: '1',
      tamanhoPagina: '15'
    });

    if (uf && uf.trim()) {
      params.append('uf', uf.trim().toUpperCase());
    }

    try {
      const response = await fetch(`${baseUrl}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Erro na API do PNCP (Código ${response.status})`);
      }

      // Check if status is 204 (No Content)
      if (response.status === 204) {
        setResults([]);
        if (showToast) {
          showToast('Nenhum resultado encontrado para este filtro.');
        }
        return;
      }

      // Read response as text first to safely check for empty content
      const text = await response.text();
      if (!text || !text.trim()) {
        setResults([]);
        if (showToast) {
          showToast('Nenhum resultado encontrado para este filtro.');
        }
        return;
      }

      const data = JSON.parse(text);
      const items = data.data || [];
      setResults(items);

      if (showToast) {
        if (items.length === 0) {
          showToast('Nenhum resultado encontrado para este filtro.');
        } else {
          showToast(`Busca concluída! ${items.length} licitações encontradas.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao carregar dados do PNCP.');
      if (showToast) {
        showToast('Falha na comunicação com o PNCP.', true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to format currency values
  const formatCurrency = (val: number) => {
    if (!val) return 'Valor não informado';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  // Helper to format ISO dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Não definida';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Simulated or direct save handler
  const handleSaveLicitacao = async (item: any) => {
    if (!supabase) {
      if (showToast) showToast('Banco de dados Supabase não configurado.', true);
      return;
    }

    const uniqueId = `${item.orgaoEntidade.cnpj}-${item.anoCompra}-${item.numeroCompra}`;

    const licitacaoFormatada = {
      id: uniqueId,
      user_id: userId || null,
      empresa: 'Importado via Busca PNCP', // Placeholder since user associates a client company later
      orgao_id: item.orgaoEntidade.cnpj,
      orgao_nome: item.orgaoEntidade.razaoSocial,
      processo: `${item.numeroCompra}/${item.anoCompra}`,
      portal: `PNCP - ${item.modalidadeNome}`,
      status: 'aberta',
      objeto: item.objeto || 'Sem objeto descrito.',
      reabertura: item.dataAberturaProposta || null,
      valor_est: item.valorTotalEstimado || 0,
      link: item.linkSistemaOrigem || 'https://pncp.gov.br',
      resultado: '',
      valor_prop: 0,
      obs: 'Licitação importada da pesquisa pública do PNCP.',
      timeline: [
        {
          id: 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          tipo: 'status',
          msg: 'A oportunidade foi salva via painel de pesquisa PNCP.',
          autor: 'Sistema PNCP',
          dt: new Date().toISOString()
        }
      ] as any
    };

    try {
      const { error } = await supabase
        .from('licitaplus_licitacoes')
        .upsert(licitacaoFormatada);

      if (error) throw error;
      
      if (showToast) {
        showToast('Licitação salva com sucesso no Supabase!');
      }
      if (onBidSaved) {
        onBidSaved();
      }
    } catch (err: any) {
      console.error(err);
      if (showToast) {
        showToast('Erro ao salvar no banco: ' + err.message, true);
      }
    }
  };

  return (
    <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-6 text-[#e8ebf0]">
      {/* Header */}
      <div className="border-b border-[#2d3548] pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-serif font-bold text-[#d4a574] flex items-center gap-2">
            <Search className="w-5 h-5" />
            <span>Busca de Oportunidades PNCP</span>
          </h3>
          <p className="text-xs text-[#8892a6] mt-1">
            Consulte licitações em tempo real direto do portal oficial.
          </p>
        </div>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-[#0f1419]/45 p-4 rounded-lg border border-[#2d3548]/55">
        <div className="space-y-1">
          <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">Data Inicial</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a6]" />
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              required
              className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none focus:border-[#d4a574] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">Data Final</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a6]" />
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              required
              className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none focus:border-[#d4a574] transition-all"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="space-y-1 flex-1">
            <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">Estado (UF)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a6]" />
              <input
                type="text"
                placeholder="Ex: RS, SP (Opcional)"
                maxLength={2}
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e8ebf0] placeholder-[#8892a6]/40 focus:outline-none focus:border-[#d4a574] transition-all uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-[32px] px-5 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-[#d4a574]/5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-red-950/45 border border-red-500/30 rounded-lg text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        <h4 className="text-xs uppercase font-mono text-[#8892a6] tracking-wider">
          Resultados da Pesquisa ({results.length})
        </h4>

        {loading ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#d4a574] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#8892a6]">Consultando dados governamentais no PNCP...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="border border-dashed border-[#2d3548] rounded-lg p-10 text-center">
            <p className="text-xs text-[#8892a6] italic">
              {errorMsg ? 'A busca falhou devido a erros.' : 'Nenhuma licitação carregada. Ajuste as datas e clique em Buscar.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {results.map((item, index) => {
              const uniqueKey = `${item.orgaoEntidade.cnpj}-${item.anoCompra}-${item.numeroCompra}-${index}`;
              return (
                <div key={uniqueKey} className="bg-[#232a3d]/55 border border-[#2d3548] rounded-xl p-4 flex flex-col justify-between gap-4 hover:border-[#d4a574]/40 transition-all shadow-sm">
                  <div className="space-y-2">
                    {/* Badge & Value */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2 py-0.5 bg-[#d4a574]/15 border border-[#d4a574]/25 text-[#d4a574] text-[9px] font-mono rounded">
                        PROCESSO {item.numeroCompra}/{item.anoCompra}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#7cb380]">
                        {formatCurrency(item.valorTotalEstimado)}
                      </span>
                    </div>

                    {/* Organ Title */}
                    <div>
                      <h5 className="text-xs font-bold text-[#e8ebf0] line-clamp-1">{item.orgaoEntidade.razaoSocial}</h5>
                      <span className="text-[10px] text-[#8892a6] font-mono uppercase">CNPJ: {item.orgaoEntidade.cnpj}</span>
                    </div>

                    {/* Object Description */}
                    <p className="text-[11px] text-[#8892a6] leading-relaxed line-clamp-3">
                      {item.objeto || 'Sem objeto descrito.'}
                    </p>

                    {/* Session date */}
                    <div className="text-[10px] text-[#8892a6] flex items-center gap-1.5 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#d4a574]" />
                      <span>Abertura: <strong>{formatDate(item.dataAberturaProposta)}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-[#2d3548]/45 pt-3 mt-1">
                    {item.linkSistemaOrigem && (
                      <a
                        href={item.linkSistemaOrigem}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-3 bg-[#232a3d] hover:bg-[#2d3548] border border-[#2d3548] hover:border-[#8892a6]/30 text-xs font-semibold text-[#8892a6] hover:text-[#e8ebf0] rounded-lg transition-all flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ver Edital</span>
                      </a>
                    )}
                    
                    <button
                      onClick={() => handleSaveLicitacao(item)}
                      className="py-1.5 px-3 bg-[#d4a574]/15 hover:bg-[#d4a574]/25 border border-[#d4a574]/35 hover:border-[#d4a574]/55 text-xs font-bold text-[#d4a574] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Salvar no seu banco de dados Supabase"
                    >
                      <Database className="w-3 h-3" />
                      <span>Salvar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
