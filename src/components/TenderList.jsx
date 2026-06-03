import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { FileText, Calendar, DollarSign, Trash2 } from 'lucide-react'

export default function TenderList({ refreshTrigger }) {
  const [tenders, setTenders] = useState([])
  const [loading, setLoading] = useState(true)

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

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este edital?')) return
    
    try {
      const { error } = await supabase
        .from('licitacoes')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Remove da lista local
      setTenders(tenders.filter(t => t.id !== id))
    } catch (error) {
      console.error('Erro ao excluir:', error.message)
      alert('Erro ao excluir o edital.')
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
          <div key={tender.id} className="tender-card card">
            <div className="tender-header">
              <span className="tender-number">
                <FileText size={16} />
                {tender.numero_edital || 'S/N'}
              </span>
              <button 
                className="btn-icon btn-delete" 
                onClick={() => handleDelete(tender.id)}
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
    </div>
  )
}
