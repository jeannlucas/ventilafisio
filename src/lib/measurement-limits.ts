// ============================================================
// Limites de plausibilidade física das medidas registradas.
//
// ATENÇÃO: isto NÃO é faixa clínica, alvo terapêutico nem limite de alarme.
// Só barra o que não pode existir: grandeza negativa onde não há negativo,
// zero onde zero não existe, e escala fora do próprio domínio (FiO2 além de
// oxigênio puro, Glasgow fora de 3 a 15, pH fora da escala de pH).
//
// Um valor aprovado aqui ainda pode ser gravíssimo. Quem julga gravidade é
// classify() em clinical.ts, e o profissional na beira do leito.
// ============================================================

export interface MeasurementLimit {
  min?: number;
  max?: number;
}

export interface MeasurementError {
  field: string;
  message: string;
}

/** Rótulo exibido ao profissional, para a mensagem de erro fazer sentido. */
const LABELS: Record<string, string> = {
  fr: "FR",
  vc: "VC",
  peep: "PEEP",
  fio2: "FiO₂",
  ppico: "P. pico",
  pplat: "P. platô",
  flow: "Fluxo",
  ph: "pH",
  pao2: "PaO₂",
  paco2: "PaCO₂",
  spo2: "SpO₂",
  hco3: "HCO₃⁻",
  be: "BE",
  na: "Na⁺",
  cl: "Cl⁻",
  albumina: "Albumina",
  pimax: "PImax",
  peak_cough_flow: "Pico de tosse",
  glasgow: "Glasgow",
  hr: "FC",
  sbp: "PAS",
  dbp: "PAD",
  lactate: "Lactato",
  height_cm: "Altura",
  weight_kg: "Peso",
  age: "Idade",
  p01: "P0.1",
  pocc: "ΔPocc",
  auto_peep: "Auto-PEEP",
};

// Menor incremento representável acima de zero para "tem que ser positivo".
// Usar 0 como min deixaria passar o zero, que é justamente o que barramos.
const ACIMA_DE_ZERO = Number.MIN_VALUE;

export const MEASUREMENT_LIMITS: Record<string, MeasurementLimit> = {
  // Ventilação
  fr: { min: ACIMA_DE_ZERO },
  vc: { min: ACIMA_DE_ZERO },
  peep: { min: 0 }, // ZEEP existe: PEEP zero é regulagem válida
  fio2: { min: 21, max: 100 }, // ar ambiente até oxigênio puro
  ppico: { min: ACIMA_DE_ZERO },
  pplat: { min: ACIMA_DE_ZERO },
  flow: { min: ACIMA_DE_ZERO },

  // Gasometria
  ph: { min: 0, max: 14 },
  pao2: { min: ACIMA_DE_ZERO },
  paco2: { min: ACIMA_DE_ZERO },
  spo2: { min: 0, max: 100 },
  hco3: { min: ACIMA_DE_ZERO },
  // Cerca de implausibilidade, não faixa clínica: -50 e 50 só barram o que não
  // pode existir. Não há piso positivo de propósito — o BE é rotineiramente
  // NEGATIVO e zero é o seu valor NORMAL, no meio da escala e não numa ponta
  // dela, então `min: 0` rejeitaria toda gasometria de paciente acidótico.
  be: { min: -50, max: 50 },
  na: { min: ACIMA_DE_ZERO },
  cl: { min: ACIMA_DE_ZERO },
  albumina: { min: ACIMA_DE_ZERO },

  // Desmame
  pimax: { max: 0 }, // pressão inspiratória máxima é negativa por convenção
  peak_cough_flow: { min: ACIMA_DE_ZERO },
  glasgow: { min: 3, max: 15 }, // a escala não existe fora disto

  // Hemodinâmica
  hr: { min: ACIMA_DE_ZERO },
  sbp: { min: ACIMA_DE_ZERO },
  dbp: { min: ACIMA_DE_ZERO },
  lactate: { min: 0 },

  // Antropometria
  height_cm: { min: ACIMA_DE_ZERO },
  weight_kg: { min: ACIMA_DE_ZERO },
  age: { min: 0 },

  // Esforço e drive
  // P0.1 é positivo por convenção de tela, e ZERO É VALOR VÁLIDO E GRAVE:
  // ausência de drive. Nunca ACIMA_DE_ZERO aqui.
  p01: { min: 0, max: 30 },
  // ΔPocc é NEGATIVO por definição: deflexão abaixo da PEEP. Piso em zero
  // rejeitaria toda medida real, como `min: 0` rejeitaria todo BE de paciente
  // acidótico. Cerca de plausibilidade, não faixa clínica.
  pocc: { min: -60, max: 0 },

  // Auto-PEEP: ZERO É MEDIDA, e favorável — significa ausência de
  // aprisionamento aéreo. Nunca ACIMA_DE_ZERO aqui.
  auto_peep: { min: 0 },
};

export function limitsFor(field: string): MeasurementLimit | undefined {
  return MEASUREMENT_LIMITS[field];
}

function describeLimit(label: string, limit: MeasurementLimit): string {
  const semZero = limit.min === ACIMA_DE_ZERO;
  if (semZero && limit.max == null) return `${label} precisa ser maior que zero.`;
  if (limit.min != null && limit.max != null) {
    const min = semZero ? "0 (exclusivo)" : String(limit.min);
    return `${label} precisa estar entre ${min} e ${limit.max}.`;
  }
  if (limit.max != null) return `${label} não pode passar de ${limit.max}.`;
  return `${label} não pode ser menor que ${limit.min}.`;
}

/**
 * Valida os campos preenchidos de um formulário de medidas.
 * Campo vazio é ausência de medida, não erro. Acumula todos os problemas,
 * para o profissional corrigir de uma vez em vez de um por vez.
 */
export function invalidMeasurements(
  values: Record<string, string | null | undefined>
): MeasurementError[] {
  const errors: MeasurementError[] = [];

  for (const [field, rawValue] of Object.entries(values)) {
    const limit = MEASUREMENT_LIMITS[field];
    if (!limit) continue;

    const text = rawValue?.trim();
    if (!text) continue;

    const value = Number(text);
    if (!Number.isFinite(value)) {
      errors.push({
        field,
        message: `${LABELS[field] ?? field} precisa ser um número.`,
      });
      continue;
    }

    const abaixo = limit.min != null && value < limit.min;
    const acima = limit.max != null && value > limit.max;
    if (abaixo || acima) {
      errors.push({
        field,
        message: describeLimit(LABELS[field] ?? field, limit),
      });
    }
  }

  return errors;
}

function parseOptional(value: string | null | undefined): number | null {
  const text = value?.trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Coerência entre campos. Cada valor abaixo é plausível isolado, mas a
 * combinação não existe em um paciente ventilado. Era daqui que saíam a
 * driving pressure negativa e a resistência negativa que o app classificava
 * em verde antes do conserto.
 */
export function inconsistentMeasurements(
  values: Record<string, string | null | undefined>
): MeasurementError[] {
  const errors: MeasurementError[] = [];
  const ppico = parseOptional(values.ppico);
  const pplat = parseOptional(values.pplat);
  const peep = parseOptional(values.peep);

  if (pplat != null && peep != null && pplat <= peep) {
    errors.push({
      field: "pplat",
      message:
        "P. platô precisa ficar acima da PEEP: a diferença entre as duas é a driving pressure.",
    });
  }

  if (ppico != null && pplat != null && ppico < pplat) {
    errors.push({
      field: "ppico",
      message: "P. pico não pode ficar abaixo da P. platô.",
    });
  }

  return errors;
}
