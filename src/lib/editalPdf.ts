import jsPDF from "jspdf";
import logoSrc from "@/assets/provax-logo.png";

interface MateriaResult {
  nome: string;
  explicacao: string;
  conteudos_principais: string[];
  exemplos: { topico: string; exemplo: string }[];
  dicas_prova: string[];
  estrategia_estudo: string;
  cargos_aplicaveis?: string[];
}

interface AnalysisResult {
  cargos?: string[];
  materias: MateriaResult[];
  info_concurso?: {
    nome?: string;
    banca?: string;
    cargo?: string;
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateEditalPdf(resultado: AnalysisResult, fileName: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  };

  const addWrappedText = (text: string, x: number, fontSize: number, color: [number, number, number] = [60, 60, 60]) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW - (x - margin));
    lines.forEach((line: string) => {
      checkPage(6);
      doc.text(line, x, y);
      y += fontSize * 0.45;
    });
  };

  // === COVER ===
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 55, "F");

  // Add logo
  try {
    const img = await loadImage(logoSrc);
    // Draw logo trimmed horizontally — 50x14mm at top-left
    doc.addImage(img, "PNG", margin, 10, 50, 14);
    y = 32;
  } catch {
    // Fallback text if logo fails
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("ProvaX", margin, 30);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo do Edital", margin, y + 2);
  y = 40;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (resultado.info_concurso?.nome) {
    doc.text(resultado.info_concurso.nome, margin, y);
    y += 6;
  }
  const meta: string[] = [];
  if (resultado.info_concurso?.banca) meta.push(`Banca: ${resultado.info_concurso.banca}`);
  if (resultado.info_concurso?.cargo) meta.push(`Cargo: ${resultado.info_concurso.cargo}`);
  if (resultado.materias?.length) meta.push(`${resultado.materias.length} materias`);
  if (meta.length) doc.text(meta.join("  |  "), margin, y);

  y = 65;
  doc.setTextColor(0, 0, 0);

  // === MATERIAS ===
  resultado.materias?.forEach((mat, idx) => {
    checkPage(30);

    // Section header
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(margin - 2, y - 5, maxW + 4, 12, 2, 2, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(`${idx + 1}. ${mat.nome}`, margin, y + 2);
    y += 14;

    // Explicacao
    doc.setFont("helvetica", "bold");
    addWrappedText("Sobre a materia", margin, 10, [30, 30, 30]);
    y += 1;
    doc.setFont("helvetica", "normal");
    addWrappedText(mat.explicacao, margin, 9);
    y += 4;

    // Conteudos
    if (mat.conteudos_principais?.length) {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      addWrappedText("Conteudos Principais", margin, 10, [30, 30, 30]);
      y += 1;
      doc.setFont("helvetica", "normal");
      mat.conteudos_principais.forEach((c) => {
        checkPage(6);
        addWrappedText(`- ${c}`, margin + 3, 9);
      });
      y += 3;
    }

    // Exemplos
    if (mat.exemplos?.length) {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      addWrappedText("Exemplos Praticos", margin, 10, [30, 30, 30]);
      y += 1;
      doc.setFont("helvetica", "normal");
      mat.exemplos.forEach((ex) => {
        checkPage(12);
        doc.setFont("helvetica", "bold");
        addWrappedText(`${ex.topico}:`, margin + 3, 9, [50, 50, 50]);
        doc.setFont("helvetica", "normal");
        addWrappedText(ex.exemplo, margin + 6, 8.5, [80, 80, 80]);
        y += 2;
      });
      y += 2;
    }

    // Dicas
    if (mat.dicas_prova?.length) {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      addWrappedText("Dicas de Prova", margin, 10, [180, 120, 0]);
      y += 1;
      doc.setFont("helvetica", "normal");
      mat.dicas_prova.forEach((d) => {
        checkPage(6);
        addWrappedText(`> ${d}`, margin + 3, 9, [80, 60, 0]);
      });
      y += 3;
    }

    // Estrategia
    if (mat.estrategia_estudo) {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      addWrappedText("Estrategia de Estudo", margin, 10, [22, 130, 70]);
      y += 1;
      doc.setFont("helvetica", "normal");
      addWrappedText(mat.estrategia_estudo, margin, 9, [30, 100, 50]);
      y += 4;
    }

    // Separator
    y += 4;
    checkPage(4);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  });

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Gerado por ProvaX — provax-online.lovable.app", margin, 288);

  const safeName = fileName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`resumo_edital_${safeName}.pdf`);
}
