// ============================================================
// Catálogos do quadro clínico (Tema A) :: CONTEÚDO A VALIDAR
// Achados de imagem, categorias de medicamento venoso e opções de sonda/dieta.
// Você e o mentor devem revisar a nomenclatura e os lembretes (ventHint)
// antes do uso clínico real.
// ============================================================
import type { IvMedKey, FeedingTube, DietType } from "../types";

export interface ImagingFinding {
  key: string;
  label: string;
  modality: "xray" | "ct" | "mri";
}

// Achados comuns por modalidade. As keys são estáveis (usadas pelo motor de
// correlação); os labels são o que o profissional vê nos chips.
export const IMAGING_FINDINGS: ImagingFinding[] = [
  { key: "infiltrado_bilateral", label: "Infiltrado bilateral", modality: "xray" },
  { key: "consolidacao", label: "Consolidação", modality: "xray" },
  { key: "atelectasia", label: "Atelectasia", modality: "xray" },
  { key: "derrame", label: "Derrame pleural", modality: "xray" },
  { key: "pneumotorax", label: "Pneumotórax", modality: "xray" },
  { key: "hiperinsuflacao", label: "Hiperinsuflação", modality: "xray" },
  { key: "normal", label: "Sem alterações", modality: "xray" },
  { key: "infiltrado_bilateral", label: "Infiltrado bilateral", modality: "ct" },
  { key: "consolidacao", label: "Consolidação", modality: "ct" },
  { key: "vidro_fosco", label: "Vidro fosco", modality: "ct" },
  { key: "derrame", label: "Derrame pleural", modality: "ct" },
  { key: "pneumotorax", label: "Pneumotórax", modality: "ct" },
  { key: "atelectasia", label: "Atelectasia", modality: "ct" },
  { key: "normal", label: "Sem alterações", modality: "ct" },
  { key: "normal", label: "Sem alterações", modality: "mri" },
];

export interface IvMedCategory {
  key: IvMedKey;
  label: string;
  ventHint: string;
}

// As 5 categorias que mudam o raciocínio ventilatório.
export const IV_MED_CATEGORIES: IvMedCategory[] = [
  { key: "sedation", label: "Sedação", ventHint: "Sedação profunda reduz o drive e o esforço; reavalie o trigger." },
  { key: "analgesia", label: "Analgesia (opioide)", ventHint: "Opioide reduz o drive respiratório e a frequência espontânea." },
  { key: "nmb", label: "Bloqueador neuromuscular", ventHint: "Sob BNM o drive é zerado; paciente não dispara, use modo controlado." },
  { key: "vasopressor", label: "Vasopressor", ventHint: "PEEP alta reduz o retorno venoso; titule observando a hemodinâmica." },
  { key: "bronchodilator", label: "Broncodilatador", ventHint: "Sugere broncoespasmo: atenção a auto-PEEP e tempo expiratório." },
];

export const FEEDING_TUBES: { v: FeedingTube; t: string }[] = [
  { v: "none", t: "Nenhuma" },
  { v: "sng", t: "SNG" },
  { v: "sne", t: "SNE" },
  { v: "gtt", t: "Gastrostomia" },
];

export const DIET_TYPES: { v: DietType; t: string }[] = [
  { v: "fasting", t: "Jejum" },
  { v: "enteral", t: "Enteral" },
  { v: "oral", t: "Oral" },
  { v: "parenteral", t: "Parenteral" },
];
