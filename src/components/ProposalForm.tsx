import React, { useState, useEffect, useRef } from 'react';
import { Company, ItemProposta, Licitacao } from '../types';
import { apiFetchCompanies, apiSaveCompany, apiFetchLicitacoes, apiSaveLicitacao } from '../lib/db';
import { validarCNPJ } from '../lib/utils';
import { jsPDF } from 'jspdf';
import { 
  Building2, Search, FileText, Check, Plus, Trash2, Edit3, DollarSign,
  Briefcase, FolderOpen, Calendar, Archive, Key, HelpCircle, ArrowRight,
  Sparkles, Cpu, AlertTriangle
} from 'lucide-react';

interface ProposalFormProps {
  companies: Company[];
  onRefreshCompanies: () => void;
  // Shared bid state
  orgao: string;
  modalidade: string;
  edital: string;
  objeto: string;
  cidade: string;
  dataAssinatura: string;
  editalFullText?: string;
  aiAnalysisResult?: any;
  onCopyFromDeclarations: () => void;
  showToast: (msg: string, isError?: boolean) => void;
}

// 3 Standard embeds
const PROP_EMBEDS = {
  elaboracao: {
    titulo: 'ELABORAÇÃO INDEPENDENTE DA PROPOSTA',
    corpo: (d: any) => `Declara, sob as penas da lei, em especial o art. 299 do Código Penal Brasileiro, que: (1) a proposta econômica foi elaborada de maneira independente, e o seu conteúdo não foi, no todo ou em parte, direta ou indiretamente, informado ou discutido com qualquer outro participante potencial ou de fato; (2) a intenção de apresentar a proposta não foi informada, discutida ou recebida de qualquer outro participante; (3) não houve conluio, combinação, influência ou qualquer espécie de acordo com outros licitantes ou terceiros para a fixação de preços ou de quaisquer condições da proposta; (4) não tentou, por qualquer meio ou pessoa, influir na decisão de qualquer outro participante quanto a participar ou não da licitação; (5) o conteúdo da proposta não será comunicado a qualquer outro participante antes da abertura oficial das propostas.`
  },
  conhecimento: {
    titulo: 'CONHECIMENTO E ACEITAÇÃO DO EDITAL',
    corpo: (d: any) => `Declara que: (a) recebeu, analisou e tem pleno conhecimento de todos os termos, cláusulas, condições, exigências e anexos contidos no edital do ${d.modalidade} nº ${d.edital}; (b) aceita integralmente e de forma irrestrita as condições nele estabelecidas, comprometendo-se a executar o objeto na forma e nos prazos avençados; (c) tomou conhecimento de todas as informações e condições locais necessárias para o cumprimento das obrigações objeto da licitação.`
  },
  habilitacao: {
    titulo: 'PLENO CUMPRIMENTO DOS REQUISITOS DE HABILITAÇÃO',
    corpo: (d: any) => `Declara, em atendimento ao previsto no art. 63, I, da Lei nº 14.133/2021 (e/ou art. 4º, VII, da Lei nº 10.520/2002), que cumpre plenamente todos os requisitos de habilitação jurídica, fiscal, social, trabalhista e técnica exigidos no edital, estando ciente das sanções aplicáveis em caso de declaração falsa.`
  }
};

