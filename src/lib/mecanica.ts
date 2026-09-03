// ============================================================
// Mecânica: drive, esforço e recrutabilidade — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Conversões de Bertoni 2019; faixas de interpretação são parecer do mentor.
// ============================================================

// Number.isFinite e não isNaN: uma divisão por zero produz Infinity, que passa
// por isNaN e chegaria às classificações como se fosse medida válida.
const num = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v);

export type FaixaDrive = "baixo" | "adequado" | "elevado";

/** Faixa do P0.1. O 3,5 é de Telias 2020; o 1,5 é parecer do mentor. */
export const FAIXA_P01 = { min: 1.5, max: 3.5 } as const;

/**
 * Drive respiratório pelo P0.1.
 *
 * ZERO É MEDIDA, e das graves: significa ausência de drive. Nunca tratar como
 * dado faltando — é a armadilha nº 5 do projeto num campo onde o valor mais
 * sério é justamente o menor.
 *
 * As operating characteristics de Telias 2020 (sensibilidade 80%,
 * especificidade 77% acima de 3,5) foram medidas contra esforço esofágico, não
 * contra desfecho clínico. A tela diz isso.
 */
export function classificarDrive(p01: number | null): FaixaDrive | null {
  if (!num(p01)) return null;
  if (p01 < FAIXA_P01.min) return "baixo";
  if (p01 > FAIXA_P01.max) return "elevado";
  return "adequado";
}

export type FaixaEsforco = "muito_baixo" | "adequado" | "aumentado" | "elevado";

/**
 * Fronteiras da leitura do Pmus, em cmH₂O. Parecer do mentor (02/09/2026).
 *
 * Ele escreveu as bordas de forma difusa ("< 3-4", "> 12-15") e código precisa
 * de número: 4, 8 e 12 produzem quatro faixas contíguas sem buraco. O 15 do
 * texto dele NÃO é uma quarta fronteira — aparece na frase como o ponto onde a
 * preocupação fica mais forte, dentro da faixa `elevado`, e é isso que a tela
 * diz.
 */
export const FRONTEIRAS_PMUS = { adequado: 4, aumentado: 8, elevado: 12 } as const;

export function classificarEsforco(pmus: number): FaixaEsforco {
  if (pmus < FRONTEIRAS_PMUS.adequado) return "muito_baixo";
  if (pmus < FRONTEIRAS_PMUS.aumentado) return "adequado";
  if (pmus < FRONTEIRAS_PMUS.elevado) return "aumentado";
  return "elevado";
}

export type FaixaDpL = "baixa" | "intermediaria" | "elevada";

/**
 * Fronteiras da leitura da ΔP_L,dyn estimada, em cmH₂O. Parecer do mentor
 * (03/09/2026): "Por favor classifica com os cortes já vistos como 15 e 20."
 *
 * Até 02/09/2026 este número saía SEM faixa e sem cor, porque o mentor não
 * tinha sido perguntado. Ele foi, e respondeu — a decisão de não classificar
 * caiu, e no lugar dela ficam estes dois números, que são dele e não da
 * literatura. `COEF_DPL` continua sendo Bertoni 2019: o parecer sustenta as
 * faixas, não o coeficiente.
 *
 * Mesma convenção de inclusividade de `classificarEsforco`: a comparação é
 * `<`, então 15 já é `intermediaria` e 20 já é `elevada`. Três faixas, dois
 * números, sem quarta faixa.
 */
export const FRONTEIRAS_DPL = { intermediaria: 15, elevada: 20 } as const;

export function classificarDpL(dpl: number): FaixaDpL {
  if (dpl < FRONTEIRAS_DPL.intermediaria) return "baixa";
  if (dpl < FRONTEIRAS_DPL.elevada) return "intermediaria";
  return "elevada";
}

export interface Esforco {
  /** Sempre positivo, qualquer que seja o sinal do ΔPocc gravado. */
  pmus: number;
  faixa: FaixaEsforco;
  /** Estimativa de estresse pulmonar. */
  dpLDinamica: number | null;
  /** Faixa da ΔP_L,dyn. null quando não há ΔP_L,dyn a classificar. */
  faixaDpL: FaixaDpL | null;
}

const COEF_PMUS = 0.75;
const COEF_DPL = 2 / 3;

/**
 * Esforço inspiratório a partir da oclusão expiratória (Bertoni 2019).
 *
 *   Pmus       = 0,75 × |ΔPocc|
 *   ΔP_L,dyn   = (P_pico − PEEP) + 2/3 × |ΔPocc|
 *
 * O MÓDULO do ΔPocc é deliberado: a deflexão é negativa por definição, mas
 * alguns serviços anotam o valor absoluto. O sinal do que foi digitado não
 * pode mudar a leitura clínica.
 *
 * Nada disto é gravado. Guardamos ΔPocc, P_pico e PEEP e recalculamos na
 * exibição: se um coeficiente mudar por decisão do mentor, o histórico inteiro
 * se corrige sozinho, em vez de ficar com números velhos cristalizados no banco
 * afirmando o que a versão anterior achava.
 */
