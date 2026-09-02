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
  | "sem_disturbio"
  | "indeterminado";

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
  // distúrbio a partir destes três valores. Os gases são internamente
  // inconsistentes — o pH diz uma coisa e os dois parâmetros não dizem nada —
  // e isso NÃO é o mesmo que "sem distúrbio": aqui há desacordo entre os
  // números, não ausência de problema. Deliberadamente um valor distinto.
  return "indeterminado";
}

export type Temporalidade = "aguda" | "cronica" | "indeterminada";

/**
 * Variação esperada do HCO₃⁻ por 10 mmHg de desvio da PaCO₂ em relação a 40.
 *
 * O 5,0 da acidose crônica é PARECER do mentor (01/09/2026): Berend 2014 dá a
 * faixa de 4 a 5 e Martinu 2003 mediu 5,1 em DPOC estável. Nenhuma das duas
 * diz 5,0. Os demais são de Berend 2014; o −4,5 da alcalose crônica é o meio
 * da faixa de −4 a −5 que a revisão publica.
 */
const DELTA_HCO3_POR_10 = {
  acidoseAguda: 1,
  acidoseCronica: 5.0,
  alcaloseAguda: 2,
  alcaloseCronica: 4.5,
} as const;

/**
 * Tolerância para o app se recusar a rotular. Não é limiar clínico: é o quanto
 * o bicarbonato medido pode se afastar do mais próximo dos dois valores
 * esperados antes de "indeterminada" ser a resposta honesta.
 */
const TOLERANCIA_HCO3 = 3;

/**
 * Aguda ou crônica, decidida pelo BICARBONATO.
 *
 * A regra do pH por 10 mmHg (0,08 agudo, 0,03 crônico) é convenção de
 * livro-texto sem estudo primário rastreável, e por isso é só leitura auxiliar
 * na tela — ver `parecer_ph_por_10`. Ela não decide nada aqui.
 *
 * Devolve null em distúrbio metabólico ou misto: não há compensação
 * respiratória a datar.
 */
export function temporalidade(e: EntradaGasometria): Temporalidade | null {
  const d = disturbioPrimario(e);
  if (d !== "acidose_respiratoria" && d !== "alcalose_respiratoria") return null;
  if (!num(e.paco2) || !num(e.hco3)) return null;

  const unidades = (e.paco2 - 40) / 10;
  const agudo = d === "acidose_respiratoria"
    ? DELTA_HCO3_POR_10.acidoseAguda
    : DELTA_HCO3_POR_10.alcaloseAguda;
  const cronico = d === "acidose_respiratoria"
    ? DELTA_HCO3_POR_10.acidoseCronica
    : DELTA_HCO3_POR_10.alcaloseCronica;

  // Os coeficientes são MAGNITUDES positivas e quem carrega a direção é
  // `unidades`, que já é negativo quando a PaCO₂ está abaixo de 40. Coeficiente
  // negativo aqui inverteria o sinal duas vezes e faria o bicarbonato esperado
  // SUBIR na alcalose respiratória, que é o oposto do que acontece.
  const esperadoAgudo = 24 + agudo * unidades;
  const esperadoCronico = 24 + cronico * unidades;

  const distAgudo = Math.abs(e.hco3 - esperadoAgudo);
  const distCronico = Math.abs(e.hco3 - esperadoCronico);

  if (Math.min(distAgudo, distCronico) > TOLERANCIA_HCO3) return "indeterminada";
  return distAgudo <= distCronico ? "aguda" : "cronica";
}

/**
 * Critério da BTS para hipercapnia de longa data.
 *
 * A diretriz escreve "pH ≥ 7,35 e/ou HCO₃⁻ > 28". O mentor resolveu o "e/ou"
 * para OU em 01/09/2026, apresentados dois casos concretos. É o critério mais
 * SENSÍVEL dos dois: marca como crônico mais gente do que o E marcaria, e por
 * isso a tela diz "compatível com", nunca "é".
 *
 * O E externo continua sendo E: sem PaCO₂ elevada não há hipercapnia nenhuma.
 */
export function hipercapniaCronica(e: EntradaGasometria): boolean {
  if (!num(e.paco2) || e.paco2 <= FAIXAS.paco2.max) return false;
  const phCompativel = num(e.ph) && e.ph >= 7.35;
  const hco3Compativel = num(e.hco3) && e.hco3 > 28;
  return phCompativel || hco3Compativel;
}

export interface Compensacao {
  esperada: number;
  medida: number;
  margem: number;
  adequada: boolean;
}

const MARGEM_WINTERS = 2;

/**
 * Compensação respiratória PREVISTA.
 *
 * Só existe na acidose metabólica, pela fórmula de Winters
 * (Albert, Dell e Winters, 1967): PaCO₂ esperada = 1,5 × HCO₃⁻ + 8 ± 2.
 *
 * NA ALCALOSE METABÓLICA O APLICATIVO NÃO DÁ NÚMERO, E ISSO É DELIBERADO.
 * Decisão do mentor em 01/09/2026, tomada depois de saber que o estudo
 * primário da fórmula de 0,7 é em CÃES (Madias 1984) e que Berend 2014
 * registra em nota de rodapé que a previsão neste distúrbio é difícil.
 * A tela diz que se espera hipoventilação e que a previsão quantitativa aqui
 * é pouco confiável. Isto NÃO é implementação faltando.
 */
export function compensacao(e: EntradaGasometria): Compensacao | null {
  if (disturbioPrimario(e) !== "acidose_metabolica") return null;
  if (!num(e.hco3) || !num(e.paco2)) return null;
  const esperada = 1.5 * e.hco3 + 8;
  return {
    esperada,
    medida: e.paco2,
    margem: MARGEM_WINTERS,
    adequada: Math.abs(e.paco2 - esperada) <= MARGEM_WINTERS,
  };
}

export interface AnionGap {
  bruto: number;
  /** null quando não há albumina: a correção não é adivinhada. */
  corrigido: number | null;
  albuminaUsada: number | null;
}

/** Albumina de referência da correção de Figge. Fixa, e visível na tela. */
export const ALBUMINA_REFERENCIA = 4.0;
const CORRECAO_POR_G_DL = 2.5;

/**
 * Ânion gap sem potássio: Na⁺ − (Cl⁻ + HCO₃⁻). Fórmula de Berend 2014,
 * confirmada pelo mentor em 01/09/2026.
 *
 * A correção pela albumina (Figge 1998, medida em 152 pacientes de UTI) não é
 * refinamento acadêmico aqui: hipoalbuminemia é regra em paciente crítico e
 * derruba o gap calculado, escondendo acidose por ânion gap elevado.
 *
 * O aplicativo NÃO afirma faixa de normalidade: ela depende do analisador do
 * laboratório e as fontes divergem de 3-12 a 8,5-15.
 */
export function anionGap(e: EntradaGasometria): AnionGap | null {
  if (!num(e.na) || !num(e.cl) || !num(e.hco3)) return null;
  const bruto = e.na - (e.cl + e.hco3);
  if (!num(e.albumina)) return { bruto, corrigido: null, albuminaUsada: null };
  return {
    bruto,
    corrigido: bruto + CORRECAO_POR_G_DL * (ALBUMINA_REFERENCIA - e.albumina),
    albuminaUsada: e.albumina,
  };
}
