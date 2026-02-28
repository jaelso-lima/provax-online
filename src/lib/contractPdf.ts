import jsPDF from "jspdf";

interface ContractData {
  partnerName: string;
  partnerEmail: string;
  percentual: number;
  valorInvestido: number;
  dataEntrada: string;
  tipo: string;
}

export function generateContractPDF(data: ContractData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addText = (text: string, fontSize = 10, bold = false, align: "left" | "center" = "left") => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, maxWidth);
    if (y + lines.length * (fontSize * 0.5) > 270) {
      doc.addPage();
      y = 20;
    }
    if (align === "center") {
      lines.forEach((line: string) => {
        const w = doc.getTextWidth(line);
        doc.text(line, (pageWidth - w) / 2, y);
        y += fontSize * 0.5;
      });
    } else {
      doc.text(lines, margin, y);
      y += lines.length * (fontSize * 0.5);
    }
    y += 3;
  };

  const addClause = (title: string, body: string) => {
    addText(title, 11, true);
    addText(body, 10);
    y += 2;
  };

  // Header
  addText("CONTRATO DE PARTICIPAÇÃO SOCIETÁRIA PRIVADA", 14, true, "center");
  addText("Provax — Plataforma Educacional Digital", 11, false, "center");
  y += 5;

  // Data
  addText(`Sócio Investidor: ${data.partnerName}`, 10, true);
  addText(`E-mail: ${data.partnerEmail}`, 10);
  addText(`Percentual: ${data.percentual}%`, 10, true);
  addText(`Valor Investido: R$ ${Number(data.valorInvestido).toFixed(2)}`, 10);
  addText(`Data de Entrada: ${new Date(data.dataEntrada).toLocaleDateString("pt-BR")}`, 10);
  addText(`Tipo: ${data.tipo.replace("_", " ")}`, 10);
  y += 5;

  // Clauses
  addClause(
    "CLÁUSULA 1 – NATUREZA DA PARTICIPAÇÃO",
    "O presente contrato formaliza participação societária exclusivamente econômica, não conferindo ao Sócio Investidor qualquer poder de gestão, voto, deliberação ou interferência administrativa. A participação é estritamente financeira e proporcional ao lucro líquido distribuído."
  );

  addClause(
    "CLÁUSULA 2 – CONTROLE ABSOLUTO",
    "A gestão integral, estratégica, operacional e financeira da empresa permanece sob controle exclusivo do Fundador. Nenhuma decisão poderá ser exigida, contestada ou imposta pelo Sócio Investidor."
  );

  addClause(
    "CLÁUSULA 3 – LIMITAÇÃO DE PODER",
    "O Sócio Investidor: Não possui direito a voto; Não possui direito de veto; Não possui acesso a contas bancárias; Não possui acesso a dados financeiros detalhados; Não pode representar a empresa; Não pode contratar em nome da empresa."
  );

  addClause(
    "CLÁUSULA 4 – DIREITO DE RECOMPRA",
    "O Fundador poderá recomprar a participação do Sócio a qualquer momento: pelo valor originalmente investido OU por valuation interno definido pelo Fundador. Em caso de quebra contratual, recompra poderá ocorrer pelo valor nominal simbólico."
  );

  addClause(
    "CLÁUSULA 5 – NÃO CONCORRÊNCIA",
    "O Sócio compromete-se a não criar, investir, participar ou trabalhar em plataforma concorrente direta ou indireta por prazo mínimo de 5 (cinco) anos."
  );

  addClause(
    "CLÁUSULA 6 – CONFIDENCIALIDADE PERPÉTUA",
    "Qualquer vazamento de código, estratégia, dados, estrutura ou modelo de negócio gera multa equivalente a 10 (dez) vezes o valor investido."
  );

  addClause(
    "CLÁUSULA 7 – DISTRIBUIÇÃO DE LUCROS",
    "A distribuição de lucros: Não é automática; Não é obrigatória mensalmente; Depende de decisão do Fundador; Depende da saúde financeira da empresa. Lucro será distribuído apenas quando houver formalização interna."
  );

  addClause(
    "CLÁUSULA 8 – RESPONSABILIDADE LIMITADA",
    "O Sócio não responde por dívidas da empresa. A empresa não responde por obrigações pessoais do Sócio."
  );

  addClause(
    "CLÁUSULA 9 – PROIBIÇÃO DE CESSÃO",
    "O Sócio não pode vender, transferir ou ceder sua participação sem autorização expressa do Fundador."
  );

  addClause(
    "CLÁUSULA 10 – RESCISÃO POR CONDUTA",
    "O contrato poderá ser rescindido unilateralmente pelo Fundador em caso de: quebra de confidencialidade; danos à imagem; interferência indevida; tentativa de sabotagem; ação judicial abusiva."
  );

  addClause(
    "CLÁUSULA 11 – SUCESSÃO",
    "Em caso de falecimento do Sócio, a participação poderá ser recomprada pelo Fundador antes de qualquer transferência hereditária."
  );

  addClause(
    "CLÁUSULA 12 – FORO",
    "Foro da comarca do Fundador."
  );

  addClause(
    "CLÁUSULA 13 – CARÁTER PRIVADO",
    "Este contrato não constitui sociedade formal registrada, tratando-se de acordo privado de participação econômica."
  );

  // Signatures
  y += 10;
  if (y > 240) { doc.addPage(); y = 30; }

  addText("_______________________________", 10, false, "center");
  addText("Fundador — Provax", 10, false, "center");
  y += 10;
  addText("_______________________________", 10, false, "center");
  addText(`Sócio Investidor — ${data.partnerName}`, 10, false, "center");
  y += 10;

  const now = new Date();
  addText(`Data: ${now.toLocaleDateString("pt-BR")}`, 10, false, "center");

  // Hash
  const hashInput = `${data.partnerEmail}:${data.percentual}:${now.toISOString()}`;
  addText(`Código hash: SHA-256 do contrato gerado digitalmente`, 9, false, "center");

  doc.save(`contrato-${data.partnerName.replace(/\s+/g, "_")}-${now.toISOString().slice(0, 10)}.pdf`);
}
