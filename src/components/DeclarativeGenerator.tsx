import React, { useState, useEffect, useRef } from 'react';
import { Company, Orgao } from '../types';
import { apiFetchCompanies, apiSaveCompany, apiDeleteCompany } from '../lib/db';
import { validarCNPJ } from '../lib/utils';
import { jsPDF } from 'jspdf';
import { 
  Building2, Search, FileText, Check, Plus, Trash2, 
  User, Compass, MapPin, Calendar, HelpCircle, AlertCircle, Sparkles, AlertTriangle
} from 'lucide-react';

interface DeclarativeGeneratorProps {
  companies: Company[];
  onRefreshCompanies: () => void;
  // Shared bidirectional bidding values
  orgao: string;
  setOrgao: (v: string) => void;
  modalidade: string;
  setModalidade: (v: string) => void;
  edital: string;
  setEdital: (v: string) => void;
  objeto: string;
  setObjeto: (v: string) => void;
  cidade: string;
  setCidade: (v: string) => void;
  dataAssinatura: string;
  setDataAssinatura: (v: string) => void;
  showToast: (msg: string, isError?: boolean) => void;
}

interface CustomDec {
  id: string;
  titulo: string;
  texto: string;
}

// 17 Standard Declarations based on specifications
const DECLARATIONS = [
  {
    id: 'menor',
    title: '1. Não Emprego de Menor (Art. 7º, XXXIII CF)',
    desc: 'Não emprega menor de 18 anos em trabalho noturno/perigoso/insalubre, nem menor de 16 (exceto aprendiz a partir de 14).',
    body: (d: any) => `DECLARAÇÃO DE CUMPRIMENTO DO ART. 7º, INCISO XXXIII DA CONSTITUIÇÃO FEDERAL\n\n` +
      `A empresa ${d.razao_social}, inscrita no CNPJ sob o nº ${d.cnpj}, com sede em ${d.endereco}, por intermédio de seu representante legal o(a) Sr.(a) ${d.rep_nome}, portador(a) do RG nº ${d.rep_rg} e do CPF nº ${d.rep_cpf}, DECLARA, para fins do disposto no inciso V do art. 27 da Lei nº 8.666/93 e art. 68 da Lei nº 14.133/2021, acrescido pela Lei nº 9.854, de 27 de outubro de 1999, que não emprega menor de dezoito anos em trabalho noturno, perigoso ou insalubre e não emprega menor de dezoito anos na condição de aprendiz, salvo a partir de quatorze anos.\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.\n` +
      `Objeto: ${d.objeto}.`,
    bodyConsolidado: (d: any) => `Declara, para fins do disposto no inciso V do art. 27 da Lei nº 8.666/93 e art. 68 da Lei nº 14.133/2021, que não emprega menor de dezoito anos em trabalho noturno, perigoso ou insalubre e não emprega menor de dezesseis anos, salvo na condição de aprendiz, a partir de quatorze anos.`
  },
  {
    id: 'idoneidade',
    title: '2. Idoneidade / Inexistência de Fato Impeditivo',
    desc: 'Declara, sob as penas da lei, não estar suspensa, impedida ou inidônea por qualquer órgão da Administração Pública.',
    body: (d: any) => `DECLARAÇÃO DE IDONEIDADE E INEXISTÊNCIA DE FATO IMPEDITIVO\n\n` +
      `A empresa ${d.razao_social}, inscrita no CNPJ sob o nº ${d.cnpj}, com sede em ${d.endereco}, por seu representante legal ${d.rep_nome}, CPF nº ${d.rep_cpf}, DECLARA, sob as penas da lei, que:\n\n` +
      `a) não foi declarada inidônea para licitar ou contratar com a Administração Pública direta ou indireta, em qualquer esfera federativa;\n\n` +
      `b) não está suspensa temporariamente nem impedida de licitar e contratar com qualquer órgão ou entidade da Administração Pública;\n\n` +
      `c) inexistem fatos supervenientes impeditivos para sua habilitação no presente certame, ciente da obrigatoriedade de declarar ocorrências posteriores nos termos do art. 63, §1º, da Lei nº 14.133/2021;\n\n` +
      `d) não se encontra em processo de falência, dissolução ou liquidação, ressalvado o disposto quanto à recuperação judicial nos termos da Lei nº 11.101/2005.\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.`,
    bodyConsolidado: (d: any) => `Declara, sob as penas da lei, que: (a) não foi declarada inidônea para licitar ou contratar com a Administração Pública direta ou indireta, em qualquer esfera federativa; (b) não está suspensa temporariamente nem impedida de licitar e contratar com qualquer órgão ou entidade da Administração Pública; (c) inexistem fatos supervenientes impeditivos para sua habilitação no presente certame, ciente da obrigatoriedade de declarar ocorrências posteriores nos termos do art. 63, §1º, da Lei nº 14.133/2021; (d) não se encontra em processo de falência, dissolução ou liquidação, ressalvado o disposto quanto à recuperação judicial nos termos da Lei nº 11.101/2005.`
  },
  {
    id: 'sicaf',
    title: '3. Inexistência de Sanções em Cadastros Nacionais',
    desc: 'Declara não possuir registros impeditivos no SICAF, CEIS, CNEP ou CNIA do CNJ.',
    body: (d: any) => `DECLARAÇÃO DE INEXISTÊNCIA DE SANÇÕES EM CADASTROS NACIONAIS\n\n` +
      `A empresa ${d.razao_social}, inscrita no CNPJ sob o nº ${d.cnpj}, por seu representante legal ${d.rep_nome}, CPF nº ${d.rep_cpf}, DECLARA, sob as penas da lei, que não possui registros impeditivos ou sanções ativas que vedem a sua participação em licitações nos seguintes cadastros:\n\n` +
      `a) Sistema de Cadastramento Unificado de Fornecedores – SICAF;\n\n` +
      `b) Cadastro Nacional de Empresas Inidôneas e Suspensas – CEIS;\n\n` +
      `c) Cadastro Nacional de Empresas Punidas – CNEP;\n\n` +
      `d) Cadastro Nacional de Condenações Cíveis por Ato de Improbidade Administrativa e Inelegibilidade – CNIA (CNJ).\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.`,
    bodyConsolidado: (d: any) => `Declara, sob as penas da lei, que não possui registros impeditivos ou sanções ativas que vedem a sua participação em licitações ou a sua contratação pela Administração Pública nos seguintes cadastros: (a) SICAF; (b) CEIS; (c) CNEP (Lei nº 12.846/2013); (d) CNIA (CNJ).`
  },
  {
    id: 'meepp',
    title: '4. Enquadramento ME / EPP (LC 123/2006)',
    desc: 'Declara enquadramento como Microempresa ou Empresa de Pequeno Porte para fins tributários diferenciados.',
    body: (d: any) => {
      let enquadramento = d.porte === 'ME'
        ? `(X) é Microempresa (ME), conforme o art. 3º, inciso I, da LC 123/2006;\n(  ) é Empresa de Pequeno Porte (EPP), conforme o art. 3º, inciso II, da LC 123/2006;`
        : d.porte === 'EPP'
          ? `(  ) é Microempresa (ME), conforme o art. 3º, inciso I, da LC 123/2006;\n(X) é Empresa de Pequeno Porte (EPP), conforme o art. 3º, inciso II, da LC 123/2006;`
          : `(  ) é Microempresa (ME), conforme o art. 3º, inciso I, da LC 123/2006;\n(  ) é Empresa de Pequeno Porte (EPP), conforme o art. 3º, inciso II, da LC 123/2006;`;
      return `DECLARAÇÃO DE ENQUADRAMENTO COMO MICROEMPRESA OU EMPRESA DE PEQUENO PORTE\n\n` +
        `A empresa ${d.razao_social}, inscrita no CNPJ sob o nº ${d.cnpj}, por intermédio de seu representante legal ${d.rep_nome}, CPF nº ${d.rep_cpf}, DECLARA, para os fins do disposto na Lei Complementar nº 123/2006, que:\n\n` +
        enquadramento + `\n\n` +
        `Declara, ainda, que está apta a usufruir do tratamento diferenciado estabelecido nos artigos 42 a 49 da referida Lei Complementar, não se enquadrando em nenhuma das exclusões relacionadas no § 4º do art. 3º da LC 123/2006.\n\n` +
        `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.`;
    },
    bodyConsolidado: (d: any) => {
      const pText = d.porte === 'ME' 
        ? 'enquadra-se como MICROEMPRESA (ME), nos termos do art. 3º, inciso I, da Lei Complementar nº 123/2006'
        : d.porte === 'EPP'
          ? 'enquadra-se como EMPRESA DE PEQUENO PORTE (EPP), nos termos do art. 3º, inciso II, da Lei Complementar nº 123/2006'
          : 'enquadra-se como ME ou EPP nos termos da Lei Complementar nº 123/2006';
      return `Declara, para os fins da Lei Complementar nº 123/2006, que ${pText}, estando apta a usufruir do tratamento diferenciado estabelecido nos artigos 42 a 49 da referida Lei, não incorrendo em nenhum impeditivo legal.`;
    },
    requiresContador: true
  },
  {
    id: 'habilitacao',
    title: '5. Pleno Cumprimento dos Requisitos de Habilitação',
    desc: 'Declara cumprir todos os requisitos habilitórios (jurídicos, fiscais, trabalhistas, técnicos).',
    body: (d: any) => `DECLARAÇÃO DE PLENO CUMPRIMENTO DOS REQUISITOS DE HABILITAÇÃO\n\n` +
      `A empresa ${d.razao_social}, inscrita no CNPJ sob o nº ${d.cnpj}, por seu representante legal ${d.rep_nome}, CPF nº ${d.rep_cpf}, DECLARA que cumpre plenamente todos os requisitos de habilitação jurídica, fiscal, social, trabalhista e técnica exigidos para o certame do ${d.modalidade} nº ${d.edital}.\n\n` +
      `Órgão: ${d.orgao}.\n` +
      `Objeto: ${d.objeto}.`,
    bodyConsolidado: (d: any) => `Declara, em atendimento ao previsto no art. 63, I, da Lei nº 14.133/2021 (e/ou art. 4º, VII, da Lei nº 10.520/2002), que cumpre plenamente todos os requisitos de habilitação jurídica, fiscal, social, trabalhista e técnica exigidos.`
  },
  {
    id: 'cumprimento',
    title: '6. Conhecimento e Cumprimento do Edital',
    desc: 'Declara plena ciência das regras e anexos convocatórios, assumindo suas obrigações.',
    body: (d: any) => `DECLARAÇÃO DE CONHECIMENTO E ACEITAÇÃO DO EDITAL\n\n` +
      `A empresa ${d.razao_social}, inscrita no CNPJ sob o nº ${d.cnpj}, por seu representante legal ${d.rep_nome}, DECLARA, para todos os fins, que tem amplo conhecimento de todos os termos e condições convocatórias do ${d.modalidade} nº ${d.edital}, do(a) ${d.orgao}, aceitando-as integralmente.`,
    bodyConsolidado: (d: any) => `Declara que recebeu, analisou e tem pleno conhecimento de todos os termos do edital e anexos, aceitando de forma irrestrita os requisitos e regras estipuladas.`
  },
  {
    id: 'quantitativos',
    title: '7. Ciência dos Limites Quantitativos e Lotes',
    desc: 'Declara pleno conhecimento e aceitação das quantidades mínimas e máximas de fornecimento.',
    body: (d: any) => `DECLARAÇÃO DE CIÊNCIA DOS LIMITES QUANTITATIVOS\n\n` +
      `A empresa ${d.razao_social}, inscrita no CNPJ sob o nº ${d.cnpj}, por seu representante legal ${d.rep_nome}, DECLARA integral ciência e capacidade operacional para atender aos limites quantitativos estipulados no ${d.modalidade} nº ${d.edital}.`,
    bodyConsolidado: (d: any) => `Declara que possui plena ciência e capacidade operacional, técnica e econômica para atender aos limites quantitativos mínimos e máximos previstos no termo de referência do certame.`
  },
  {
    id: 'elaboracao',
    title: '8. Elaboração Independente da Proposta',
    desc: 'Declara que a proposta foi formulada autonomamente, sem qualquer acordo ou cartelização.',
    body: (d: any) => `DECLARAÇÃO DE ELABORAÇÃO INDEPENDENTE DA PROPOSTA\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, por seu representante legal ${d.rep_nome}, DECLARA, sob as penas do art. 299 do Código Penal, que a proposta econômica foi elaborada de maneira totalmente independente, livre de qualquer cartelização, conluio ou influência mútua com terceiros.`,
    bodyConsolidado: (d: any) => `Declara, sob as penas da lei (art. 299 do CP), que a proposta econômica foi formulada de maneira autônoma, sem conluio, cartelização ou qualquer combinação de preços ou vantagens com outros licitantes.`
  },
  {
    id: 'parentesco',
    title: '9. Inexistência de Parentesco com Agente Público',
    desc: 'Declara não haver dirigentes ou sócios com parentesco até 3º grau no corpo decisório do órgão.',
    body: (d: any) => `DECLARAÇÃO DE INEXISTÊNCIA DE PARENTESCO COM AGENTE PÚBLICO\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA que não possui em seu quadro gerencial, diretivo ou de sócios, parentes em linha reta, colateral ou por afinidade até o terceiro grau de funcionários com atuação decisória ou licitatória no(a) ${d.orgao}.`,
    bodyConsolidado: (d: any) => `Declara que não possui em seus cargos de gerência, conselho ou quadro societário, parentes consanguíneos ou afins até o terceiro grau de funcionários ou tomadores de decisões no processo licitatório correspondente.`
  },
  {
    id: 'vinculo',
    title: '10. Inexistência de Vínculo com a Administração',
    desc: 'Declara que os sócios e gerentes não são servidores públicos do órgão contratante.',
    body: (d: any) => `DECLARAÇÃO DE INEXISTÊNCIA DE VÍNCULO COM A ADMINISTRAÇÃO\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA que nenhum de seus sócios ou representantes possui vínculo empregatício público com o(a) ${d.orgao}, em obediência ao art. 14, III, da Lei nº 14.133/2021.`,
    bodyConsolidado: (d: any) => `Declara que nenhum de seus cotistas, diretores ou equipe técnica é integrante, servidor público ativo ou agente político nos quadros da instituição contratante.`
  },
  {
    id: 'reservado',
    title: '11. Cumprimento da Reserva de Cargos (PCD e Aprendiz)',
    desc: 'Declara cumprir as cotas de contratação de pessoas com deficiência e jovens aprendizes.',
    body: (d: any) => `DECLARAÇÃO DE CUMPRIMENTO DA RESERVA DE CARGOS\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA, em conformidade com o art. 63, IV, da Lei nº 14.133/2021, que cumpre perfeitamente as reservas legais de cargos para PCD (Lei nº 8.213/1991, art. 93) e aprendizes (CLT, art. 429).`,
    bodyConsolidado: (d: any) => `Declara que atende rigorosamente as cotas de reserva de vagas exigidas por lei para pessoas com deficiência (Art. 93 da Lei nº 8.213/91) e de jovens aprendizes (Art. 429 da CLT).`
  },
  {
    id: 'lgpd',
    title: '12. Conformidade com a LGPD',
    desc: 'Declara observância e conformidade com a Lei de Proteção de Dados (Lei 13.709/2018).',
    body: (d: any) => `DECLARAÇÃO DE ADERÊNCIA E CONFORMIDADE À LGPD\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA que age em plena consonância com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados), aplicando medidas robustas de segurança nos tratamentos de dados necessários à execução do objeto.`,
    bodyConsolidado: (d: any) => `Declara que atua em total conformidade com as exigências técnicas da Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018), adotando medidas razoáveis e eficazes para resguardar a privacidade e o sigilo de informações.`
  },
  {
    id: 'antitruste',
    title: '13. Inexistência de Práticas Anticoncorrenciais',
    desc: 'Declara não ter incorrido em sanções da Lei Anticorrupção ou cartel das Leis de Defesa Econômica.',
    body: (d: any) => `DECLARAÇÃO DE INEXISTÊNCIA DE CONDUTAS ANTICONCORRENCIAIS\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA que sua conduta mercantil se pauta pelas diretrizes da Lei nº 12.846/2013 (Lei Anticorrupção) e Lei nº 12.529/2011 (Defesa da Concorrência).`,
    bodyConsolidado: (d: any) => `Declara que não cometeu qualquer infração mercantil ou ato de corrupção tipificados na Lei nº 12.846/2013 ou na Lei nº 12.529/2011, agindo sob rígidos princípios de integridade e compliance.`
  },
  {
    id: 'trabescravo',
    title: '14. Não Utilização de Trabalho Escravo ou Infantil',
    desc: 'Declara que não utiliza mão de obra forçada, análoga à escravidão ou infantil em sua produção.',
    body: (d: any) => `DECLARAÇÃO NEGATIVA DE TRABALHO DEGRADANTE E INFANTIL\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA que não utiliza mão de obra submetida a trabalho forçado, degradante ou infantil em nenhum setor de sua produção ou prestação de suprimentos.`,
    bodyConsolidado: (d: any) => `Declara que repudia e não abriga trabalho escravo, degradante ou infantil em qualquer etapa de sua cadeia econômica, alinhando-se aos ditames legais vigentes.`
  },
  {
    id: 'eletronicos',
    title: '15. Veracidade de Documentos Eletrônicos',
    desc: 'Declara que todos os arquivos e comprovantes enviados via sistema são autênticos aos originais.',
    body: (d: any) => `DECLARAÇÃO DE VERACIDADE DE DOCUMENTOS DIGITAIS\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA que todos os arquivos por ela submetidos no sistema eletrônico para concorrer ao ${d.modalidade} nº ${d.edital} são fiéis aos originais.`,
    bodyConsolidado: (d: any) => `Declara, sob as sanções do art. 299 do Código Penal, a integral autenticidade, integridade e veracidade de todos os documentos e certidões anexadas eletronicamente na plataforma licitatória.`
  },
  {
    id: 'fiscalizacao',
    title: '16. Submissão à Fiscalização dos Órgãos de Controle',
    desc: 'Declara franquear acesso imediato a registros e auditorias contratuais por parte dos Tribunais.',
    body: (d: any) => `DECLARAÇÃO DE FISCALIZAÇÃO DOS ÓRGÃOS DE CONTROLE\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA sua submissão e cooperação com os órgãos de controle interno e externo da União, Estados e Municípios, franqueando-lhes todas as informações mercantis pedidas.`,
    bodyConsolidado: (d: any) => `Declara ciência e conformidade com o dever de responder, cooperar e franquear documentos fiscais e administrativos a inspeções dos sistemas de auditoria e Tribunais de Contas competentes.`
  },
  {
    id: 'exequibilidade',
    title: '17. Viabilidade Econômica e Exequibilidade da Proposta',
    desc: 'Declara que seus preços cobrem integralmente todos os insumos, impostos e custos sem subdimensionamento.',
    body: (d: any) => `DECLARAÇÃO DE EXEQUIBILIDADE E ECONOMICIDADE\n\n` +
      `A empresa ${d.razao_social}, CNPJ ${d.cnpj}, DECLARA que os preços inseridos em sua proposta comercial são exequíveis, prevendo exaustivamente impostos, contribuições e margem lucrativa viável.`,
    bodyConsolidado: (d: any) => `Declara que sua proposta de preços é integralmente exequível para a total satisfação do objeto contratado, cobrindo todos os custos materiais, de mão de obra, adicionais, tributos e sua devida margem comercial de forma estável.`
  }
];

