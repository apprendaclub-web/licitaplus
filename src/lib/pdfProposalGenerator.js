import { jsPDF } from "jspdf";

const PAGE = { marginL: 20, marginR: 20, marginT: 20, marginB: 20, usableW: 170 };

function writeJustifiedText(doc, text, x, y, maxWidth) {
  const paragraphs = text.split('\n');
  paragraphs.forEach((para) => {
    if (para.trim() === '') { y += 4; return; }
    const lines = doc.splitTextToSize(para, maxWidth);
    lines.forEach((ln, lineIdx) => {
      if (y > 297 - PAGE.marginB - 5) { doc.addPage(); y = PAGE.marginT; }
      if (lineIdx === lines.length - 1 || lines.length === 1) {
        doc.text(ln, x, y);
      } else {
        const words = ln.split(' ').filter(w => w);
        if (words.length > 1) {
          const textWidth = doc.getTextWidth(words.join(' '));
          const spaceTotal = maxWidth - textWidth;
          const spaceEach = spaceTotal / (words.length - 1);
          let cursorX = x;
          words.forEach((w) => {
            doc.text(w, cursorX, y);
            cursorX += doc.getTextWidth(w) + doc.getTextWidth(' ') + spaceEach;
          });
        } else {
          doc.text(ln, x, y);
        }
      }
      y += 5.5;
    });
    y += 2;
  });
  return y;
}

function drawSectionTitle(doc, title, x, y) {
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(140, 100, 60);
  doc.text(title, x, y);
  doc.setTextColor(0);
  y += 2;
  doc.setDrawColor(200, 160, 110);
  doc.setLineWidth(0.4);
  doc.line(x, y, x + 170, y);
  y += 5;
  return y;
}

function parseValor(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/R\$/g, '').replace(/\s/g, '');
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.')) {
    const partes = s.split('.');
    const ultima = partes[partes.length - 1];
    if (partes.length > 2 || (ultima.length === 3 && partes[0].length <= 3 && partes.length === 2 && /^\d+$/.test(partes[0]))) {
      s = partes.join('');
    }
  }
  return parseFloat(s) || 0;
}

function parseQtd(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/\s/g, '');
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  return parseFloat(s) || 0;
}

