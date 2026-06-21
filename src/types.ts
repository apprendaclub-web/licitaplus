export interface Company {
  id?: string;
  user_id?: string;
  razao_social: string;
  cnpj: string;
  ie?: string;
  endereco: string;
  telefone?: string;
  email?: string;
  rep_nome: string;
  rep_cpf: string;
  rep_cargo: string;
  rep_rg: string;
  porte: 'ME' | 'EPP' | 'NAO';
  incluir_contador: boolean;
  cont_nome?: string;
  cont_crc?: string;
  cont_cpf?: string;
  cont_escritorio?: string;
  logo_data_url?: string | null;
  created_at?: string;
}

export interface TimelineEvent {
  id: string;
  tipo: 'obs' | 'alerta' | 'doc' | 'ligacao' | 'sessao' | 'status';
  msg: string;
  autor: string;
  dt: string;
}

export interface Licitacao {
  id: string;
  user_id?: string;
  empresa: string;
  orgao_id?: string; // Links to Orgao
  orgao_nome: string;
  processo: string;
  portal: string;
  status: 'aberta' | 'aguardando' | 'suspensa' | 'encerrada' | 'concluida';
  objeto: string;
  reabertura?: string; // ISO DateTime
  valor_est: number;
  resp?: string;
  link?: string;
  resultado?: 'ganhou' | 'perdeu' | '';
  valor_prop: number;
  obs?: string;
  timeline: TimelineEvent[];
  ia_analise?: any;
  created_at?: string;
}

export interface Parcela {
  idx: number;
  label: string;
  valor: number;
  dt_prevista: string;
  status: 'pag_registrado' | 'pendente';
  dt_recebimento?: string;
  obs?: string;
}

export interface Contrato {
  id: string;
  user_id?: string;
  empresa: string;
  numero: string;
  licit_id?: string;
  status: 'em_andamento' | 'encerrado_contrato';
  objeto: string;
  valor: number;
  perc_comissao: number;
  resp?: string;
  inicio?: string;
  fim?: string;
  num_parcelas: number;
  periodo: 'mensal' | 'bimestral' | 'trimestral' | 'anual' | 'unico';
  dt_inicio_parcela?: string;
  obs?: string;
  parcelas: Parcela[];
  created_at?: string;
}

export interface Orgao {
  id: string;
  user_id?: string;
  nome: string;
  cnpj?: string;
  cidade?: string;
  categoria: 'municipal' | 'estadual' | 'federal' | 'outro';
  created_at?: string;
}

export interface Portal {
  id: string;
  user_id?: string;
  nome: string;
  url?: string;
  created_at?: string;
}

export interface ItemProposta {
  item?: string;
  codigo?: string;
  descricao: string;
  marca?: string;
  unidade?: string;
  tipoCalculo: 'qtd' | 'mensal' | 'fechado';
  qtd?: string;
  unitario: string;
}
