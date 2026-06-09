import { supabase, isConfigured } from './supabase';
import { Company, Licitacao, Contrato, Orgao, Portal } from '../types';

// Detect if we are in sandbox/demo mode
const isSandboxMode = () => {
  return !isConfigured || localStorage.getItem('licitaplus_sandbox') === 'true';
};

// HELPER: Get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  if (isSandboxMode() || !supabase) return 'sandbox-user';
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// ==========================================
// 1. COMPANIES OPERATIONS
// ==========================================
export const apiFetchCompanies = async (): Promise<Company[]> => {
  if (isSandboxMode() || !supabase) {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('empresa:'));
    return keys.map(k => JSON.parse(localStorage.getItem(k) || '{}'));
  }
  
  const { data, error } = await supabase
    .from('licitaplus_companies')
    .select('*')
    .order('razao_social', { ascending: true });
    
  if (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
  return data || [];
};

export const apiSaveCompany = async (company: Company): Promise<Company> => {
  const userId = await getCurrentUserId();
  
  if (isSandboxMode() || !supabase) {
    const key = 'empresa:' + company.razao_social.replace(/[\s/\\'"]/g, '_');
    const localComp = { ...company, id: company.id || 'local_' + Date.now(), user_id: userId || 'sandbox' };
    localStorage.setItem(key, JSON.stringify(localComp));
    return localComp;
  }

  const payload = {
    ...company,
    user_id: userId,
  };

  let result;
  if (company.id && !company.id.startsWith('local_')) {
    // Update
    const { data, error } = await supabase
      .from('licitaplus_companies')
      .update(payload)
      .eq('id', company.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    // Insert new
    // Remove temporary local_ id if exists
    const { id, ...cleanPayload } = payload;
    const { data, error } = await supabase
      .from('licitaplus_companies')
      .insert([cleanPayload])
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  return result;
};

export const apiDeleteCompany = async (company: Company): Promise<void> => {
  if (isSandboxMode() || !supabase) {
    const key = 'empresa:' + company.razao_social.replace(/[\s/\\'"]/g, '_');
    localStorage.removeItem(key);
    return;
  }

  if (company.id) {
    const { error } = await supabase
      .from('licitaplus_companies')
      .delete()
      .eq('id', company.id);
    if (error) throw error;
  }
};

// ==========================================
// 2. LICITACOES OPERATIONS
// ==========================================
export const apiFetchLicitacoes = async (): Promise<Licitacao[]> => {
  if (isSandboxMode() || !supabase) {
    const data = localStorage.getItem('licitaplus_licitacoes');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('licitaplus_licitacoes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const apiSaveLicitacao = async (licit: Licitacao): Promise<Licitacao> => {
  const userId = await getCurrentUserId();
  
  if (isSandboxMode() || !supabase) {
    const current = await apiFetchLicitacoes();
    const index = current.findIndex(l => l.id === licit.id);
    const updated = [...current];
    const item = { ...licit, user_id: userId || 'sandbox' };
    
    if (index >= 0) {
      updated[index] = item;
    } else {
      updated.push(item);
    }
    localStorage.setItem('licitaplus_licitacoes', JSON.stringify(updated));
    return item;
  }

  const payload = {
    ...licit,
    user_id: userId,
  };

  let result;
  // Check if exists in db
  const { data: check } = await supabase
    .from('licitaplus_licitacoes')
    .select('id')
    .eq('id', licit.id);

  if (check && check.length > 0) {
    const { data, error } = await supabase
      .from('licitaplus_licitacoes')
      .update(payload)
      .eq('id', licit.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('licitaplus_licitacoes')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  return result;
};

export const apiDeleteLicitacao = async (id: string): Promise<void> => {
  if (isSandboxMode() || !supabase) {
    const current = await apiFetchLicitacoes();
    const filtered = current.filter(l => l.id !== id);
    localStorage.setItem('licitaplus_licitacoes', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('licitaplus_licitacoes')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ==========================================
// 3. CONTRATOS OPERATIONS
// ==========================================
export const apiFetchContratos = async (): Promise<Contrato[]> => {
  if (isSandboxMode() || !supabase) {
    const data = localStorage.getItem('licitaplus_contratos');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('licitaplus_contratos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const apiSaveContrato = async (ct: Contrato): Promise<Contrato> => {
  const userId = await getCurrentUserId();
  
  if (isSandboxMode() || !supabase) {
    const current = await apiFetchContratos();
    const index = current.findIndex(c => c.id === ct.id);
    const updated = [...current];
    const item = { ...ct, user_id: userId || 'sandbox' };
    
    if (index >= 0) {
      updated[index] = item;
    } else {
      updated.push(item);
    }
    localStorage.setItem('licitaplus_contratos', JSON.stringify(updated));
    return item;
  }

  const payload = {
    ...ct,
    user_id: userId,
  };

  let result;
  const { data: check } = await supabase
    .from('licitaplus_contratos')
    .select('id')
    .eq('id', ct.id);

  if (check && check.length > 0) {
    const { data, error } = await supabase
      .from('licitaplus_contratos')
      .update(payload)
      .eq('id', ct.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('licitaplus_contratos')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  return result;
};

export const apiDeleteContrato = async (id: string): Promise<void> => {
  if (isSandboxMode() || !supabase) {
    const current = await apiFetchContratos();
    const filtered = current.filter(c => c.id !== id);
    localStorage.setItem('licitaplus_contratos', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('licitaplus_contratos')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ==========================================
// 4. ORGAOS OPERATIONS
// ==========================================
export const apiFetchOrgaos = async (): Promise<Orgao[]> => {
  if (isSandboxMode() || !supabase) {
    const data = localStorage.getItem('licitaplus_orgaos');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('licitaplus_orgaos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const apiSaveOrgao = async (org: Orgao): Promise<Orgao> => {
  const userId = await getCurrentUserId();
  
  if (isSandboxMode() || !supabase) {
    const current = await apiFetchOrgaos();
    const index = current.findIndex(o => o.id === org.id);
    const updated = [...current];
    const item = { ...org, user_id: userId || 'sandbox' };
    
    if (index >= 0) {
      updated[index] = item;
    } else {
      updated.push(item);
    }
    localStorage.setItem('licitaplus_orgaos', JSON.stringify(updated));
    return item;
  }

  const payload = {
    ...org,
    user_id: userId,
  };

  let result;
  const { data: check } = await supabase
    .from('licitaplus_orgaos')
    .select('id')
    .eq('id', org.id);

  if (check && check.length > 0) {
    const { data, error } = await supabase
      .from('licitaplus_orgaos')
      .update(payload)
      .eq('id', org.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('licitaplus_orgaos')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  return result;
};

export const apiDeleteOrgao = async (id: string): Promise<void> => {
  if (isSandboxMode() || !supabase) {
    const current = await apiFetchOrgaos();
    const filtered = current.filter(o => o.id !== id);
    localStorage.setItem('licitaplus_orgaos', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('licitaplus_orgaos')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ==========================================
// 5. PORTAIS OPERATIONS
// ==========================================
export const apiFetchPortais = async (): Promise<Portal[]> => {
  if (isSandboxMode() || !supabase) {
    const data = localStorage.getItem('licitaplus_portais');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('licitaplus_portais')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const apiSavePortal = async (port: Portal): Promise<Portal> => {
  const userId = await getCurrentUserId();
  
  if (isSandboxMode() || !supabase) {
    const current = await apiFetchPortais();
    const index = current.findIndex(p => p.id === port.id);
    const updated = [...current];
    const item = { ...port, user_id: userId || 'sandbox' };
    
    if (index >= 0) {
      updated[index] = item;
    } else {
      updated.push(item);
    }
    localStorage.setItem('licitaplus_portais', JSON.stringify(updated));
    return item;
  }

  const payload = {
    ...port,
    user_id: userId,
  };

  let result;
  const { data: check } = await supabase
    .from('licitaplus_portais')
    .select('id')
    .eq('id', port.id);

  if (check && check.length > 0) {
    const { data, error } = await supabase
      .from('licitaplus_portais')
      .update(payload)
      .eq('id', port.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('licitaplus_portais')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  return result;
};

export const apiDeletePortal = async (id: string): Promise<void> => {
  if (isSandboxMode() || !supabase) {
    const current = await apiFetchPortais();
    const filtered = current.filter(p => p.id !== id);
    localStorage.setItem('licitaplus_portais', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('licitaplus_portais')
    .delete()
    .eq('id', id);
  if (error) throw error;
};