export default function DeclarativeGenerator({
  companies,
  onRefreshCompanies,
  orgao, setOrgao,
  modalidade, setModalidade,
  edital, setEdital,
  objeto, setObjeto,
  cidade, setCidade,
  dataAssinatura, setDataAssinatura,
  showToast
}: DeclarativeGeneratorProps) {

  // Selected companies and form state
  const [selectedCompanyKey, setSelectedCompanyKey] = useState('');
  const [currentCompany, setCurrentCompany] = useState<Partial<Company>>({
    razao_social: '',
    cnpj: '',
    ie: '',
    endereco: '',
    rep_nome: '',
    rep_cpf: '',
    rep_cargo: '',
    rep_rg: '',
    porte: 'NAO',
    incluir_contador: false,
    cont_nome: '',
    cont_crc: '',
    cont_cpf: '',
    cont_escritorio: '',
    logo_data_url: null
  });

  const [selectedDecs, setSelectedDecs] = useState<string[]>([]);
  const [formato, setFormato] = useState<'consolidado' | 'separado'>('consolidado');
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [customDecs, setCustomDecs] = useState<CustomDec[]>([]);

  // Local Logo Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if company selection changes
  useEffect(() => {
    if (selectedCompanyKey) {
      const comp = companies.find(c => {
        const generatedKey = 'empresa:' + c.razao_social.replace(/[\s/\\'"]/g, '_');
        return generatedKey === selectedCompanyKey;
      });
      if (comp) {
        setCurrentCompany(comp);
      }
    } else {
      clearCompanyForm();
    }
  }, [selectedCompanyKey, companies]);

  const clearCompanyForm = () => {
    setCurrentCompany({
      razao_social: '',
      cnpj: '',
      ie: '',
      endereco: '',
      rep_nome: '',
      rep_cpf: '',
      rep_cargo: '',
      rep_rg: '',
      porte: 'NAO',
      incluir_contador: false,
      cont_nome: '',
      cont_crc: '',
      cont_cpf: '',
      cont_escritorio: '',
      logo_data_url: null
    });
  };

  const handleCnpjLookup = async () => {
    const numericCnpj = (currentCompany.cnpj || '').replace(/\D/g, '');
    if (numericCnpj.length !== 14) {
      showToast('Digite um CNPJ válido com 14 dígitos.', true);
      return;
    }

    if (!validarCNPJ(numericCnpj)) {
      showToast('CNPJ inválido (Dígito Verificador incorreto).', true);
      return;
    }

    setLoadingCnpj(true);
    showToast('Consultando CNPJ no banco de dados da Receita Federal...');
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numericCnpj}`);
      if (!res.ok) {
        throw new Error('Empresa não cadastrada ou limite de requisições BrasilAPI atingido.');
      }
      const data = await res.json();
      
      const enderecoPartes = [
        `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro || ''}`.trim(),
        data.numero ? `nº ${data.numero}` : '',
        data.complemento || '',
        data.bairro || '',
        data.municipio ? `${data.municipio}/${data.uf || ''}` : '',
        data.cep ? `CEP ${data.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}` : ''
      ].filter(Boolean).join(', ');

      const formattedCnpj = numericCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

      setCurrentCompany(prev => ({
        ...prev,
        razao_social: data.razao_social || '',
        endereco: enderecoPartes,
        cnpj: formattedCnpj,
        telefone: data.ddd_telefone_1 || '',
        email: (data.email || '').toLowerCase()
      }));
      showToast('CNPJ extraído e preenchido!');
    } catch (e: any) {
      showToast(e.message || 'Falha ao buscar CNPJ na API pública.', true);
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!currentCompany.razao_social) {
      showToast('Razão Social obrigatória para salvar.', true);
      return;
    }
    try {
      await apiSaveCompany(currentCompany as Company);
      showToast('Empresa gravada no banco com sucesso!');
      onRefreshCompanies();
    } catch (e: any) {
      showToast('Erro ao salvar no Supabase: ' + e.message, true);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompanyKey) {
      showToast('Selecione uma empresa antes de pedir sua exclusão.', true);
      return;
    }
    if (!confirm('Deseja excluir permanentemente este cadastro corporativo?')) return;
    try {
      const comp = companies.find(c => {
        const generatedKey = 'empresa:' + c.razao_social.replace(/[\s/\\'"]/g, '_');
        return generatedKey === selectedCompanyKey;
      });
      if (comp) {
        await apiDeleteCompany(comp);
        showToast('Cadastro empresarial excluído.');
        onRefreshCompanies();
        setSelectedCompanyKey('');
        clearCompanyForm();
      }
    } catch (e: any) {
      showToast('Erro de exclusão: ' + e.message, true);
    }
  };

  // Logo handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Selecione uma imagem menor que 2MB.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCurrentCompany(prev => ({ ...prev, logo_data_url: event.target?.result as string }));
      showToast('Logo corporativo acoplado!');
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setCurrentCompany(prev => ({ ...prev, logo_data_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Logo removido.');
  };

  // Toggle Standard Declarations Selection
  const toggleDec = (id: string) => {
    setSelectedDecs(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedDecs(DECLARATIONS.map(d => d.id));
  };

  const selectNone = () => {
    setSelectedDecs([]);
  };

  // Custom declarations logic
  const addCustomDec = () => {
    setCustomDecs(prev => [
      ...prev,
      { id: Date.now().toString(), titulo: '', texto: '' }
    ]);
  };

  const removeCustomDec = (id: string) => {
    setCustomDecs(prev => prev.filter(x => x.id !== id));
  };

  const handleCustomChange = (id: string, prop: 'titulo' | 'texto', value: string) => {
    setCustomDecs(prev => prev.map(x => x.id === id ? { ...x, [prop]: value } : x));
  };

  // PDF Generation helpers
  const PAGE = {
    marginL: 25, marginR: 25, marginT: 25, marginB: 25,
    usableW: 160 // 210 - margins
  };

  const drawHeader = (doc: jsPDF, y: number, company: any) => {
    if (company.logo_data_url) {
      try {
        const maxH = 22;
        const maxW = 60;
        // Simple scale and center placing
        const x = (210 - maxW) / 2;
        const format = company.logo_data_url.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(company.logo_data_url, format, x, y, maxW, maxH);
        return y + maxH + 8;
      } catch (e) {
        console.error('Logo drawing error:', e);
      }
    }
    return y + 5;
  };

  const drawProponenteBlock = (doc: jsPDF, y: number, company: any) => {
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.text(`${modalidade} nº ${edital} — ${orgao}`, 105, y, { align: 'center' });
    y += 8;

    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(PAGE.marginL, y, 210 - PAGE.marginR, y);
    y += 5;

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text('PROPONENTE:', PAGE.marginL, y);
    y += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);

    const lines = [
      `${company.razao_social || '[Razão Social]'} — CNPJ: ${company.cnpj || '[CNPJ]'}`,
      company.endereco || '[Endereço Completo]',
      `Representante: ${company.rep_nome || '[Representante]'} (${company.rep_cargo || '[Cargo]'}) — CPF: ${company.rep_cpf || '[CPF]'}`
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
    return y;
  };

  const drawSectionTitle = (doc: jsPDF, title: string, y: number) => {
    if (y > 265) { doc.addPage(); y = PAGE.marginT; }
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(140, 100, 60);
    doc.text(title, PAGE.marginL, y);
    doc.setTextColor(0);
    y += 2;
    doc.setDrawColor(200, 160, 110);
    doc.setLineWidth(0.4);
    doc.line(PAGE.marginL, y, 210 - PAGE.marginR, y);
    y += 5;
    return y;
  };

  const writeJustifiedText = (doc: jsPDF, text: string, y: number) => {
    const paragraphs = text.split('\n');
    paragraphs.forEach((para) => {
      if (para.trim() === '') { y += 4; return; }
      const lines = doc.splitTextToSize(para, PAGE.usableW);
      lines.forEach((ln, idx) => {
        if (y > 270) {
          doc.addPage();
          y = PAGE.marginT;
        }
        if (idx === lines.length - 1 || lines.length === 1) {
          doc.text(ln, PAGE.marginL, y);
        } else {
          // Justified spacer algorithm
          const words = ln.split(' ').filter(w => w);
          if (words.length > 1) {
            const sumTextW = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
            const spacesNeeded = words.length - 1;
            const eachSpaceW = (PAGE.usableW - sumTextW) / spacesNeeded;
            let currentX = PAGE.marginL;
            words.forEach((w, wordIdx) => {
              doc.text(w, currentX, y);
              currentX += doc.getTextWidth(w) + eachSpaceW;
            });
          } else {
            doc.text(ln, PAGE.marginL, y);
          }
        }
        y += 5.5;
      });
      y += 2.5;
    });
    return y;
  };

  const drawFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${modalidade} nº ${edital} — ${orgao}`, 105, 297 - 12, { align: 'center' });
    doc.text(`Página ${pageNum} de ${totalPages}`, 210 - PAGE.marginR, 297 - 12, { align: 'right' });
    doc.setTextColor(0);
  };

  const extractClausulaCorpo = (dec: any, data: any) => {
    if (dec.bodyConsolidado) {
      return dec.bodyConsolidado(data).trim();
    }
    const fullText = dec.body(data);
    const startIdx = fullText.indexOf('\n');
    return fullText.substring(startIdx !== -1 ? startIdx + 1 : 0).trim();
  };

  const generatePDF = () => {
    try {
      const activeDecs = selectedDecs.map(id => DECLARATIONS.find(d => d.id === id)).filter(Boolean);
      // Append custom ones
      customDecs.forEach(c => {
        if (!c.titulo || !c.texto) return;
        activeDecs.push({
          id: 'custom',
          title: c.titulo,
          body: (d: any) => `${c.titulo.toUpperCase()}\n\n${c.texto}`,
          bodyConsolidado: (d: any) => c.texto,
          requiresContador: false
        } as any);
      });

      if (activeDecs.length === 0) {
        showToast('Escolha ou crie pelo menos uma declaração para imprimir.', true);
        return;
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const docData = {
        ...currentCompany,
        orgao, modalidade, edital, objeto, cidade,
        data: dataAssinatura ? formatarData(dataAssinatura) : formatarData(new Date().toISOString().split('T')[0])
      };

      if (formato === 'separado') {
        // Individual Pages Mode
        activeDecs.forEach((dec: any, idx) => {
          if (idx > 0) doc.addPage();
          let y = PAGE.marginT;
          y = drawHeader(doc, y, currentCompany);
          y = drawProponenteBlock(doc, y, docData);

          const fullText = dec.body(docData);
          const firstLineIndex = fullText.indexOf('\n');
          const finalTitle = firstLineIndex !== -1 ? fullText.substring(0, firstLineIndex).trim() : dec.title.toUpperCase();
          const cleanBody = extractClausulaCorpo(dec, docData);

          y = drawSectionTitle(doc, finalTitle, y);
          doc.setFont('times', 'normal');
          doc.setFontSize(10.5);
          y = writeJustifiedText(doc, cleanBody, y);

          // Sign block location check
          y += 15;
          if (y > 240) { doc.addPage(); y = PAGE.marginT + 15; }
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          doc.text(`${cidade}, ${docData.data}.`, PAGE.marginL, y);
          
          y += 20;
          const sigW = 80;
          const sigX = (210 - sigW) / 2;
          doc.setDrawColor(180);
          doc.line(sigX, y, sigX + sigW, y);
          y += 5;
          doc.setFont('times', 'bold');
          doc.setFontSize(10.5);
          doc.text(currentCompany.rep_nome || '[Representante]', 105, y, { align: 'center' });
          y += 4.5;
          doc.setFont('times', 'normal');
          doc.setFontSize(9.5);
          doc.text(`${currentCompany.rep_cargo || ''} — CPF: ${currentCompany.rep_cpf || ''}`, 105, y, { align: 'center' });
          y += 4.5;
          doc.text(currentCompany.razao_social || '[Razão Social]', 105, y, { align: 'center' });

          if (dec.requiresContador && currentCompany.incluir_contador) {
            y += 18;
            if (y > 260) { doc.addPage(); y = PAGE.marginT + 15; }
            doc.line(sigX, y, sigX + sigW, y);
            y += 5;
            doc.setFont('times', 'bold');
            doc.setFontSize(10.5);
            doc.text(currentCompany.cont_nome || '[Contador]', 105, y, { align: 'center' });
            y += 4.5;
            doc.setFont('times', 'normal');
            doc.setFontSize(9.5);
            doc.text(`CRC: ${currentCompany.cont_crc || ''} — CPF: ${currentCompany.cont_cpf || ''}`, 105, y, { align: 'center' });
          }
        });
      } else {
        // Combined Consolidated layout
        let y = PAGE.marginT;
        y = drawHeader(doc, y, currentCompany);

        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text('DECLARAÇÃO CONSOLIDADA DA LICITANTE', 105, y, { align: 'center' });
        y += 8;

        y = drawProponenteBlock(doc, y, docData);

        doc.setFont('times', 'italic');
        doc.setFontSize(10);
        const preambulo = `Para as finalidades legais do certame ${modalidade} nº ${edital}, promovido pelo correspondente contratante ${orgao}, a empresa proponente acima especificada declara sob as penas do direito:`;
        y = writeJustifiedText(doc, preambulo, y);
        y += 5;

        // Draw each selected declaration as an elegant listed clause
        activeDecs.forEach((dec: any, idx) => {
          if (y > 250) { doc.addPage(); y = PAGE.marginT; }
          const simplifiedHeader = `${idx + 1}. ${dec.title.replace(/^\d+\.\s*/, '').toUpperCase()}`;
          y = drawSectionTitle(doc, simplifiedHeader, y);

          doc.setFont('times', 'normal');
          doc.setFontSize(10.5);
          const cleanText = extractClausulaCorpo(dec, docData);
          y = writeJustifiedText(doc, cleanText, y);
          y += 5;
        });

        // Sign bottom block
        y += 12;
        if (y > 235) { doc.addPage(); y = PAGE.marginT + 12; }
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.text(`${cidade}, ${docData.data}.`, PAGE.marginL, y);

        y += 22;
        const sigW = 80;
        const sigX = (210 - sigW) / 2;

        const hasMeepp = activeDecs.some((d: any) => d.requiresContador);
        const renderTwoCols = hasMeepp && currentCompany.incluir_contador;

        if (renderTwoCols) {
          // Double signatures side-by-side
          const halfW = 65;
          const leftX = 25;
          const rightX = 210 - 25 - halfW;

          // Left: Rep
          doc.setDrawColor(200);
          doc.line(leftX, y, leftX + halfW, y);
          let yL = y + 5;
          doc.setFont('times', 'bold');
          doc.setFontSize(9.5);
          doc.text(currentCompany.rep_nome || '', leftX + (halfW / 2), yL, { align: 'center' });
          yL += 4.5;
          doc.setFont('times', 'normal');
          doc.setFontSize(8.5);
          doc.text(currentCompany.rep_cargo || '', leftX + (halfW / 2), yL, { align: 'center' });
          yL += 4;
          doc.text(`CPF: ${currentCompany.rep_cpf || ''}`, leftX + (halfW / 2), yL, { align: 'center' });

          // Right: accountant
          doc.line(rightX, y, rightX + halfW, y);
          let yR = y + 5;
          doc.setFont('times', 'bold');
          doc.setFontSize(9.5);
          doc.text(currentCompany.cont_nome || '', rightX + (halfW / 2), yR, { align: 'center' });
          yR += 4.5;
          doc.setFont('times', 'normal');
          doc.setFontSize(8.5);
          doc.text(`Contador — CRC ${currentCompany.cont_crc || ''}`, rightX + (halfW / 2), yR, { align: 'center' });
          yR += 4;
          doc.text(`CPF: ${currentCompany.cont_cpf || ''}`, rightX + (halfW / 2), yR, { align: 'center' });
        } else {
          // Singe Rep Sign Centered
          doc.setDrawColor(180);
          doc.line(sigX, y, sigX + sigW, y);
          y += 5;
          doc.setFont('times', 'bold');
          doc.setFontSize(10.5);
          doc.text(currentCompany.rep_nome || '[Representante]', 105, y, { align: 'center' });
          y += 4.5;
          doc.setFont('times', 'normal');
          doc.setFontSize(9.5);
          doc.text(`${currentCompany.rep_cargo || ''} — CPF: ${currentCompany.rep_cpf || ''}`, 105, y, { align: 'center' });
          y += 4;
          doc.text(currentCompany.razao_social || '[Razão Social]', 105, y, { align: 'center' });
        }
      }

      // Append pages numbers
      const totalPagesNum = (doc.internal as any).getNumberOfPages();
      for (let pageIdx = 1; pageIdx <= totalPagesNum; pageIdx++) {
        doc.setPage(pageIdx);
        drawFooter(doc, pageIdx, totalPagesNum);
      }

      const formattedName = (currentCompany.razao_social || 'Firma').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Declaracoes_${formato}_${formattedName}.pdf`);
      showToast('Declaração exportada como PDF!');
    } catch (e: any) {
      showToast('Erro ao renderizar PDF: ' + e.message, true);
    }
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#e8ebf0]">
      {/* LEFT COLUMN: COMPANY & LICITATION CONTEXT */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Proponente Corporate Panel */}
        <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl relative">
          <div className="flex items-center justify-between border-b border-[#2d3548] pb-4 mb-6">
            <h3 className="text-lg font-serif font-bold text-[#d4a574] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#d4a574]" />
              <span>Dados da Empresa</span>
            </h3>
            <span className="text-[11px] font-mono text-[#8892a6] bg-[#232a3d] px-2 py-0.5 rounded-md border border-[#2d3548]">
              Cloud-integrated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">
                Selecionar Empresa Salva
              </label>
              <select
                value={selectedCompanyKey}
                onChange={(e) => setSelectedCompanyKey(e.target.value)}
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
              >
                <option value="">— Criar Nova Empresa —</option>
                {companies.map((c) => {
                  const key = 'empresa:' + c.razao_social.replace(/[\s/\\'"]/g, '_');
                  return (
                    <option key={key} value={key}>
                      {c.razao_social}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex items-end gap-1">
              <button
                type="button"
                onClick={handleSaveCompany}
                className="flex-1 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-all h-[38px] cursor-pointer"
              >
                <span>Gravar</span>
              </button>
              {selectedCompanyKey && (
                <button
                  type="button"
                  onClick={handleDeleteCompany}
                  className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-semibold p-2 h-[38px] rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  title="Excluir cadastro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Form details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={currentCompany.razao_social || ''}
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, razao_social: e.target.value }))}
                placeholder="Ex: EMPRESA EXEMPLO LTDA"
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/40 focus:border-[#d4a574] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">
                  CNPJ (apenas dígitos)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={currentCompany.cnpj || ''}
                    onChange={(e) => setCurrentCompany(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    className="flex-1 bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/30 focus:border-[#d4a574] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCnpjLookup}
                    disabled={loadingCnpj}
                    className="bg-[#2d3548] hover:bg-[#232a3d] text-[#d4a574] border border-[#2d3548] hover:border-[#d4a574]/40 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {loadingCnpj ? <div className="w-3.5 h-3.5 border-2 border-[#d4a574] border-t-transparent rounded-full animate-spin"></div> : <Search className="w-3.5 h-3.5" />}
                    <span>Buscar</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  value={currentCompany.ie || ''}
                  onChange={(e) => setCurrentCompany(prev => ({ ...prev, ie: e.target.value }))}
                  placeholder="Isento ou numérico"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/40 focus:border-[#d4a574] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                value={currentCompany.endereco || ''}
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Rua, número, bairro, cidade/UF, CEP"
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/40 focus:border-[#d4a574] focus:outline-none"
              />
            </div>

            {/* Representative Subgroup */}
            <div className="border-t border-[#2d3548] pt-4 mt-2">
              <span className="text-[11px] font-mono tracking-widest text-[#d4a574] uppercase block mb-3">
                Representante Legal
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-[#8892a6] mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={currentCompany.rep_nome || ''}
                    onChange={(e) => setCurrentCompany(prev => ({ ...prev, rep_nome: e.target.value }))}
                    placeholder="Ex: Carlos Santos"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/30 focus:border-[#d4a574] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[#8892a6] mb-1">
                    Cargo / Atribuição
                  </label>
                  <input
                    type="text"
                    value={currentCompany.rep_cargo || ''}
                    onChange={(e) => setCurrentCompany(prev => ({ ...prev, rep_cargo: e.target.value }))}
                    placeholder="Sócio-Administrador"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/30 focus:border-[#d4a574] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs uppercase text-[#8892a6] mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={currentCompany.rep_cpf || ''}
                    onChange={(e) => setCurrentCompany(prev => ({ ...prev, rep_cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/30 focus:border-[#d4a574] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[#8892a6] mb-1">
                    RG / Órgão Expedidor
                  </label>
                  <input
                    type="text"
                    value={currentCompany.rep_rg || ''}
                    onChange={(e) => setCurrentCompany(prev => ({ ...prev, rep_rg: e.target.value }))}
                    placeholder="Ex: 1102928 SSP/SP"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/30 focus:border-[#d4a574] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Logo picker */}
            <div className="border-t border-[#2d3548] pt-4 mt-2">
              <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-2">
                Logo corporativo (PNG ou JPEG transparente)
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#232a3d] hover:bg-[#2d3548] border border-[#2d3548] hover:border-[#d4a574] px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-[#e8ebf0]"
                >
                  Anexar Arquivo
                </button>
                {currentCompany.logo_data_url && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold cursor-pointer"
                  >
                    Excluir Logo
                  </button>
                )}
              </div>
              {currentCompany.logo_data_url && (
                <div className="mt-3 inline-block bg-white p-2 rounded-lg border border-[#2d3548]">
                  <img
                    src={currentCompany.logo_data_url}
                    alt="Logo corporativo"
                    className="max-h-12 w-auto object-contain"
                  />
                </div>
              )}
            </div>

            {/* Porte e Contador section */}
            <div className="border-t border-[#2d3548] pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-[#8892a6] mb-1">
                  Porte Tributário (ME/EPP)
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#e8ebf0] cursor-pointer">
                    <input
                      type="radio"
                      name="porte"
                      value="ME"
                      checked={currentCompany.porte === 'ME'}
                      onChange={() => setCurrentCompany(p => ({ ...p, porte: 'ME' }))}
                      className="accent-[#d4a574]"
                    />
                    <span>ME</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#e8ebf0] cursor-pointer">
                    <input
                      type="radio"
                      name="porte"
                      value="EPP"
                      checked={currentCompany.porte === 'EPP'}
                      onChange={() => setCurrentCompany(p => ({ ...p, porte: 'EPP' }))}
                      className="accent-[#d4a574]"
                    />
                    <span>EPP</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#e8ebf0] cursor-pointer">
                    <input
                      type="radio"
                      name="porte"
                      value="NAO"
                      checked={currentCompany.porte === 'NAO' || !currentCompany.porte}
                      onChange={() => setCurrentCompany(p => ({ ...p, porte: 'NAO' }))}
                      className="accent-[#d4a574]"
                    />
                    <span>Outro</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 text-xs text-[#8892a6] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentCompany.incluir_contador || false}
                    onChange={(e) => setCurrentCompany(p => ({ ...p, incluir_contador: e.target.checked }))}
                    className="rounded accent-[#d4a574] w-4 h-4"
                  />
                  <span>Acoplar dados de CRC do Contador</span>
                </label>
              </div>
            </div>

            {currentCompany.incluir_contador && (
              <div className="mt-3 p-4 bg-[#232a3d] border border-[#2d3548] rounded-xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6]">Nome do Contador</label>
                    <input
                      type="text"
                      value={currentCompany.cont_nome || ''}
                      onChange={(e) => setCurrentCompany(p => ({ ...p, cont_nome: e.target.value }))}
                      placeholder="Ex: Paulo Silveira"
                      className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6]">Registro CRC</label>
                    <input
                      type="text"
                      value={currentCompany.cont_crc || ''}
                      onChange={(e) => setCurrentCompany(p => ({ ...p, cont_crc: e.target.value }))}
                      placeholder="CRC/UF 00000/O-0"
                      className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6]">CPF do Contador</label>
                    <input
                      type="text"
                      value={currentCompany.cont_cpf || ''}
                      onChange={(e) => setCurrentCompany(p => ({ ...p, cont_cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                      className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-[#8892a6]">Escritório / Local</label>
                    <input
                      type="text"
                      value={currentCompany.cont_escritorio || ''}
                      onChange={(e) => setCurrentCompany(p => ({ ...p, cont_escritorio: e.target.value }))}
                      placeholder="Ex: Escritório Lux Contábil"
                      className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Licitation Info Context Card */}
        <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-serif font-bold text-[#d4a574] flex items-center gap-2 border-b border-[#2d3548] pb-3 mb-2">
            <Compass className="w-5 h-5" />
            <span>Contexto Técnico do Edital</span>
          </h3>

          <div>
            <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">Órgão / Ente Licitante</label>
            <input
              type="text"
              value={orgao}
              onChange={(e) => setOrgao(e.target.value)}
              placeholder="Prefeitura Municipal de..."
              className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/30 focus:border-[#d4a574] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">Modalidade</label>
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
              >
                <option>Pregão Eletrônico</option>
                <option>Pregão Presencial</option>
                <option>Concorrência</option>
                <option>Tomada de Preços</option>
                <option>Convite</option>
                <option>Dispensa</option>
                <option>Inexigibilidade</option>
                <option>Credenciamento</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">Nº Edital / Processo</label>
              <input
                type="text"
                value={edital}
                onChange={(e) => setEdital(e.target.value)}
                placeholder="Ex: 014/2026"
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/30 focus:border-[#d4a574] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">Objeto Resumido</label>
            <textarea
              value={objeto}
              onChange={(e) => setObjeto(e.target.value)}
              placeholder="Digite sumariamente o que está sendo licitado"
              className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] placeholder-[#8892a6]/30 focus:border-[#d4a574] focus:outline-none h-20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">Cidade da Assinatura</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Porto Alegre/RS"
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-mono text-[#8892a6] mb-1">Data</label>
              <input
                type="date"
                value={dataAssinatura}
                onChange={(e) => setDataAssinatura(e.target.value)}
                className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: DECLARATIONS SELECTION */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
          <div className="border-b border-[#2d3548] pb-3 mb-2 flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-lg font-serif font-bold text-[#d4a574] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span>Declarações Jurídicas</span>
            </h3>
            <span className="text-xs text-[#8892a6] font-mono">
              Selecione as desejadas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={selectAll}
              className="py-1.5 bg-[#232a3d] border border-[#2d3548] hover:border-[#d4a574] text-xs text-[#e8ebf0] font-semibold rounded-lg cursor-pointer transition-colors"
            >
              Selecionar Todas
            </button>
            <button
              onClick={selectNone}
              className="py-1.5 bg-transparent border border-[#2d3548] text-xs text-[#8892a6] hover:text-[#e8ebf0] rounded-lg cursor-pointer transition-colors"
            >
              Limpar Seleção
            </button>
          </div>

          {/* Scroller list of declarations */}
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5">
            {DECLARATIONS.map(d => {
              const selected = selectedDecs.includes(d.id);
              return (
                <div 
                  key={d.id}
                  onClick={() => toggleDec(d.id)}
                  className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                    selected 
                      ? 'bg-[rgba(212,165,116,0.06)] border-[#d4a574] text-[#e8ebf0]' 
                      : 'bg-[#232a3d]/50 border-[#2d3548] hover:border-[#8a6d4a] text-[#8892a6]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      selected ? 'bg-[#d4a574] border-[#d4a574] text-[#0f1419]' : 'border-[#2d3548]'
                    }`}>
                      {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold ${selected ? 'text-[#d4a574]' : 'text-[#e8ebf0]'}`}>
                        {d.title}
                      </h4>
                      <p className="text-[11px] leading-relaxed text-[#8892a6] mt-1">{d.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Decs section */}
        <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[#2d3548] pb-3 mb-2">
            <h3 className="text-md font-serif font-bold text-[#d4a574] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#d4a574]" />
              <span>Declarações Personalizadas</span>
            </h3>
            <button
              onClick={addCustomDec}
              className="p-1 px-2.5 bg-[#232a3d] border border-[#2d3548] hover:border-[#d4a574] text-[11px] text-[#d4a574] font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Inserir</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {customDecs.length === 0 ? (
              <p className="text-xs text-[#8892a6] italic text-center py-4 bg-[#232a3d]/20 rounded-lg">
                Nenhuma declaração customizada adicionada. Use-as para exigências extraordinárias do Edital.
              </p>
            ) : (
              customDecs.map(c => (
                <div key={c.id} className="p-3 bg-[#232a3d] border border-[#2d3548] rounded-xl relative space-y-2">
                  <button
                    onClick={() => removeCustomDec(c.id)}
                    className="absolute top-2.5 right-2.5 text-[#8892a6] hover:text-red-400 p-1 cursor-pointer transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="pr-6">
                    <label className="block text-[10px] uppercase text-[#8892a6] mb-0.5">Título da Cláusula</label>
                    <input
                      type="text"
                      value={c.titulo}
                      onChange={(e) => handleCustomChange(c.id, 'titulo', e.target.value)}
                      placeholder="Ex: Declaração de Visitação Técnica Técnica"
                      className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-[#8892a6] mb-0.5">Teor Jurídico</label>
                    <textarea
                      value={c.texto}
                      onChange={(e) => handleCustomChange(c.id, 'texto', e.target.value)}
                      placeholder="Declara que..."
                      className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2 py-1 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none h-14"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Generate and Layout Format actions */}
        <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8892a6]">Formato de Saída</span>
            <div className="flex bg-[#232a3d] p-1 rounded-lg border border-[#2d3548]">
              <button
                type="button"
                onClick={() => setFormato('consolidado')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  formato === 'consolidado' ? 'bg-[#d4a574] text-[#0f1419]' : 'text-[#8892a6] hover:text-[#e8ebf0]'
                }`}
              >
                Consolidado
              </button>
              <button
                type="button"
                onClick={() => setFormato('separado')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  formato === 'separado' ? 'bg-[#d4a574] text-[#0f1419]' : 'text-[#8892a6] hover:text-[#e8ebf0]'
                }`}
              >
                Folhas Separadas
              </button>
            </div>
          </div>

          <div className="text-xs text-[#8892a6] leading-relaxed">
            {formato === 'consolidado' 
              ? '✓ Todas as declarações empilhadas no mesmo layout com uma única assinatura oficial no rodapé ao final.' 
              : '✓ Cada declaração impressa em uma nova página diferente para aposição de assinatura individualizada.'}
          </div>

          <button
            onClick={generatePDF}
            className="w-full py-3 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold uppercase tracking-wider rounded-lg text-sm shadow-xl shadow-[#d4a574]/15 transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 stroke-[2]" />
            <span>Gerar PDF Oficial ({selectedDecs.length + customDecs.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
