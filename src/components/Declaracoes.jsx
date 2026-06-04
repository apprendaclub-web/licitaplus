import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { DECLARATIONS } from '../lib/declarations';
import { generateDeclarationsPDF } from '../lib/pdfGenerator';
import { Plus, Trash2, UploadCloud, Search, FileText } from 'lucide-react';
import { extractTextFromPdf, parseTenderData } from '../lib/pdfExtractor';

export default function Declaracoes({ session }) {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    razaoSocial: '',
    cnpj: '',
    ie: '',
    endereco: '',
    repNome: '',
    repCpf: '',
    repCargo: '',
    repRg: '',
    logoB64: '',
    porte: 'NAO',
    incluirContador: false,
    contNome: '',
    contCrc: '',
    contCpf: '',
    contEscritorio: '',
    orgao: '',
    modalidade: 'Pregão Eletrônico',
    edital: '',
    objeto: '',
    cidade: 'Arroio do Sal/RS',
    data: new Date().toISOString().split('T')[0]
  });

  const [selectedDecs, setSelectedDecs] = useState({});
  const [customDecs, setCustomDecs] = useState([]);
  const [formato, setFormato] = useState('consolidado');

  useEffect(() => {
    fetchEmpresas();
  }, [session]);

  async function fetchEmpresas() {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setEmpresas(data);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  }

  const handleSelectEmpresa = (e) => {
    const emp = empresas.find(em => em.id === e.target.value);
    if (emp) {
      setFormData(prev => ({
        ...prev,
        razaoSocial: emp.razao_social || '',
        cnpj: emp.cnpj || '',
        ie: emp.ie || '',
        endereco: emp.endereco || '',
        repNome: emp.rep_nome || '',
        repCpf: emp.rep_cpf || '',
        repCargo: emp.rep_cargo || ''
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleAll = (state) => {
    const newSelected = {};
    DECLARATIONS.forEach(d => newSelected[d.id] = state);
    setSelectedDecs(newSelected);
  };

  const toggleDec = (id) => {
    setSelectedDecs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addCustomDec = () => {
    setCustomDecs([...customDecs, { id: Date.now(), titulo: '', texto: '' }]);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await extractTextFromPdf(file);
      const data = parseTenderData(text);
      if (data) {
        setFormData(prev => ({
          ...prev,
          edital: data.numero_edital || prev.edital,
          objeto: data.objeto || prev.objeto
        }));
        alert('Edital carregado e campos preenchidos automaticamente!');
      }
    } catch (err) {
      alert('Erro ao extrair PDF');
    }
    e.target.value = '';
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ ...prev, logoB64: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const updateCustomDec = (id, field, value) => {
    setCustomDecs(customDecs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCustomDec = (id) => {
    setCustomDecs(customDecs.filter(c => c.id !== id));
  };

  const handleGeneratePDF = () => {
    const selected = DECLARATIONS.filter(d => selectedDecs[d.id]);
    
    // Add custom pseudo-declarations
    const customs = customDecs.map(c => {
      const titulo = (c.titulo || 'Declaração Personalizada').toUpperCase();
      return {
        id: 'custom-' + c.id,
        title: c.titulo,
        custom: true,
        body: (d) => `${titulo}\n\nA empresa ${d.razaoSocial}, inscrita no CNPJ sob o nº ${d.cnpj}, com sede em ${d.endereco}, por seu representante legal ${d.repNome}, DECLARA, para os devidos fins, que:\n\n${c.texto}`,
        bodyConsolidado: (d) => c.texto,
        _customTitulo: titulo
      };
    });

    const finalSelected = [...selected, ...customs];

    if (finalSelected.length === 0) {
      alert('Selecione pelo menos uma declaração ou adicione uma personalizada.');
      return;
    }

    try {
      generateDeclarationsPDF(
        { ...formData, data: formData.data.split('-').reverse().join('/'), logoDataUrl: formData.logoB64 }, // basic date format
        finalSelected,
        formato
      );
    } catch (e) {
      alert('Erro ao gerar PDF: ' + e.message);
    }
  };

  const selectedCount = Object.values(selectedDecs).filter(Boolean).length + customDecs.length;

  return (
    <div className="lp-container">
      <div className="lp-wrap" style={{ padding: '0 16px' }}>

        <div className="panel" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <FileText size={40} className="text-primary" style={{ opacity: 0.8 }} />
              <div>
                <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.1rem' }}>Carregar Edital (extração automática)</h3>
                <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem' }}>Suba o PDF do edital e o sistema vai tentar preencher automaticamente os campos.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <label className="btn-lp" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UploadCloud size={18} /> Escolher PDF do Edital
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
              </label>
            </div>
          </div>
        </div>

        <div className="layout">
          <div>
            <div className="panel">
              <h2>Empresa Licitante</h2>
              <div className="company-bar">
                <select onChange={handleSelectEmpresa}>
                  <option value="">— Selecione uma empresa salva —</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.razao_social}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Razão Social</label>
                <input type="text" name="razaoSocial" value={formData.razaoSocial} onChange={handleInputChange} placeholder="Ex: EMPRESA EXEMPLO LTDA" />
              </div>
              <div className="row">
                <div className="field">
                  <label>CNPJ</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" name="cnpj" value={formData.cnpj} onChange={handleInputChange} placeholder="00.000.000/0001-00" />
                    <button type="button" className="btn-lp" style={{ padding: '0 12px' }} title="Buscar na Receita Federal">
                      <Search size={16} /> Buscar
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Inscrição Estadual</label>
                  <input type="text" name="ie" value={formData.ie} onChange={handleInputChange} placeholder="Opcional" />
                </div>
              </div>
              <div className="field">
                <label>Endereço Completo</label>
                <input type="text" name="endereco" value={formData.endereco} onChange={handleInputChange} placeholder="Rua, número, bairro, cidade/UF, CEP" />
              </div>

              <div className="section-divider">Representante Legal</div>
              <div className="field">
                <label>Nome</label>
                <input type="text" name="repNome" value={formData.repNome} onChange={handleInputChange} placeholder="Nome completo" />
              </div>
              <div className="row">
                <div className="field">
                  <label>CPF</label>
                  <input type="text" name="repCpf" value={formData.repCpf} onChange={handleInputChange} placeholder="000.000.000-00" />
                </div>
                <div className="field">
                  <label>Cargo</label>
                  <input type="text" name="repCargo" value={formData.repCargo} onChange={handleInputChange} placeholder="Ex: Sócio-Administrador" />
                </div>
              </div>
              <div className="field">
                <label>RG</label>
                <input type="text" name="repRg" value={formData.repRg} onChange={handleInputChange} placeholder="Ex: 000000000 SSP/RS" />
              </div>

              <div className="section-divider">Logo da Empresa (Opcional)</div>
              <div className="field">
                <label>Logo (PNG ou JPG — Aparecerá no topo das declarações)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} style={{ background: 'transparent', padding: 0, border: 'none' }} />
                  {formData.logoB64 && (
                    <button type="button" className="btn-ghost-lp" onClick={() => setFormData(prev => ({...prev, logoB64: ''}))}>Remover</button>
                  )}
                </div>
              </div>

              <div className="section-divider">Porte da Empresa</div>
              <div className="row" style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="radio" name="porte" value="ME" checked={formData.porte === 'ME'} onChange={handleInputChange} style={{ width: 'auto' }} /> ME (Microempresa)
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="radio" name="porte" value="EPP" checked={formData.porte === 'EPP'} onChange={handleInputChange} style={{ width: 'auto' }} /> EPP (Peq. Porte)
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="radio" name="porte" value="NAO" checked={formData.porte === 'NAO'} onChange={handleInputChange} style={{ width: 'auto' }} /> Outro
                </label>
              </div>

              <div className="field">
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" name="incluirContador" checked={formData.incluirContador} onChange={handleInputChange} style={{ width: 'auto' }} />
                  Incluir assinatura do contador (ME/EPP)
                </label>
              </div>

              {formData.incluirContador && (
                <div style={{ background: 'var(--panel-2)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                  <div className="field">
                    <label>Nome do Contador</label>
                    <input type="text" name="contNome" value={formData.contNome} onChange={handleInputChange} />
                  </div>
                  <div className="row">
                    <div className="field">
                      <label>CRC</label>
                      <input type="text" name="contCrc" value={formData.contCrc} onChange={handleInputChange} />
                    </div>
                    <div className="field">
                      <label>CPF</label>
                      <input type="text" name="contCpf" value={formData.contCpf} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="panel" style={{ marginTop: 24 }}>
              <h2>Dados da Licitação</h2>
              <div className="field">
                <label>Órgão / Entidade</label>
                <input type="text" name="orgao" value={formData.orgao} onChange={handleInputChange} placeholder="Ex: Prefeitura Municipal..." />
              </div>
              <div className="row">
                <div className="field">
                  <label>Modalidade</label>
                  <select name="modalidade" value={formData.modalidade} onChange={handleInputChange}>
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
                <div className="field">
                  <label>Nº do Edital / Processo</label>
                  <input type="text" name="edital" value={formData.edital} onChange={handleInputChange} placeholder="Ex: 001/2026" />
                </div>
              </div>
              <div className="field">
                <label>Objeto da Licitação</label>
                <textarea name="objeto" value={formData.objeto} onChange={handleInputChange} placeholder="Descrição resumida do objeto"></textarea>
              </div>
              <div className="row">
                <div className="field">
                  <label>Cidade (local da assinatura)</label>
                  <input type="text" name="cidade" value={formData.cidade} onChange={handleInputChange} />
                </div>
                <div className="field">
                  <label>Data</label>
                  <input type="date" name="data" value={formData.data} onChange={handleInputChange} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="panel">
              <h2>Declarações a Emitir</h2>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className="btn-ghost-lp btn-lp" onClick={() => toggleAll(true)} style={{ flex: 1 }}>Selecionar todas</button>
                <button className="btn-ghost-lp btn-lp" onClick={() => toggleAll(false)} style={{ flex: 1 }}>Limpar seleção</button>
              </div>
              
              <div className="declarations-list">
                {DECLARATIONS.map(d => (
                  <label key={d.id} className={`dec-item ${selectedDecs[d.id] ? 'checked' : ''}`}>
                    <input type="checkbox" checked={!!selectedDecs[d.id]} onChange={() => toggleDec(d.id)} />
                    <div className="dec-item-content">
                      <div className="dec-title">{d.title}</div>
                      <div className="dec-desc">{d.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="panel" style={{ marginTop: 24 }}>
              <h2>Declarações Personalizadas (opcional)</h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: 14, fontSize: '0.88rem', fontStyle: 'italic' }}>
                Para editais que exigem uma declaração específica fora da lista padrão.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {customDecs.map(c => (
                  <div key={c.id} style={{ background: 'var(--panel-2)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Título da Declaração</label>
                      <button className="btn-icon btn-delete" onClick={() => removeCustomDec(c.id)} style={{ padding: 4 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <input type="text" value={c.titulo} onChange={(e) => updateCustomDec(c.id, 'titulo', e.target.value)} placeholder="Ex: Declaração de Visita Técnica" style={{ width: '100%', marginBottom: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: 8 }} />
                    <textarea value={c.texto} onChange={(e) => updateCustomDec(c.id, 'texto', e.target.value)} placeholder="Insira apenas o corpo da declaração (A empresa X declara que...)." style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: 8, minHeight: 60, resize: 'vertical' }}></textarea>
                  </div>
                ))}
              </div>

              <button className="btn-ghost-lp btn-lp" onClick={addCustomDec} style={{ marginTop: 10 }}>
                <Plus size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Adicionar declaração personalizada
              </button>
            </div>
          </div>
        </div>

        <div className="action-bar">
          <div className="info">
            Selecionadas: <strong>{selectedCount}</strong> declarações
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Formato:</label>
            <select value={formato} onChange={e => setFormato(e.target.value)} style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', borderRadius: 4, fontFamily: 'Georgia,serif' }}>
              <option value="consolidado">Documento Único Consolidado (1 assinatura)</option>
              <option value="separado">Páginas Separadas (1 assinatura por declaração)</option>
            </select>
          </div>
          <button className="btn-generate" disabled={selectedCount === 0} onClick={handleGeneratePDF}>
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
