// ============================================================
// Catálogos dos escores :: CONTEÚDO A VALIDAR
// MRC: seis grupos testados bilateralmente, 0 a 5 cada, máximo 60.
// A chave `cotovelo` é neutra de propósito: a literatura diverge entre
// flexão e extensão no somatório, e é pendência do mentor (spec, seção 10).
// Trocar o RÓTULO depois não exige migração de dado.
// ============================================================

export interface MrcGroup {
  key: string;
  label: string;
}

export const MRC_GROUPS: MrcGroup[] = [
  { key: "ombro_abducao", label: "Abdução de ombro" },
  { key: "cotovelo", label: "Flexão de cotovelo" },
  { key: "punho_extensao", label: "Extensão de punho" },
  { key: "quadril_flexao", label: "Flexão de quadril" },
  { key: "joelho_extensao", label: "Extensão de joelho" },
  { key: "tornozelo_dorsi", label: "Dorsiflexão de tornozelo" },
];

// RASS: 10 níveis, +4 a -5.
export const RASS_LEVELS: { v: string; t: string }[] = [
  { v: "4", t: "+4 Combativo" },
  { v: "3", t: "+3 Muito agitado" },
  { v: "2", t: "+2 Agitado" },
  { v: "1", t: "+1 Inquieto" },
  { v: "0", t: "0 Alerta e calmo" },
  { v: "-1", t: "−1 Sonolento" },
  { v: "-2", t: "−2 Sedação leve" },
  { v: "-3", t: "−3 Sedação moderada" },
  { v: "-4", t: "−4 Sedação profunda" },
  { v: "-5", t: "−5 Não desperta" },
];

// IMS: 0 a 10.
export const IMS_LEVELS: { v: string; t: string }[] = [
  { v: "0", t: "0 Nada (deitado)" },
  { v: "1", t: "1 Exercício no leito" },
  { v: "2", t: "2 Transferência passiva à poltrona" },
  { v: "3", t: "3 Sentado à beira do leito" },
  { v: "4", t: "4 De pé" },
  { v: "5", t: "5 Transferência ao assento" },
  { v: "6", t: "6 Marcha no lugar" },
  { v: "7", t: "7 Marcha com 2 ou mais pessoas" },
  { v: "8", t: "8 Marcha com 1 pessoa" },
  { v: "9", t: "9 Marcha com apoio" },
  { v: "10", t: "10 Marcha independente" },
];
