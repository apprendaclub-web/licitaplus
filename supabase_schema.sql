-- ====================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - LICITA PLUS
-- COPIE ESTE SCRIPT INTEIRO E COLE NO SQL EDITOR DO SEU SUPABASE
-- ====================================================================

-- 1. TABELA DE EMPRESAS (licitaplus_companies)
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

-- Habilitar RLS para Empresas
ALTER TABLE public.licitaplus_companies ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Empresas
CREATE POLICY "Gerenciamento total de Empresas pelo próprio usuário" 
ON public.licitaplus_companies FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);


-- 2. TABELA DE LICITAÇÕES (licitaplus_licitacoes)
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

-- Habilitar RLS para Licitações
ALTER TABLE public.licitaplus_licitacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Licitações
CREATE POLICY "Gerenciamento total de Licitações pelo próprio usuário" 
ON public.licitaplus_licitacoes FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);


-- 3. TABELA DE CONTRATOS (licitaplus_contratos)
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

-- Habilitar RLS para Contratos
ALTER TABLE public.licitaplus_contratos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Contratos
CREATE POLICY "Gerenciamento total de Contratos pelo próprio usuário" 
ON public.licitaplus_contratos FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);


-- 4. TABELA DE ÓRGÃOS (licitaplus_orgaos)
CREATE TABLE IF NOT EXISTS public.licitaplus_orgaos (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cnpj TEXT,
    cidade TEXT,
    categoria TEXT NOT NULL CHECK (categoria IN ('municipal', 'estadual', 'federal', 'outro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para Órgãos
ALTER TABLE public.licitaplus_orgaos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Órgãos
CREATE POLICY "Gerenciamento total de Órgãos pelo próprio usuário" 
ON public.licitaplus_orgaos FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);


-- 5. TABELA DE PORTAIS DE COMPRAS (licitaplus_portais)
CREATE TABLE IF NOT EXISTS public.licitaplus_portais (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para Portais
ALTER TABLE public.licitaplus_portais ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Portais
CREATE POLICY "Gerenciamento total de Portais pelo próprio usuário" 
ON public.licitaplus_portais FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
