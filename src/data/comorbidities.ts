// ============================================================
// Comorbidades relevantes para a ventilação :: CONTEÚDO A VALIDAR
// A marcação `pulmonar` existe para a Fase 2 (alvo ventilatório por
// patologia). NESTA FASE ela não modula alvo nenhum — é só registro.
// ============================================================

export interface Comorbidity {
  key: string;
  label: string;
  /** Doença pulmonar prévia. Reservado para a Fase 2. */
  pulmonar: boolean;
}

export const COMORBIDITIES: Comorbidity[] = [
  { key: "dpoc", label: "DPOC", pulmonar: true },
  { key: "asma", label: "Asma", pulmonar: true },
  { key: "fibrose", label: "Fibrose pulmonar", pulmonar: true },
  { key: "bronquiectasia", label: "Bronquiectasia", pulmonar: true },
  { key: "sahos", label: "SAHOS", pulmonar: true },
  { key: "tabagismo", label: "Tabagismo", pulmonar: true },
  { key: "icc", label: "Insuficiência cardíaca", pulmonar: false },
  { key: "has", label: "Hipertensão", pulmonar: false },
  { key: "dm", label: "Diabetes", pulmonar: false },
  { key: "drc", label: "Doença renal crônica", pulmonar: false },
  { key: "obesidade", label: "Obesidade", pulmonar: false },
  { key: "neuro", label: "Doença neurológica", pulmonar: false },
  { key: "lesao_cerebral_aguda", label: "Lesão cerebral aguda", pulmonar: false },
  { key: "neoplasia", label: "Neoplasia", pulmonar: false },
];
