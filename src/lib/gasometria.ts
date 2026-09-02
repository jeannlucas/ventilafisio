// ============================================================
// Gasometria interpretada — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Faixas e regras de compensação: Berend 2014 (N Engl J Med).
// Winters: Albert, Dell e Winters, 1967.
// ============================================================
import type { Conduta } from "./condutas";
import type { SourceKey } from "./references";

export interface EntradaGasometria {
  ph: number | null;
  paco2: number | null;
  hco3: number | null;
  /**
   * Capturado e exibido em outros pontos do app, mas NÃO alimenta nenhum
   * cálculo deste módulo: nenhuma função aqui lê `be`. Está na interface para
   * que a entrada da gasometria continue completa, não porque participe da
   * interpretação.
   */
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
 *
 * ESTREITAMENTO INTERINO (02/09/2026), à espera do mentor: o E externo passou a
 * exigir também pH ≤ FAIXAS.ph.max, ou seja, paciente NÃO alcalêmico. Sem essa
 * cláusula, pH 7,48 / PaCO₂ 48 / HCO₃⁻ 35 — alcalose metabólica corriqueira de
 * diurético ou de sonda nasogástrica — passava pelo braço do pH e a tela
 * anunciava hipercapnia de longa data, emitindo o alvo de SpO₂ de 88 a 92% num
 * paciente que não retém CO₂. O critério da BTS é escrito para quem está sendo
 * avaliado por insuficiência respiratória HIPERCÁPNICA, e ali "pH ≥ 7,35"
 * significa "não acidótico, logo provavelmente compensado" — nunca quis dizer
 * francamente alcalêmico.
 *
 * O que o mentor validou continua valendo: os dois casos que ele analisou
 * (pH 7,36 / PaCO₂ 55 / HCO₃⁻ 26 e pH 7,30 / PaCO₂ 55 / HCO₃⁻ 30) seguem
 * devolvendo `true`, porque os dois têm pH ≤ 7,36. Um pH alcalêmico estava fora
 * do que lhe foi perguntado. O OU interno é ruling dele e NÃO foi tocado.
 */
export function hipercapniaCronica(e: EntradaGasometria): boolean {
  if (!num(e.paco2) || e.paco2 <= FAIXAS.paco2.max) return false;
  // pH ausente não bloqueia: quem carrega o critério então é o bicarbonato.
  if (num(e.ph) && e.ph > FAIXAS.ph.max) return false;
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

export interface Interpretacao {
  disturbio: DisturbioPrimario;
  /** null em distúrbio metabólico ou misto. */
  temporalidade: Temporalidade | null;
  /** Só na acidose metabólica. Ver `compensacao`. */
  compensacao: Compensacao | null;
  /**
   * Não é opcional: `interpretar` só devolve resultado com os três parâmetros
   * presentes, e com eles o critério da BTS é sempre decidível. Um null que não
   * pode acontecer vira ramo morto que ninguém consegue testar.
   */
  hipercapniaCronica: boolean;
  anionGap: AnionGap | null;
  condutas: Conduta[];
  /** Derivadas do resultado, não escritas à mão no painel. */
  sourceKeys: SourceKey[];
}

/** Limiar do bicarbonato, parecer do mentor em 01/09/2026. */
const PH_BICARBONATO = 7.2;

export function interpretar(e: EntradaGasometria): Interpretacao | null {
  const disturbio = disturbioPrimario(e);
  if (disturbio === null) return null;

  const temp = temporalidade(e);
  const cronica = hipercapniaCronica(e);
  const ag = anionGap(e);
  const condutas: Conduta[] = [];

  if (num(e.ph) && e.ph < PH_BICARBONATO) {
    condutas.push({
      texto:
        "Considerar bicarbonato de sódio. A indicação e a dose são da equipe médica.",
      alcada: "medica",
      sourceKey: "acidoBase",
    });
  }
  if (disturbio === "acidose_respiratoria" && temp === "aguda") {
    condutas.push({
      texto: "Reavaliar o volume-minuto: frequência e volume corrente.",
      alcada: "fisio",
      sourceKey: "acidoBase",
    });
  }
  if (disturbio === "alcalose_respiratoria") {
    condutas.push({
      texto:
        "Verificar hiperventilação induzida pelo ventilador antes de atribuir o quadro ao paciente.",
      alcada: "fisio",
      sourceKey: "acidoBase",
    });
  }
  if (cronica) {
    condutas.push({
      texto:
        "Alvo de SpO₂ de 88 a 92%. Saturação acima da faixa não é melhor neste paciente.",
      alcada: "fisio",
      sourceKey: "dpocOxigenio",
    });
  }

  const sourceKeys: SourceKey[] = ["acidoBase"];
  if (ag) sourceKeys.push("anionGap");
  if (cronica) sourceKeys.push("dpocOxigenio");

  return {
    disturbio,
    temporalidade: temp,
    compensacao: compensacao(e),
    hipercapniaCronica: cronica,
    anionGap: ag,
    condutas,
    sourceKeys,
  };
}
