import { jsPDF } from "jspdf";

const PAGE = {
  marginL: 25, marginR: 25, marginT: 25, marginB: 25,
  get usableW() { return 210 - this.marginL - this.marginR; }
};

function drawHeader(doc, y, data) {
  if (data && data.logoDataUrl) {
    try {
      const maxH = 25;
      const maxW = 70;
      const img = data.logoImageInfo || { w: maxW, h: maxH };
      let w = img.w, h = img.h;
      const ratio = w / h;
      if (h > maxH) { h = maxH; w = h * ratio; }
      if (w > maxW) { w = maxW; h = w / ratio; }
      const x = (210 - w) / 2;
      const format = data.logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(data.logoDataUrl, format, x, y, w, h);
      y += h + 6;
    } catch (e) {
      console.error('Erro ao desenhar logo:', e);
      y += 5;
    }
  }
  return y;
}

function drawProponenteBlock(doc, y, data) {
  const marginL = PAGE.marginL;
  const marginR = PAGE.marginR;
  const usableW = PAGE.usableW;

  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.text(`${data.modalidade} nº ${data.edital} — ${data.orgao}`, 105, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(marginL, y, 210 - marginR, y);
  y += 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text('PROPONENTE:', marginL, y);
  y += 5;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  const linhas = [
    `${data.razaoSocial} — CNPJ: ${data.cnpj}`,
    data.endereco,
    `Representante: ${data.repNome}${data.repCargo ? ' — ' + data.repCargo : ''}${data.repCpf && data.repCpf !== '[CPF]' ? ' — CPF: ' + data.repCpf : ''}`
  ].filter(Boolean);

  linhas.forEach(linha => {
    const wrapped = doc.splitTextToSize(linha, usableW);
    wrapped.forEach(w => { doc.text(w, marginL, y); y += 4.5; });
  });
  y += 2;

  doc.line(marginL, y, 210 - marginR, y);
  y += 8;

  return y;
}

function drawDecSectionTitle(doc, title, x, y, width) {
  if (y > 270) { doc.addPage(); y = PAGE.marginT; }
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(140, 100, 60);
  doc.text(title, x, y);
  doc.setTextColor(0);
  y += 2;
  doc.setDrawColor(200, 160, 110);
  doc.setLineWidth(0.4);
  doc.line(x, y, x + width, y);
  y += 5;
  return y;
}

function drawFooter(doc, data, pageNum, totalPages) {
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`${data.modalidade} nº ${data.edital} — ${data.orgao}`, 105, 297 - 12, { align: 'center' });
  doc.text(`Página ${pageNum} de ${totalPages}`, 210 - PAGE.marginR, 297 - 12, { align: 'right' });
  doc.setTextColor(0);
}

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

function extractClausulaTitulo(dec) {
  return dec.title.replace(/^\d+\.\s*/, '').toUpperCase();
}

function extractClausulaCorpo(dec, data) {
  if (dec.bodyConsolidado) return dec.bodyConsolidado(data).trim();
  const fullText = dec.body(data);
  const lines = fullText.split('\n');
  let bodyStart = 1;
  while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
  let corpo = lines.slice(bodyStart).join('\n').trim();
  const m = corpo.match(/DECLARA[^]*?,\s*que[:,]?\s*([\s\S]+)$/i);
  if (m) corpo = 'Declara que ' + m[1].trim();
  corpo = corpo.replace(/\n\nReferência:[^]*$/, '');
  corpo = corpo.replace(/\n\nObjeto:[^]*$/, '');
  corpo = corpo.replace(/\n\nÓrgão:[^]*$/, '');
  return corpo.trim();
}

