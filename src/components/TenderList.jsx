import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { FileText, Calendar, DollarSign, Trash2, X, Edit, Copy, Check, Save } from 'lucide-react'

export default function TenderList({ refreshTrigger }) {
  const [tenders, setTenders] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [selectedTender, setSelectedTender] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTenders()
  }, [refreshTrigger])

  const fetchTenders = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('licitacoes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTenders(data || [])
    } catch (error) {
      console.error('Erro ao buscar licitações:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation() // Prevent modal open
    if (!window.confirm('Tem certeza que deseja excluir este edital?')) return
    
    try {
      const { error } = await supabase
        .from('licitacoes')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTenders(tenders.filter(t => t.id !== id))
      if (selectedTender?.id === id) setSelectedTender(null)
    } catch (error) {
      console.error('Erro ao excluir:', error.message)
      alert('Erro ao excluir o edital.')
    }
  }

  const openModal = (tender) => {
    setSelectedTender(tender)
    setIsEditing(false)
    setEditForm({
      numero_edital: tender.numero_edital,
      objeto: tender.objeto,
      valor: tender.valor
    })
    setCopied(false)
  }

  const closeModal = () => {
    setSelectedTender(null)
    setIsEditing(false)
  }

  const handleCopy = () => {
    const textToCopy = `Edital: ${selectedTender.numero_edital || 'S/N'}\nValor: R$ ${selectedTender.valor || '0,00'}\n\nObjeto:\n${selectedTender.objeto || 'Não identificado'}`
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('licitacoes')
        .update({
          numero_edital: editForm.numero_edital,
          objeto: editForm.objeto,
          valor: editForm.valor
        })
        .eq('id', selectedTender.id)

      if (error) throw error

      // Update local state
      const updatedTender = { ...selectedTender, ...editForm }
      setTenders(tenders.map(t => t.id === updatedTender.id ? updatedTender : t))
      setSelectedTender(updatedTender)
      setIsEditing(false)
    } catch (error) {
      console.error('Erro ao atualizar:', error.message)
      alert('Erro ao salvar as edições.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="card loading-state">
        <div className="spinner"></div>
        <p>Carregando editais...</p>
      </div>
    )
  }

  if (tenders.length === 0) {
    return (
      <div className="card empty-state">
        <FileText size={48} className="text-muted" />
        <h3>Nenhum edital salvo</h3>
        <p>Faça o upload de um PDF para começar a extrair dados.</p>
      </div>
    )
  }

  return (
    <div className="tender-list-container">
      <h2>Meus Editais Salvos</h2>
      <div className="tender-grid">
        {tenders.map((tender) => (
          <div key={tender.id} className="tender-card card" onClick={() => openModal(tender)}>
            <div className="tender-header">
              <span className="tender-number">
                <FileText size={16} />
                {tender.numero_edital || 'S/N'}
              </span>
              <button 
                className="btn-icon btn-delete" 
                onClick={(e) => handleDelete(e, tender.id)}
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="tender-body">
              <p className="tender-object">{tender.objeto || 'Objeto não identificado'}</p>
            </div>
            
            <div className="tender-footer">
              <div className="tender-value">
                <DollarSign size={16} />
                <span>R$ {tender.valor || '0,00'}</span>
              </div>
              <div className="tender-date text-muted">
                <Calendar size={14} />
                <span>{new Date(tender.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selectedTender && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes do Edital</h3>
              <button className="btn-icon" onClick={closeModal} title="Fechar">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {isEditing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Número do Edital</label>
                    <input 
                      type="text" 
                      value={editForm.numero_edital} 
                      onChange={e => setEditForm({...editForm, numero_edital: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Valor (R$)</label>
                    <input 
                      type="text" 
                      value={editForm.valor} 
                      onChange={e => setEditForm({...editForm, valor: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Objeto</label>
                    <textarea 
                      rows={6}
                      value={editForm.objeto} 
                      onChange={e => setEditForm({...editForm, objeto: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="view-mode">
                  <div className="detail-row">
                    <strong>Número</strong>
                    <p>{selectedTender.numero_edital || 'S/N'}</p>
                  </div>
                  <div className="detail-row">
                    <strong>Data de Extração</strong>
                    <p>{new Date(selectedTender.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="detail-row">
                    <strong>Valor Estimado</strong>
                    <p className="text-success">R$ {selectedTender.valor || '0,00'}</p>
                  </div>
                  <div className="detail-row">
                    <strong>Objeto Completo</strong>
                    <p className="object-text">{selectedTender.objeto || 'Não identificado'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {isEditing ? (
                <>
                  <button className="btn-text" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancelar
                  </button>
                  <button className="btn-primary" onClick={handleSaveEdit} disabled={saving} style={{ width: 'auto' }}>
                    <Save size={16} style={{marginRight: '8px'}} />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-text" onClick={() => setIsEditing(true)}>
                    <Edit size={16} style={{marginRight: '8px', verticalAlign: 'middle'}} />
                    Editar Dados
                  </button>
                  <button className="btn-primary" onClick={handleCopy} style={{ width: 'auto' }}>
                    {copied ? (
                      <><Check size={16} style={{marginRight: '8px'}} /> Copiado!</>
                    ) : (
                      <><Copy size={16} style={{marginRight: '8px'}} /> Copiar Dados</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
