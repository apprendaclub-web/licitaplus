import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generateProposalPDF } from '../lib/pdfProposalGenerator';
import { Plus, Trash2, Copy, Diamond } from 'lucide-react';

export default function Propostas({ session }) {
  const [empresas, setEmpresas] = useState([]);
  const [tipoProposta, setTipoProposta] = useState('preco');
  const [itemsMode, setItemsMode] = useState('simples');

  const [formData, setFormData] = useState({
    razaoSocial: '',
    cnpj: '',
    ie: '',
    endereco: '',
    repNome: '',
    repCpf: '',
    repCargo: '',
    telefone: '',
    email: '',
    logoB64: '',
    orgao: '',
    modalidade: 'Pregão Eletrônico',
    edital: '',
    objeto: '',
    cidade: 'Arroio do Sal/RS',
    data: new Date().toISOString().split('T')[0],
    
    validade: '60 (sessenta) dias',
    prazoEntrega: '',
    pagamento: '',
    garantia: '',
    observacoes: '',
    
    banco: '',
    agencia: '',
    conta: '',
    tipoConta: 'Conta Corrente',
    pix: '',

    tecnicaObjeto: '',
    metodologia: '',
    cronograma: '',
    qualificacoes: '',
    recursos: ''
  });

  const [items, setItems] = useState([
    { id: Date.now(), item: '1', codigo: '', descricao: '', marca: '', unidade: 'UN', tipoCalculo: 'qtd', qtd: '1', unitario: '' }
  ]);

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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value } : it));
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

  const addItem = () => {
    setItems([...items, { id: Date.now(), item: String(items.length + 1), codigo: '', descricao: '', marca: '', unidade: 'UN', tipoCalculo: 'qtd', qtd: '1', unitario: '' }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(it => it.id !== id));
    }
  };

  const parseNumber = (val) => {
    if (!val) return 0;
    let s = String(val).replace(/R\$/g, '').replace(/\s/g, '');
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    return parseFloat(s) || 0;
  };

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateTotal = () => {
    return items.reduce((acc, it) => {
      const unit = parseNumber(it.unitario);
      if (it.tipoCalculo === 'fechado') return acc + unit;
      const qtd = parseNumber(it.qtd);
      return acc + (qtd * unit);
    }, 0);
  };

  const handleGeneratePDF = () => {
    try {
      const exportData = {
        ...formData,
        data: formData.data.split('-').reverse().join('/'),
        items: items,
        totalGeral: calculateTotal(),
        logoDataUrl: formData.logoB64
      };
      generateProposalPDF(exportData, tipoProposta, itemsMode);
    } catch (e) {
      alert('Erro ao gerar proposta: ' + e.message);
    }
  };

  return (
    <div className="lp-container">
      <div className="lp-wrap" style={{ padding: '0 16px' }}>
        
        <div className="panel" style={{ marginBottom: 24 }}>
          <h2><Diamond size={18} style={{ color: 'var(--accent)', marginRight: 8, display: 'inline' }}/> Tipo de Proposta</h2>
          <div className="proposal-type-selector">
            <button className={`proposal-type-btn ${tipoProposta === 'preco' ? 'active' : ''}`} onClick={() => setTipoProposta('preco')}>
              <div className="ptype-title">Proposta de Preço</div>
              <div className="ptype-desc">Foco apenas nos itens, quantidades e valores ofertados.</div>
            </button>
            <button className={`proposal-type-btn ${tipoProposta === 'tecnica' ? 'active' : ''}`} onClick={() => setTipoProposta('tecnica')}>
              <div className="ptype-title">Proposta Técnica</div>
              <div className="ptype-desc">Foco na metodologia, capacidade técnica e cronograma.</div>
            </button>
            <button className={`proposal-type-btn ${tipoProposta === 'completa' ? 'active' : ''}`} onClick={() => setTipoProposta('completa')}>
              <div className="ptype-title">Comercial Completa</div>
              <div className="ptype-desc">Une itens, metodologia, dados bancários e prazos.</div>
            </button>
          </div>
        </div>

        <div className="layout">
          <div>
            <div className="panel">
              <h2>Empresa e Licitação</h2>
              
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
                <input type="text" name="razaoSocial" value={formData.razaoSocial} onChange={handleInputChange} />
              </div>
              <div className="row">
                <div className="field">
                  <label>CNPJ</label>
                  <input type="text" name="cnpj" value={formData.cnpj} onChange={handleInputChange} />
                </div>
                <div className="field">
                  <label>I.E.</label>
                  <input type="text" name="ie" value={formData.ie} onChange={handleInputChange} />
                </div>
              </div>
              <div className="field">
                <label>Endereço</label>
                <input type="text" name="endereco" value={formData.endereco} onChange={handleInputChange} />
              </div>

              <div className="row">
                <div className="field">
                  <label>Telefone</label>
                  <input type="text" name="telefone" value={formData.telefone} onChange={handleInputChange} />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
                </div>
              </div>

              <div className="section-divider">Representante</div>
              <div className="field">
                <label>Nome do Representante</label>
                <input type="text" name="repNome" value={formData.repNome} onChange={handleInputChange} />
              </div>
              <div className="row">
                <div className="field">
                  <label>CPF</label>
                  <input type="text" name="repCpf" value={formData.repCpf} onChange={handleInputChange} />
                </div>
                <div className="field">
                  <label>Cargo</label>
                  <input type="text" name="repCargo" value={formData.repCargo} onChange={handleInputChange} />
                </div>
              </div>

              <div className="section-divider">Logo da Proposta (Opcional)</div>
              <div className="field">
                <label>Logo (PNG ou JPG — Aparecerá no topo da proposta)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} style={{ background: 'transparent', padding: 0, border: 'none' }} />
                  {formData.logoB64 && (
                    <button type="button" className="btn-ghost-lp" onClick={() => setFormData(prev => ({...prev, logoB64: ''}))}>Remover</button>
                  )}
                </div>
              </div>

              <div className="section-divider">Licitação</div>
              <div className="field">
                <label>Órgão/Entidade</label>
                <input type="text" name="orgao" value={formData.orgao} onChange={handleInputChange} />
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
                  <label>Nº Edital</label>
                  <input type="text" name="edital" value={formData.edital} onChange={handleInputChange} />
                </div>
              </div>
              <div className="field">
                <label>Objeto</label>
                <textarea name="objeto" value={formData.objeto} onChange={handleInputChange} style={{ minHeight: 60 }}></textarea>
              </div>
              <div className="row">
                <div className="field">
                  <label>Cidade (Localização)</label>
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
            {(tipoProposta === 'tecnica' || tipoProposta === 'completa') && (
              <div className="panel" style={{ marginBottom: 24 }}>
                <h2>Proposta Técnica</h2>
                <div className="field">
                  <label>Descrição Detalhada do Objeto Ofertado</label>
                  <textarea name="tecnicaObjeto" value={formData.tecnicaObjeto} onChange={handleInputChange}></textarea>
                </div>
                <div className="field">
                  <label>Metodologia / Plano de Trabalho</label>
                  <textarea name="metodologia" value={formData.metodologia} onChange={handleInputChange}></textarea>
                </div>
                <div className="field">
                  <label>Cronograma de Execução</label>
                  <textarea name="cronograma" value={formData.cronograma} onChange={handleInputChange}></textarea>
                </div>
                <div className="field">
                  <label>Qualificações e Experiência</label>
                  <textarea name="qualificacoes" value={formData.qualificacoes} onChange={handleInputChange}></textarea>
                </div>
                <div className="field">
                  <label>Equipamentos e Recursos</label>
                  <textarea name="recursos" value={formData.recursos} onChange={handleInputChange}></textarea>
                </div>
              </div>
            )}

            {(tipoProposta === 'preco' || tipoProposta === 'completa') && (
              <div className="panel" style={{ marginBottom: 24 }}>
                <h2>Condições Comerciais</h2>
                <div className="row">
                  <div className="field">
                    <label>Validade da Proposta</label>
                    <input type="text" name="validade" value={formData.validade} onChange={handleInputChange} placeholder="Ex: 60 (sessenta) dias" />
                  </div>
                  <div className="field">
                    <label>Prazo de Entrega/Execução</label>
                    <input type="text" name="prazoEntrega" value={formData.prazoEntrega} onChange={handleInputChange} placeholder="Ex: 10 dias úteis" />
                  </div>
                </div>
                {tipoProposta === 'completa' && (
                  <div className="row">
                    <div className="field">
                      <label>Pagamento</label>
                      <input type="text" name="pagamento" value={formData.pagamento} onChange={handleInputChange} placeholder="Ex: 30 dias após emissão da NF" />
                    </div>
                    <div className="field">
                      <label>Garantia</label>
                      <input type="text" name="garantia" value={formData.garantia} onChange={handleInputChange} placeholder="Ex: 12 meses" />
                    </div>
                  </div>
                )}
                <div className="field">
                  <label>Observações Extras</label>
                  <textarea name="observacoes" value={formData.observacoes} onChange={handleInputChange} style={{ minHeight: 60 }}></textarea>
                </div>

                <div className="section-divider">Dados Bancários</div>
                <div className="row">
                  <div className="field">
                    <label>Banco</label>
                    <input type="text" name="banco" value={formData.banco} onChange={handleInputChange} />
                  </div>
                  <div className="field">
                    <label>Agência</label>
                    <input type="text" name="agencia" value={formData.agencia} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="row">
                  <div className="field">
                    <label>Tipo de Conta</label>
                    <select name="tipoConta" value={formData.tipoConta} onChange={handleInputChange}>
                      <option>Conta Corrente</option>
                      <option>Conta Poupança</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Conta</label>
                    <input type="text" name="conta" value={formData.conta} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="field">
                  <label>Chave PIX</label>
                  <input type="text" name="pix" value={formData.pix} onChange={handleInputChange} />
                </div>
              </div>
            )}
          </div>
        </div>

        {(tipoProposta === 'preco' || tipoProposta === 'completa') && (
          <div className="panel" style={{ marginTop: 24, overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2>Tabela de Itens e Valores</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Visualização:</label>
                <select value={itemsMode} onChange={e => setItemsMode(e.target.value)} style={{ padding: '6px 12px', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4 }}>
                  <option value="simples">Simples (Qtd x Valor)</option>
                  <option value="completa">Completa (Marcas, Unidade, Códigos)</option>
                </select>
              </div>
            </div>

            <table className="items-table">
              <thead>
                {itemsMode === 'simples' ? (
                  <tr>
                    <th style={{ width: '40%' }}>Descrição</th>
                    <th style={{ width: '130px' }}>Tipo de Cálculo</th>
                    <th style={{ width: '90px' }}>Qtd/Meses</th>
                    <th style={{ width: '130px' }}>Valor Unit. (R$)</th>
                    <th style={{ width: '130px' }}>Total (R$)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: '50px' }}>Item</th>
                    <th style={{ width: '90px' }}>Código</th>
                    <th>Descrição</th>
                    <th style={{ width: '100px' }}>Marca</th>
                    <th style={{ width: '70px' }}>Unid.</th>
                    <th style={{ width: '110px' }}>Tipo</th>
                    <th style={{ width: '80px' }}>Qtd</th>
                    <th style={{ width: '110px' }}>Valor (R$)</th>
                    <th style={{ width: '110px' }}>Total (R$)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                )}
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const unit = parseNumber(it.unitario);
                  let total = 0;
                  if (it.tipoCalculo === 'fechado') total = unit;
                  else total = parseNumber(it.qtd) * unit;

                  return itemsMode === 'simples' ? (
                    <tr key={it.id}>
                      <td><textarea value={it.descricao} onChange={e => handleItemChange(it.id, 'descricao', e.target.value)}></textarea></td>
                      <td>
                        <select value={it.tipoCalculo} onChange={e => handleItemChange(it.id, 'tipoCalculo', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)' }}>
                          <option value="qtd">Qtd × Valor</option>
                          <option value="mensal">Mensal × Meses</option>
                          <option value="fechado">Valor Fechado</option>
                        </select>
                      </td>
                      <td>
                        <input type="text" value={it.qtd} onChange={e => handleItemChange(it.id, 'qtd', e.target.value)} disabled={it.tipoCalculo === 'fechado'} style={{ opacity: it.tipoCalculo === 'fechado' ? 0.4 : 1 }} placeholder="1" />
                      </td>
                      <td><input type="text" value={it.unitario} onChange={e => handleItemChange(it.id, 'unitario', e.target.value)} placeholder="0,00" /></td>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>R$ {formatCurrency(total)}</td>
                      <td><button className="btn-icon btn-delete" onClick={() => removeItem(it.id)}><Trash2 size={16} /></button></td>
                    </tr>
                  ) : (
                    <tr key={it.id}>
                      <td><input type="text" value={it.item} onChange={e => handleItemChange(it.id, 'item', e.target.value)} style={{ textAlign: 'center' }} /></td>
                      <td><input type="text" value={it.codigo} onChange={e => handleItemChange(it.id, 'codigo', e.target.value)} /></td>
                      <td><textarea value={it.descricao} onChange={e => handleItemChange(it.id, 'descricao', e.target.value)}></textarea></td>
                      <td><input type="text" value={it.marca} onChange={e => handleItemChange(it.id, 'marca', e.target.value)} /></td>
                      <td><input type="text" value={it.unidade} onChange={e => handleItemChange(it.id, 'unidade', e.target.value)} placeholder="UN" /></td>
                      <td>
                        <select value={it.tipoCalculo} onChange={e => handleItemChange(it.id, 'tipoCalculo', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.8rem' }}>
                          <option value="qtd">Qtd × Valor</option>
                          <option value="mensal">Mensal × Meses</option>
                          <option value="fechado">Valor Fechado</option>
                        </select>
                      </td>
                      <td>
                        <input type="text" value={it.qtd} onChange={e => handleItemChange(it.id, 'qtd', e.target.value)} disabled={it.tipoCalculo === 'fechado'} style={{ opacity: it.tipoCalculo === 'fechado' ? 0.4 : 1 }} placeholder="1" />
                      </td>
                      <td><input type="text" value={it.unitario} onChange={e => handleItemChange(it.id, 'unitario', e.target.value)} placeholder="0,00" /></td>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>R$ {formatCurrency(total)}</td>
                      <td><button className="btn-icon btn-delete" onClick={() => removeItem(it.id)}><Trash2 size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={itemsMode === 'simples' ? 4 : 8} style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>VALOR TOTAL DA PROPOSTA:</td>
                  <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>R$ {formatCurrency(calculateTotal())}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <button className="btn-ghost-lp btn-lp" onClick={addItem} style={{ marginTop: 12 }}>
              <Plus size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Adicionar Linha
            </button>
          </div>
        )}

        <div className="action-bar" style={{ marginTop: 24 }}>
          <div className="info">
            Tudo pronto para gerar sua <strong>Proposta {tipoProposta === 'preco' ? 'de Preço' : tipoProposta === 'tecnica' ? 'Técnica' : 'Comercial'}</strong>
          </div>
          <button className="btn-generate" onClick={handleGeneratePDF}>
            Gerar Proposta em PDF
          </button>
        </div>
        
      </div>
    </div>
  );
}
