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
      // 1. Extrair texto do PDF
      const text = await extractTextFromPdf(selectedFile)
      // 2. Aplicar Regex
      const data = parseTenderData(text)
      setExtractedData(data)
    } catch (err) {
      console.error(err)
      setError('Erro ao processar o PDF. Certifique-se de que é um documento de texto válido.')
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

      // Sucesso
      setFile(null)
      setExtractedData(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (onUploadSuccess) onUploadSuccess()
      
      alert('Edital salvo com sucesso!')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Erro ao salvar os dados.')
    } finally {
      setLoading(false)
    }
  }

  const handleDataChange = (field, value) => {
    setExtractedData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="upload-section card">
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
            <UploadCloud size={48} className="text-muted" />
            <p>Clique ou arraste um PDF aqui</p>
          </div>
        )}

        {loading && !extractedData && (
          <div className="upload-processing">
            <div className="spinner"></div>
            <p>Lendo e extraindo dados do PDF...</p>
          </div>
        )}

        {file && !loading && (
          <div className="file-info">
            <FileText size={32} className="text-primary" />
            <span>{file.name}</span>
            <button 
              type="button" 
              className="btn-text btn-small"
              onClick={(e) => {
                e.stopPropagation()
                setFile(null)
                setExtractedData(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            >
              Remover
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {extractedData && (
        <div className="extraction-results fade-in">
          <div className="alert success">
            <CheckCircle size={20} />
            <span>Dados extraídos com sucesso! Revise antes de salvar.</span>
          </div>
          
          <form onSubmit={handleSave} className="extracted-form">
            <div className="form-group">
              <label>Número do Edital</label>
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

            <div className="form-group full-width">
              <label>Objeto</label>
              <textarea 
                value={extractedData.objeto} 
                onChange={(e) => handleDataChange('objeto', e.target.value)}
                rows={4}
                placeholder="Descrição do objeto da licitação"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar no Banco de Dados'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
