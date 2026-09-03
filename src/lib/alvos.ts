// ============================================================
// Motor de alvos ventilatórios — Ventila Fisio
// Nenhum alvo é número solto: todo valor vem com o que ele seria sem
// modulação e com a lista do que o modificou. O tipo obriga cada modulação
// a declarar razão e fonte, então não há como mudar um número clínico em
// silêncio.
// ============================================================
import type { SourceKey } from "./references";
import type { PerfilClinico } from "./perfil";

export interface Modulacao {
  /** O que mudou e por quê, na língua do usuário. */
  motivo: string;
  /** Quem sustenta a modulação. */
  sourceKey: SourceKey;
}

export interface Alvo<T> {
  /** O que o app sugere. */
  valor: T;
  /** O que sugeriria sem modulação. Igual a `valor` quando não houve. */
  base: T;
  modulacoes: Modulacao[];
}

/** Alvo sem modulação alguma: base igual ao valor, lista vazia. */
const semModulacao = <T>(valor: T): Alvo<T> => ({
  valor,
  base: valor,
  modulacoes: [],
});

// Number.isFinite e não isNaN: uma divisão por zero produz Infinity, que
// passa por isNaN e chegaria a estas funções como se fosse medida válida.
const num = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v);

// ---------- Volume corrente ----------
export interface AlvoVc {
  lowKg: number;
  highKg: number;
  targetKg: number;
  low: number;
  high: number;
  target: number;
  ml6: number;
  ml8: number;
}

// Faixa protetora 4-6 ml/kg; obesidade desloca para 6-8 (o peso predito não
// muda com o peso real, então o alvo por quilo sobe para não subventilar).
export function sugerirVc(perfil: PerfilClinico): Alvo<AlvoVc> {
  const predBW = perfil.pbw;
  const base: AlvoVc = {
    lowKg: 4,
    highKg: 6,
    targetKg: 6,
    low: Math.round(predBW * 4),
    high: Math.round(predBW * 6),
    target: Math.round(predBW * 6),
    ml6: Math.round(predBW * 6),
    ml8: Math.round(predBW * 8),
  };
  if (!perfil.obeso) return semModulacao(base);

  const valor: AlvoVc = {
    ...base,
    lowKg: 6,
    highKg: 8,
    targetKg: 7,
    low: Math.round(predBW * 6),
    high: Math.round(predBW * 8),
    target: Math.round(predBW * 7),
  };
  return {
    valor,
    base,
    modulacoes: [
      {
        motivo: "Obesidade (IMC ≥ 30): faixa de volume corrente deslocada de 4–6 para 6–8 ml/kg de peso predito.",
        sourceKey: "vcKg",
      },
    ],
  };
}

// ---------- PEEP / FiO2 (ARDSnet, tabela low) ----------
const ARDSNET_LOW = [
  { fio2: 30, peep: 5 }, { fio2: 40, peep: 5 }, { fio2: 40, peep: 8 },
  { fio2: 50, peep: 8 }, { fio2: 50, peep: 10 }, { fio2: 60, peep: 10 },
  { fio2: 70, peep: 10 }, { fio2: 70, peep: 12 }, { fio2: 70, peep: 14 },
  { fio2: 80, peep: 14 }, { fio2: 90, peep: 14 }, { fio2: 90, peep: 16 },
  { fio2: 90, peep: 18 }, { fio2: 100, peep: 18 }, { fio2: 100, peep: 20 },
];

export interface AlvoPeepFio2 {
  fio2: number;
  /** null quando o aplicativo não tem número a dar. Ver `sugerirPeepFio2`. */
  peep: number | null;
  /** Faixa, usada no DPOC: 80 a 85% do auto-PEEP. null nos demais casos. */
  faixaPeep: { min: number; max: number } | null;
  presetAdmissao: boolean;
}

/** Teto de PEEP externa na asma (Demoule 2020). */
const PEEP_MAX_ASMA = 5;
/**
 * Fração do auto-PEEP que limita a PEEP externa no DPOC.
 *
 * Ranieri 1993 diz 85%; Demoule 2020 diz 80%. NÃO SÃO O MESMO NÚMERO, e o
 * aplicativo exibe a faixa citando as duas em vez de escolher um e esconder a
 * divergência.
 */