function formatBR(v) {
  const n = (typeof v === 'string') ? parseValor(v) : v;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQtd(n) {
  if (n === Math.floor(n)) return String(n);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
}

function calcItemTotal(it) {
  const tipo = it.tipoCalculo || 'qtd';
  const unit = parseValor(it.unitario);
  if (tipo === 'fechado') return unit;
  const qtd = parseQtd(it.qtd);
  return qtd * unit;
}

function valorPorExtensoProp(valor) {
  if (!valor || isNaN(valor)) return 'zero reais';
  valor = Math.round(valor * 100) / 100;
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function ate999(n) {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    let t = '';
    const c = Math.floor(n / 100);
    const r = n % 100;
    if (c > 0) t += centenas[c];
    if (r > 0) {
      if (t) t += ' e ';
      if (r < 20) t += unidades[r];
      else {
        t += dezenas[Math.floor(r/10)];
        if (r % 10 > 0) t += ' e ' + unidades[r % 10];
      }
    }
    return t;
  }
  function porExt(n) {
    if (n === 0) return 'zero';
    if (n < 1000) return ate999(n);
    if (n < 1000000) {
      const mil = Math.floor(n / 1000), r = n % 1000;
      let t = (mil === 1) ? 'mil' : ate999(mil) + ' mil';
      if (r > 0) t += (r < 100 || r % 100 === 0) ? ' e ' : ', ', t += ate999(r);
      return t;
    }
    const milhoes = Math.floor(n / 1000000), r = n % 1000000;
    let t = (milhoes === 1) ? 'um milhão' : ate999(milhoes) + ' milhões';
    if (r > 0) t += ' e ' + porExt(r);
    return t;
  }

  let texto = '';
  if (inteiro > 0) {
    const conector = (inteiro >= 1000000 && inteiro % 1000000 === 0) ? ' de ' : ' ';
    texto = porExt(inteiro) + conector + (inteiro === 1 ? 'real' : 'reais');
  }
  if (centavos > 0) {
    if (texto) texto += ' e ';
    texto += porExt(centavos) + ' ' + (centavos === 1 ? 'centavo' : 'centavos');
  }
  if (!texto) texto = 'zero reais';
  return texto;
}

function drawItemsTable(doc, items, x, y, w, itemsMode) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(35, 42, 61);
  doc.setTextColor(255);

  if (itemsMode === 'simples') {
    const colWidths = [w * 0.50, w * 0.14, w * 0.18, w * 0.18];
    const headers = ['DESCRIÇÃO', 'QTD/MESES', 'VALOR (R$)', 'TOTAL (R$)'];
    doc.rect(x, y - 4, w, 7, 'F');
    let cx = x;
    headers.forEach((h, i) => {
      doc.text(h, cx + 2, y);
      cx += colWidths[i];
    });
    doc.setTextColor(0);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    items.forEach((it, idx) => {
      const desc = it.descricao || '';
      const tipo = it.tipoCalculo || 'qtd';
      const qtd = parseQtd(it.qtd);
      const unit = parseValor(it.unitario);
      const total = calcItemTotal(it);
      const qtdDisplay = tipo === 'fechado' ? '—' : formatQtd(qtd);
      const descLines = doc.splitTextToSize(desc, colWidths[0] - 4);
      const rowH = Math.max(5, descLines.length * 4);
      if (y + rowH > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(x, y - 3, w, rowH, 'F');
      }
      let cx2 = x;
      doc.text(descLines, cx2 + 2, y);
      cx2 += colWidths[0];
      doc.text(qtdDisplay, cx2 + 2, y);
      cx2 += colWidths[1];
      doc.text(formatBR(unit.toFixed(2)), cx2 + 2, y);
      cx2 += colWidths[2];
      doc.text(formatBR(total.toFixed(2)), cx2 + 2, y);
      y += rowH;
    });
  } else {
    const colWidths = [w * 0.05, w * 0.10, w * 0.35, w * 0.12, w * 0.07, w * 0.08, w * 0.11, w * 0.12];
    const headers = ['#', 'CÓDIGO', 'DESCRIÇÃO', 'MARCA', 'UN.', 'QTD', 'UNIT.', 'TOTAL'];
    doc.rect(x, y - 4, w, 7, 'F');
    let cx = x;
    headers.forEach((h, i) => {
      doc.text(h, cx + 1, y);
      cx += colWidths[i];
    });
    doc.setTextColor(0);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    items.forEach((it, idx) => {
      const desc = it.descricao || '';
      const tipo = it.tipoCalculo || 'qtd';
      const qtd = parseQtd(it.qtd);
      const unit = parseValor(it.unitario);
      const total = calcItemTotal(it);
      const qtdDisplay = tipo === 'fechado' ? '—' : formatQtd(qtd);
      const descLines = doc.splitTextToSize(desc, colWidths[2] - 2);
      const rowH = Math.max(4.5, descLines.length * 3.8);
      if (y + rowH > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(x, y - 3, w, rowH, 'F');
      }
      let cx2 = x;
      doc.text(String(it.item || (idx + 1)), cx2 + 1, y);
      cx2 += colWidths[0];
      doc.text(it.codigo || '', cx2 + 1, y);
      cx2 += colWidths[1];
      doc.text(descLines, cx2 + 1, y);
      cx2 += colWidths[2];
      doc.text(it.marca || '', cx2 + 1, y);
      cx2 += colWidths[3];
      doc.text(it.unidade || '', cx2 + 1, y);
      cx2 += colWidths[4];
      doc.text(qtdDisplay, cx2 + 1, y);
      cx2 += colWidths[5];
      doc.text(formatBR(unit.toFixed(2)), cx2 + 1, y);
      cx2 += colWidths[6];
      doc.text(formatBR(total.toFixed(2)), cx2 + 1, y);
      y += rowH;
    });
  }
  return y + 2;
}

