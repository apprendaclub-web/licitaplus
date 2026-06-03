import * as pdfjsLib from 'pdfjs-dist'

// Configuração do Worker do PDF.js compatível com Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Lê o texto de um arquivo PDF
 * @param {File} file - Arquivo PDF
 * @returns {Promise<string>} - Texto completo do PDF
 */
export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
  }
  
  return fullText
}

/**
 * Extrai Número do Edital, Objeto e Valor do texto
 * @param {string} text - Texto completo
 * @returns {Object} - Dados extraídos
 */
export function parseTenderData(text) {
  // Regex flexível: 'Edital n° X/YYYY' ou 'Edital X/YYYY'
  const numberRegex = /Edital\s*(?:n[°º]\s*)?(\d+\/\d{4})/i
  const numberMatch = text.match(numberRegex)
  const numero_edital = numberMatch ? numberMatch[1] : ''

  // Regex flexível: captura de 'Objeto:' até a próxima quebra de linha
  const objectRegex = /Objeto:\s*([^\n]+)/i
  const objectMatch = text.match(objectRegex)
  const objeto = objectMatch ? objectMatch[1].trim() : ''

  // Regex flexível: 'R$' seguido de números com ponto e vírgula
  const valueRegex = /R\$\s*([\d.,]+)/i
  const valueMatch = text.match(valueRegex)
  const valor = valueMatch ? valueMatch[1] : ''

  return {
    numero_edital,
    objeto,
    valor
  }
}
