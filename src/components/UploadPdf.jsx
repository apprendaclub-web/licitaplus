import { useState, useRef } from 'react'
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { extractTextFromPdf, parseTenderData } from '../lib/pdfExtractor'
import { supabase } from '../supabaseClient'

export default function UploadPdf({ user, onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    
    if (selectedFile.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF válido.')
      return
    }

    setFile(selectedFile)
    setError('')
    setExtractedData(null)
    setLoading(true)

    try {
      const text = await extractTextFromPdf(selectedFile)
      const data = parseTenderData(text)
      setExtractedData(data)
    } catch (err) {
      console.error(err)
      setError('Erro ao processar o PDF. Certifique-se de que é um documento legível.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('licitacoes')
        .insert([
          { 
            user_id: user.id,
            numero_edital: extractedData.numero_edital,
            objeto: extractedData.objeto,
            valor: extractedData.valor
          }
        ])

      if (insertError) throw insertError

      setFile(null)
      setExtractedData(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (onUploadSuccess) onUploadSuccess()
      
    } catch (err) {
      console.error(err)
      setError(err.message || 'Erro ao salvar os dados no banco.')
    } finally {
      setLoading(false)
    }
  }

  const handleDataChange = (field, value) => {
    setExtractedData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <section className="upload-section card">
      <h2>Processar Novo Edital</h2>
      
      <div 
        className={`upload-zone ${file ? 'has-file' : ''}`}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleFileChange} 
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        
        {!file && !loading && (
          <div className="upload-placeholder">
            <UploadCloud size={56} className="text-primary" style={{ opacity: 0.8 }} />
            <p>Arraste seu edital em PDF ou clique para selecionar</p>
          </div>
        )}

        {loading && !extractedData && (
          <div className="upload-processing">
            <div className="spinner"></div>
            <p className="text-muted">Analisando o documento com inteligência...</p>
          </div>
        )}

        {file && !loading && (
          <div className="file-info">
            <FileText size={32} className="text-primary" />
            <span style={{ color: 'var(--primary-color)' }}>{file.name}</span>
            <button 
              type="button" 
              className="btn-text"
              onClick={(e) => {
                e.stopPropagation()
                setFile(null)
                setExtractedData(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            >
              Trocar arquivo
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert error fade-in">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {extractedData && (
        <div className="extraction-results fade-in">
          <div className="alert success">
            <CheckCircle size={20} />
            <span>Extração concluída com sucesso. Revise os dados extraídos abaixo.</span>
          </div>
          
          <form onSubmit={handleSave} className="extracted-form">
            <div className="grid-2">
              <div className="form-group">
                <label>Nº do Edital</label>
                <input 
                  type="text" 
                  value={extractedData.numero_edital} 
                  onChange={(e) => handleDataChange('numero_edital', e.target.value)}
                  placeholder="Ex: 12/2023"
                />
              </div>
              
              <div className="form-group">
                <label>Valor Estimado</label>
                <input 
                  type="text" 
                  value={extractedData.valor} 
                  onChange={(e) => handleDataChange('valor', e.target.value)}
                  placeholder="Ex: 150.000,00"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Objeto da Licitação</label>
              <textarea 
                value={extractedData.objeto} 
                onChange={(e) => handleDataChange('objeto', e.target.value)}
                rows={5}
                placeholder="Descrição extraída do objeto..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto', minWidth: '200px' }}>
                {loading ? 'Salvando...' : 'Salvar no Sistema'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
