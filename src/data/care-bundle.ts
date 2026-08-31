// ============================================================
// Bundle de cuidados :: CONTEÚDO A VALIDAR
// Ações registradas por plantão. As keys são estáveis (gravadas em
// care_actions.action); os labels são o que o profissional vê.
// A lista definitiva é pendência do mentor (spec, seção 10).
// ============================================================

export interface CareBundleItem {
  key: string;
  label: string;
  /** Aceita observação livre (ex.: pressão do cuff em cmH₂O). */
  comObservacao: boolean;
}

export const CARE_BUNDLE: CareBundleItem[] = [
  { key: "aspiracao_tot", label: "Aspiração de TOT/TQT", comObservacao: false },
  { key: "aspiracao_vas", label: "Aspiração de vias aéreas superiores", comObservacao: false },
  { key: "cuffometria", label: "Cuffometria", comObservacao: true },
  { key: "higiene_oral", label: "Higiene oral", comObservacao: false },
  { key: "cabeceira_30", label: "Cabeceira elevada 30–45°", comObservacao: false },
  { key: "mudanca_decubito", label: "Mudança de decúbito", comObservacao: true },
  { key: "umidificacao", label: "Umidificação conferida", comObservacao: false },
];