export default function ProposalForm({
  companies,
  onRefreshCompanies,
  orgao, modalidade, edital, objeto, cidade, dataAssinatura,
  editalFullText,
  aiAnalysisResult,
  onCopyFromDeclarations,
  showToast
}: ProposalFormProps) {

  const [proposalType, setProposalType] = useState<'preco' | 'tecnica' | 'completa'>('preco');
  const [itemsMode, setItemsMode] = useState<'simples' | 'completo'>('simples');
  const [selectedCompanyKey, setSelectedCompanyKey] = useState('');
  
  // Localized proposal states
  const [propCompany, setPropCompany] = useState<Partial<Company>>({
    razao_social: '', cnpj: '', ie: '', endereco: '', rep_nome: '', rep_cpf: '', rep_cargo: ''
  });

  // Items table
  const [items, setItems] = useState<ItemProposta[]>([
    { descricao: '', tipoCalculo: 'qtd', qtd: '1', unitario: '0' }
  ]);

  // Pricing conditions and variables
  const [validade, setValidade] = useState('60 (sessenta) dias');
  const [prazoEntrega, setPrazoEntrega] = useState('30 (trinta) dias úteis');
  const [condicoesPagto, setCondicoesPagto] = useState('Em até 30 dias após aceitação do serviço');
  const [garantia, setGarantia] = useState('Mínima de 12 (doze) meses');
  const [observacoes, setObservacoes] = useState('');

  // Bank Info
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState('Conta Corrente');
  const [pix, setPix] = useState('');

  // Tech Specs Section
  const [tecnicaObjeto, setTecnicaObjeto] = useState('');
  const [metodologia, setMetodologia] = useState('');
  const [cronograma, setCronograma] = useState('');
  const [qualificacoes, setQualificacoes] = useState('');
  const [recursos, setRecursos] = useState('');

  // Embedded elements
  const [embedsChecked, setEmbedsChecked] = useState<{ [key: string]: boolean }>({
    elaboracao: false,
    conhecimento: false,
    habilitacao: false
  });
  const [customEmbeds, setCustomEmbeds] = useState<{ id: string; titulo: string; texto: string }[]>([]);

  const [editalText, setEditalText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Carrega análise existente se a licitação já estiver no banco
  useEffect(() => {
    const fetchExistingAnalysis = async () => {
      if (!edital || !propCompany.razao_social) return;
      try {
        const bids = await apiFetchLicitacoes();
        const match = bids.find(
          b => b.processo === edital && b.empresa === propCompany.razao_social
        );
        if (match && match.ia_analise) {
          setAnalysisResult(match.ia_analise);
        } else {
          setAnalysisResult(null);
        }
      } catch (e) {
        console.error('Erro ao buscar análise de edital:', e);
      }
    };
    fetchExistingAnalysis();
  }, [edital, propCompany.razao_social]);

  // Sincroniza o texto bruto do PDF extraído no App.tsx
  useEffect(() => {
    if (editalFullText) {
      setEditalText(editalFullText);
    }
  }, [editalFullText]);

  // Sincroniza o resultado da análise automática feita no App.tsx
  useEffect(() => {
    if (aiAnalysisResult) {
      setAnalysisResult(aiAnalysisResult);
    }
  }, [aiAnalysisResult]);

  const handleAiAnalysis = async () => {
    if (!editalText.trim()) {
      showToast('Por favor, digite ou carregue o texto de um edital para analisar.', true);
      return;
    }

    setAnalyzing(true);
    showToast('Iniciando análise inteligente com GPT-4o...');

    try {
      const response = await fetch('/api/analyze-edital', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: editalText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro na chamada do microsserviço de IA.');
      }

      const data = await response.json();
      setAnalysisResult(data);

      // Persistir no banco de dados (Supabase ou localstorage)
      showToast('Salvando dados na tabela de licitações...');
      const bids = await apiFetchLicitacoes();
      const match = bids.find(
        b => b.processo === edital && b.empresa === propCompany.razao_social
      );

      const bidToSave: Licitacao = match
        ? {
            ...match,
            ia_analise: data,
          }
        : {
            id: 'lc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            empresa: propCompany.razao_social || 'Empresa Não Selecionada',
            orgao_nome: orgao || 'Órgão Não Informado',
            processo: edital || 'Edital Não Informado',
            portal: 'Outros',
            status: 'aberta' as const,
            objeto: objeto || data.objeto || 'Não especificado',
            valor_est: 0,
            valor_prop: 0,
            timeline: [],
            ia_analise: data,
          };

      await apiSaveLicitacao(bidToSave);
      showToast('Edital analisado com IA e persistido com sucesso!');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao realizar análise: ' + err.message, true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyAiData = () => {
    if (!analysisResult) return;

    let count = 0;
    if (analysisResult.prazo_entrega && analysisResult.prazo_entrega !== 'Não especificado') {
      setPrazoEntrega(analysisResult.prazo_entrega);
      count++;
    }
    if (analysisResult.garantias && analysisResult.garantias !== 'Não especificado') {
      setGarantia(analysisResult.garantias);
      count++;
    }

    if (count > 0) {
      showToast(`${count} campo(s) atualizado(s) com sucesso no formulário!`);
    } else {
      showToast('Nenhuma informação válida ou diferente para aplicar.', true);
    }
  };

  // Local sync
  useEffect(() => {
    if (selectedCompanyKey) {
      const comp = companies.find(c => {
        const key = 'empresa:' + c.razao_social.replace(/[\s/\\'"]/g, '_');
        return key === selectedCompanyKey;
      });
      if (comp) setPropCompany(comp);
    }
  }, [selectedCompanyKey, companies]);

  // Sync prop company if parent forms trigger copy
  const handlePropsCopy = () => {
    onCopyFromDeclarations();
    // Pre-populate fields immediately from parent states
    const curRazao = (document.getElementById('razaoSocial') as HTMLInputElement)?.value || '';
    const curCnpj = (document.getElementById('cnpj') as HTMLInputElement)?.value || '';
    const curIe = (document.getElementById('ie') as HTMLInputElement)?.value || '';
    const curEnd = (document.getElementById('endereco') as HTMLInputElement)?.value || '';
    const curRep = (document.getElementById('repNome') as HTMLInputElement)?.value || '';
    const curCpf = (document.getElementById('repCpf') as HTMLInputElement)?.value || '';
    const curCargo = (document.getElementById('repCargo') as HTMLInputElement)?.value || '';

    setPropCompany({
      razao_social: curRazao,
      cnpj: curCnpj,
      ie: curIe,
      endereco: curEnd,
      rep_nome: curRep,
      rep_cpf: curCpf,
      rep_cargo: curCargo
    });
  };

  const handleCnpjLookup = async () => {
    const numericCnpj = (propCompany.cnpj || '').replace(/\D/g, '');
    if (numericCnpj.length !== 14) {
      showToast('CNPJ com 14 dígitos é requerido.', true);
      return;
    }

    if (!validarCNPJ(numericCnpj)) {
      showToast('CNPJ inválido (Dígito Verificador incorreto).', true);
      return;
    }

    showToast('Acessando dados fiscais...');
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numericCnpj}`);
      if (!res.ok) throw new Error('Não localizado.');
      const d = await res.json();
      
      const addr = [
        `${d.descricao_tipo_de_logradouro || ''} ${d.logradouro || ''}`.trim(),
        d.numero ? `nº ${d.numero}` : '',
        d.bairro || '',
        d.municipio ? `${d.municipio}/${d.uf || ''}` : '',
        d.cep ? `CEP ${d.cep}` : ''
      ].filter(Boolean).join(', ');

      const formatted = numericCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

      setPropCompany(p => ({
        ...p,
        razao_social: d.razao_social || '',
        cnpj: formatted,
        endereco: addr
      }));
      showToast('Empresa preenchida com sucesso!');
    } catch (e) {
      showToast('Erro ao buscar CNPJ.', true);
    }
  };

  // Dynamic Row Actions
  const handleItemChange = (index: number, prop: keyof ItemProposta, value: string) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updated = { ...item, [prop]: value };
        return updated;
      }
      return item;
    }));
  };

  const addItemRow = () => {
    setItems(prev => [...prev, { descricao: '', tipoCalculo: 'qtd', qtd: '1', unitario: '0' }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      showToast('Sua proposta deve conter pelo menos 1 item.', true);
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const parseValue = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/R\$/g, '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(clean) || 0;
  };

  const parseQtd = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(',', '.').trim();
    return parseFloat(clean) || 0;
  };

  const getLineTotal = (item: ItemProposta): number => {
    const u = parseValue(item.unitario);
    if (item.tipoCalculo === 'fechado') return u;
    const q = parseQtd(item.qtd || '1');
    return q * u;
  };

  const getProposalTotal = (): number => {
    return items.reduce((sum, item) => sum + getLineTotal(item), 0);
  };

  // Embeddable creations
  const addPropCustomDec = () => {
    setCustomEmbeds(prev => [
      ...prev,
      { id: Date.now().toString(), titulo: '', texto: '' }
    ]);
  };

  const removePropCustomDec = (id: string) => {
    setCustomEmbeds(prev => prev.filter(x => x.id !== id));
  };

  const handleCustomChange = (id: string, prop: 'titulo' | 'texto', value: string) => {
    setCustomEmbeds(prev => prev.map(x => x.id === id ? { ...x, [prop]: value } : x));
  };

  // PDF Engine
  const generateProposalPDF = () => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const totalAmount = getProposalTotal();
      const docData = {
        ...propCompany,
        orgao, modalidade, edital, objeto, cidade, validade,
        data: dataAssinatura ? formatarData(dataAssinatura) : formatarData(new Date().toISOString().split('T')[0])
      };

      const PAGE = { marginL: 20, marginR: 20, marginT: 20, marginB: 20, usableW: 170 };
      let y = PAGE.marginT;

      // Header logo
      const activeLogo = propCompany.logo_data_url || companies.find(c => c.razao_social === propCompany.razao_social)?.logo_data_url;
      if (activeLogo) {
        try {
          const maxH = 20, maxW = 55;
          const x = (210 - maxW) / 2;
          const format = activeLogo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(activeLogo, format, x, y, maxW, maxH);
          y += maxH + 8;
        } catch (e) {}
      }

      // Title
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      const mainTitle = proposalType === 'preco' 
        ? 'PROPOSTA COMERCIAL DE PREÇOS' 
        : proposalType === 'tecnica' 
          ? 'PROPOSTA TÉCNICA E MEMORIAL DESCRITIVO' 
          : 'PROPOSTA COMERCIAL E TÉCNICA COMPLETA';
      doc.text(mainTitle, 105, y, { align: 'center' });
      y += 8;

      // Bidding Details Subheader
      doc.setFont('times', 'italic');
      doc.setFontSize(10);
      doc.text(`${modalidade} nº ${edital} — ${orgao}`, 105, y, { align: 'center' });
      y += 8;

      // Proponente Line Block
      doc.setDrawColor(200);
      doc.setLineWidth(0.25);
      doc.line(PAGE.marginL, y, 210 - PAGE.marginR, y);
      y += 5;

      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.text('EMPRESA PROPONENTE:', PAGE.marginL, y);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      y += 5.5;

      const lines = [
        `${propCompany.razao_social || '[Razão Social]'} — CNPJ: ${propCompany.cnpj || '[CNPJ]'}`,
        propCompany.endereco || '[Endereço]',
        `Atendimento: ${propCompany.rep_nome || '[Representante]'} (${propCompany.rep_cargo || ''}) — CPF/MF: ${propCompany.rep_cpf || ''}`
      ];

      lines.forEach(l => {
        const wrapped = doc.splitTextToSize(l, PAGE.usableW);
        wrapped.forEach(w => {
          doc.text(w, PAGE.marginL, y);
          y += 4.5;
        });
      });
      y += 2;
      doc.line(PAGE.marginL, y, 210 - PAGE.marginR, y);
      y += 8;

      // OBJECT
      y = drawSecTitle(doc, '1. OBJETO DA PROPOSTA', y);
      y = writeJustifiedText(doc, objeto || '—', doc, y, PAGE.usableW);
      y += 6;

      // TECH SPECS INCLUSIONS
      if (proposalType === 'tecnica' || proposalType === 'completa') {
        if (tecnicaObjeto) {
          y = drawSecTitle(doc, '2. ESPECIFICAÇÕES TÉCNICAS E DETALHAMENTO', y);
          y = writeJustifiedText(doc, tecnicaObjeto, doc, y, PAGE.usableW);
          y += 5;
        }
        if (metodologia) {
          y = drawSecTitle(doc, '3. PLANO DE TRABALHO E METODOLOGIA', y);
          y = writeJustifiedText(doc, metodologia, doc, y, PAGE.usableW);
          y += 5;
        }
        if (cronograma) {
          y = drawSecTitle(doc, '4. CRONOGRAMA FÍSICO-FINANCEIRO DE EXECUÇÃO', y);
          y = writeJustifiedText(doc, cronograma, doc, y, PAGE.usableW);
          y += 5;
        }
        if (qualificacoes) {
          y = drawSecTitle(doc, '5. QUALIFICAÇÃO TÉCNICA E CERTIFICAÇÕES', y);
          y = writeJustifiedText(doc, qualificacoes, doc, y, PAGE.usableW);
          y += 5;
        }
      }

      // PRICING TABLE (preco, completa)
      if (proposalType === 'preco' || proposalType === 'completa') {
        const priceSectionIndex = proposalType === 'completa' ? '6' : '2';
        y = drawSecTitle(doc, `${priceSectionIndex}. QUANTITATIVOS, VALORES UNITÁRIOS E GERAIS`, y);

        // Header Table
        doc.setFillColor(30, 41, 59);
        doc.rect(PAGE.marginL, y - 4, PAGE.usableW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255);

        if (itemsMode === 'simples') {
          const widths = [PAGE.usableW * 0.50, PAGE.usableW * 0.14, PAGE.usableW * 0.18, PAGE.usableW * 0.18];
          const cols = ['DESCRIÇÃO DOS ESCOPOS', 'QTD/MESES', 'VALOR UNIT.', 'VALOR TOTAL'];
          let cx = PAGE.marginL;
          cols.forEach((c, idx) => {
            doc.text(c, cx + 2, y);
            cx += widths[idx];
          });
          doc.setTextColor(0);
          y += 5;

          doc.setFont('times', 'normal');
          doc.setFontSize(9.5);
          items.forEach((item, idx) => {
            const descLines = doc.splitTextToSize(item.descricao || '', widths[0] - 4);
            const rH = Math.max(5, descLines.length * 4.2);
            if (y + rH > 265) { doc.addPage(); y = PAGE.marginT; }
            if (idx % 2 === 0) {
              doc.setFillColor(245, 245, 245);
              doc.rect(PAGE.marginL, y - 3, PAGE.usableW, rH, 'F');
            }
            let cx2 = PAGE.marginL;
            doc.text(descLines, cx2 + 2, y);
            cx2 += widths[0];
            doc.text(item.tipoCalculo === 'fechado' ? '—' : (item.qtd || '1'), cx2 + 2, y);
            cx2 += widths[1];
            doc.text(`R$ ${parseFloat(item.unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cx2 + 2, y);
            cx2 += widths[2];
            doc.text(`R$ ${getLineTotal(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cx2 + 2, y);
            y += rH;
          });
        } else {
          // Completed mode
          const widths = [PAGE.usableW * 0.05, PAGE.usableW * 0.10, PAGE.usableW * 0.35, PAGE.usableW * 0.12, PAGE.usableW * 0.07, PAGE.usableW * 0.08, PAGE.usableW * 0.11, PAGE.usableW * 0.12];
          const cols = ['#', 'CÓDIGO', 'DESCRIÇÃO', 'MARCA', 'UNID.', 'QTD', 'VALOR U.', 'TOTAL'];
          let cx = PAGE.marginL;
          cols.forEach((c, idx) => {
            doc.text(c, cx + 1, y);
            cx += widths[idx];
          });
          doc.setTextColor(0);
          y += 5;

          doc.setFont('times', 'normal');
          doc.setFontSize(8.5);
          items.forEach((item, idx) => {
            const descLines = doc.splitTextToSize(item.descricao || '', widths[2] - 2);
            const rH = Math.max(5, descLines.length * 4);
            if (y + rH > 265) { doc.addPage(); y = PAGE.marginT; }
            if (idx % 2 === 0) {
              doc.setFillColor(245, 245, 245);
              doc.rect(PAGE.marginL, y - 3, PAGE.usableW, rH, 'F');
            }
            let cx2 = PAGE.marginL;
            doc.text(String(item.item || (idx + 1)), cx2 + 1, y);
            cx2 += widths[0];
            doc.text(item.codigo || '', cx2 + 1, y);
            cx2 += widths[1];
            doc.text(descLines, cx2 + 1, y);
            cx2 += widths[2];
            doc.text(item.marca || '', cx2 + 1, y);
            cx2 += widths[3];
            doc.text(item.unidade || 'UN', cx2 + 1, y);
            cx2 += widths[4];
            doc.text(item.tipoCalculo === 'fechado' ? '—' : (item.qtd || '1'), cx2 + 1, y);
            cx2 += widths[5];
            doc.text(`R$ ${parseFloat(item.unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cx2 + 1, y);
            cx2 += widths[6];
            doc.text(`R$ ${getLineTotal(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cx2 + 1, y);
            y += rH;
          });
        }

        y += 4;
        if (y > 255) { doc.addPage(); y = PAGE.marginT; }
        doc.setFillColor(245, 235, 215);
        doc.rect(PAGE.marginL, y - 3, PAGE.usableW, 9, 'F');
        doc.setFont('times', 'bold');
        doc.setFontSize(11.5);
        doc.text(`VALOR TOTAL EXECUTADO: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, PAGE.marginL + 3, y + 3);
        y += 10;

        // Conditions block below table
        y = drawSecTitle(doc, 'CONDIÇÕES COMERCIAIS ADICIONAIS', y);
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        const condLines = [
          `Validade desta Proposta: ${validade}`,
          `Prazo para Entrega/Execução final: ${prazoEntrega}`,
          proposalType === 'completa' ? `Formas de Pagamento e Crédito: ${condicoesPagto}` : null,
          proposalType === 'completa' ? `Garantia Contratual: ${garantia}` : null,
          banco ? `Agência e Crédito Bancário: ${banco} — Ag ${agencia} — Conta ${conta} (${tipoConta}) — PIX ${pix}` : null
        ].filter(Boolean);

        condLines.forEach(cl => {
          doc.text(`• ${cl}`, PAGE.marginL, y);
          y += 5;
        });
        y += 4;
      }

      // Declarations Embutidas
      const selectedEmbeds = Object.entries(embedsChecked).filter(([_, v]) => v).map(([k]) => k);
      if (selectedEmbeds.length > 0 || customEmbeds.length > 0) {
        if (y > 235) { doc.addPage(); y = PAGE.marginT; }
        y = drawSecTitle(doc, 'DECLARAÇÕES E ANEXOS COMPLEMENTARES', y);
        doc.setFont('times', 'italic');
        doc.setFontSize(10);
        doc.text('Anexamos à nossa proposta comercial as seguintes garantias corporativas sob responsabilidade legal:', PAGE.marginL, y);
        y += 6;

        let indexClause = 1;
        selectedEmbeds.forEach((k) => {
          const dec = (PROP_EMBEDS as any)[k];
          if (y > 255) { doc.addPage(); y = PAGE.marginT; }
          doc.setFont('times', 'bold');
          doc.text(`${indexClause++}. ${dec.titulo}`, PAGE.marginL, y);
          y += 4.5;
          doc.setFont('times', 'normal');
          y = writeJustifiedText(doc, dec.corpo(docData), doc, y, PAGE.usableW);
          y += 3;
        });

        // custom ones
        customEmbeds.forEach((c) => {
          if (!c.titulo || !c.texto) return;
          if (y > 255) { doc.addPage(); y = PAGE.marginT; }
          doc.setFont('times', 'bold');
          doc.text(`${indexClause++}. ${c.titulo.toUpperCase()}`, PAGE.marginL, y);
          y += 4.5;
          doc.setFont('times', 'normal');
          y = writeJustifiedText(doc, c.texto, doc, y, PAGE.usableW);
          y += 3;
        });
      }

      // Signatures Bottom
      y += 12;
      if (y > 250) { doc.addPage(); y = PAGE.marginT + 12; }
      doc.setFont('times', 'normal');
      doc.setFontSize(10.5);
      doc.text(`${cidade || 'Arroio do Sal/RS'}, ${docData.data}.`, PAGE.marginL, y);
      y += 24;

      const sigW = 80;
      const sigX = (210 - sigW) / 2;
      doc.setDrawColor(180);
      doc.line(sigX, y, sigX + sigW, y);
      y += 5;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(propCompany.rep_nome || '[Representante]', 105, y, { align: 'center' });
      y += 4.5;
      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.text(`${propCompany.rep_cargo || ''} — CPF: ${propCompany.rep_cpf || ''}`, 105, y, { align: 'center' });
      y += 4.5;
      doc.text(propCompany.razao_social || '[Razão Social]', 105, y, { align: 'center' });

      // Page numbers footer
      const numTotalPages = (doc.internal as any).getNumberOfPages();
      for (let pageIdx = 1; pageIdx <= numTotalPages; pageIdx++) {
        doc.setPage(pageIdx);
        doc.setFont('times', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`${mainTitle} — ${propCompany.razao_social || ''}`, 105, 297 - 12, { align: 'center' });
        doc.text(`Página ${pageIdx} de ${numTotalPages}`, 210 - PAGE.marginR, 297 - 12, { align: 'right' });
        doc.setTextColor(0);
      }

      const formattedName = (propCompany.razao_social || 'Firma').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Proposta_${proposalType}_${formattedName}.pdf`);
      showToast('Documento de Proposta baixado com sucesso!');
    } catch (e: any) {
      console.error(e);
      showToast('Erro ao criar arquivo PDF da proposta: ' + e.message, true);
    }
  };

  const drawSecTitle = (doc: jsPDF, title: string, y: number) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(140, 100, 60);
    doc.text(title, 20, y);
    doc.setTextColor(0);
    y += 2;
    doc.setDrawColor(210, 170, 120);
    doc.setLineWidth(0.4);
    doc.line(20, y, 190, y);
    y += 5;
    return y;
  };

  const writeJustifiedText = (doc: jsPDF, text: string, documentRef: any, y: number, width: number) => {
    const paragraphs = text.split('\n');
    paragraphs.forEach((p) => {
      if (p.trim() === '') { y += 4; return; }
      const lines = doc.splitTextToSize(p, width);
      lines.forEach((ln, idx) => {
        if (y > 275) { doc.addPage(); y = 20; }
        if (idx === lines.length - 1 || lines.length === 1) {
          doc.text(ln, 20, y);
        } else {
          const words = ln.split(' ').filter(w => w);
          if (words.length > 1) {
            const sumW = words.reduce((acc, w) => acc + doc.getTextWidth(w), 0);
            const eachSpace = (width - sumW) / (words.length - 1);
            let cx = 20;
            words.forEach((word) => {
              doc.text(word, cx, y);
              cx += doc.getTextWidth(word) + eachSpace;
            });
          } else {
            doc.text(ln, 20, y);
          }
        }
        y += 5.5;
      });
      y += 2.5;
    });
    return y;
  };

  const formatarData = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const [y, m, d] = parts;
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
  };

  return (
    <div className="space-y-8 text-[#e8ebf0]">
      {/* Type Selection header */}
      <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl">
        <h3 className="text-sm uppercase font-mono tracking-widest text-[#d4a574] mb-3">Selecione o Escopo da Proposta</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setProposalType('preco')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              proposalType === 'preco'
                ? 'bg-[rgba(212,165,116,0.08)] border-[#d4a574]'
                : 'bg-[#232a3d]/50 border-[#2d3548] hover:border-[#8a6d4a]'
            }`}
          >
            <div className="font-serif font-bold text-sm text-[#e8ebf0]">Proposta de Preços</div>
            <div className="text-[11px] text-[#8892a6] mt-1">Cabeçalho, planilha de precificação detalhada e dados bancários.</div>
          </button>
          
          <button
            type="button"
            onClick={() => setProposalType('tecnica')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              proposalType === 'tecnica'
                ? 'bg-[rgba(212,165,116,0.08)] border-[#d4a574]'
                : 'bg-[#232a3d]/50 border-[#2d3548] hover:border-[#8a6d4a]'
            }`}
          >
            <div className="font-serif font-bold text-sm text-[#e8ebf0]">Proposta Técnica</div>
            <div className="text-[11px] text-[#8892a6] mt-1">Metodologias, cronogramas operacionais, qualificações e atestados.</div>
          </button>
          
          <button
            type="button"
            onClick={() => setProposalType('completa')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              proposalType === 'completa'
                ? 'bg-[rgba(212,165,116,0.08)] border-[#d4a574]'
                : 'bg-[#232a3d]/50 border-[#2d3548] hover:border-[#8a6d4a]'
            }`}
          >
            <div className="font-serif font-bold text-sm text-[#e8ebf0]">Comercial e Técnica Completa</div>
            <div className="text-[11px] text-[#8892a6] mt-1">Junção de memorial descritivo, planilhas de custos e garantias.</div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: IDENTIFICATIONS */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex border-b border-[#2d3548] pb-3 mb-2 justify-between items-center">
              <h3 className="font-serif font-bold text-md text-[#d4a574] flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>Empresa Proponente</span>
              </h3>
              <button
                type="button"
                onClick={handlePropsCopy}
                className="text-[11px] bg-[#232a3d] border border-[#2d3548] hover:border-[#d4a574] text-[#d4a574] px-2.5 py-1 rounded transition-all cursor-pointer font-semibold"
              >
                Copiar das Declarações
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <select
                  value={selectedCompanyKey}
                  onChange={(e) => setSelectedCompanyKey(e.target.value)}
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                >
                  <option value="">— Selecione uma Empresa Salva —</option>
                  {companies.map((c) => {
                    const key = 'empresa:' + c.razao_social.replace(/[\s/\\'"]/g, '_');
                    return (
                      <option key={key} value={key}>{c.razao_social}</option>
                    );
                  })}
                </select>
              </div>
              <button
                type="button"
                onClick={handleCnpjLookup}
                className="bg-[#2d3548] hover:bg-[#232a3d] border border-[#2d3548] text-xs font-semibold py-1 rounded-lg text-[#d4a574] cursor-pointer"
              >
                Buscar CNPJ
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] uppercase text-[#8892a6]">Razão Social</label>
                <input
                  type="text"
                  value={propCompany.razao_social || ''}
                  onChange={(e) => setPropCompany(p => ({ ...p, razao_social: e.target.value }))}
                  placeholder="Nome corporativo oficial"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6]">CNPJ</label>
                  <input
                    type="text"
                    value={propCompany.cnpj || ''}
                    onChange={(e) => setPropCompany(p => ({ ...p, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6]">Inscrição Estadual (IE)</label>
                  <input
                    type="text"
                    value={propCompany.ie || ''}
                    onChange={(e) => setPropCompany(p => ({ ...p, ie: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase text-[#8892a6]">Endereço</label>
                <input
                  type="text"
                  value={propCompany.endereco || ''}
                  onChange={(e) => setPropCompany(p => ({ ...p, endereco: e.target.value }))}
                  placeholder="Rua, Número, Bairro, CEP"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6]">Telefone</label>
                  <input
                    type="text"
                    value={propCompany.telefone || ''}
                    onChange={(e) => setPropCompany(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6]">E-mail Comercial</label>
                  <input
                    type="text"
                    value={propCompany.email || ''}
                    onChange={(e) => setPropCompany(p => ({ ...p, email: e.target.value }))}
                    placeholder="comercial@empresa.com"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-[#2d3548] pt-3">
                <span className="text-[10px] font-mono tracking-widest text-[#d4a574] uppercase block mb-2">Representante da Proposta</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6]">Nome</label>
                    <input
                      type="text"
                      value={propCompany.rep_nome || ''}
                      onChange={(e) => setPropCompany(p => ({ ...p, rep_nome: e.target.value }))}
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6]">Cargo</label>
                    <input
                      type="text"
                      value={propCompany.rep_cargo || ''}
                      onChange={(e) => setPropCompany(p => ({ ...p, rep_cargo: e.target.value }))}
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Scope fields (only on tech or full) */}
          {(proposalType === 'tecnica' || proposalType === 'completa') && (
            <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4 animate-fade-in">
              <h3 className="font-serif font-bold text-md text-[#d4a574] border-b border-[#2d3548] pb-3 mb-2 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                <span>Textos Técnicos e Memorial Descritivo</span>
              </h3>
              
              <div>
                <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">
                  Detalhamento de Escopo / Objeto da Solução
                </label>
                <textarea
                  value={tecnicaObjeto}
                  onChange={(e) => setTecnicaObjeto(e.target.value)}
                  placeholder="Descreva a qualidade e modelo dos serviços prestados..."
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-xs text-[#e8ebf0] focus:outline-none h-20"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">
                  Metodologias Aplicadas / Plano de Trabalho
                </label>
                <textarea
                  value={metodologia}
                  onChange={(e) => setMetodologia(e.target.value)}
                  placeholder="Quais métodos, padrões e boas práticas serão adotadas para gerenciar..."
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-xs text-[#e8ebf0] focus:outline-none h-20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">Cronograma de Fases</label>
                  <textarea
                    value={cronograma}
                    onChange={(e) => setCronograma(e.target.value)}
                    placeholder="Fase 1: 10 dias..."
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-xs text-[#e8ebf0] focus:outline-none h-16"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">Atestações & Qualificações</label>
                  <textarea
                    value={qualificacoes}
                    onChange={(e) => setQualificacoes(e.target.value)}
                    placeholder="Certificados ISO, acordos e atestados de acervo..."
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-xs text-[#e8ebf0] focus:outline-none h-16"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ITEMS PRICING & CONDITIONS */}
        <div className="lg:col-span-6 space-y-6">
          {(proposalType === 'preco' || proposalType === 'completa') && (
            <>
              {/* Proposal items card */}
              <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
                <div className="flex border-b border-[#2d3548] pb-3 mb-2 justify-between items-center">
                  <h3 className="font-serif font-bold text-md text-[#d4a574] flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>Planilha de Preços</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={itemsMode}
                      onChange={(e) => setItemsMode(e.target.value as any)}
                      className="bg-[#232a3d] border border-[#2d3548] rounded px-2.5 py-1 text-xs text-[#e8ebf0] focus:outline-none"
                    >
                      <option value="simples">Simples (4 colunas)</option>
                      <option value="completo">Completo (8 colunas)</option>
                    </select>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs p-1 px-2.5 rounded-lg transition-all cursor-pointer"
                    >
                      + Item
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto space-y-2.5 max-h-[300px] pr-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-4 bg-[#232a3d] border border-[#2d3548] rounded-xl relative space-y-3">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="absolute top-2.5 right-2 text-xs text-red-400 hover:text-red-300 font-bold px-2 cursor-pointer"
                        title="Deletar Item"
                      >
                        Remover
                      </button>

                      {itemsMode === 'completo' && (
                        <div className="grid grid-cols-4 gap-2 pt-2 pr-12">
                          <div>
                            <label className="block text-[10px] text-[#8892a6] uppercase">Item</label>
                            <input
                              type="text"
                              value={item.item || (idx + 1).toString()}
                              onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                              className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#8892a6] uppercase">Código</label>
                            <input
                              type="text"
                              value={item.codigo || ''}
                              onChange={(e) => handleItemChange(idx, 'codigo', e.target.value)}
                              className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#8892a6] uppercase">Marca</label>
                            <input
                              type="text"
                              value={item.marca || ''}
                              onChange={(e) => handleItemChange(idx, 'marca', e.target.value)}
                              className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#8892a6] uppercase">Unid.</label>
                            <input
                              type="text"
                              value={item.unidade || 'UN'}
                              onChange={(e) => handleItemChange(idx, 'unidade', e.target.value)}
                              className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div className={itemsMode === 'completo' ? '' : 'pt-2'}>
                        <label className="block text-[10px] text-[#8892a6] uppercase">Descrição do Fornecimento / Escopo</label>
                        <textarea
                          value={item.descricao}
                          onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                          placeholder="Digite aqui o memorial do material/serviço..."
                          className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:outline-none h-12"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#8892a6] uppercase">Tipo de Preço</label>
                          <select
                            value={item.tipoCalculo}
                            onChange={(e) => handleItemChange(idx, 'tipoCalculo', e.target.value as any)}
                            className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none height-[26px]"
                          >
                            <option value="qtd">Qtd x Unit.</option>
                            <option value="mensal">Qtd x Meses</option>
                            <option value="fechado">Valor Único</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#8892a6] uppercase">
                            {item.tipoCalculo === 'fechado' ? 'Quantidade' : 'Qtd/Meses'}
                          </label>
                          <input
                            type="text"
                            disabled={item.tipoCalculo === 'fechado'}
                            value={item.tipoCalculo === 'fechado' ? '—' : (item.qtd || '1')}
                            onChange={(e) => handleItemChange(idx, 'qtd', e.target.value)}
                            className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none disabled:opacity-40"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#8892a6] uppercase">Valor Unitário (R$)</label>
                          <input
                            type="text"
                            value={item.unitario}
                            onChange={(e) => handleItemChange(idx, 'unitario', e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none font-semibold text-[#7cb380]"
                          />
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-[#8892a6]">
                        <span>Subtotal: </span>
                        <strong className="text-[#d4a574]">
                          R$ {getLineTotal(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#232a3d] border border-[#2d3548] rounded-xl flex justify-between items-center text-sm font-semibold">
                  <span className="text-[#8892a6]">VALOR TOTAL ESTIMADO:</span>
                  <span className="text-[#d4a574] text-lg font-bold font-mono">
                    R$ {getProposalTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Conditions of Payment */}
              <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
                <h3 className="font-serif font-bold text-md text-[#d4a574] border-b border-[#2d3548] pb-3 mb-2 flex items-center gap-1.5">
                  <Archive className="w-4 h-4" />
                  <span>Condições Comercias da Proposta</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Validade da Proposta</label>
                    <input
                      type="text"
                      value={validade}
                      onChange={(e) => setValidade(e.target.value)}
                      placeholder="Ex: 60 dias"
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Prazo de Entrega/Execução</label>
                    <input
                      type="text"
                      value={prazoEntrega}
                      onChange={(e) => setPrazoEntrega(e.target.value)}
                      placeholder="Ex: 30 dias úteis"
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                    />
                  </div>
                </div>

                {proposalType === 'completa' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Condições de Pagamento</label>
                      <input
                        type="text"
                        value={condicoesPagto}
                        onChange={(e) => setCondicoesPagto(e.target.value)}
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Garantia Técnica</label>
                      <input
                        type="text"
                        value={garantia}
                        onChange={(e) => setGarantia(e.target.value)}
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] uppercase text-[#8892a6] mb-1">Observações Internas ou Notas</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Inclua restrições, ressalvas de preços, impostos etc..."
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none h-14 animate-fade-in"
                  />
                </div>

                <div className="border-t border-[#2d3548] pt-3">
                  <span className="text-[10px] font-mono tracking-widest text-[#d4a574] uppercase block mb-3">Linha de Crédito e Dados Bancários</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase text-[#8892a6]">Banco</label>
                      <input
                        type="text"
                        value={banco}
                        onChange={(e) => setBanco(e.target.value)}
                        placeholder="Ex: Banco do Brasil (001)"
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase text-[#8892a6]">Agência</label>
                      <input
                        type="text"
                        value={agencia}
                        onChange={(e) => setAgencia(e.target.value)}
                        placeholder="0000-0"
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-[11px] uppercase text-[#8892a6]">Conta</label>
                      <input
                        type="text"
                        value={conta}
                        onChange={(e) => setConta(e.target.value)}
                        placeholder="00000-0"
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase text-[#8892a6]">Chave PIX</label>
                      <input
                        type="text"
                        value={pix}
                        onChange={(e) => setPix(e.target.value)}
                        placeholder="CNPJ, Celular ou E-mail"
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-1.5 text-xs text-[#e8ebf0] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Embedded declarations inside proposal */}
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
            <div className="border-b border-[#2d3548] pb-3 mb-2 flex justify-between items-center">
              <h3 className="font-serif font-bold text-md text-[#d4a574] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Declarações Embutidas</span>
              </h3>
              <span className="text-[10px] uppercase font-mono text-[#8892a6]">Opcional</span>
            </div>

            <p className="text-xs text-[#8892a6] italic">
              Selecione as declarações padrão ou adicione específicas corporativas diretamente no corpo de sua proposta final.
            </p>

            <div className="space-y-2">
              {Object.entries(PROP_EMBEDS).map(([k, d]) => (
                <label key={k} className="flex items-start gap-3 p-3 bg-[#232a3d]/50 hover:bg-[#232a3d] border border-[#2d3548] rounded-lg cursor-pointer select-none text-left transition-colors">
                  <input
                    type="checkbox"
                    checked={embedsChecked[k] || false}
                    onChange={(e) => setEmbedsChecked(prev => ({ ...prev, [k]: e.target.checked }))}
                    className="rounded accent-[#d4a574] w-4 h-4 mt-0.5"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-[#d4a574]">{d.titulo}</h5>
                    <p className="text-[10px] text-[#8892a6] mt-0.5 leading-relaxed">
                      Insere a cláusula de aceitação de responsabilidade civil antes da assinatura.
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Custom embeds */}
            <div className="border-t border-[#2d3548] pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8892a6] font-semibold">Exigências Especiais de Declaração</span>
                <button
                  type="button"
                  onClick={addPropCustomDec}
                  className="py-1 px-2.5 bg-[#232a3d] border border-[#2d3548] hover:border-[#d4a574] text-[10px] text-[#d4a574] rounded transition-all cursor-pointer font-bold"
                >
                  + Customizar Cláusula
                </button>
              </div>

              <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                {customEmbeds.map((c) => (
                  <div key={c.id} className="p-3 bg-[#232a3d] border border-[#2d3548] rounded-xl relative space-y-2">
                    <button
                      onClick={() => removePropCustomDec(c.id)}
                      className="absolute top-2.5 right-2.5 text-[#8892a6] hover:text-red-400 p-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="pr-6">
                      <input
                        type="text"
                        value={c.titulo}
                        onChange={(e) => handleCustomChange(c.id, 'titulo', e.target.value)}
                        placeholder="Nome da cláusula (Visita, conformidade etc.)"
                        className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none"
                      />
                    </div>
                    <div>
                      <textarea
                        value={c.texto}
                        onChange={(e) => handleCustomChange(c.id, 'texto', e.target.value)}
                        placeholder="Escreva a responsabilidade no primeiro parágrafo..."
                        className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:outline-none h-14"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="p-6 bg-[#1a2030] border border-[#2d3548] rounded-xl shadow-xl">
            <button
              onClick={generateProposalPDF}
              className="w-full py-3.5 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold uppercase tracking-wider rounded-lg text-sm shadow-xl transition-all cursor-pointer"
            >
              Emitir Proposta em PDF Oficial
            </button>
          </div>
        </div>

      </div>

      {/* SEÇÃO DE ANÁLISE DE EDITAL COM IA */}
      <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-6 mt-8">
        <div className="flex border-b border-[#2d3548] pb-3 mb-2 justify-between items-center flex-wrap gap-2">
          <h3 className="font-serif font-bold text-md text-[#d4a574] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#d4a574]" />
            <span>Análise de Edital com IA</span>
          </h3>
          <span className="text-[10px] uppercase font-mono text-[#8892a6]">Powered by GPT-4o</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase text-[#8892a6] mb-1.5">Texto do Edital para Inspecionar</label>
            <textarea
              value={editalText}
              onChange={(e) => setEditalText(e.target.value)}
              placeholder="Cole o texto bruto do edital aqui (ou carregue o arquivo PDF no topo da página para extração automática)..."
              className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2.5 text-xs text-[#e8ebf0] focus:outline-none h-44 resize-y leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAiAnalysis}
              disabled={analyzing || !editalText.trim()}
              className="px-5 py-2.5 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#0f1419] border-t-transparent rounded-full animate-spin"></div>
                  <span>Inspecionando Edital...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Analisar Edital com IA</span>
                </>
              )}
            </button>
            {analysisResult && (
              <button
                type="button"
                onClick={handleApplyAiData}
                className="px-5 py-2.5 bg-[#232a3d] border border-[#2d3548] hover:border-[#d4a574] text-[#d4a574] text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Prazos e Garantias</span>
              </button>
            )}
          </div>
        </div>

        {/* RESULTADOS DA ANÁLISE */}
        {analysisResult && (
          <div className="bg-[#232a3d]/45 border border-[#d4a574]/20 rounded-xl p-5 space-y-4 animate-fade-in text-xs leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="md:col-span-2 bg-[#1a2030]/60 p-3.5 rounded-lg border border-[#2d3548]">
                <h4 className="text-[10px] uppercase font-mono text-[#d4a574] font-bold mb-1">Objeto do Contrato / Edital</h4>
                <p className="text-[#e8ebf0]">{analysisResult.objeto}</p>
              </div>

              <div className="bg-[#1a2030]/60 p-3.5 rounded-lg border border-[#2d3548]">
                <h4 className="text-[10px] uppercase font-mono text-[#d4a574] font-bold mb-1">Prazo de Entrega / Execução</h4>
                <p className="text-[#e8ebf0]">{analysisResult.prazo_entrega}</p>
              </div>

              <div className="bg-[#1a2030]/60 p-3.5 rounded-lg border border-[#2d3548]">
                <h4 className="text-[10px] uppercase font-mono text-[#d4a574] font-bold mb-1">Exigência de Garantias</h4>
                <p className="text-[#e8ebf0]">{analysisResult.garantias}</p>
              </div>

              <div className="bg-[#1a2030]/60 p-3.5 rounded-lg border border-[#2d3548]">
                <h4 className="text-[10px] uppercase font-mono text-[#d4a574] font-bold mb-1">Exigências de Habilitação Técnica</h4>
                {Array.isArray(analysisResult.exigencias_habilitacao) ? (
                  <ul className="list-disc pl-4 space-y-1 text-[#e8ebf0] mt-1">
                    {analysisResult.exigencias_habilitacao.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#e8ebf0]">{analysisResult.exigencias_habilitacao}</p>
                )}
              </div>

              <div className="bg-[#1a2030]/60 p-3.5 rounded-lg border border-red-950/20 bg-red-950/5">
                <h4 className="text-[10px] uppercase font-mono text-red-400 font-bold mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span>Cláusulas de Risco / Restrições Severas</span>
                </h4>
                <p className="text-red-200/90">{analysisResult.riscos}</p>
              </div>

            </div>
            
            <div className="border-t border-[#2d3548] pt-3 text-[10px] text-[#8892a6] font-mono flex items-center gap-1.5 justify-end">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Análise gravada automaticamente na licitação do banco de dados.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
