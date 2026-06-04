import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Briefcase, Building2, Globe, FileText, FileCheck, Plus, Trash2, Edit } from 'lucide-react';

export default function Gestao({ session }) {
  const [activeTab, setActiveTab] = useState('empresas');
  const [data, setData] = useState({
    empresas: [],
    portais: [],
    orgaos: [],
    licitacoes: [],
    contratos: []
  });
  const [loading, setLoading] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (session) fetchAllData();
  }, [session, activeTab]);

  async function fetchAllData() {
    setLoading(true);
    try {
      const { data: records, error } = await supabase
        .from(activeTab)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && records) {
        setData(prev => ({ ...prev, [activeTab]: records }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      await supabase.from(activeTab).delete().eq('id', id);
      fetchAllData();
    } catch (e) {
      alert('Erro ao excluir: ' + e.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, user_id: session.user.id };
      if (payload.id) {
        await supabase.from(activeTab).update(payload).eq('id', payload.id);
      } else {
        await supabase.from(activeTab).insert([payload]);
      }
      setShowForm(false);
      setFormData({});
      fetchAllData();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
  };

  const openForm = (item = null) => {
    setFormData(item || {});
    setShowForm(true);
  };

  const renderEmpresasTable = () => (
    <table className="items-table">
      <thead><tr><th>Razão Social</th><th>CNPJ</th><th>Representante</th><th>Ações</th></tr></thead>
      <tbody>
        {data.empresas.map(emp => (
          <tr key={emp.id}>
            <td>{emp.razao_social}</td>
            <td>{emp.cnpj}</td>
            <td>{emp.rep_nome}</td>
            <td style={{width: 80}}>
              <button className="btn-icon" onClick={() => openForm(emp)}><Edit size={16}/></button>
              <button className="btn-icon btn-delete" onClick={() => handleDelete(emp.id)}><Trash2 size={16}/></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderPortaisTable = () => (
    <table className="items-table">
      <thead><tr><th>Nome do Portal</th><th>Link</th><th>Usuário</th><th>Ações</th></tr></thead>
      <tbody>
        {data.portais.map(p => (
          <tr key={p.id}>
            <td>{p.nome}</td>
            <td><a href={p.link} target="_blank" rel="noreferrer" style={{color: 'var(--accent)'}}>{p.link}</a></td>
            <td>{p.usuario}</td>
            <td style={{width: 80}}>
              <button className="btn-icon" onClick={() => openForm(p)}><Edit size={16}/></button>
              <button className="btn-icon btn-delete" onClick={() => handleDelete(p.id)}><Trash2 size={16}/></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderOrgaosTable = () => (
    <table className="items-table">
      <thead><tr><th>Órgão Licitante</th><th>Cidade</th><th>Estado</th><th>Ações</th></tr></thead>
      <tbody>
        {data.orgaos.map(o => (
          <tr key={o.id}>
            <td>{o.nome}</td>
            <td>{o.cidade}</td>
            <td>{o.estado}</td>
            <td style={{width: 80}}>
              <button className="btn-icon" onClick={() => openForm(o)}><Edit size={16}/></button>
              <button className="btn-icon btn-delete" onClick={() => handleDelete(o.id)}><Trash2 size={16}/></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const menus = [
    { id: 'empresas', icon: Building2, label: 'Empresas' },
    { id: 'portais', icon: Globe, label: 'Portais' },
    { id: 'orgaos', icon: Briefcase, label: 'Órgãos' },
    { id: 'licitacoes', icon: FileText, label: 'Licitações' },
    { id: 'contratos', icon: FileCheck, label: 'Contratos' }
  ];

  return (
    <div className="lp-container" style={{ display: 'flex', gap: 24, padding: '0 16px', height: 'calc(100vh - 120px)' }}>
      {/* Sidebar de Gestão */}
      <div className="panel" style={{ width: 250, flexShrink: 0, overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Módulos de Gestão</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {menus.map(m => {
            const Icon = m.icon;
            const isActive = activeTab === m.id;
            return (
              <button 
                key={m.id}
                onClick={() => { setActiveTab(m.id); setShowForm(false); }}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: isActive ? 'var(--panel-2)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  textAlign: 'left', fontWeight: isActive ? 600 : 400, transition: '0.2s'
                }}
              >
                <Icon size={18} /> {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2>Gerenciar {menus.find(m => m.id === activeTab)?.label}</h2>
          {!showForm && (
            <button className="btn-primary" onClick={() => openForm()} style={{ width: 'auto' }}>
              <Plus size={18} style={{ marginRight: 8 }}/> Novo Registro
            </button>
          )}
        </div>

        {loading && !showForm ? (
          <div className="text-muted">Carregando dados...</div>
        ) : showForm ? (
          <form onSubmit={handleSave} style={{ background: 'var(--panel-2)', padding: 24, borderRadius: 8 }}>
            
            {activeTab === 'empresas' && (
              <>
                <div className="field">
                  <label>Razão Social</label>
                  <input type="text" value={formData.razao_social || ''} onChange={e => setFormData({...formData, razao_social: e.target.value})} required/>
                </div>
                <div className="row">
                  <div className="field">
                    <label>CNPJ</label>
                    <input type="text" value={formData.cnpj || ''} onChange={e => setFormData({...formData, cnpj: e.target.value})} required/>
                  </div>
                  <div className="field">
                    <label>Representante</label>
                    <input type="text" value={formData.rep_nome || ''} onChange={e => setFormData({...formData, rep_nome: e.target.value})}/>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'portais' && (
              <>
                <div className="field">
                  <label>Nome do Portal</label>
                  <input type="text" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} required/>
                </div>
                <div className="field">
                  <label>Link de Acesso</label>
                  <input type="url" value={formData.link || ''} onChange={e => setFormData({...formData, link: e.target.value})}/>
                </div>
                <div className="row">
                  <div className="field">
                    <label>Usuário/Login</label>
                    <input type="text" value={formData.usuario || ''} onChange={e => setFormData({...formData, usuario: e.target.value})}/>
                  </div>
                  <div className="field">
                    <label>Senha</label>
                    <input type="text" value={formData.senha || ''} onChange={e => setFormData({...formData, senha: e.target.value})}/>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'orgaos' && (
              <>
                <div className="field">
                  <label>Nome do Órgão</label>
                  <input type="text" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} required/>
                </div>
                <div className="row">
                  <div className="field">
                    <label>Cidade</label>
                    <input type="text" value={formData.cidade || ''} onChange={e => setFormData({...formData, cidade: e.target.value})}/>
                  </div>
                  <div className="field">
                    <label>Estado</label>
                    <input type="text" value={formData.estado || ''} onChange={e => setFormData({...formData, estado: e.target.value})}/>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'licitacoes' && (
              <p className="text-muted">A tabela de Licitações possui muitos campos (modalidade, dados de edital). Para a versão inicial, a edição de licitações é feita pelo Dashboard de Editais.</p>
            )}
            
            {activeTab === 'contratos' && (
              <p className="text-muted">Gestão de contratos e comissões (Em desenvolvimento).</p>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={activeTab === 'licitacoes' || activeTab === 'contratos'}>Salvar</button>
              <button type="button" className="btn-ghost-lp" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {data[activeTab]?.length === 0 ? (
              <div className="empty-state" style={{ padding: 40, background: 'var(--panel-2)', borderRadius: 8 }}>
                <p className="text-muted">Nenhum registro encontrado em {menus.find(m=>m.id===activeTab)?.label}.</p>
              </div>
            ) : (
              <>
                {activeTab === 'empresas' && renderEmpresasTable()}
                {activeTab === 'portais' && renderPortaisTable()}
                {activeTab === 'orgaos' && renderOrgaosTable()}
                {activeTab === 'licitacoes' && <p className="text-muted">As licitações podem ser vistas no Dashboard principal.</p>}
                {activeTab === 'contratos' && <p className="text-muted">Área de contratos em construção.</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
