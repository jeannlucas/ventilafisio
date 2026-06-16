export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
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
  admission_date: string | null;
  intubation_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  comorbidities: string[];
  ventilator_id: string | null;
  current_mode: string | null;
  active: boolean;
  status: "active" | "archived";
  discharge_reason: "death" | "extubation" | null;
  discharge_date: string | null;
  created_at: string;
  updated_at: string;
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
  hco3: number | null;
  be: number | null;
  spo2: number | null;
  pimax: number | null;
  peak_cough_flow: number | null;
  glasgow: number | null;
  tre_result: string | null;
  hr: number | null;
  sbp: number | null;
  dbp: number | null;
  lactate: number | null;
  vasopressor: boolean | null;
  notes: string | null;
}

export interface Asynchrony {
  id: string;
  patient_id: string;
  owner_id: string;
  evolution_id: string | null;
  type: string;
  severity: string | null;
  recorded_at: string;
  notes: string | null;
}
