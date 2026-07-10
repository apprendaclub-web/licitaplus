import React, { useState } from 'react';
import {
  Search, Calendar, MapPin, ExternalLink, Database,
  AlertCircle, RefreshCw, Filter, TrendingUp, Zap,
  Globe, ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BuscaOportunidadesProps {
  userId?: string;
  showToast: (msg: string, isError?: boolean) => void;
  onBidSaved?: () => void;
}

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
];

const MODALIDADES = [
  { value: '5',  label: 'Pregão Eletrônico' },
  { value: '8',  label: 'Concorrência Eletrônica' },
  { value: '6',  label: 'Pregão Presencial' },
  { value: '1',  label: 'Leilão' },
  { value: '2',  label: 'Diálogo Competitivo' },
  { value: '3',  label: 'Concurso' },
  { value: '4',  label: 'Concorrência' },
  { value: '7',  label: 'Dispensa Eletrônica' },
  { value: '9',  label: 'Manifestação de Interesse' },
  { value: '10', label: 'Pré-qualificação' },
  { value: '11', label: 'Credenciamento' },
  { value: '12', label: 'Registro de Preços' },
];

export default function BuscaOportunidades({ userId, showToast, onBidSaved }: BuscaOportunidadesProps) {
  const [dataInicial, setDataInicial] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().split('T')[0];
  });
  const [dataFinal, setDataFinal] = useState(() => new Date().toISOString().split('T')[0]);
  const [uf, setUf] = useState('');
  const [modalidade, setModalidade] = useState('5');
  const [tamanhoPagina, setTamanhoPagina] = useState('20');
  const [palavraChave, setPalavraChave] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [totalResultados, setTotalResultados] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResults([]);
    setTotalResultados(null);

    const baseUrl = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
    const formatToPncpDate = (dateStr: string) => dateStr.replace(/-/g, '');

    const params = new URLSearchParams({
      dataInicial: formatToPncpDate(dataInicial),
      dataFinal: formatToPncpDate(dataFinal),
      codigoModalidadeContratacao: modalidade,
      pagina: '1',
      tamanhoPagina: tamanhoPagina
    });

    if (uf && uf.trim()) {
      params.append('uf', uf.trim().toUpperCase());
    }

    if (palavraChave && palavraChave.trim()) {
      params.append('objeto', palavraChave.trim());
    }

    try {
      const response = await fetch(`${baseUrl}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Erro na API do PNCP (Código ${response.status})`);
      }

      if (response.status === 204) {
        setResults([]);
        showToast('Nenhum resultado encontrado para este filtro.');
        return;
      }

      const text = await response.text();
      if (!text || !text.trim()) {
        setResults([]);
        showToast('Nenhum resultado encontrado para este filtro.');
        return;
      }

      const data = JSON.parse(text);
      const items = data.data || [];
      setResults(items);
      setTotalResultados(data.totalRegistros ?? items.length);

      if (items.length === 0) {
        showToast('Nenhum resultado encontrado para este filtro.');
      } else {
        showToast(`Busca concluída! ${items.length} licitações encontradas.`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao carregar dados do PNCP.');
      showToast('Falha na comunicação com o PNCP.', true);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (!val) return 'Valor não informado';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Não definida';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const handleSaveLicitacao = async (item: any) => {
    if (!supabase) {
      showToast('Banco de dados Supabase não configurado.', true);
      return;
    }

    const uniqueId = `${item.orgaoEntidade.cnpj}-${item.anoCompra}-${item.numeroCompra}`;

    const licitacaoFormatada = {
      id: uniqueId,
      user_id: userId || null,
      empresa: 'Importado via Busca PNCP',
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

      setSavedIds(prev => new Set(prev).add(uniqueId));
      showToast('Licitação salva com sucesso no banco de dados!');
      if (onBidSaved) onBidSaved();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar no banco: ' + err.message, true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page Header */}
      <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#d4a574]/10 border border-[#d4a574]/20 rounded-xl">
              <Globe className="w-6 h-6 text-[#d4a574]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[#d4a574] flex items-center gap-2">
                Busca de Certames
              </h1>
              <p className="text-xs text-[#8892a6] mt-0.5">
                Consulte licitações em tempo real direto do Portal Nacional de Contratações Públicas (PNCP)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#232a3d]/60 border border-[#2d3548] rounded-lg px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">API PNCP Ativa</span>
          </div>
        </div>

        {/* Stats Row */}
        {totalResultados !== null && (
          <div className="mt-4 pt-4 border-t border-[#2d3548] flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#d4a574]" />
              <span className="text-xs text-[#8892a6]">
                <span className="text-[#e8ebf0] font-bold">{totalResultados.toLocaleString('pt-BR')}</span> registros encontrados
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#7cb380]" />
              <span className="text-xs text-[#8892a6]">
                Exibindo <span className="text-[#e8ebf0] font-bold">{results.length}</span> resultados
              </span>
            </div>
            {savedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-[#8892a6]">
                  <span className="text-blue-400 font-bold">{savedIds.size}</span> salvas nesta sessão
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Form */}
      <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-[#d4a574]" />
          <span className="text-sm font-semibold text-[#e8ebf0]">Filtros de Pesquisa</span>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Palavras-Chave (Full-width) */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">Palavras-Chave</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a6]" />
              <input
                type="text"
                placeholder="Ex: limpeza, tecnologia, material de escritório..."
                value={palavraChave}
                onChange={(e) => setPalavraChave(e.target.value)}
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-9 pr-14 py-2 text-xs text-[#e8ebf0] focus:outline-none focus:border-[#d4a574] transition-all"
              />
              {palavraChave && (
                <button
                  type="button"
                  onClick={() => setPalavraChave('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8892a6] hover:text-[#e8ebf0] transition-colors"
                >
                  LIMPAR
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Data Inicial */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">Data Inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a6]" />
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                required
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-9 pr-3 py-2 text-xs text-[#e8ebf0] focus:outline-none focus:border-[#d4a574] transition-all"
              />
            </div>
          </div>

          {/* Data Final */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">Data Final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a6]" />
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                required
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-9 pr-3 py-2 text-xs text-[#e8ebf0] focus:outline-none focus:border-[#d4a574] transition-all"
              />
            </div>
          </div>

          {/* Modalidade */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">Modalidade</label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8892a6] pointer-events-none" />
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-xs text-[#e8ebf0] focus:outline-none focus:border-[#d4a574] appearance-none cursor-pointer transition-all"
              >
                {MODALIDADES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* UF + Tamanho + Botão */}
          <div className="flex gap-2 items-end">
            <div className="space-y-1.5 w-20">
              <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">UF</label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8892a6]" />
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-7 pr-1 py-2 text-xs text-[#e8ebf0] focus:outline-none focus:border-[#d4a574] appearance-none cursor-pointer transition-all"
                >
                  <option value="">Todas</option>
                  {UF_OPTIONS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 w-16">
              <label className="text-[10px] text-[#8892a6] uppercase font-mono tracking-wider block">Qtd</label>
              <select
                value={tamanhoPagina}
                onChange={(e) => setTamanhoPagina(e.target.value)}
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2 py-2 text-xs text-[#e8ebf0] focus:outline-none focus:border-[#d4a574] appearance-none cursor-pointer transition-all"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-[34px] px-4 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[#d4a574]/10 cursor-pointer disabled:opacity-50"
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
          </div>
        </form>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-red-950/45 border border-red-500/30 rounded-xl text-red-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-mono text-[#8892a6] tracking-wider">
            Resultados da Pesquisa
            {results.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-[#d4a574]/15 border border-[#d4a574]/25 text-[#d4a574] rounded text-[9px]">
                {results.length}
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl py-16 text-center flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-[#d4a574]/20 rounded-full"></div>
              <div className="w-12 h-12 border-2 border-[#d4a574] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#e8ebf0]">Consultando o PNCP...</p>
              <p className="text-xs text-[#8892a6]">Buscando dados governamentais em tempo real</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-[#1a2030] border border-dashed border-[#2d3548] rounded-xl p-14 text-center">
            <Globe className="w-10 h-10 text-[#2d3548] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#8892a6]">Nenhuma licitação carregada</p>
            <p className="text-xs text-[#8892a6]/60 mt-1">
              {errorMsg ? 'A busca falhou. Verifique sua conexão.' : 'Ajuste os filtros acima e clique em Buscar.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((item, index) => {
              const uniqueId = `${item.orgaoEntidade.cnpj}-${item.anoCompra}-${item.numeroCompra}`;
              const isSaved = savedIds.has(uniqueId);
              const uniqueKey = `${uniqueId}-${index}`;

              return (
                <div
                  key={uniqueKey}
                  className={`bg-[#1a2030] border rounded-xl p-4 flex flex-col justify-between gap-4 transition-all shadow-sm hover:shadow-md ${
                    isSaved
                      ? 'border-emerald-500/30 bg-emerald-950/5'
                      : 'border-[#2d3548] hover:border-[#d4a574]/40'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badge & Value */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2 py-0.5 bg-[#d4a574]/15 border border-[#d4a574]/25 text-[#d4a574] text-[9px] font-mono rounded">
                        {item.numeroCompra}/{item.anoCompra}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#7cb380] text-right">
                        {formatCurrency(item.valorTotalEstimado)}
                      </span>
                    </div>

                    {/* Organ */}
                    <div>
                      <h3 className="text-xs font-bold text-[#e8ebf0] line-clamp-2 leading-snug">
                        {item.orgaoEntidade.razaoSocial}
                      </h3>
                      <span className="text-[10px] text-[#8892a6] font-mono">
                        CNPJ: {item.orgaoEntidade.cnpj}
                      </span>
                    </div>

                    {/* Object */}
                    <p className="text-[11px] text-[#8892a6] leading-relaxed line-clamp-3">
                      {item.objeto || 'Sem objeto descrito.'}
                    </p>

                    {/* Modality & Date */}
                    <div className="flex flex-col gap-1">
                      {item.modalidadeNome && (
                        <span className="text-[10px] font-mono text-[#8892a6] uppercase">
                          {item.modalidadeNome}
                        </span>
                      )}
                      <div className="text-[10px] text-[#8892a6] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#d4a574]" />
                        <span>
                          Abertura: <strong className="text-[#e8ebf0]">{formatDate(item.dataAberturaProposta)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-[#2d3548]/45 pt-3">
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
                      disabled={isSaved}
                      className={`py-1.5 px-3 border text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isSaved
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 cursor-default'
                          : 'bg-[#d4a574]/15 hover:bg-[#d4a574]/25 border-[#d4a574]/35 hover:border-[#d4a574]/55 text-[#d4a574]'
                      }`}
                      title={isSaved ? 'Já salva no banco de dados' : 'Salvar no banco de dados'}
                    >
                      <Database className="w-3 h-3" />
                      <span>{isSaved ? 'Salva ✓' : 'Salvar'}</span>
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
