import jsPDF from "jspdf";
import logoSrc from "@/assets/provax-logo.png";

interface MateriaResult {
  nome: string;
  tipo?: string;
  explicacao: string;
  conteudos_principais: string[];
  resumo_detalhado?: string;
  macetes?: string[];
  exemplos: { topico: string; exemplo: string }[];
  dicas_prova: string[];
  estrategia_estudo: string;
  cargos_aplicaveis?: string[];
}

interface CronogramaDia {
  dia: string;
  materias: string[];
  foco: string;
}

interface CronogramaSemana {
  semana: number;
  titulo: string;
  dias: CronogramaDia[];
}

interface RaioX {
  orgao?: string;
  banca?: string;
  escolaridade?: string;
  salario_de?: string;
  salario_ate?: string;
  vagas?: string;
  taxa_inscricao?: string;
  data_prova?: string;
  inscricao_inicio?: string;
  inscricao_fim?: string;
  etapas?: string[];
  requisitos?: string[];
  observacoes?: string;
}

interface AnalysisResult {
  cargos?: string[];
  materias: MateriaResult[];
  raio_x?: RaioX;
  cronograma?: CronogramaSemana[];
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
    if (y + needed > 275) { doc.addPage(); y = 20; }
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

  try {
    const img = await loadImage(logoSrc);
    doc.addImage(img, "PNG", margin, 10, 50, 14);
    y = 32;
  } catch {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("ProvaX", margin, 30);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Edital Master - Guia do Concurseiro", margin, y + 2);
  y = 40;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (resultado.info_concurso?.nome) {
    doc.text(resultado.info_concurso.nome, margin, y);
    y += 6;
  }
  const meta: string[] = [];
  if (resultado.info_concurso?.banca || resultado.raio_x?.banca) meta.push(`Banca: ${resultado.raio_x?.banca || resultado.info_concurso?.banca}`);
  if (resultado.materias?.length) meta.push(`${resultado.materias.length} materias`);
  if (meta.length) doc.text(meta.join("  |  "), margin, y);

  y = 65;
  doc.setTextColor(0, 0, 0);

  // === RAIO-X ===
  if (resultado.raio_x) {
    const rx = resultado.raio_x;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text("RAIO-X DO EDITAL", margin, y);
    y += 8;

    const rxItems: [string, string | undefined][] = [
      ["Orgao", rx.orgao],
      ["Banca", rx.banca],
      ["Vagas", rx.vagas],
      ["Salario", rx.salario_de ? (rx.salario_ate ? `R$ ${rx.salario_de} a R$ ${rx.salario_ate}` : `R$ ${rx.salario_de}`) : undefined],
      ["Escolaridade", rx.escolaridade],
      ["Taxa", rx.taxa_inscricao],
      ["Data da Prova", rx.data_prova],
      ["Inscricoes", rx.inscricao_inicio ? `${rx.inscricao_inicio} a ${rx.inscricao_fim || "?"}` : undefined],
    ];

    doc.setFont("helvetica", "normal");
    rxItems.forEach(([label, value]) => {
      if (!value) return;
      checkPage(6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}: `, margin, y);
      const labelW = doc.getTextWidth(`${label}: `);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value, margin + labelW, y);
      y += 5;
    });

    if (rx.etapas?.length) {
      checkPage(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("Etapas: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(rx.etapas.join(", "), margin + doc.getTextWidth("Etapas: "), y);
      y += 5;
    }

    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  }

  // === MATERIAS ===
  resultado.materias?.forEach((mat, idx) => {
    checkPage(30);

    doc.setFillColor(240, 245, 255);
    doc.roundedRect(margin - 2, y - 5, maxW + 4, 12, 2, 2, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(`${idx + 1}. ${mat.nome}`, margin, y + 2);
    y += 14;

    if (mat.cargos_aplicaveis?.length) {
      doc.setFont("helvetica", "italic");
      addWrappedText(`Cargos: ${mat.cargos_aplicaveis.join(", ")}`, margin, 8, [120, 120, 120]);
      y += 2;
    }

    doc.setFont("helvetica", "bold");
    addWrappedText("Sobre a materia", margin, 10, [30, 30, 30]);
    y += 1;
    doc.setFont("helvetica", "normal");
    addWrappedText(mat.explicacao, margin, 9);
    y += 4;

    if (mat.conteudos_principais?.length) {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      addWrappedText(`Conteudos do Edital (${mat.conteudos_principais.length} itens)`, margin, 10, [30, 30, 30]);
      y += 1;
      doc.setFont("helvetica", "normal");
      mat.conteudos_principais.forEach((c) => {
        checkPage(6);
        addWrappedText(`[ ] ${c}`, margin + 3, 9);
      });
      y += 3;
    }

    if (mat.resumo_detalhado) {
      checkPage(20);
      doc.setFont("helvetica", "bold");
      addWrappedText("RESUMO COMPLETO PARA ESTUDO", margin, 11, [37, 99, 235]);
      y += 2;
      doc.setFont("helvetica", "normal");
      const resumoLines = mat.resumo_detalhado.split('\n');
      resumoLines.forEach(line => {
        if (line.trim()) { addWrappedText(line, margin, 9, [40, 40, 40]); y += 1; }
        else { y += 3; }
      });
      y += 4;
    }

    if (mat.macetes?.length) {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      addWrappedText("MACETES DE MEMORIZACAO", margin, 10, [128, 0, 255]);
      y += 1;
      doc.setFont("helvetica", "normal");
      mat.macetes.forEach((m) => {
        checkPage(8);
        addWrappedText(`* ${m}`, margin + 3, 9, [100, 50, 150]);
        y += 2;
      });
      y += 3;
    }

    if (mat.exemplos?.length) {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      addWrappedText("Exemplos de Questoes", margin, 10, [30, 30, 30]);
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

    if (mat.estrategia_estudo) {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      addWrappedText("Estrategia de Estudo", margin, 10, [22, 130, 70]);
      y += 1;
      doc.setFont("helvetica", "normal");
      addWrappedText(mat.estrategia_estudo, margin, 9, [30, 100, 50]);
      y += 4;
    }

    y += 4;
    checkPage(4);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  });

  // === CRONOGRAMA ===
  if (resultado.cronograma?.length) {
    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text("CRONOGRAMA DE ESTUDOS - 4 SEMANAS", margin, y);
    y += 10;

    resultado.cronograma.forEach((semana) => {
      checkPage(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(`Semana ${semana.semana}${semana.titulo ? ` - ${semana.titulo}` : ""}`, margin, y);
      y += 6;

      semana.dias?.forEach((dia) => {
        checkPage(8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`${dia.dia}:`, margin + 3, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const materiasTxt = dia.materias?.join(", ") || "";
        doc.text(materiasTxt, margin + 25, y);
        y += 4;
        if (dia.foco) {
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(`Foco: ${dia.foco}`, margin + 25, y);
          y += 4;
        }
      });
      y += 4;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Gerado por ProvaX - provax-online.lovable.app", margin, 288);

  const safeName = fileName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`edital_master_${safeName}.pdf`);
}
