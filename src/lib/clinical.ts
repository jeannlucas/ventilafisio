// ============================================================
// Cálculos clínicos de VM — Ventila Fisio
// Fórmulas padrão. Apoio à decisão; não substitui julgamento clínico.
// ============================================================

export type Status = "ok" | "warn" | "danger";
export interface Classified {
  s: Status;
  t: string;
}

const num = (v: number | null | undefined): v is number =>
  v != null && !Number.isNaN(v);

// Peso predito (ARDSnet) — altura em cm
export function pbw(sex: "M" | "F", heightCm?: number | null): number | null {
  if (!num(heightCm)) return null;
  const base = sex === "M" ? 50 : 45.5;
  return base + 0.91 * (heightCm - 152.4);
}

// Altura média populacional (BR) para estimativa quando não há altura.
export const AVG_HEIGHT = { M: 169, F: 158 } as const;

// PBW com fallback: se não houver altura, estima pela média do sexo.
// Retorna o valor e se foi estimado, para sinalizar na UI.
export function pbwOrEstimate(
  sex: "M" | "F",
  heightCm?: number | null
): { value: number; estimated: boolean } {
  if (num(heightCm)) return { value: pbw(sex, heightCm)!, estimated: false };
  return { value: pbw(sex, AVG_HEIGHT[sex])!, estimated: true };
}