export function estimarEsforco(
  pocc: number | null,
  ppico: number | null,
  peep: number | null
): Esforco | null {
  if (!num(pocc)) return null;
  const modulo = Math.abs(pocc);
  const pmus = COEF_PMUS * modulo;
  const dpLDinamica =
    num(ppico) && num(peep) ? ppico - peep + COEF_DPL * modulo : null;
  return {
    pmus,
    faixa: classificarEsforco(pmus),
    dpLDinamica,
    // Sem ΔP_L,dyn não há o que classificar, e `null` aqui é ausência de
    // número, não faixa baixa: classificar o que não foi calculado seria a
    // armadilha nº 5 do projeto.
    faixaDpL: dpLDinamica != null ? classificarDpL(dpLDinamica) : null,
  };
}

export interface RecrutabilidadeEntrada {
  passivo: boolean | null;
  fechamentoViaAerea: boolean | null;
  pressaoAbertura: number | null;
  peepAlta: number | null;
  peepBaixa: number | null;
  volumeExpiradoExtra: number | null;
  pplatBaixa: number | null;
  vcBaixa: number | null;
}

export interface Recrutabilidade {
  cBaixa: number;
  vInflado: number;
  vRecrutado: number;
  ri: number;
  /** A PEEP baixa usada: a medida, ou a de abertura se houve fechamento. */
  peepBaixaEfetiva: number;
}

/**
 * Faixa OBSERVADA na coorte de Chen 2020, para referência descritiva na tela.
 * NÃO é faixa de normalidade e NÃO é limiar de decisão.
 */
export const FAIXA_RI_OBSERVADA = { min: 0, max: 2.0 } as const;

/**
 * Razão de recrutamento sobre insuflação (Chen 2020).
 *
 *   PEEP baixa efetiva = fechamento ? pressão de abertura : PEEP baixa
 *   C_baixa            = VC baixa / (Pplat baixa − PEEP baixa efetiva)
 *   V_inflado          = C_baixa × (PEEP alta − PEEP baixa efetiva)
 *   V_recrutado        = volume expirado extra − V_inflado
 *   R/I                = V_recrutado / V_inflado
 *
 * A substituição pela pressão de abertura quando há fechamento completo de via
 * aérea vem do artigo. Sem ela a conta erra exatamente no paciente em que ela
 * mais importa.
 *
 * ESTA FUNÇÃO NÃO EMITE VEREDITO, e o tipo não tem onde guardar um. O 0,5 que
 * circula como corte é a mediana da coorte de derivação (n = 45), usada ali
 * para dicotomizar a análise, e não ponto de corte validado contra desfecho.
 *
 * O R/I PODE DAR NEGATIVO, quando o volume expirado extra fica abaixo do
 * V_inflado. Isso indica problema na medida, não recrutamento negativo, e a
 * função deliberadamente não recorta esse valor: o painel precisa poder
 * mostrar o que foi de fato medido.
 */
export function calcularRi(e: RecrutabilidadeEntrada): Recrutabilidade | null {
  // A manobra pressupõe paciente passivo. Sem essa confirmação não há número.
  if (e.passivo !== true) return null;

  // Não saber se houve fechamento de via aérea não é o mesmo que saber que não
  // houve. Calcular pelo caminho sem substituição diante de uma pergunta sem
  // resposta seria exatamente o erro que a substituição existe para evitar.
  if (typeof e.fechamentoViaAerea !== "boolean") return null;

  const peepBaixaEfetiva = e.fechamentoViaAerea
    ? e.pressaoAbertura
    : e.peepBaixa;
  if (!num(peepBaixaEfetiva)) return null;
  if (!num(e.peepAlta) || !num(e.pplatBaixa)) return null;
  if (!num(e.vcBaixa) || !num(e.volumeExpiradoExtra)) return null;

  const deltaPeep = e.peepAlta - peepBaixaEfetiva;
  const deltaPressao = e.pplatBaixa - peepBaixaEfetiva;
  // A guarda de deltaPeep é redundante com a de vInflado abaixo: como cBaixa é
  // sempre positiva (deltaPressao > 0 já foi validado), vInflado > 0 iff
  // deltaPeep > 0. Nenhum fixture consegue fazer essa guarda disparar sozinha.
  // Mantemos pela clareza: ela expressa a pergunta no ponto onde ela é feita.
  if (deltaPeep <= 0 || deltaPressao <= 0) return null;

  const cBaixa = e.vcBaixa / deltaPressao;
  const vInflado = cBaixa * deltaPeep;
  if (vInflado <= 0) return null;

  const vRecrutado = e.volumeExpiradoExtra - vInflado;
  return { cBaixa, vInflado, vRecrutado, ri: vRecrutado / vInflado, peepBaixaEfetiva };
}