function generatePDFConsolidado(doc, data, selected) {
  let y = PAGE.marginT;
  y = drawHeader(doc, y, data);

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.text('DECLARAÇÕES PARA FINS LICITATÓRIOS', 105, y, { align: 'center' });
  y += 9;

  y = drawProponenteBlock(doc, y, data);

  doc.setFont('times', 'italic');
  doc.setFontSize(10.5);
  const preambulo = `Para fins de participação no ${data.modalidade} nº ${data.edital}, promovido pelo(a) ${data.orgao}, tendo como objeto ${data.objeto}, a empresa acima qualificada, por seu representante legal, DECLARA, sob as penas da lei, o que segue:`;
  y = writeJustifiedText(doc, preambulo, PAGE.marginL, y, PAGE.usableW);
  y += 6;

  selected.forEach((dec, idx) => {
    if (y > 297 - PAGE.marginB - 30) { doc.addPage(); y = PAGE.marginT; }
    const clausulaTitulo = `${idx + 1}. ${extractClausulaTitulo(dec)}`;
    y = drawDecSectionTitle(doc, clausulaTitulo, PAGE.marginL, y, PAGE.usableW);
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const corpoEnxuto = extractClausulaCorpo(dec, data);
    y = writeJustifiedText(doc, corpoEnxuto, PAGE.marginL, y, PAGE.usableW);
    y += 5;
  });

  y += 8;
  if (y > 297 - PAGE.marginB - 60) { doc.addPage(); y = PAGE.marginT + 10; }

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(`${data.cidade}, ${data.data}.`, PAGE.marginL, y);
  y += 22;

  const sigW = 85;
  const sigX = (210 - sigW) / 2;
  const temMeepp = selected.some(d => d.requiresContador);
  const mostraContador = temMeepp && data.incluirContador;

  if (mostraContador) {
    const halfW = 70;
    const leftX = 25;
    const rightX = 210 - 25 - halfW;

    doc.line(leftX, y, leftX + halfW, y);
    let yL = y + 5;
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(data.repNome, leftX + halfW / 2, yL, { align: 'center' });
    yL += 4;
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(data.repCargo, leftX + halfW / 2, yL, { align: 'center' });
    yL += 4;
    doc.text(`CPF: ${data.repCpf}`, leftX + halfW / 2, yL, { align: 'center' });
    yL += 4;
    const empLines = doc.splitTextToSize(data.razaoSocial, halfW);
    empLines.forEach(ln => { doc.text(ln, leftX + halfW / 2, yL, { align: 'center' }); yL += 4; });
    doc.text(`CNPJ: ${data.cnpj}`, leftX + halfW / 2, yL, { align: 'center' });

    doc.line(rightX, y, rightX + halfW, y);
    let yR = y + 5;
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(data.contNome, rightX + halfW / 2, yR, { align: 'center' });
    yR += 4;
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Contador', rightX + halfW / 2, yR, { align: 'center' });
    yR += 4;
    doc.text(data.contCrc, rightX + halfW / 2, yR, { align: 'center' });
    yR += 4;
    doc.text(`CPF: ${data.contCpf}`, rightX + halfW / 2, yR, { align: 'center' });
    if (data.contEscritorio) {
      yR += 4;
      const escLines = doc.splitTextToSize(data.contEscritorio, halfW);
      escLines.forEach(ln => { doc.text(ln, rightX + halfW / 2, yR, { align: 'center' }); yR += 4; });
    }
  } else {
    doc.line(sigX, y, sigX + sigW, y);
    y += 5;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(data.repNome, 105, y, { align: 'center' });
    y += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`${data.repCargo} — CPF: ${data.repCpf}`, 105, y, { align: 'center' });
    y += 5;
    doc.text(data.razaoSocial, 105, y, { align: 'center' });
    y += 4;
    doc.text(`CNPJ: ${data.cnpj}`, 105, y, { align: 'center' });
  }

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(doc, data, i, total); }
}

function generatePDFSeparado(doc, data, selected) {
  selected.forEach((dec, idx) => {
    if (idx > 0) doc.addPage();
    let y = PAGE.marginT;
    y = drawHeader(doc, y, data);

    const fullText = dec.body(data);
    const firstNewline = fullText.indexOf('\n');
    const titleText = fullText.substring(0, firstNewline).trim();
    const semQualificacao = extractClausulaCorpo(dec, data);

    y = drawProponenteBlock(doc, y, data);
    y = drawDecSectionTitle(doc, titleText, PAGE.marginL, y, PAGE.usableW);
    y += 2;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    y = writeJustifiedText(doc, semQualificacao, PAGE.marginL, y, PAGE.usableW);

    y += 12;
    if (y > 297 - PAGE.marginB - 50) { doc.addPage(); y = PAGE.marginT + 20; }
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text(`${data.cidade}, ${data.data}.`, PAGE.marginL, y);
    y += 20;

    const sigW = 80;
    const sigX = (210 - sigW) / 2;
    doc.line(sigX, y, sigX + sigW, y);
    y += 5;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(data.repNome, 105, y, { align: 'center' });
    y += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`${data.repCargo} — CPF: ${data.repCpf}`, 105, y, { align: 'center' });
    y += 5;
    doc.text(data.razaoSocial, 105, y, { align: 'center' });
    y += 4;
    doc.text(`CNPJ: ${data.cnpj}`, 105, y, { align: 'center' });

    if (dec.requiresContador && data.incluirContador) {
      y += 18;
      if (y > 297 - PAGE.marginB - 25) { doc.addPage(); y = PAGE.marginT + 20; }
      doc.line(sigX, y, sigX + sigW, y);
      y += 5;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(data.contNome, 105, y, { align: 'center' });
      y += 5;
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.text(`Contador — ${data.contCrc}`, 105, y, { align: 'center' });
      y += 4;
      doc.text(`CPF: ${data.contCpf}`, 105, y, { align: 'center' });
      if (data.contEscritorio) { y += 4; doc.text(data.contEscritorio, 105, y, { align: 'center' }); }
    }
  });

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(doc, data, i, total); }
}

export function generateDeclarationsPDF(data, selected, formato = 'consolidado') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  
  if (formato === 'consolidado') {
    generatePDFConsolidado(doc, data, selected);
  } else {
    generatePDFSeparado(doc, data, selected);
  }

  const safeName = (data.razaoSocial.substring(0,30) || 'EMPRESA').replace(/[^a-zA-Z0-9]/g,'_');
  const safeEdital = (data.edital || 'EDITAL').replace(/[^a-zA-Z0-9]/g,'_');
  const suffix = formato === 'consolidado' ? 'Consolidado' : 'Separado';
  doc.save(`Declaracoes_${suffix}_${safeName}_${safeEdital}.pdf`);
}