export function bmi(weightKg?: number | null, heightCm?: number | null) {
  if (!num(weightKg) || !num(heightCm)) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// P/F = PaO2 / (FiO2 fração)
export function pfRatio(pao2?: number | null, fio2Pct?: number | null) {
  if (!num(pao2) || !num(fio2Pct)) return null;
  return pao2 / (fio2Pct / 100);
}

export function vcPerKg(vcMl?: number | null, predBW?: number | null) {
  if (!num(vcMl) || !num(predBW)) return null;
  return vcMl / predBW;
}

export function drivingPressure(pplat?: number | null, peep?: number | null) {
  if (!num(pplat) || !num(peep)) return null;
  return pplat - peep;
}

// Mechanical Power (Gattinoni simplificada) — VC em LITROS
export function mechanicalPower(
  fr?: number | null,
  vcMl?: number | null,
  ppico?: number | null,
  dp?: number | null
) {
  if (!num(fr) || !num(vcMl) || !num(ppico) || !num(dp)) return null;
  return 0.098 * fr * (vcMl / 1000) * (ppico - 0.5 * dp);
}

export function cStat(vcMl?: number | null, pplat?: number | null, peep?: number | null) {
  const d = drivingPressure(pplat, peep);
  if (!num(vcMl) || !num(d) || d === 0) return null;
  return vcMl / d;
}

export function cDyn(vcMl?: number | null, ppico?: number | null, peep?: number | null) {
  if (!num(vcMl) || !num(ppico) || !num(peep)) return null;
  const d = ppico - peep;
  if (d === 0) return null;
  return vcMl / d;
}

export function raw(ppico?: number | null, pplat?: number | null, flowLs?: number | null) {
  if (!num(ppico) || !num(pplat) || !num(flowLs) || flowLs === 0) return null;
  return (ppico - pplat) / flowLs;
}

// Tobin (IRRS) = FR / VC(L)
export function tobin(fr?: number | null, vcMl?: number | null) {
  if (!num(fr) || !num(vcMl) || vcMl === 0) return null;
  return fr / (vcMl / 1000);
}

export function map(sbp?: number | null, dbp?: number | null) {
  if (!num(sbp) || !num(dbp)) return null;
  return (sbp + 2 * dbp) / 3;
}

// ---------- Classificações ----------
export const classify = {
  pf(v: number | null): Classified | null {
    if (!num(v)) return null;
    if (v >= 300) return { s: "ok", t: "Normal" };
    if (v >= 200) return { s: "warn", t: "Leve" };
    if (v >= 100) return { s: "warn", t: "Moderada" };
    return { s: "danger", t: "Grave" };
  },
  vcKg(v: number | null, obese = false): Classified | null {
    if (!num(v)) return null;
    const hi = obese ? 8 : 6;
    if (v < 4) return { s: "danger", t: "Muito baixo" };
    if (v <= hi) return { s: "ok", t: "Ideal" };
    if (v <= 8) return { s: "warn", t: "Aceitável" };
    return { s: "danger", t: "Alto" };
  },
  pplat(v: number | null): Classified | null {
    if (!num(v)) return null;
    return v < 30 ? { s: "ok", t: "Adequado" } : { s: "danger", t: "Risco de lesão" };
  },
  dp(v: number | null): Classified | null {
    if (!num(v)) return null;
    if (v < 13) return { s: "ok", t: "Ideal" };
    if (v <= 15) return { s: "warn", t: "Atenção" };
    return { s: "danger", t: "Alto risco" };
  },
  mp(v: number | null): Classified | null {
    if (!num(v)) return null;
    return v < 17 ? { s: "ok", t: "Adequado" } : { s: "danger", t: "Elevado" };
  },
  tobin(v: number | null): Classified | null {
    if (!num(v)) return null;
    return v < 105 ? { s: "ok", t: "Favorável" } : { s: "warn", t: "Desfavorável" };
  },
  pimax(v: number | null): Classified | null {
    if (!num(v)) return null;
    if (v <= -30) return { s: "ok", t: "Ideal" };
    if (v <= -20) return { s: "warn", t: "Aceitável" };
    return { s: "danger", t: "Insuficiente" };
  },
};

// ============================================================
// Predição de prontidão para extubação a partir da evolução.
// Pontua critérios objetivos; retorna nível + critérios atendidos/pendentes.
// É um auxílio de triagem, não uma indicação de extubar.
// ============================================================
export interface ExtubationInput {
  fio2?: number | null; // %
  peep?: number | null;
  tobinVal?: number | null;
  pimaxVal?: number | null;
  glasgow?: number | null;
  vasopressor?: boolean | null;
  treResult?: string | null; // 'pass' | 'fail'
  peakCoughFlow?: number | null; // L/min
}

export interface ExtubationReadiness {
  level: "favorable" | "borderline" | "unfavorable";
  score: number;
  max: number;
  met: string[];
  pending: string[];
}

export function extubationReadiness(i: ExtubationInput): ExtubationReadiness {
  const checks: { label: string; pass: boolean | null }[] = [
    { label: "FiO₂ ≤ 40%", pass: num(i.fio2) ? i.fio2! <= 40 : null },
    { label: "PEEP ≤ 8", pass: num(i.peep) ? i.peep! <= 8 : null },
    { label: "Tobin < 105", pass: num(i.tobinVal) ? i.tobinVal! < 105 : null },
    { label: "PImax ≤ -20", pass: num(i.pimaxVal) ? i.pimaxVal! <= -20 : null },
    { label: "Glasgow ≥ 8", pass: num(i.glasgow) ? i.glasgow! >= 8 : null },
    { label: "Sem vasopressor elevado", pass: i.vasopressor == null ? null : !i.vasopressor },
    { label: "TRE aprovado", pass: i.treResult == null ? null : i.treResult === "pass" },
    { label: "Tosse eficaz (PCF ≥ 60 L/min)", pass: num(i.peakCoughFlow) ? i.peakCoughFlow! >= 60 : null },
  ];

  const evaluated = checks.filter((c) => c.pass !== null);
  const met = evaluated.filter((c) => c.pass).map((c) => c.label);
  const pending = checks.filter((c) => c.pass === false || c.pass === null).map((c) => c.label);
  const score = met.length;
  const max = checks.length;

  // TRE falhado é bloqueador explícito.
  let level: ExtubationReadiness["level"];
  if (i.treResult === "fail") level = "unfavorable";
  else if (evaluated.length >= 4 && met.length === evaluated.length) level = "favorable";
  else if (met.length >= Math.ceil(evaluated.length * 0.6)) level = "borderline";
  else level = "unfavorable";

  return { level, score, max, met, pending };
}

// ---------- Motor de sugestão (PEEP/FiO2 ARDSnet low) ----------
const ARDSNET_LOW = [
  { fio2: 30, peep: 5 }, { fio2: 40, peep: 5 }, { fio2: 40, peep: 8 },
  { fio2: 50, peep: 8 }, { fio2: 50, peep: 10 }, { fio2: 60, peep: 10 },
  { fio2: 70, peep: 10 }, { fio2: 70, peep: 12 }, { fio2: 70, peep: 14 },
  { fio2: 80, peep: 14 }, { fio2: 90, peep: 14 }, { fio2: 90, peep: 16 },
  { fio2: 90, peep: 18 }, { fio2: 100, peep: 18 }, { fio2: 100, peep: 20 },
];

export function suggestVc(predBW: number | null, obese: boolean) {
  if (!num(predBW)) return null;
  const lowKg = obese ? 6 : 4;
  const highKg = obese ? 8 : 6;
  const targetKg = obese ? 7 : 6;
  return {
    obese, lowKg, highKg, targetKg,
    low: Math.round(predBW * lowKg),
    high: Math.round(predBW * highKg),
    target: Math.round(predBW * targetKg),
    ml6: Math.round(predBW * 6),
    ml8: Math.round(predBW * 8),
  };
}

export function suggestPeepFio2(pf: number | null, spo2: number | null) {
  // Sem gasometria nem oximetria: preset de admissão (titular FiO2 para baixo).
  if (!num(pf) && !num(spo2)) {
    return { fio2: 100, peep: 5, admission: true };
  }
  let fio2: number;
  if (!num(pf)) fio2 = 40;
  else if (pf >= 300) fio2 = 30;
  else if (pf >= 200) fio2 = 40;
  else if (pf >= 100) fio2 = 60;
  else fio2 = 80;
  if (num(spo2) && spo2 < 90) fio2 = Math.min(100, fio2 + 10);
  const row = ARDSNET_LOW.find((r) => r.fio2 >= fio2) ?? ARDSNET_LOW[ARDSNET_LOW.length - 1];
  return { fio2: row.fio2, peep: row.peep, admission: false };
}

export function suggestVentilation(predBW: number | null, vcTargetMl: number | null) {
  if (!num(predBW) || !num(vcTargetMl)) return null;
  const veL = (predBW * 100) / 1000; // L/min
  const fr = Math.round(veL / (vcTargetMl / 1000));
  return { veL, fr: Math.max(12, Math.min(35, fr)) };
}

// ============================================================
// Sugestão de admissão — funciona mesmo sem altura/peso/gasometria.
// Garante um ponto de partida para colocar o paciente na ventilação.
// ============================================================
export interface AdmissionSuggestion {
  pbw: number;
  pbwEstimated: boolean;
  obese: boolean;
  obeseUnknown: boolean; // true quando não há IMC para confirmar
  vc: ReturnType<typeof suggestVc>;
  peepFio2: ReturnType<typeof suggestPeepFio2>;
  ventilation: ReturnType<typeof suggestVentilation>;
  mode: string;
}

export function admissionSuggestion(
  sex: "M" | "F",
  heightCm?: number | null,
  weightKg?: number | null,
  pf?: number | null,
  spo2?: number | null,
  currentMode?: string | null
): AdmissionSuggestion {
  const { value: predBW, estimated } = pbwOrEstimate(sex, heightCm);
  const bmiVal = bmi(weightKg, heightCm);
  // Sem dados para IMC, assume não-obeso (faixa protetora) mas sinaliza.
  const obese = bmiVal != null ? bmiVal >= 30 : false;
  const obeseUnknown = bmiVal == null;
  const vc = suggestVc(predBW, obese);
  const peepFio2 = suggestPeepFio2(pf ?? null, spo2 ?? null);
  const ventilation = vc ? suggestVentilation(predBW, vc.target) : null;
  return {
    pbw: predBW,
    pbwEstimated: estimated,
    obese,
    obeseUnknown,
    vc,
    peepFio2,
    ventilation,
    mode: currentMode || "VCV",
  };
}
