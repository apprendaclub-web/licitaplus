export const DECLARATIONS = [
  {
    id: 'menor',
    title: '1. Não Emprego de Menor (Art. 7º, XXXIII CF)',
    desc: 'Não emprega menor de 18 em trabalho noturno/perigoso/insalubre, nem menor de 16 anos, salvo aprendiz a partir de 14.',
    body: (d) => `DECLARAÇÃO DE CUMPRIMENTO DO ART. 7º, INCISO XXXIII DA CONSTITUIÇÃO FEDERAL\n\n` +
      `A empresa ${d.razaoSocial}, inscrita no CNPJ sob o nº ${d.cnpj}, com sede em ${d.endereco}, por intermédio de seu representante legal o(a) Sr.(a) ${d.repNome}, portador(a) do RG nº ${d.repRg} e do CPF nº ${d.repCpf}, DECLARA, para fins do disposto no inciso V do art. 27 da Lei nº 8.666/93 e art. 68 da Lei nº 14.133/2021, acrescido pela Lei nº 9.854, de 27 de outubro de 1999, que não emprega menor de dezoito anos em trabalho noturno, perigoso ou insalubre e não emprega menor de dezesseis anos, salvo na condição de aprendiz, a partir de quatorze anos.\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.\n` +
      `Objeto: ${d.objeto}.`,
    bodyConsolidado: (d) => `Declara, para fins do disposto no inciso V do art. 27 da Lei nº 8.666/93 e art. 68 da Lei nº 14.133/2021, que não emprega menor de dezoito anos em trabalho noturno, perigoso ou insalubre e não emprega menor de dezesseis anos, salvo na condição de aprendiz, a partir de quatorze anos.`
  },
  {
    id: 'idoneidade',
    title: '2. Idoneidade / Inexistência de Fato Impeditivo',
    desc: 'Declara, sob as penas da lei, não estar suspensa, impedida ou inidônea por qualquer órgão da Administração Pública direta ou indireta.',
    body: (d) => `DECLARAÇÃO DE IDONEIDADE E INEXISTÊNCIA DE FATO IMPEDITIVO\n\n` +
      `A empresa ${d.razaoSocial}, inscrita no CNPJ sob o nº ${d.cnpj}, com sede em ${d.endereco}, por seu representante legal ${d.repNome}, CPF nº ${d.repCpf}, DECLARA, sob as penas da lei, que:\n\n` +
      `a) não foi declarada inidônea para licitar ou contratar com a Administração Pública direta ou indireta, em qualquer esfera federativa (Federal, Estadual, Distrital ou Municipal);\n\n` +
      `b) não está suspensa temporariamente nem impedida de licitar e contratar com qualquer órgão ou entidade da Administração Pública;\n\n` +
      `c) inexistem fatos supervenientes impeditivos para sua habilitação no presente certame, ciente da obrigatoriedade de declarar ocorrências posteriores nos termos do art. 63, §1º, da Lei nº 14.133/2021;\n\n` +
      `d) não se encontra em processo de falência, dissolução ou liquidação, ressalvado o disposto quanto à recuperação judicial nos termos da Lei nº 11.101/2005.\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.`,
    bodyConsolidado: (d) => `Declara, sob as penas da lei, que: (a) não foi declarada inidônea para licitar ou contratar com a Administração Pública direta ou indireta, em qualquer esfera federativa; (b) não está suspensa temporariamente nem impedida de licitar e contratar com qualquer órgão ou entidade da Administração Pública; (c) inexistem fatos supervenientes impeditivos para sua habilitação no presente certame, ciente da obrigatoriedade de declarar ocorrências posteriores nos termos do art. 63, §1º, da Lei nº 14.133/2021; (d) não se encontra em processo de falência, dissolução ou liquidação, ressalvado o disposto quanto à recuperação judicial nos termos da Lei nº 11.101/2005.`
  },
  {
    id: 'sicaf',
    title: '3. Inexistência de Sanções em Cadastros Nacionais (SICAF/CEIS/CNEP/CNIA)',
    desc: 'Declara não possuir registros impeditivos no SICAF, CEIS, CNEP ou CNIA do CNJ.',
    body: (d) => `DECLARAÇÃO DE INEXISTÊNCIA DE SANÇÕES EM CADASTROS NACIONAIS\n\n` +
      `A empresa ${d.razaoSocial}, inscrita no CNPJ sob o nº ${d.cnpj}, por seu representante legal ${d.repNome}, CPF nº ${d.repCpf}, DECLARA, sob as penas da lei, que não possui registros impeditivos ou sanções ativas que vedem a sua participação em licitações ou a sua contratação pela Administração Pública nos seguintes cadastros:\n\n` +
      `a) Sistema de Cadastramento Unificado de Fornecedores – SICAF;\n\n` +
      `b) Cadastro Nacional de Empresas Inidôneas e Suspensas – CEIS, mantido pela Controladoria-Geral da União;\n\n` +
      `c) Cadastro Nacional de Empresas Punidas – CNEP, instituído pela Lei nº 12.846/2013;\n\n` +
      `d) Cadastro Nacional de Condenações Cíveis por Ato de Improbidade Administrativa e Inelegibilidade – CNIA, mantido pelo Conselho Nacional de Justiça (CNJ);\n\n` +
      `e) Lista de Inidôneos e Inabilitados do Tribunal de Contas da União – TCU.\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.`,
    bodyConsolidado: (d) => `Declara, sob as penas da lei, que não possui registros impeditivos ou sanções ativas que vedem a sua participação em licitações ou a sua contratação pela Administração Pública nos seguintes cadastros: (a) SICAF — Sistema de Cadastramento Unificado de Fornecedores; (b) CEIS — Cadastro Nacional de Empresas Inidôneas e Suspensas; (c) CNEP — Cadastro Nacional de Empresas Punidas (Lei nº 12.846/2013); (d) CNIA — Cadastro Nacional de Condenações Cíveis por Ato de Improbidade Administrativa, mantido pelo CNJ; e (e) Lista de Inidôneos e Inabilitados do TCU. Compromete-se a informar imediatamente qualquer alteração nessa situação durante o curso do certame e a execução contratual.`
  },
  {
    id: 'meepp',
    title: '4. Enquadramento ME / EPP (LC 123/2006)',
    desc: 'Declara enquadramento como Microempresa ou Empresa de Pequeno Porte para fins de tratamento diferenciado.',
    body: (d) => {
      let enquadramento;
      if (d.porte === 'ME') {
        enquadramento = `(X) é Microempresa (ME), conforme o art. 3º, inciso I, da LC 123/2006;\n(  ) é Empresa de Pequeno Porte (EPP), conforme o art. 3º, inciso II, da LC 123/2006;`;
      } else if (d.porte === 'EPP') {
        enquadramento = `(  ) é Microempresa (ME), conforme o art. 3º, inciso I, da LC 123/2006;\n(X) é Empresa de Pequeno Porte (EPP), conforme o art. 3º, inciso II, da LC 123/2006;`;
      } else {
        enquadramento = `(  ) é Microempresa (ME), conforme o art. 3º, inciso I, da LC 123/2006;\n(  ) é Empresa de Pequeno Porte (EPP), conforme o art. 3º, inciso II, da LC 123/2006;`;
      }
      return `DECLARAÇÃO DE ENQUADRAMENTO COMO MICROEMPRESA OU EMPRESA DE PEQUENO PORTE\n\n` +
        `A empresa ${d.razaoSocial}, inscrita no CNPJ sob o nº ${d.cnpj}, por intermédio de seu representante legal ${d.repNome}, CPF nº ${d.repCpf}, DECLARA, para os fins do disposto na Lei Complementar nº 123, de 14 de dezembro de 2006, e suas alterações, que:\n\n` +
        enquadramento + `\n\n` +
        `Declara, ainda, que está apta a usufruir do tratamento diferenciado e favorecido estabelecido nos artigos 42 a 49 da referida Lei Complementar, cumprindo todos os requisitos legais para fazer jus a tais benefícios, e que não se enquadra em nenhuma das exclusões relacionadas no § 4º do art. 3º da LC 123/2006.\n\n` +
        `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.`;
    },
    bodyConsolidado: (d) => {
      let porteText;
      if (d.porte === 'ME') {
        porteText = 'enquadra-se como MICROEMPRESA (ME), nos termos do art. 3º, inciso I, da Lei Complementar nº 123/2006';
      } else if (d.porte === 'EPP') {
        porteText = 'enquadra-se como EMPRESA DE PEQUENO PORTE (EPP), nos termos do art. 3º, inciso II, da Lei Complementar nº 123/2006';
      } else {
        porteText = 'enquadra-se como (  ) Microempresa — ME / (  ) Empresa de Pequeno Porte — EPP, nos termos do art. 3º da Lei Complementar nº 123/2006';
      }
      return `Declara, para os fins do disposto na Lei Complementar nº 123/2006 e suas alterações, que ${porteText}, estando apta a usufruir do tratamento diferenciado e favorecido estabelecido nos artigos 42 a 49 da referida Lei Complementar, cumprindo todos os requisitos legais e não se enquadrando em nenhuma das exclusões relacionadas no § 4º do art. 3º da LC 123/2006.`;
    },
    requiresContador: true
  },
  {
    id: 'habilitacao',
    title: '5. Pleno Cumprimento dos Requisitos de Habilitação',
    desc: 'Declara cumprir plenamente todos os requisitos de habilitação jurídica, fiscal, social, trabalhista e técnica.',
    body: (d) => `DECLARAÇÃO DE PLENO CUMPRIMENTO DOS REQUISITOS DE HABILITAÇÃO\n\n` +
      `A empresa ${d.razaoSocial}, inscrita no CNPJ sob o nº ${d.cnpj}, por seu representante legal ${d.repNome}, CPF nº ${d.repCpf}, em atendimento ao previsto no art. 63, I, da Lei nº 14.133/2021 (e/ou art. 4º, VII, da Lei nº 10.520/2002), DECLARA que cumpre plenamente todos os requisitos de habilitação jurídica, fiscal, social, trabalhista, econômico-financeira e técnica exigidos no edital do ${d.modalidade} nº ${d.edital}, do(a) ${d.orgao}, estando ciente das sanções aplicáveis em caso de declaração falsa.\n\n` +
      `Objeto: ${d.objeto}.`,
    bodyConsolidado: (d) => `Declara, em atendimento ao previsto no art. 63, I, da Lei nº 14.133/2021 (e/ou art. 4º, VII, da Lei nº 10.520/2002), que cumpre plenamente todos os requisitos de habilitação jurídica, fiscal, social, trabalhista, econômico-financeira e técnica exigidos no edital, estando ciente das sanções aplicáveis em caso de declaração falsa.`
  },
  {
    id: 'cumprimento',
    title: '6. Conhecimento e Cumprimento do Edital',
    desc: 'Declara conhecer integralmente os termos, cláusulas e anexos do edital, aceitando irrestritamente suas condições.',
    body: (d) => `DECLARAÇÃO DE CONHECIMENTO E ACEITAÇÃO DO EDITAL\n\n` +
      `A empresa ${d.razaoSocial}, inscrita no CNPJ sob o nº ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, para todos os fins de direito, que:\n\n` +
      `a) recebeu, analisou e tem pleno conhecimento de todos os termos, cláusulas, condições, exigências e anexos contidos no edital do ${d.modalidade} nº ${d.edital};\n\n` +
      `b) aceita integralmente e de forma irrestrita as condições nele estabelecidas, comprometendo-se a executar o objeto na forma e nos prazos avençados;\n\n` +
      `c) tomou conhecimento de todas as informações e condições locais necessárias para o cumprimento das obrigações objeto da licitação.\n\n` +
      `Órgão: ${d.orgao}.\n` +
      `Objeto: ${d.objeto}.`,
    bodyConsolidado: (d) => `Declara que: (a) recebeu, analisou e tem pleno conhecimento de todos os termos, cláusulas, condições, exigências e anexos contidos no edital; (b) aceita integralmente e de forma irrestrita as condições nele estabelecidas, comprometendo-se a executar o objeto na forma e nos prazos avençados; (c) tomou conhecimento de todas as informações e condições locais necessárias para o cumprimento das obrigações objeto da licitação.`
  },
  {
    id: 'quantitativos',
    title: '7. Ciência dos Limites Quantitativos e Lotes',
    desc: 'Declara pleno conhecimento e aceitação das quantidades mínimas e máximas por item/lote e capacidade operacional para atender.',
    body: (d) => `DECLARAÇÃO DE CIÊNCIA DOS LIMITES QUANTITATIVOS E CAPACIDADE OPERACIONAL\n\n` +
      `A empresa ${d.razaoSocial}, inscrita no CNPJ sob o nº ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, para fins de participação no ${d.modalidade} nº ${d.edital}, do(a) ${d.orgao}, que:\n\n` +
      `a) tem pleno conhecimento e aceita integralmente as quantidades mínimas e máximas estipuladas no edital e seus anexos para cada item ou lote da presente licitação;\n\n` +
      `b) possui capacidade operacional, logística, técnica e financeira para atender às demandas de fornecimento ou prestação de serviços dentro das margens quantitativas previstas, observados os prazos e condições estabelecidos no instrumento convocatório;\n\n` +
      `Objeto: ${d.objeto}.`,
    bodyConsolidado: (d) => `Declara que: (a) tem pleno conhecimento e aceita integralmente as quantidades mínimas e máximas estipuladas no edital e seus anexos para cada item ou lote; (b) possui capacidade operacional, logística, técnica e financeira para atender às demandas dentro das margens quantitativas previstas, observados os prazos e condições estabelecidos no instrumento convocatório; (c) está ciente de que eventuais variações quantitativas dentro dos limites estabelecidos não ensejarão pleito de reequilíbrio econômico-financeiro, ressalvadas as hipóteses legais.`
  },
  {
    id: 'elaboracao',
    title: '8. Elaboração Independente da Proposta',
    desc: 'Declara que a proposta econômica foi elaborada de forma independente, sem conluio, combinação, influência ou acordo com qualquer outro licitante.',
    body: (d) => `DECLARAÇÃO DE ELABORAÇÃO INDEPENDENTE DA PROPOSTA\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, sob as penas da lei, em especial o art. 299 do Código Penal Brasileiro, que:\n\n` +
      `1. a proposta econômica apresentada para o ${d.modalidade} nº ${d.edital} foi elaborada de maneira independente, e o seu conteúdo não foi, no todo ou em parte, direta ou indiretamente, informado ou discutido com qualquer outro participante potencial ou de fato;\n\n` +
      `2. a intenção de apresentar a proposta não foi informada, discutida ou recebida de qualquer outro participante potencial ou de fato;\n\n` +
      `3. não houve conluio, combinação, influência ou qualquer espécie de acordo com outros licitantes ou terceiros para a fixação de preços ou de quaisquer condições da proposta;\n\n` +
      `4. não tentou, por qualquer meio ou por qualquer pessoa, influir na decisão de qualquer outro participante quanto a participar ou não da referida licitação;\n\n` +
      `5. o conteúdo da proposta não será, no todo ou em parte, direta ou indiretamente, comunicado a qualquer outro participante antes da abertura oficial das propostas;\n\n` +
      `6. está plenamente ciente do teor e da extensão desta declaração e detém plenos poderes e informações para firmá-la.`,
    bodyConsolidado: (d) => `Declara, sob as penas da lei, em especial o art. 299 do Código Penal Brasileiro, que: (1) a proposta econômica foi elaborada de maneira independente, e o seu conteúdo não foi, no todo ou em parte, direta ou indiretamente, informado ou discutido com qualquer outro participante potencial ou de fato; (2) a intenção de apresentar a proposta não foi informada, discutida ou recebida de qualquer outro participante; (3) não houve conluio, combinação, influência ou qualquer espécie de acordo com outros licitantes ou terceiros para a fixação de preços ou de quaisquer condições da proposta; (4) não tentou, por qualquer meio ou pessoa, influir na decisão de qualquer outro participante quanto a participar ou não da licitação; (5) o conteúdo da proposta não será comunicado a qualquer outro participante antes da abertura oficial das propostas.`
  },
  {
    id: 'parentesco',
    title: '9. Inexistência de Parentesco com Agente Público',
    desc: 'Declara não haver dirigente, sócio com poder de gerência ou responsável técnico com parentesco até o terceiro grau com servidor do órgão.',
    body: (d) => `DECLARAÇÃO DE INEXISTÊNCIA DE PARENTESCO COM AGENTE PÚBLICO\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, para os devidos fins, que não possui em seu quadro societário, de direção ou técnico, dirigente, sócio com poder de gerência ou responsável técnico que possua vínculo de parentesco — cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau — com servidores ou ocupantes de cargo em comissão do(a) ${d.orgao}, em especial daqueles que exerçam funções de direção, chefia, assessoramento ou que tenham atuação no processo licitatório, conforme vedação prevista na Súmula Vinculante nº 13 do STF e art. 14 da Lei nº 14.133/2021.\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital}.`,
    bodyConsolidado: (d) => `Declara, para os devidos fins, que não possui em seu quadro societário, de direção ou técnico, dirigente, sócio com poder de gerência ou responsável técnico que possua vínculo de parentesco — cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau — com servidores ou ocupantes de cargo em comissão do(a) ${d.orgao}, em especial daqueles que exerçam funções de direção, chefia, assessoramento ou atuem no processo licitatório, conforme vedação prevista na Súmula Vinculante nº 13 do STF e art. 14 da Lei nº 14.133/2021.`
  },
  {
    id: 'vinculo',
    title: '10. Inexistência de Vínculo com a Administração',
    desc: 'Declara que sócios, gerentes e responsáveis técnicos não são servidores ou empregados públicos pertencentes aos quadros da Administração contratante.',
    body: (d) => `DECLARAÇÃO DE INEXISTÊNCIA DE VÍNCULO COM A ADMINISTRAÇÃO\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, para os devidos fins, que nenhum de seus sócios, gerentes, dirigentes ou responsáveis técnicos é servidor público, empregado público ou agente político pertencente aos quadros da Administração Pública contratante, qual seja, o(a) ${d.orgao}, nos termos do art. 14, III, da Lei nº 14.133/2021.\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital}.`,
    bodyConsolidado: (d) => `Declara, para os devidos fins, que nenhum de seus sócios, gerentes, dirigentes ou responsáveis técnicos é servidor público, empregado público ou agente político pertencente aos quadros da Administração Pública contratante, qual seja, o(a) ${d.orgao}, nos termos do art. 14, III, da Lei nº 14.133/2021.`
  },
  {
    id: 'reservado',
    title: '11. Cumprimento da Reserva de Cargos (PCD e Aprendiz)',
    desc: 'Declara cumprir as reservas de cargos para pessoa com deficiência e aprendiz (art. 63, IV, Lei 14.133/2021).',
    body: (d) => `DECLARAÇÃO DE CUMPRIMENTO DA RESERVA DE CARGOS\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, em conformidade com o art. 63, inciso IV, da Lei nº 14.133/2021, que cumpre as exigências de reserva de cargos prevista em lei para pessoa com deficiência (Lei nº 8.213/1991, art. 93) e para reabilitado da Previdência Social, bem como para aprendiz (CLT, art. 429), nos casos em que possua quadro funcional sujeito a tais obrigações.\n\n` +
      `Referência: ${d.modalidade} nº ${d.edital} – ${d.orgao}.`,
    bodyConsolidado: (d) => `Declara, em conformidade com o art. 63, inciso IV, da Lei nº 14.133/2021, que cumpre as exigências de reserva de cargos prevista em lei para pessoa com deficiência (Lei nº 8.213/1991, art. 93) e para reabilitado da Previdência Social, bem como para aprendiz (CLT, art. 429), nos casos em que possua quadro funcional sujeito a tais obrigações.`
  },
  {
    id: 'lgpd',
    title: '12. Conformidade com a LGPD',
    desc: 'Declara observância e estrito cumprimento à Lei Geral de Proteção de Dados (Lei 13.709/2018).',
    body: (d) => `DECLARAÇÃO DE CONFORMIDADE COM A LEI GERAL DE PROTEÇÃO DE DADOS (LGPD)\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, para fins de participação no ${d.modalidade} nº ${d.edital}, do(a) ${d.orgao}, que observa e cumpre estritamente as disposições da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), comprometendo-se a:\n\n` +
      `a) aplicar a referida lei em todas as operações que envolvam tratamento de dados pessoais no âmbito do contrato decorrente desta licitação;\n\n` +
      `b) adotar medidas técnicas e administrativas aptas a proteger os dados pessoais a que tiver acesso em razão da execução contratual;\n\n` +
      `c) tratar os dados pessoais exclusivamente para as finalidades necessárias à execução do contrato, observando os princípios da finalidade, adequação, necessidade, segurança e prevenção previstos no art. 6º da LGPD;\n\n` +
      `d) responsabilizar-se por qualquer dano decorrente do tratamento indevido de dados pessoais sob sua responsabilidade.`,
    bodyConsolidado: (d) => `Declara que observa e cumpre estritamente as disposições da Lei nº 13.709/2018 (LGPD), comprometendo-se a: (a) aplicar a referida lei em todas as operações que envolvam tratamento de dados pessoais no âmbito do contrato; (b) adotar medidas técnicas e administrativas aptas a proteger os dados pessoais a que tiver acesso em razão da execução contratual; (c) tratar os dados pessoais exclusivamente para as finalidades necessárias à execução do contrato, observando os princípios da finalidade, adequação, necessidade, segurança e prevenção previstos no art. 6º da LGPD; (d) responsabilizar-se por qualquer dano decorrente do tratamento indevido de dados pessoais sob sua responsabilidade.`
  },
  {
    id: 'antitruste',
    title: '13. Inexistência de Práticas Anticoncorrenciais e Corrupção',
    desc: 'Declara não incorrer e adotar práticas para prevenir atos lesivos previstos na Lei Anticorrupção e na Lei de Defesa da Concorrência.',
    body: (d) => `DECLARAÇÃO DE INEXISTÊNCIA DE PRÁTICAS ANTICONCORRENCIAIS E DE CORRUPÇÃO\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, sob as penas da lei, que:\n\n` +
      `a) não incorreu em quaisquer das condutas lesivas previstas no art. 5º da Lei nº 12.846/2013 (Lei Anticorrupção) e adota práticas de integridade voltadas a prevenir a ocorrência de tais atos;\n\n` +
      `b) não pratica nem nunca praticou ato que possa ser caracterizado como infração à ordem econômica nos termos da Lei nº 12.529/2011 (Lei de Defesa da Concorrência);\n\n` +
      `c) não foi condenada, nos últimos 5 (cinco) anos, por sentença transitada em julgado, à pena de proibição de contratar com a Administração Pública;\n\n` +
      `d) compromete-se a, durante toda a vigência do contrato, manter em seus atos os princípios éticos e de integridade, sob pena de aplicação das sanções previstas na legislação vigente.`,
    bodyConsolidado: (d) => `Declara, sob as penas da lei, que: (a) não incorreu em quaisquer das condutas lesivas previstas no art. 5º da Lei nº 12.846/2013 (Lei Anticorrupção) e adota práticas de integridade voltadas a prevenir tais atos; (b) não pratica nem nunca praticou ato que possa ser caracterizado como infração à ordem econômica nos termos da Lei nº 12.529/2011; (c) não foi condenada, nos últimos 5 (cinco) anos, por sentença transitada em julgado, à pena de proibição de contratar com a Administração Pública; (d) compromete-se a manter durante a vigência do contrato os princípios éticos e de integridade, sob pena de aplicação das sanções legais.`
  },
  {
    id: 'trabescravo',
    title: '14. Não Utilização de Trabalho Escravo, Infantil ou Tráfico de Pessoas',
    desc: 'Declara que não utiliza trabalho análogo à escravidão, infantil ou ligado a tráfico de pessoas em sua cadeia produtiva e de suprimentos.',
    body: (d) => `DECLARAÇÃO DE NÃO UTILIZAÇÃO DE TRABALHO ESCRAVO, INFANTIL OU TRÁFICO DE PESSOAS\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, para os fins do ${d.modalidade} nº ${d.edital}, do(a) ${d.orgao}, que:\n\n` +
      `a) não utiliza, em nenhuma das etapas de sua cadeia produtiva e de suprimentos, mão de obra submetida a trabalho forçado ou em condições análogas à de escravo, conforme tipificado no art. 149 do Código Penal;\n\n` +
      `b) não utiliza trabalho infantil em qualquer fase de sua atividade, observados os limites do art. 7º, XXXIII, da Constituição Federal;\n\n` +
      `c) não emprega práticas ligadas ao tráfico de pessoas, conforme tipificado no art. 149-A do Código Penal e na Lei nº 13.344/2016;\n\n` +
      `d) responsabiliza-se pela observância da legislação trabalhista por parte de seus prepostos, empregados e subcontratados;\n\n` +
      `e) cumpre integralmente as normas de saúde e segurança do trabalho aplicáveis à sua atividade.`,
    bodyConsolidado: (d) => `Declara que: (a) não utiliza, em nenhuma das etapas de sua cadeia produtiva e de suprimentos, mão de obra submetida a trabalho forçado ou em condições análogas à de escravo, conforme tipificado no art. 149 do Código Penal; (b) não utiliza trabalho infantil em qualquer fase de sua atividade, observados os limites do art. 7º, XXXIII, da Constituição Federal; (c) não emprega práticas ligadas ao tráfico de pessoas, conforme art. 149-A do Código Penal e Lei nº 13.344/2016; (d) responsabiliza-se pela observância da legislação trabalhista por parte de seus prepostos, empregados e subcontratados; (e) cumpre integralmente as normas de saúde e segurança do trabalho aplicáveis à sua atividade.`
  },
  {
    id: 'eletronicos',
    title: '15. Veracidade de Documentos Eletrônicos',
    desc: 'Declara que todos os documentos, certidões e propostas enviados eletronicamente são autênticos e fiéis aos originais.',
    body: (d) => `DECLARAÇÃO DE VERACIDADE DE DOCUMENTOS ELETRÔNICOS\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, sob as penalidades cabíveis, em especial as previstas no art. 299 do Código Penal Brasileiro e no art. 155 da Lei nº 14.133/2021, que todos os documentos, certidões, propostas e demais arquivos apresentados eletronicamente na plataforma de licitações para fins do ${d.modalidade} nº ${d.edital}, do(a) ${d.orgao}, são autênticos, fiéis à verdade e correspondem a cópias exatas dos respectivos originais, comprometendo-se a apresentar os originais ou cópias autenticadas sempre que solicitada pela Administração, sob pena das sanções previstas em lei.`,
    bodyConsolidado: (d) => `Declara, sob as penalidades cabíveis, em especial as previstas no art. 299 do Código Penal e no art. 155 da Lei nº 14.133/2021, que todos os documentos, certidões, propostas e demais arquivos apresentados eletronicamente na plataforma de licitações são autênticos, fiéis à verdade e correspondem a cópias exatas dos respectivos originais, comprometendo-se a apresentar os originais ou cópias autenticadas sempre que solicitada pela Administração.`
  },
  {
    id: 'fiscalizacao',
    title: '16. Submissão à Fiscalização dos Órgãos de Controle',
    desc: 'Declara ciência de que a execução contratual estará sujeita ao controle e fiscalização, comprometendo-se a franquear acesso a documentos e registros.',
    body: (d) => `DECLARAÇÃO DE SUBMISSÃO À FISCALIZAÇÃO DOS ÓRGÃOS DE CONTROLE\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, para os fins do ${d.modalidade} nº ${d.edital}, do(a) ${d.orgao}, plena ciência de que a execução do contrato estará sujeita ao controle e fiscalização pela Administração contratante, pelos órgãos de controle interno e externo, em especial pelos Tribunais de Contas competentes, bem como pelos órgãos de controle social.\n\n` +
      `Compromete-se, ainda, a:\n\n` +
      `a) franquear amplo acesso a documentos, livros de registro contábil, fiscal, societário e trabalhista, registros eletrônicos, sistemas e quaisquer outras informações relacionadas ao objeto contratado, sempre que solicitado pela Administração ou pelos órgãos de controle;\n\n` +
      `b) prestar todos os esclarecimentos e fornecer todos os documentos requisitados nos prazos fixados;\n\n` +
      `c) colaborar com auditorias, inspeções e diligências eventualmente determinadas pelos órgãos competentes durante e após a vigência contratual, observados os prazos legais de guarda documental.`,
    bodyConsolidado: (d) => `Declara plena ciência de que a execução do contrato estará sujeita ao controle e fiscalização pela Administração contratante, pelos órgãos de controle interno e externo — em especial pelos Tribunais de Contas competentes — e pelos órgãos de controle social, comprometendo-se a: (a) franquear amplo acesso a documentos, livros de registro contábil, fiscal, societário e trabalhista, registros eletrônicos, sistemas e quaisquer outras informações relacionadas ao objeto contratado; (b) prestar todos os esclarecimentos e fornecer todos os documentos requisitados nos prazos fixados; (c) colaborar com auditorias, inspeções e diligências determinadas pelos órgãos competentes durante e após a vigência contratual, observados os prazos legais de guarda documental.`
  },
  {
    id: 'exequibilidade',
    title: '17. Viabilidade Econômica e Exequibilidade da Proposta',
    desc: 'Declara que os preços são exequíveis e contemplam todas as despesas diretas, indiretas, tributos, encargos e custos operacionais.',
    body: (d) => `DECLARAÇÃO DE VIABILIDADE ECONÔMICA E EXEQUIBILIDADE DA PROPOSTA\n\n` +
      `A empresa ${d.razaoSocial}, CNPJ ${d.cnpj}, por seu representante legal ${d.repNome}, DECLARA, para os fins do ${d.modalidade} nº ${d.edital}, do(a) ${d.orgao}, que:\n\n` +
      `a) os preços apresentados em sua proposta econômica são exequíveis e foram calculados de forma criteriosa, contemplando integralmente todas as despesas diretas e indiretas necessárias à execução do objeto;\n\n` +
      `b) a proposta inclui todos os tributos (federais, estaduais e municipais), taxas, contribuições sociais, custos operacionais, encargos trabalhistas e previdenciários, insumos, frete, seguros, lucros e demais despesas inerentes à execução contratual;\n\n` +
      `c) assume total responsabilidade por eventuais omissões, equívocos ou subdimensionamentos em sua proposta, não cabendo pleitos de reequilíbrio decorrentes de tais falhas;\n\n` +
      `d) está apta a executar o objeto pelos valores ofertados, mantendo-os firmes durante todo o prazo de validade da proposta.\n\n` +
      `Objeto: ${d.objeto}.`,
    bodyConsolidado: (d) => `Declara que: (a) os preços apresentados em sua proposta econômica são exequíveis e foram calculados de forma criteriosa, contemplando integralmente todas as despesas diretas e indiretas necessárias à execução do objeto; (b) a proposta inclui todos os tributos (federais, estaduais e municipais), taxas, contribuições sociais, custos operacionais, encargos trabalhistas e previdenciários, insumos, frete, seguros, lucros e demais despesas inerentes à execução contratual; (c) assume total responsabilidade por eventuais omissões, equívocos ou subdimensionamentos em sua proposta, não cabendo pleitos de reequilíbrio decorrentes de tais falhas; (d) está apta a executar o objeto pelos valores ofertados, mantendo-os firmes durante todo o prazo de validade da proposta.`
  }
];
