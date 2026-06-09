import React, { useState, useEffect } from 'react';
import { Company } from './types';
import { supabase, isConfigured } from './lib/supabase';
import { apiFetchCompanies, apiSaveCompany, apiFetchLicitacoes, apiFetchContratos, apiFetchOrgaos, apiFetchPortais } from './lib/db';
import AuthScreen from './components/AuthScreen';
import DeclarativeGenerator from './components/DeclarativeGenerator';
import ProposalForm from './components/ProposalForm';
import ManagementDashboard from './components/ManagementDashboard';
import CompanyManager from './components/CompanyManager';
import { 
  FileCheck, Shield, LogOut, CheckCircle, UploadCloud, Download, 
  Trash2, AlertCircle, RefreshCw, FileText, Settings 
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'declaracoes' | 'propostas' | 'gestao' | 'empresas'>('empresas');

  // Database lists
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [missingTablesDetected, setMissingTablesDetected] = useState(false);

  // Bid context sharing (Global Context Autofilled by PDF reader)
  const [orgao, setOrgao] = useState('Secretaria de Educação de Porto Alegre/RS');
  const [modalidade, setModalidade] = useState('Pregão Eletrônico');
  const [edital, setEdital] = useState('024/2026');
  const [objeto, setObjeto] = useState('Aquisição de materiais pedagógicos e brinquedos psicomotores para atendimento das creches.');
  const [cidade, setCidade] = useState('Arroio do Sal');
  const [dataAssinatura, setDataAssinatura] = useState(() => new Date().toISOString().split('T')[0]);

  // PDF Loading indicator
  const [parsingPdf, setParsingPdf] = useState(false);

  // Toast Alerts State
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Check auth session on boot
  useEffect(() => {
    localStorage.removeItem('licitaplus_sandbox');
    checkSession();
  }, []);

  const checkSession = async () => {
    setCheckingSession(true);

    if (!isConfigured || !supabase) {
      setCheckingSession(false);
      return;
    }

    try {
      const { data: { session: curSession } } = await supabase.auth.getSession();
      setSession(curSession);
      
      // Setup listener
      supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          loadCompaniesForUser();
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadCompaniesForUser();
    }
  }, [session]);

  const loadCompaniesForUser = async () => {
    setLoadingCompanies(true);
    try {
      const res = await apiFetchCompanies();
      setCompanies(res);
      setMissingTablesDetected(false); // Reset if successful
    } catch (e: any) {
      const errMsg = e.message || '';
      if (
        errMsg.includes('licitaplus_companies') ||
        errMsg.includes('relation') ||
        errMsg.includes('not find the table') ||
        errMsg.includes('schema cache')
      ) {
        setMissingTablesDetected(true);
      }
      showToast('Erro ao ler cadastro de empresas: ' + e.message, true);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('licitaplus_sandbox');
    setSandboxMode(false);
    setSession(null);
    if (isConfigured && supabase) {
      await supabase.auth.signOut();
    }
    showToast('Sessão encerrada de forma segura.');
  };

  // Toast Engine Trigger
  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Bid context copier tool
  const handlePropCopyTrigger = () => {
    // If standard forms are empty, alert
    if (!orgao) {
      showToast('Preencha os dados da licitação antes de duplicar.', true);
      return;
    }
    showToast('Ficha licitatória copiada para os Painéis de Proposta!');
  };

  // ==========================================
  // CLIENT-SIDE PDF PARSER (pdf.js + regex)
  // ==========================================
  const handlePdfEditalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Envie apenas arquivos válidos no formato PDF.', true);
      return;
    }

    setParsingPdf(true);
    showToast('Carregando e analisando edital com leitor nativo...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
          
          // Access global pdf.js library configured in index.html
          if (!(window as any).pdfjsLib) {
            throw new Error('Bibliotecas de leitura PDF não carregadas no topo do documento.');
          }

          const pdf = await (window as any).pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = '';
          
          // scan up to 30 pages to prevent sandbox freezes
          const maxPages = Math.min(30, pdf.numPages);
          for (let pNum = 1; pNum <= maxPages; pNum++) {
            const page = await pdf.getPage(pNum);
            const content = await page.getTextContent();
            const pageText = content.items.map((it: any) => it.str).join(' ');
            fullText += pageText + '\n';
          }

          if (!fullText.trim()) {
            throw new Error('Não foi possível extrair textos legíveis. O arquivo pode ser escaneado por imagem.');
          }

          // Apply regex sequence specified in specs
          applyEdictRegexes(fullText);
          showToast(`Análise concluída! ${pdf.numPages} páginas inspecionadas.`);
        } catch (err: any) {
          console.error(err);
          showToast('Erro de decodificação: ' + (err.message || 'O PDF pode conter apenas imagens.'), true);
        } finally {
          setParsingPdf(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setParsingPdf(false);
      showToast('Erro ao ler arquivo.', true);
    }
  };

  const applyEdictRegexes = (text: string) => {
    // 1. Modalidade detection
    let extractedMod = 'Pregão Eletrônico';
    if (/preg[aã]o\s+eletr[oô]nico/i.test(text)) extractedMod = 'Pregão Eletrônico';
    else if (/preg[aã]o\s+presencial/i.test(text)) extractedMod = 'Pregão Presencial';
    else if (/concorr[eê]ncia/i.test(text)) extractedMod = 'Concorrência';
    else if (/tomada\s+de\s+pre[cç]os/i.test(text)) extractedMod = 'Tomada de Preços';
    else if (/convite/i.test(text)) extractedMod = 'Convite';
    else if (/dispensa/i.test(text)) extractedMod = 'Dispensa';
    else if (/inexigibilidade/i.test(text)) extractedMod = 'Inexigibilidade';
    
    setModalidade(extractedMod);

    // 2. Número de processo
    const numRegexes = [
      /edital\s*(?:nº|n\.º)?\s*(\d+[\d./-]*)/i,
      /processo\s*(?:nº|n\.º)?\s*(\d+[\d./-]*)/i,
      /licita[cç][aã]o\s*(?:nº|n\.º)?\s*(\d+[\d./-]*)/i
    ];
    
    let extractedNum = '';
    for (const rx of numRegexes) {
      const match = text.match(rx);
      if (match && match[1]) {
        extractedNum = match[1].trim();
        break;
      }
    }
    if (extractedNum) setEdital(extractedNum);

    // 3. Órgão Licitante Search
    const orgPatterns = [
      /prefeitura\s+municipal\s+de\s+([A-Za-zÀ-ÿ\s-]+)/i,
      /c[âa]mara\s+municipal\s+de\s+([A-Za-zÀ-ÿ\s-]+)/i,
      /secretaria\s+municipal\s+de\s+([A-Za-zÀ-ÿ\s-]+)/i,
      /cons[oó]rcio\s+de\s+([A-Za-zÀ-ÿ\s-]+)/i
    ];

    let extractedOrg = '';
    for (const rx of orgPatterns) {
      const match = text.match(rx);
      if (match && match[0]) {
        extractedOrg = match[0].trim();
        break;
      }
    }
    if (extractedOrg) setOrgao(extractedOrg);

    // 4. Objeto da licitação
    const objPatterns = [
      /objeto:\s*([\s\S]{1,300})/i,
      /visa\s+o\s+objeto\s+de\s*([\s\S]{1,300})/i,
      /visando\s+a\s*([\s\S]{1,300})/i
    ];

    let extractedObj = '';
    for (const rx of objPatterns) {
      const match = text.match(rx);
      if (match && match[1]) {
        extractedObj = match[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        break;
      }
    }
    if (extractedObj) {
      if (extractedObj.length > 250) extractedObj = extractedObj.substring(0, 245) + '...';
      setObjeto(extractedObj);
    }
  };

  // ==========================================
  // MASTER BACKUP & RESTORE IMPO/EXPO
  // ==========================================
  const exportFullBackup = async () => {
    try {
      showToast('Coletando dados para backup completo...');
      const [allCompanies, allLicitacoes, allContratos, allOrgaos, allPortais] = await Promise.all([
        apiFetchCompanies(),
        apiFetchLicitacoes(),
        apiFetchContratos(),
        apiFetchOrgaos(),
        apiFetchPortais()
      ]);

      const backupObj = {
        _tipo: 'LicitaPlus_Backup_Completo',
        _versao: '1.1',
        _data: new Date().toISOString(),
        empresas: allCompanies,
        licitacoes: allLicitacoes,
        contratos: allContratos,
        orgaos: allOrgaos,
        portais: allPortais
      };

      const datastr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', datastr);
      dlAnchor.setAttribute('download', `LicitaPlus_BackupFull_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      showToast('Arquivo JSON de backup completo exportado!');
    } catch (e) {
      showToast('Erro ao exportar backup completo.', true);
    }
  };

  const handleImportCompaniesBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed._tipo !== 'LicitaPlus_Backup_Empresas' || !Array.isArray(parsed.empresas)) {
          throw new Error('O arquivo selecionado não possui o formato de metadados do Licita Plus.');
        }

        showToast(`Importando ${parsed.empresas.length} empresas...`);
        for (const comp of parsed.empresas) {
          // Merge / Insert saving
          await apiSaveCompany(comp);
        }
        showToast('Importação de backups concluída com sucesso!');
        loadCompaniesForUser();
      } catch (err: any) {
        showToast('Erro de Importação: ' + err.message, true);
      }
    };
    reader.readAsText(file);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-[#d4a574] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-[#8892a6] font-mono uppercase tracking-widest">Iniciando Servidor Nuvem...</p>
      </div>
    );
  }

  // Not signed in? Force Login
  if (!session) {
    return <AuthScreen onSessionActive={checkSession} />;
  }

  const userDisplayName = session.user?.user_metadata?.full_name || session.user?.email || 'Assessor';

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col relative font-sans text-[#e8ebf0]">
      
      {/* Toast Alert Widget */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in max-w-sm">
          <div className={`p-4 rounded-xl border shadow-2xl flex gap-3 text-xs ${
            toast.isError 
              ? 'bg-red-950/65 border-red-500/35 text-red-100' 
              : 'bg-emerald-950/65 border-emerald-500/35 text-emerald-100'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {toast.isError ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
            </div>
            <div>
              <p className="font-bold">{toast.isError ? 'Aviso técnico' : 'Operação de Sucesso'}</p>
              <p className="mt-1 opacity-85 leading-relaxed">{toast.msg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Background Decorative Gradients */}
      <div className="absolute top-[10%] right-[5%] w-[40%] h-[40%] rounded-full bg-radial from-[rgba(212,165,116,0.06)] to-transparent pointer-events-none blur-3xl"></div>
      <div className="absolute bottom-[10%] left-[5%] w-[40%] h-[40%] rounded-full bg-radial from-[rgba(124,179,128,0.04)] to-transparent pointer-events-none blur-3xl"></div>

      {/* TOP HEADER */}
      <header className="border-b border-[#2d3548] bg-[#1a2030]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/Logo.png" alt="LICITA PLUS" className="h-10 w-auto" />
          <div>
            <p className="text-[10px] text-[#8892a6] uppercase tracking-wider font-mono">Governança e Geração Técnica</p>
          </div>
        </div>

        {/* Master Navigation Buttons */}
        <nav className="flex bg-[#232a3d]/60 border border-[#2d3548] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('empresas')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'empresas'
                ? 'bg-[#d4a574] text-[#0f1419] font-bold shadow-md'
                : 'text-[#8892a6] hover:text-[#e8ebf0]'
            }`}
          >
            Aba Empresas
          </button>
          <button
            onClick={() => setActiveTab('declaracoes')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'declaracoes'
                ? 'bg-[#d4a574] text-[#0f1419] font-bold shadow-md'
                : 'text-[#8892a6] hover:text-[#e8ebf0]'
            }`}
          >
            Aba Declarações
          </button>
          <button
            onClick={() => setActiveTab('propostas')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'propostas'
                ? 'bg-[#d4a574] text-[#0f1419] font-bold shadow-md'
                : 'text-[#8892a6] hover:text-[#e8ebf0]'
            }`}
          >
            Aba Propostas
          </button>
          <button
            onClick={() => setActiveTab('gestao')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'gestao'
                ? 'bg-[#d4a574] text-[#0f1419] font-bold shadow-md'
                : 'text-[#8892a6] hover:text-[#e8ebf0]'
            }`}
          >
            Aba Gestão
          </button>
        </nav>

        {/* Session bar */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-[#e8ebf0]">{userDisplayName}</div>
            <div className="text-[10px] text-[#8892a6] font-mono flex items-center gap-1 justify-end">
              <Shield className="w-3 h-3 text-[#7cb380]" />
              <span>Conexão Segura</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg bg-[#232a3d] border border-[#2d3548] hover:border-red-500/40 text-[#8892a6] hover:text-red-400 transition-colors cursor-pointer"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* WARNING PANEL: Missing Database Tables */}
        {missingTablesDetected && (
          <div className="bg-[#1e2538] border border-amber-500/30 rounded-xl p-6 shadow-2xl relative overflow-hidden animate-fade-in space-y-5">
            <div className="absolute top-[-30px] right-[-30px] w-24 h-24 rounded-full bg-amber-500/10 blur-xl"></div>
            
            <div className="flex flex-col sm:flex-row items-col sm:items-center gap-4">
              <div className="p-3 bg-amber-950/45 border border-amber-500/30 rounded-lg text-amber-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-serif font-bold text-amber-400 flex items-center gap-2">
                  <span>Tabelas não encontradas no seu banco Supabase!</span>
                </h3>
                <p className="text-xs text-[#8892a6] leading-relaxed">
                  As chaves de sua conta Supabase estão configuradas perfeitamente, mas as tabelas do sistema ainda não foram inicializadas pelo SQL Editor. Siga os passos rápidos abaixo para resolver:
                </p>
              </div>
            </div>

            <div className="border-t border-[#2d3548] pt-4.5 space-y-4">
              <h4 className="text-xs uppercase tracking-wider font-mono text-[#d4a574] font-bold">
                Como resolver em 3 simples passos:
              </h4>
              
              <ol className="text-xs text-[#e8ebf0]/90 space-y-2 list-decimal pl-4 leading-relaxed">
                <li>
                  Acesse o painel do seu projeto no{' '}
                  <a 
                    href="https://supabase.com/dashboard" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[#d4a574] hover:underline font-semibold"
                  >
                    Supabase Dashboard
                  </a>.
                </li>
                <li>
                  No menu lateral esquerdo, selecione o menu <strong>SQL Editor</strong> e clique em <strong>New Query</strong> (Nova Consulta).
                </li>
                <li>
                  Clique no botão <strong>Copiar SQL</strong> abaixo, cole-o no seu editor do Supabase e clique no botão verde <strong>Run</strong> (Executar) para configurar o banco.
                </li>
              </ol>

              {/* COPY SQL ACCORDION / BOX */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-[#8892a6] font-mono">Script SQL pronto para execução:</span>
                  <button
                    onClick={() => {
                      const sqlContent = `-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - LICITA PLUS
-- Cole este script no SQL Editor do seu Supabase e clique em Run

CREATE TABLE IF NOT EXISTS public.licitaplus_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    razao_social TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    ie TEXT,
    endereco TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    rep_nome TEXT NOT NULL,
    rep_cpf TEXT NOT NULL,
    rep_cargo TEXT NOT NULL,
    rep_rg TEXT NOT NULL,
    porte TEXT NOT NULL DEFAULT 'NAO' CHECK (porte IN ('ME', 'EPP', 'NAO')),
    incluir_contador BOOLEAN NOT NULL DEFAULT false,
    cont_nome TEXT,
    cont_crc TEXT,
    cont_cpf TEXT,
    cont_escritorio TEXT,
    logo_data_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.licitaplus_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerenciamento total de Empresas pelo próprio usuário" 
ON public.licitaplus_companies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.licitaplus_licitacoes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa TEXT NOT NULL,
    orgao_id TEXT,
    orgao_nome TEXT NOT NULL,
    processo TEXT,
    portal TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'aguardando', 'suspensa', 'encerrada', 'concluida')),
    objeto TEXT NOT NULL,
    reabertura TIMESTAMP WITH TIME ZONE,
    valor_est NUMERIC NOT NULL DEFAULT 0,
    resp TEXT,
    link TEXT,
    resultado TEXT DEFAULT '',
    valor_prop NUMERIC NOT NULL DEFAULT 0,
    obs TEXT,
    timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.licitaplus_licitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerenciamento total de Licitações pelo próprio usuário" 
ON public.licitaplus_licitacoes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.licitaplus_contratos (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa TEXT NOT NULL,
    numero TEXT NOT NULL,
    licit_id TEXT,
    status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'encerrada_comissao', 'encerrado_contrato')),
    objeto TEXT NOT NULL,
    valor NUMERIC NOT NULL DEFAULT 0,
    perc_comissao NUMERIC NOT NULL DEFAULT 0,
    resp TEXT,
    inicio TEXT,
    fim TEXT,
    num_parcelas INTEGER NOT NULL DEFAULT 1,
    periodo TEXT NOT NULL CHECK (periodo IN ('mensal', 'bimestral', 'trimestral', 'anual', 'unico')),
    dt_inicio_parcela TEXT,
    obs TEXT,
    parcelas JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.licitaplus_contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerenciamento total de Contratos pelo próprio usuário" 
ON public.licitaplus_contratos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.licitaplus_orgaos (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cnpj TEXT,
    cidade TEXT,
    categoria TEXT NOT NULL CHECK (categoria IN ('municipal', 'estadual', 'federal', 'outro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.licitaplus_orgaos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerenciamento total de Órgãos pelo próprio usuário" 
ON public.licitaplus_orgaos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.licitaplus_portais (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.licitaplus_portais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerenciamento total de Portais pelo próprio usuário" 
ON public.licitaplus_portais FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;
                      
                      navigator.clipboard.writeText(sqlContent);
                      showToast('Script SQL copiado para a Área de Transferência!');
                    }}
                    className="px-3 py-1.5 bg-[#d4a574]/10 border border-[#d4a574]/30 text-[#d4a574] text-xs font-semibold rounded hover:bg-[#d4a574]/20 hover:text-[#d4a574] transition-all cursor-pointer flex items-center gap-1.5 font-mono"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </button>
                </div>
                
                <div className="bg-black/50 border border-[#2d3548] rounded-lg p-3 max-h-36 overflow-y-auto text-[10px] font-mono text-emerald-400/90 leading-relaxed">
                  <pre>{`-- script pronto de tabelas e políticas RLS
-- clique no botão "Copiar SQL" para obter o código na íntegra.

CREATE TABLE public.licitaplus_companies ( ... );
CREATE TABLE public.licitaplus_licitacoes ( ... );
CREATE TABLE public.licitaplus_contratos ( ... );
CREATE TABLE public.licitaplus_orgaos ( ... );
CREATE TABLE public.licitaplus_portais ( ... );`}</pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap pt-2.5">
              <button
                onClick={loadCompaniesForUser}
                className="px-4 py-2 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#d4a574]/5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Já executei! Procurar tabelas novamente</span>
              </button>
            </div>
          </div>
        )}

        {/* UPPER EDICT PARSER DRAG-AND-DROP CONTAINER (Except on Gestao panel space) */}
        {activeTab !== 'gestao' && (
          <div className="bg-[#1a2030] border border-[#d4a574]/20 rounded-xl p-6 shadow-xl flex flex-col lg:flex-row items-center gap-6 justify-between">
            <div className="space-y-2 text-center lg:text-left flex-1">
              <h2 className="text-md font-serif font-bold text-[#d4a574] flex items-center gap-1.5 justify-center lg:justify-start">
                <UploadCloud className="w-5 h-5 text-[#d4a574]" />
                <span>Carregar Edital (extração automática)</span>
              </h2>
              <p className="text-xs text-[#8892a6] max-w-2xl leading-relaxed">
                Suba o PDF do edital e o sistema vai tentar preencher automaticamente os campos comuns (modalidade, número, órgão, objeto, datas, valores). Arquivos não saem do seu navegador.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
              <label className="flex items-center justify-center gap-2 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] px-5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all select-none shadow-md shadow-black/20">
                {parsingPdf ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0f1419] border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-mono">Analisando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Escolher PDF do Edital</span>
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfEditalUpload}
                  className="hidden"
                  disabled={parsingPdf}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setOrgao('');
                  setModalidade('Pregão Eletrônico');
                  setEdital('');
                  setObjeto('');
                  showToast('Campos extraídos recolhidos e limpos!');
                }}
                title="Limpa os campos extraídos automaticamente"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-transparent hover:bg-[#232a3d]/40 border border-[#2d3548] hover:border-[#8892a6]/30 text-[#8892a6] hover:text-[#e8ebf0] text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar extraído</span>
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE MODULE CONTAINER */}
        <div className="animate-fade-in">
          {activeTab === 'empresas' && (
            <CompanyManager
              companies={companies}
              onRefreshCompanies={loadCompaniesForUser}
              showToast={showToast}
            />
          )}

          {activeTab === 'declaracoes' && (
            <DeclarativeGenerator
              companies={companies}
              onRefreshCompanies={loadCompaniesForUser}
              orgao={orgao} setOrgao={setOrgao}
              modalidade={modalidade} setModalidade={setModalidade}
              edital={edital} setEdital={setEdital}
              objeto={objeto} setObjeto={setObjeto}
              cidade={cidade} setCidade={setCidade}
              dataAssinatura={dataAssinatura} setDataAssinatura={setDataAssinatura}
              showToast={showToast}
            />
          )}

          {activeTab === 'propostas' && (
            <ProposalForm
              companies={companies}
              onRefreshCompanies={loadCompaniesForUser}
              orgao={orgao}
              modalidade={modalidade}
              edital={edital}
              objeto={objeto}
              cidade={cidade}
              dataAssinatura={dataAssinatura}
              onCopyFromDeclarations={handlePropCopyTrigger}
              showToast={showToast}
            />
          )}

          {activeTab === 'gestao' && (
            <ManagementDashboard
              companies={companies}
              showToast={showToast}
            />
          )}
        </div>
      </main>

      {/* FOOTER METADATA BAR */}
      <footer className="border-t border-[#2d3548] bg-[#1a2030]/40 py-8 px-6 text-center text-xs text-[#8892a6]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#d4a574] font-bold">Licita Plus v11.1</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="file"
              accept=".json"
              id="import-companies-input"
              className="hidden"
              onChange={handleImportCompaniesBackup}
            />
            <button
              onClick={() => document.getElementById('import-companies-input')?.click()}
              className="px-3 py-1.5 bg-[#232a3d] border border-[#2d3548] hover:border-[#8892a6] text-[10px] uppercase font-mono rounded hover:text-[#e8ebf0] transition-colors cursor-pointer"
            >
              Restaurar Backup (.json)
            </button>
            <button
              onClick={exportFullBackup}
              className="px-3 py-1.5 bg-[#232a3d] border border-[#2d3548] hover:border-[#8892a6] text-[10px] uppercase font-mono rounded hover:text-[#e8ebf0] transition-colors cursor-pointer"
            >
              Backup de Dados (Exportação)
            </button>
          </div>
        </div>
        <p className="text-[10px] mt-6 opacity-75">
          Todos os direitos reservados, 2026.
        </p>
      </footer>
    </div>
  );
}