const FRACAO_AUTO_PEEP = { min: 0.8, max: 0.85 } as const;

/**
 * PEEP e FiO₂ sugeridas.
 *
 * Base: tabela low do ARDSnet, a partir da P/F e da SpO₂.
 *
 * DPOC e asma modulam em DIREÇÕES OPOSTAS, e o aplicativo nunca as trata como
 * "obstrutivo" genérico: na asma a PEEP externa é baixa; no DPOC o limite é
 * uma fração do auto-PEEP. Confundir as duas erra uma delas.
 *
 * No DPOC a tabela do ARDSnet NÃO SE APLICA. Sem auto-PEEP medido o
 * aplicativo não tem número a dar, e `peep` é null: devolver o da tabela seria
 * afirmar que ela vale ali.
 */
export function sugerirPeepFio2(
  pf: number | null,
  spo2: number | null,
  perfil: PerfilClinico,
  autoPeep: number | null
): Alvo<AlvoPeepFio2> {
  if (!num(pf) && !num(spo2)) {
    return semModulacao({ fio2: 100, peep: 5, faixaPeep: null, presetAdmissao: true });
  }
  let fio2: number;
  if (!num(pf)) fio2 = 40;
  else if (pf >= 300) fio2 = 30;
  else if (pf >= 200) fio2 = 40;
  else if (pf >= 100) fio2 = 60;
  else fio2 = 80;
  if (num(spo2) && spo2 < 90) fio2 = Math.min(100, fio2 + 10);
  const row = ARDSNET_LOW.find((r) => r.fio2 >= fio2) ?? ARDSNET_LOW[ARDSNET_LOW.length - 1];
  const base: AlvoPeepFio2 = {
    fio2: row.fio2, peep: row.peep, faixaPeep: null, presetAdmissao: false,
  };

  const temAsma = perfil.patologias.includes("asma");
  const temDpoc = perfil.patologias.includes("dpoc");
  if (!temAsma && !temDpoc) return semModulacao(base);

  // As duas marcadas: prevalece o teto mais conservador, e a modulação declara
  // as duas. Não é precedência clínica — o mentor não foi perguntado sobre o
  // paciente com as duas, e escolher a mais restritiva é a recusa de inventar
  // uma regra, não uma regra.
  if (temAsma) {
    const motivo = temDpoc
      ? "Asma e DPOC marcadas: aplicado o teto mais conservador, de 5 cmH₂O da asma. A PEEP externa alta agrava o aprisionamento aéreo."
      : "Asma: PEEP externa limitada a 5 cmH₂O. A tabela do ARDSnet não se aplica ao obstrutivo.";
    return {
      valor: { ...base, peep: Math.min(base.peep!, PEEP_MAX_ASMA) },
      base,
      modulacoes: [{ motivo, sourceKey: "obstrutivo" }],
    };
  }

  if (!num(autoPeep)) {
    return {
      valor: { ...base, peep: null, faixaPeep: null },
      base,
      modulacoes: [
        {
          motivo:
            "DPOC: a tabela do ARDSnet não se aplica. O limite da PEEP externa é 80 a 85% do auto-PEEP, que não foi medido — registre o auto-PEEP para o alvo aparecer.",
          sourceKey: "obstrutivo",
        },
      ],
    };
  }
  return {
    valor: {
      ...base,
      peep: null,
      faixaPeep: {
        min: autoPeep * FRACAO_AUTO_PEEP.min,
        max: autoPeep * FRACAO_AUTO_PEEP.max,
      },
    },
    base,
    modulacoes: [
      {
        motivo:
          "DPOC: a tabela do ARDSnet não se aplica. O limite da PEEP externa é 80 a 85% do auto-PEEP medido. Ranieri 1993 situa em 85% e Demoule 2020 em 80%; o aplicativo mostra a faixa em vez de escolher um dos dois.",
        sourceKey: "obstrutivo",
      },
    ],
  };
}

// ---------- Frequência / volume-minuto ----------
export interface AlvoVentilacao {
  veL: number;
  fr: number;
}

/** Piso de frequência. Cai em obstrutivo, para dar tempo de expirar. */
const FR_MIN_PADRAO = 12;
const FR_MIN_OBSTRUTIVO = 10;

