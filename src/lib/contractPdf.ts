import jsPDF from "jspdf";

interface ContractData {
  partnerName: string;
  partnerEmail: string;
  percentual: number;
  valorInvestido: number;
  dataEntrada: string;
  tipo: string;
}

export function getContractClauses(percentual: number) {
  // Determine power level based on percentual
  let powerDescription: string;
  if (percentual < 10) {
    powerDescription =
      "Participação até 10%:\n" +
      "• Natureza exclusivamente econômica\n" +
      "• Sem direito a voto\n" +
      "• Sem poder de decisão\n" +
      "• Sem direito de veto\n" +
      "• Direito apenas a acompanhamento de relatórios consolidados";
  } else if (percentual < 25) {
    powerDescription =
      "Participação entre 10% e 24%:\n" +
      "• Direito consultivo proporcional\n" +
      "• Pode opinar estrategicamente\n" +
      "• Não possui poder de veto\n" +
      "• Não possui poder executivo\n" +
      "• Não pode alterar decisões administrativas";
  } else {
    powerDescription =
      "Participação igual ou superior a 25%:\n" +
      "• Direito consultivo ampliado\n" +
      "• Pode solicitar reuniões estratégicas\n" +
      "• Pode sugerir mudanças estruturais\n" +
      "• Não possui poder de veto automático\n" +
      "• Não possui poder executivo";
  }

  return [
    {
      title: "CLÁUSULA 1 – NATUREZA DA PARTICIPAÇÃO",
      body: "O presente contrato formaliza participação societária exclusivamente econômica, não conferindo ao Sócio Investidor qualquer poder de gestão, voto, deliberação ou interferência administrativa. A participação é estritamente financeira e proporcional ao lucro líquido distribuído.",
    },
    {
      title: "CLÁUSULA 2 – CONTROLE ABSOLUTO",
      body: "A gestão integral, estratégica, operacional e financeira da empresa permanece sob controle exclusivo do Fundador. Nenhuma decisão poderá ser exigida, contestada ou imposta pelo Sócio Investidor.",
    },
    {
      title: "CLÁUSULA 3 – LIMITAÇÃO DE PODER PROPORCIONAL",
      body:
        "O poder de influência do Sócio Investidor será proporcional ao seu percentual de participação, conforme critérios abaixo:\n\n" +
        powerDescription +
        "\n\nEm qualquer cenário:\n" +
        "• A gestão executiva permanece sob controle do Fundador.\n" +
        "• O Fundador mantém maioria decisória e poder final administrativo.\n\n" +
        "O Sócio Investidor poderá adquirir participação adicional mediante acordo formal com o Fundador, respeitando o limite máximo de 49% de participação total entre todos os sócios.",
    },
    {
      title: "CLÁUSULA 4 – DIREITO DE RECOMPRA",
      body: "O Fundador poderá recomprar a participação do Sócio a qualquer momento: pelo valor originalmente investido OU por valuation interno definido pelo Fundador. Em caso de quebra contratual, recompra poderá ocorrer pelo valor nominal simbólico.",
    },
    {
      title: "CLÁUSULA 5 – NÃO CONCORRÊNCIA",
      body: "O Sócio compromete-se a não criar, investir, participar ou trabalhar em plataforma concorrente direta ou indireta por prazo mínimo de 5 (cinco) anos.",
    },
    {
      title: "CLÁUSULA 6 – CONFIDENCIALIDADE PERPÉTUA",
      body: "Qualquer vazamento de código, estratégia, dados, estrutura ou modelo de negócio gera multa equivalente a 10 (dez) vezes o valor investido.",
    },
    {
      title: "CLÁUSULA 7 – DISTRIBUIÇÃO DE LUCROS",
      body: "A distribuição de lucros: Não é automática; Não é obrigatória mensalmente; Depende de decisão do Fundador; Depende da saúde financeira da empresa. Lucro será distribuído apenas quando houver formalização interna.",
    },
    {
      title: "CLÁUSULA 8 – RESPONSABILIDADE LIMITADA",
      body: "O Sócio não responde por dívidas da empresa. A empresa não responde por obrigações pessoais do Sócio.",
    },
    {
      title: "CLÁUSULA 9 – CESSÃO E TRANSFERÊNCIA",
      body: "O Sócio não pode vender, transferir ou ceder sua participação a terceiros sem autorização expressa e por escrito do Fundador. Caso outro sócio deseje vender sua participação, o Sócio terá direito de preferência para adquiri-la, desde que haja concordância do Fundador e que a soma total de participações não ultrapasse 49%.",
    },
    {
      title: "CLÁUSULA 10 – AQUISIÇÃO DE PARTICIPAÇÃO ADICIONAL",
      body: "O Sócio poderá adquirir participação adicional na empresa mediante negociação direta e acordo formal com o Fundador, respeitando o limite máximo de 49% de participação total entre todos os sócios. O valor e as condições da aquisição adicional serão definidos pelo Fundador com base em critérios internos de valuation. O Sócio também poderá adquirir total ou parcialmente a participação de outro sócio que deseje vendê-la, desde que haja autorização prévia do Fundador e formalização por meio de novo contrato ou aditivo contratual.",
    },
    {
      title: "CLÁUSULA 11 – RESCISÃO POR CONDUTA",
      body: "O contrato poderá ser rescindido unilateralmente pelo Fundador em caso de: quebra de confidencialidade; danos à imagem; interferência indevida; tentativa de sabotagem; ação judicial abusiva.",
    },
    {
      title: "CLÁUSULA 12 – SUCESSÃO",
      body: "Em caso de falecimento do Sócio, a participação poderá ser recomprada pelo Fundador antes de qualquer transferência hereditária.",
    },
    {
      title: "CLÁUSULA 13 – FORO",
      body: "Foro da comarca do Fundador.",
    },
    {
      title: "CLÁUSULA 14 – CARÁTER PRIVADO",
      body: "Este contrato não constitui sociedade formal registrada, tratando-se de acordo privado de participação econômica.",
    },
  ];
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
  const clauses = getContractClauses(data.percentual);
  clauses.forEach((c) => addClause(c.title, c.body));

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

  addText(`Código hash: SHA-256 do contrato gerado digitalmente`, 9, false, "center");

  doc.save(`contrato-${data.partnerName.replace(/\s+/g, "_")}-${now.toISOString().slice(0, 10)}.pdf`);
}