export function generateProposalPDF(data, tipo, itemsMode) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = PAGE.marginT;

  if (data.logoDataUrl) {
    try {
      const maxH = 22, maxW = 60;
      const img = data.logoImageInfo || { w: maxW, h: maxH };
      let w = img.w, h = img.h;
      const ratio = w / h;
      if (h > maxH) { h = maxH; w = h * ratio; }
      if (w > maxW) { w = maxW; h = w / ratio; }
      const x = (210 - w) / 2;
      const format = data.logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(data.logoDataUrl, format, x, y, w, h);
      y += h + 6;
    } catch (e) {}
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  let titulo;
  if (tipo === 'preco') titulo = 'PROPOSTA DE PREÇO';
  else if (tipo === 'tecnica') titulo = 'PROPOSTA TÉCNICA';
  else titulo = 'PROPOSTA COMERCIAL';
  doc.text(titulo, 105, y, { align: 'center' });
  y += 8;

  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.text(`${data.modalidade} nº ${data.edital} — ${data.orgao}`, 105, y, { align: 'center' });
  y += 10;

  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(PAGE.marginL, y, 210 - PAGE.marginR, y);
  y += 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('PROPONENTE:', PAGE.marginL, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  y += 5;

  const cabecalhoEmpresa = [
    `${data.razaoSocial} — CNPJ: ${data.cnpj}`,
    data.ie ? `Inscrição Estadual: ${data.ie}` : null,
    data.endereco,
    [data.telefone && `Tel: ${data.telefone}`, data.email && `E-mail: ${data.email}`].filter(Boolean).join('  •  ') || null
  ].filter(Boolean);

  cabecalhoEmpresa.forEach(linha => {
    const wrapped = doc.splitTextToSize(linha, PAGE.usableW);
    wrapped.forEach(w => { doc.text(w, PAGE.marginL, y); y += 4.5; });
  });
  y += 2;
  doc.line(PAGE.marginL, y, 210 - PAGE.marginR, y);
  y += 6;

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('OBJETO:', PAGE.marginL, y);
  y += 5;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  y = writeJustifiedText(doc, data.objeto || '—', PAGE.marginL, y, PAGE.usableW);
  y += 4;

  if (tipo === 'tecnica' || tipo === 'completa') {
    y = drawSectionTitle(doc, 'DESCRIÇÃO DO OBJETO OFERTADO', PAGE.marginL, y);
    y = writeJustifiedText(doc, data.tecnicaObjeto || '—', PAGE.marginL, y, PAGE.usableW);
    y += 4;

    if (data.metodologia) {
      y = drawSectionTitle(doc, 'METODOLOGIA / PLANO DE TRABALHO', PAGE.marginL, y);
      y = writeJustifiedText(doc, data.metodologia, PAGE.marginL, y, PAGE.usableW);
      y += 4;
    }
    if (data.cronograma) {
      y = drawSectionTitle(doc, 'CRONOGRAMA DE EXECUÇÃO', PAGE.marginL, y);
      y = writeJustifiedText(doc, data.cronograma, PAGE.marginL, y, PAGE.usableW);
      y += 4;
    }
    if (data.qualificacoes) {
      y = drawSectionTitle(doc, 'QUALIFICAÇÕES E EXPERIÊNCIA', PAGE.marginL, y);
      y = writeJustifiedText(doc, data.qualificacoes, PAGE.marginL, y, PAGE.usableW);
      y += 4;
    }
    if (data.recursos) {
      y = drawSectionTitle(doc, 'EQUIPAMENTOS / RECURSOS', PAGE.marginL, y);
      y = writeJustifiedText(doc, data.recursos, PAGE.marginL, y, PAGE.usableW);
      y += 4;
    }
  }

  if (tipo === 'preco' || tipo === 'completa') {
    if (y > 220) { doc.addPage(); y = PAGE.marginT; }
    y = drawSectionTitle(doc, 'ITENS E VALORES', PAGE.marginL, y);
    y = drawItemsTable(doc, data.items, PAGE.marginL, y, PAGE.usableW, itemsMode);
    y += 4;

    if (y > 250) { doc.addPage(); y = PAGE.marginT; }
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setFillColor(245, 235, 215);
    doc.rect(PAGE.marginL, y - 3, PAGE.usableW, 9, 'F');
    doc.text(`VALOR TOTAL DA PROPOSTA: R$ ${formatBR(data.totalGeral.toFixed(2))}`, PAGE.marginL + 3, y + 3);
    y += 8;
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.text(`(${valorPorExtensoProp(data.totalGeral)})`, PAGE.marginL + 3, y + 3);
    y += 10;

    y = drawSectionTitle(doc, 'CONDIÇÕES COMERCIAIS', PAGE.marginL, y);
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const condicoes = [];
    if (data.validade) condicoes.push(`Validade da proposta: ${data.validade}`);
    if (data.prazoEntrega) condicoes.push(`Prazo de entrega/execução: ${data.prazoEntrega}`);
    if (tipo === 'completa') {
      if (data.pagamento) condicoes.push(`Condições de pagamento: ${data.pagamento}`);
      if (data.garantia) condicoes.push(`Garantia: ${data.garantia}`);
    }
    condicoes.forEach(c => {
      const wrapped = doc.splitTextToSize('• ' + c, PAGE.usableW);
      wrapped.forEach(w => {
        if (y > 270) { doc.addPage(); y = PAGE.marginT; }
        doc.text(w, PAGE.marginL, y);
        y += 5;
      });
    });
    y += 3;

    if (data.observacoes) {
      y = drawSectionTitle(doc, 'OBSERVAÇÕES', PAGE.marginL, y);
      y = writeJustifiedText(doc, data.observacoes, PAGE.marginL, y, PAGE.usableW);
      y += 4;
    }

    if (data.banco || data.agencia || data.conta || data.pix) {
      if (y > 240) { doc.addPage(); y = PAGE.marginT; }
      y = drawSectionTitle(doc, 'DADOS BANCÁRIOS', PAGE.marginL, y);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      const bancarios = [];
      if (data.banco) bancarios.push(`Banco: ${data.banco}`);
      if (data.agencia) bancarios.push(`Agência: ${data.agencia}`);
      if (data.conta) bancarios.push(`${data.tipoConta || 'Conta'}: ${data.conta}`);
      if (data.pix) bancarios.push(`PIX: ${data.pix}`);
      bancarios.forEach(b => {
        doc.text(b, PAGE.marginL, y);
        y += 5;
      });
      y += 3;
    }
  }

  if (y > 230) { doc.addPage(); y = PAGE.marginT; }
  y = drawSectionTitle(doc, 'DECLARAÇÃO DE ACEITE', PAGE.marginL, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const decAceite = `Declaramos que conhecemos e aceitamos integralmente os termos do edital do ${data.modalidade} nº ${data.edital} e seus anexos, e que a presente proposta tem ${data.validade || '60 (sessenta) dias'} de validade a contar da data de apresentação. Os preços ofertados são fixos e exequíveis, incluindo todos os tributos, encargos, custos diretos e indiretos necessários à execução do objeto.`;
  y = writeJustifiedText(doc, decAceite, PAGE.marginL, y, PAGE.usableW);
  y += 8;

  if (y > 260) { doc.addPage(); y = PAGE.marginT + 10; }
  doc.text(`${data.cidade}, ${data.data}.`, PAGE.marginL, y);
  y += 22;

  const sigW = 80;
  const sigX = (210 - sigW) / 2;
  doc.line(sigX, y, sigX + sigW, y);
  y += 5;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(data.repNome || '[REPRESENTANTE]', 105, y, { align: 'center' });
  y += 5;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`${data.repCargo || ''} — CPF: ${data.repCpf || ''}`, 105, y, { align: 'center' });
  y += 5;
  doc.text(data.razaoSocial || '[RAZÃO SOCIAL]', 105, y, { align: 'center' });
  y += 4;
  doc.text(`CNPJ: ${data.cnpj || '[CNPJ]'}`, 105, y, { align: 'center' });

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${titulo} — ${data.razaoSocial || 'Empresa'}`, 105, 287, { align: 'center' });
    doc.text(`Página ${i} de ${total}`, 210 - 20, 287, { align: 'right' });
    doc.setTextColor(0);
  }

  const safeName = (data.razaoSocial || 'Empresa').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
  const safeEdital = (data.edital || 'Edital').replace(/[^a-zA-Z0-9]/g, '_');
  const safeTipo = tipo === 'preco' ? 'Preco' : tipo === 'tecnica' ? 'Tecnica' : 'Completa';
  doc.save(`Proposta_${safeTipo}_${safeName}_${safeEdital}.pdf`);
}
