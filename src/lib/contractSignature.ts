// Helper to parse/manage contract signature data stored in partner_contracts.arquivo_pdf (JSON string)
// Using existing fields without DB changes:
// - status: "pendente_assinatura" | "assinado_socio" | "assinado_fundador" | "assinado_ambos" | "ativo" (legacy) | "substituido"
// - ip_assinatura: partner's signing IP
// - arquivo_pdf: JSON metadata { socio_assinado_em, fundador_assinado_em, fundador_ip }

export interface SignatureData {
  socio_assinado_em?: string;
  fundador_assinado_em?: string;
  fundador_ip?: string;
}

export function parseSignatureData(arquivo_pdf: string | null): SignatureData {
  if (!arquivo_pdf) return {};
  try {
    return JSON.parse(arquivo_pdf) as SignatureData;
  } catch {
    return {};
  }
}

export function getSignatureStatus(status: string, sigData: SignatureData): {
  label: string;
  icon: "both" | "pending_socio" | "pending_fundador" | "none";
  description: string;
} {
  // Legacy contracts with status "ativo" and no signature data = treat as legacy signed
  if (status === "ativo" && !sigData.socio_assinado_em && !sigData.fundador_assinado_em) {
    return { label: "Contrato Ativo (Legado)", icon: "both", description: "Contrato formalmente validado" };
  }

  switch (status) {
    case "assinado_ambos":
      return { label: "Assinado por ambas as partes", icon: "both", description: "Contrato formalmente validado" };
    case "assinado_socio":
      return { label: "Assinatura pendente do Fundador", icon: "pending_fundador", description: "Aguardando assinatura do Fundador" };
    case "assinado_fundador":
      return { label: "Assinatura pendente do Sócio", icon: "pending_socio", description: "Aguardando assinatura do Sócio" };
    case "pendente_assinatura":
      return { label: "Não assinado", icon: "none", description: "Aguardando assinatura de ambas as partes" };
    case "substituido":
      return { label: "Substituído", icon: "none", description: "Este contrato foi substituído por uma versão mais recente" };
    default:
      return { label: status, icon: "none", description: "" };
  }
}

export function isFullySigned(status: string, sigData: SignatureData): boolean {
  if (status === "assinado_ambos") return true;
  // Legacy
  if (status === "ativo" && !sigData.socio_assinado_em && !sigData.fundador_assinado_em) return true;
  return false;
}