/**
 * Frequência e volume-minuto.
 *
 * O piso de frequência cai de 12 para 10 em DPOC ou asma: Demoule 2020 orienta
 * frequência baixa e relação I:E de 1:4 a 1:6 justamente para dar tempo de
 * expirar, e o piso padrão vira obstáculo nesse paciente.
 *
 * A relação I:E não é calculada aqui: o aplicativo não conhece o tempo
 * inspiratório configurado no ventilador.
 */
export function sugerirVentilacao(
  predBW: number | null,
  vcTargetMl: number | null,
  perfil: PerfilClinico
): Alvo<AlvoVentilacao> | null {
  if (!num(predBW) || !num(vcTargetMl)) return null;
  const veL = (predBW * 100) / 1000;
  const bruto = Math.round(veL / (vcTargetMl / 1000));
  const base: AlvoVentilacao = {
    veL,
    fr: Math.max(FR_MIN_PADRAO, Math.min(35, bruto)),
  };
  const obstrutivo =
    perfil.patologias.includes("dpoc") || perfil.patologias.includes("asma");
  if (!obstrutivo) return semModulacao(base);
  return {
    valor: { veL, fr: Math.max(FR_MIN_OBSTRUTIVO, Math.min(35, bruto)) },
    base,
    modulacoes: [
      {
        motivo:
          "Obstrutivo: piso de frequência baixado para dar tempo de expirar. A relação I:E alvo é de 1:4 a 1:6, e o aplicativo não a calcula porque não conhece o tempo inspiratório configurado.",
        sourceKey: "obstrutivo",
      },
    ],
  };
}

export interface AlvoPaco2 {
  min: number;
  max: number;
}

/**
 * Alvo de PaCO₂ em lesão cerebral aguda, de Robba 2020 (consenso da ESICM):
 * recomendação FORTE com evidência de qualidade BAIXA.
 *
 * É alvo próprio e não modulação: o aplicativo não sugere PaCO₂ em nenhum
 * outro caso, e portanto não há base contra a qual comparar.
 *
 * Devolve null sem lesão cerebral aguda. A caixinha genérica de "Doença
 * neurológica" NÃO dispara este alvo: ela pega desde TCE agudo até
 * neuromuscular crônico, e num neuromuscular com DPOC o alvo empurraria na
 * direção errada.
 */
export function alvoPaco2(perfil: PerfilClinico): Alvo<AlvoPaco2> | null {
  if (!perfil.patologias.includes("lesao_cerebral_aguda")) return null;
  const valor: AlvoPaco2 = { min: 35, max: 45 };
  return {
    valor,
    base: valor,
    modulacoes: [
      {
        motivo:
          "Lesão cerebral aguda: alvo de PaCO₂ de 35 a 45 mmHg. Recomendação forte com evidência de qualidade baixa, e válida para o paciente sem hipertensão intracraniana clinicamente significativa, que o aplicativo não tem como saber.",
        sourceKey: "lesaoCerebral",
      },
    ],
  };
}

// ============================================================
// Sugestão de admissão — funciona mesmo sem altura/peso/gasometria.
// Garante um ponto de partida para colocar o paciente na ventilação.
// ============================================================
export interface SugestaoAdmissao {
  pbw: number;
  pbwEstimado: boolean;
  obeso: boolean;
  obesoIndeterminado: boolean; // true quando não há IMC para confirmar
  vc: Alvo<AlvoVc>;
  peepFio2: Alvo<AlvoPeepFio2>;
  ventilacao: Alvo<AlvoVentilacao> | null;
  modo: string;
}

export function sugestaoAdmissao(
  perfil: PerfilClinico,
  pf?: number | null,
  spo2?: number | null,
  currentMode?: string | null
): SugestaoAdmissao {
  const vc = sugerirVc(perfil);
  // Na admissão não há evolução registrada, logo não há auto-PEEP medido.
  const peepFio2 = sugerirPeepFio2(pf ?? null, spo2 ?? null, perfil, null);
  const ventilacao = sugerirVentilacao(perfil.pbw, vc.valor.target, perfil);
  return {
    pbw: perfil.pbw,
    pbwEstimado: perfil.pbwEstimado,
    obeso: perfil.obeso,
    obesoIndeterminado: perfil.obesoIndeterminado,
    vc,
    peepFio2,
    ventilacao,
    modo: currentMode || "VCV",
  };
}
