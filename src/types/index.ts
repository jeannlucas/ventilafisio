import type { Mrc } from "../lib/scores";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Ventilator {
  id: string;
  brand: string;
  model: string;
  modes: string[];
  param_labels: Record<string, string>;
  handling: Record<string, unknown>;
  notes: string | null;
  verified: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Patient {
  id: string;
  owner_id: string;
  hospital_id: string | null;
  name: string;
  age: number | null;
  sex: "M" | "F" | null;
  diagnosis: string | null;
  comorbidities: string[];
  intubation_date: string | null;
  airway: "tot" | "tqt" | null;
  height_cm: number | null;
  weight_kg: number | null;
  ventilator_id: string | null;
  current_mode: string | null;
  status: "active" | "archived";
  discharge_reason: "death" | "extubation" | null;
  discharge_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImagingData {
  xray?: string[];
  ct?: string[];
  mri?: string[];
  note?: string;
}

export interface IvMedEntry {
  on: boolean;
  note?: string;
}

export interface IvMeds {
  sedation?: IvMedEntry;
  analgesia?: IvMedEntry;
  nmb?: IvMedEntry;
  vasopressor?: IvMedEntry;
  bronchodilator?: IvMedEntry;
  other?: string;
}

// Categorias de medicamento (exclui `other`, que é texto livre).
export type IvMedKey = "sedation" | "analgesia" | "nmb" | "vasopressor" | "bronchodilator";

export type FeedingTube = "none" | "sng" | "sne" | "gtt";
export type DietType = "fasting" | "enteral" | "oral" | "parenteral";

export interface Feeding {
  tube?: FeedingTube;
  diet?: DietType;
}

export interface DailyEvolution {
  id: string;
  patient_id: string;
  owner_id: string;
  recorded_at: string;
  mode: string | null;
  fr: number | null;
  vc: number | null;
  peep: number | null;
  fio2: number | null;
  ppico: number | null;
  pplat: number | null;
  flow: number | null;
  ph: number | null;
  pao2: number | null;
  paco2: number | null;
  spo2: number | null;
  pimax: number | null;
  peak_cough_flow: number | null;
  glasgow: number | null;
  rass: number | null;
  ims: number | null;
  mrc: Mrc;
  tre_result: string | null;
  hr: number | null;
  sbp: number | null;
  dbp: number | null;
  lactate: number | null;
  vasopressor: boolean | null;
  notes: string | null;
  imaging: ImagingData;
  iv_meds: IvMeds;
  feeding: Feeding;
}

export interface Asynchrony {
  id: string;
  patient_id: string;
  owner_id: string;
  type: string;
  severity: string | null;
  recorded_at: string;
}

export interface CareAction {
  id: string;
  patient_id: string;
  owner_id: string;
  /** Chave do catálogo em src/data/care-bundle.ts. */
  action: string;
  at: string;
  note: string | null;
}

/** Desfecho de um TRE. `null` significa em andamento, não dado faltando. */
export type TreDesfecho = "aprovado" | "falhou" | "interrompido";

/**
 * Estado de um critério de falha. A AUSÊNCIA da chave no jsonb significa
 * "não avaliado" — diferente de presente com `atingido: false`, que significa
 * avaliado e não atingido.
 */
export interface TreCriterio {
  atingido: boolean;
  observacao?: string;
}

export interface TreSession {
  id: string;
  patient_id: string;
  owner_id: string;
  iniciado_em: string;
  encerrado_em: string | null;
  modo_antes: string | null;
  modo_durante: string | null;
  desfecho: TreDesfecho | null;
  motivo_interrupcao: string | null;
  criterios: Record<string, TreCriterio>;
}
