// ============================================================
// Cálculos clínicos de VM — Ventila Fisio
// Fórmulas padrão. Apoio à decisão; não substitui julgamento clínico.
// ============================================================
import type { DailyEvolution } from "../types";

export type Status = "ok" | "warn" | "danger";
export interface Classified {
  s: Status;
  t: string;
}

// Number.isFinite e não isNaN: uma divisão por zero produz Infinity, que passa
// por isNaN e chega às classificações como se fosse medida válida.
const num = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v);

// Grandeza que não existe em valor zero ou negativo (altura, peso, fluxo, FiO2).
// Barra só o fisicamente impossível; não é faixa clínica.
const positive = (v: number | null | undefined): v is number => num(v) && v > 0;

// Peso predito (ARDSnet) — altura em cm
export function pbw(sex: "M" | "F", heightCm?: number | null): number | null {
  if (!positive(heightCm)) return null;
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
  if (positive(heightCm)) return { value: pbw(sex, heightCm)!, estimated: false };
  return { value: pbw(sex, AVG_HEIGHT[sex])!, estimated: true };
}

export function bmi(weightKg?: number | null, heightCm?: number | null) {
  if (!positive(weightKg) || !positive(heightCm)) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// P/F = PaO2 / (FiO2 fração)
export function pfRatio(pao2?: number | null, fio2Pct?: number | null) {
  if (!num(pao2) || !positive(fio2Pct)) return null;
  return pao2 / (fio2Pct / 100);
}

export function vcPerKg(vcMl?: number | null, predBW?: number | null) {
  if (!num(vcMl) || !positive(predBW)) return null;
  return vcMl / predBW;
}

// Platô sempre acima da PEEP. Diferença nula ou negativa é erro de entrada,
// não uma driving pressure baixa.
export function drivingPressure(pplat?: number | null, peep?: number | null) {
  if (!num(pplat) || !num(peep)) return null;
  const delta = pplat - peep;
  return delta > 0 ? delta : null;
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
  if (!num(vcMl) || !num(d)) return null;
  return vcMl / d;
}

export function cDyn(vcMl?: number | null, ppico?: number | null, peep?: number | null) {
  if (!num(vcMl) || !num(ppico) || !num(peep)) return null;
  const d = ppico - peep;
  if (d <= 0) return null;
  return vcMl / d;
}

// Pico sempre acima do platô: a diferença é o componente resistivo.
export function raw(ppico?: number | null, pplat?: number | null, flowLs?: number | null) {
  if (!num(ppico) || !num(pplat) || !positive(flowLs)) return null;
  const delta = ppico - pplat;
  return delta < 0 ? null : delta / flowLs;
}

// Tobin (IRRS) = FR / VC(L)
export function tobin(fr?: number | null, vcMl?: number | null) {
  if (!num(fr) || !positive(vcMl)) return null;
  return fr / (vcMl / 1000);
}

export function map(sbp?: number | null, dbp?: number | null) {
  if (!num(sbp) || !num(dbp)) return null;
  return (sbp + 2 * dbp) / 3;
}

// Dias em ventilação a partir da data de intubação. O dia da intubação conta
// como 1º dia, que é como a beira do leito fala ("8º dia de VM").
// Data ausente, ilegível ou futura devolve null: contagem inventada é pior
// que campo vazio.
export function diasEmVentilacao(
  intubationDate: string | null | undefined,
  hoje: Date = new Date()
): number | null {
  if (!intubationDate) return null;
  const inicio = new Date(`${intubationDate}T00:00:00Z`);
  if (Number.isNaN(inicio.getTime())) return null;
  const ref = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.floor((ref - inicio.getTime()) / 86_400_000);
  if (dias < 0) return null;
  return dias + 1;
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
    if (!positive(v)) return null;
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
  rass?: number | null;
  vasopressor?: boolean | null;
  treResult?: string | null; // 'pass' | 'fail'
  peakCoughFlow?: number | null; // L/min
}

// Abaixo disto não há base para triagem. Ausência de dado não é avaliação
// parcial, e o corte de 4 já era o usado para liberar o nível favorável.
export const MIN_CRITERIOS_AVALIADOS = 4;

export interface ExtubationReadiness {
  level: "favorable" | "borderline" | "unfavorable" | "insufficient";
  score: number;
  max: number;
  met: string[];
  /** Critérios medidos que não passaram. */
  failed: string[];
  /** Critérios sem medida registrada. Não são reprovação. */
  notMeasured: string[];
}

export function extubationReadiness(i: ExtubationInput): ExtubationReadiness {
  const checks: { label: string; pass: boolean | null }[] = [
    { label: "FiO₂ ≤ 40%", pass: num(i.fio2) ? i.fio2! <= 40 : null },
    { label: "PEEP ≤ 8", pass: num(i.peep) ? i.peep! <= 8 : null },
    { label: "Tobin < 105", pass: num(i.tobinVal) ? i.tobinVal! < 105 : null },
    { label: "PImax ≤ -20", pass: num(i.pimaxVal) ? i.pimaxVal! <= -20 : null },
    { label: "Glasgow ≥ 8", pass: num(i.glasgow) ? i.glasgow! >= 8 : null },
    // O paciente precisa estar desperto para iniciar o TRE, e a resposta
    // verbal do Glasgow não é avaliável em paciente intubado. Decisão do
    // mentor clínico em 01/09/2026: manter os dois critérios.
    { label: "RASS entre −2 e +1", pass: num(i.rass) ? i.rass! >= -2 && i.rass! <= 1 : null },
    { label: "Sem vasopressor elevado", pass: i.vasopressor == null ? null : !i.vasopressor },
    { label: "TRE aprovado", pass: i.treResult == null ? null : i.treResult === "pass" },
    { label: "Tosse eficaz (PCF ≥ 60 L/min)", pass: num(i.peakCoughFlow) ? i.peakCoughFlow! >= 60 : null },
  ];

  const evaluated = checks.filter((c) => c.pass !== null);
  const met = evaluated.filter((c) => c.pass).map((c) => c.label);
  const failed = checks.filter((c) => c.pass === false).map((c) => c.label);
  const notMeasured = checks.filter((c) => c.pass === null).map((c) => c.label);
  const score = met.length;
  const max = checks.length;

  // TRE falhado é bloqueador explícito.
  let level: ExtubationReadiness["level"];
  if (i.treResult === "fail") level = "unfavorable";
  else if (evaluated.length < MIN_CRITERIOS_AVALIADOS) level = "insufficient";
  else if (met.length === evaluated.length) level = "favorable";
  else if (met.length >= Math.ceil(evaluated.length * 0.6)) level = "borderline";
  else level = "unfavorable";

  return { level, score, max, met, failed, notMeasured };
}

// ============================================================
// Correlação do quadro clínico com a ventilação (Tema A).
// Lembretes editáveis derivados de campos estruturados (sem caçar texto livre).
// Apoio à decisão; não é conduta automática.
// ============================================================

export interface Correlation {
  level: "info" | "warn";
  text: string;
  source: string;
}

export function ventilationCorrelations(ev: DailyEvolution): Correlation[] {
  const out: Correlation[] = [];
  const meds = ev.iv_meds ?? {};
  const img = ev.imaging ?? {};
  const allFindings = [
    ...(img.xray ?? []),
    ...(img.ct ?? []),
    ...(img.mri ?? []),
  ];
  const hasFinding = (k: string) => allFindings.includes(k);

  if (meds.nmb?.on)
    out.push({ level: "warn", source: "nmb", text: "Sob bloqueio neuromuscular: drive zerado, paciente não dispara. Use modo controlado e reavalie o trigger ao suspender." });
  if (meds.sedation?.on)
    out.push({ level: "info", source: "sedation", text: "Sedação ativa reduz o drive e o esforço; reavalie a sensibilidade do trigger e o nível de sedação." });
  if (meds.bronchodilator?.on || hasFinding("hiperinsuflacao"))
    out.push({ level: "warn", source: meds.bronchodilator?.on ? "bronchodilator" : "imaging_hiperinsuflacao", text: "Padrão obstrutivo: atenção a auto-PEEP. Vigie o tempo expiratório e prolongue a expiração se necessário." });
  if (meds.vasopressor?.on)
    out.push({ level: "info", source: "vasopressor", text: "Vasopressor em uso: PEEP alta reduz o retorno venoso. Titule a PEEP observando a hemodinâmica." });
  if (hasFinding("infiltrado_bilateral"))
    out.push({ level: "info", source: "imaging_sdra", text: "Infiltrado bilateral compatível com padrão SDRA: mantenha VC protetor e vigie a Driving Pressure." });
  if (hasFinding("pneumotorax"))
    out.push({ level: "warn", source: "imaging_pneumotorax", text: "Pneumotórax registrado: cuidado com pressões e PEEP; confirme a drenagem." });

  return out;
}
