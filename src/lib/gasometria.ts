// ============================================================
// Gasometria interpretada — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Faixas e regras de compensação: Berend 2014 (N Engl J Med).
// Winters: Albert, Dell e Winters, 1967.
// ============================================================

export interface EntradaGasometria {
  ph: number | null;
  paco2: number | null;
  hco3: number | null;
  be: number | null;
  na: number | null;
  cl: number | null;
  albumina: number | null;
}

export type DisturbioPrimario =
  | "acidose_respiratoria"
  | "alcalose_respiratoria"
  | "acidose_metabolica"
  | "alcalose_metabolica"
  | "acidose_mista"
  | "alcalose_mista"
  | "sem_disturbio";

// Number.isFinite e não isNaN: divisão por zero produz Infinity, que passa por
// isNaN. Mesma guarda de clinical.ts.
const num = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v);

export const FAIXAS = {
  ph: { min: 7.35, max: 7.45 },
  paco2: { min: 35, max: 45 },
  hco3: { min: 22, max: 26 },
} as const;

/**
 * Distúrbio ácido-base primário.
 *
 * `sem_disturbio` exige os TRÊS parâmetros dentro da faixa. Berend 2014
 * registra que na acidose respiratória crônica o pH pode estar normal ou acima
 * de 7,40: decidir pelo pH sozinho classificaria o retentor crônico compensado
 * como paciente sem distúrbio.
 *
 * Quando os dois parâmetros empurram na MESMA direção, nenhum está compensando
 * o outro e os dois são causa: o resultado é misto. Não se elege um primário
 * nesse caso, porque desempatar exigiria comparar mmHg com mmol/L.
 */
export function disturbioPrimario(e: EntradaGasometria): DisturbioPrimario | null {
  if (!num(e.ph) || !num(e.paco2) || !num(e.hco3)) return null;

  const paco2Alta = e.paco2 > FAIXAS.paco2.max;
  const paco2Baixa = e.paco2 < FAIXAS.paco2.min;
  const hco3Alto = e.hco3 > FAIXAS.hco3.max;
  const hco3Baixo = e.hco3 < FAIXAS.hco3.min;

  if (!paco2Alta && !paco2Baixa && !hco3Alto && !hco3Baixo) {
    const phNormal = e.ph >= FAIXAS.ph.min && e.ph <= FAIXAS.ph.max;
    if (phNormal) return "sem_disturbio";
  }

  // QUEM DECIDE O LADO É O pH, e não a ordem em que os parâmetros são
  // checados. Uma acidose metabólica compensada tem PaCO₂ BAIXA: perguntar
  // "PaCO₂ está baixa?" antes de olhar o pH a classificaria como alcalose
  // respiratória, invertendo o distúrbio na tela.
  //
  // 7,40 é o meio da faixa, e é onde o pH pende quando o distúrbio está
  // compensado. Exatamente 7,40 com PaCO₂ e HCO₃⁻ desviando em direções
  // opostas é ambíguo pela gasometria isolada; o critério abaixo é explícito
  // para que seja decisão, e não acidente de implementação.
  const ladoAcido = e.ph < 7.4;

  if (ladoAcido) {
    if (paco2Alta && hco3Baixo) return "acidose_mista";
    if (paco2Alta) return "acidose_respiratoria";
    if (hco3Baixo) return "acidose_metabolica";
  } else {
    if (paco2Baixa && hco3Alto) return "alcalose_mista";
    if (paco2Baixa) return "alcalose_respiratoria";
    if (hco3Alto) return "alcalose_metabolica";
  }

  // pH fora da faixa com PaCO₂ e HCO₃⁻ dentro dela: não há como nomear o
  // distúrbio a partir destes três valores.
  return "sem_disturbio";
}
