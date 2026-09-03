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
        // Chave própria, e não `vcKg`: o parecer do mentor sustenta a faixa
        // DO OBESO. Citado sob `vcKg`, ele apareceria no rodapé de todo
        // paciente, embaixo da faixa 4–6, que ele não sustenta.
        sourceKey: "vcKgObeso",
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
 *
 * As duas metades são independentes, e a função as separa: a OXIGENAÇÃO decide a
 * base (tabela do ARDSnet, ou o preset de admissão quando não há gasometria nem
 * oximetria) e a PATOLOGIA decide o que se faz com essa base. O preset não passa
 * na frente do obstrutivo com auto-PEEP medido, porque a regra do DPOC precisa
 * do auto-PEEP e não da oxigenação — devolver o preset ali descartaria em
 * silêncio a medida que o terapeuta acabou de registrar. E o auto-PEEP medido
 * não abre a tabela, porque ele não diz nada sobre oxigenação: sem P/F e sem
 * SpO₂ a FiO₂ continua sendo a do preset, com `presetAdmissao` verdadeiro.
 */
export function sugerirPeepFio2(
  pf: number | null,
  spo2: number | null,
  perfil: PerfilClinico,
  autoPeep: number | null
): Alvo<AlvoPeepFio2> {
  const temAsma = perfil.patologias.includes("asma");
  const temDpoc = perfil.patologias.includes("dpoc");
  const obstrutivo = temAsma || temDpoc;

  // A OXIGENAÇÃO decide a base; a PATOLOGIA decide o que se faz com ela. Sem
  // gasometria e sem oximetria o aplicativo não sabe nada sobre a oxigenação
  // deste paciente, e a base é o preset de admissão — inclusive no obstrutivo
  // com auto-PEEP medido. Um auto-PEEP medido não diz nada sobre oxigenação:
  // cair na tabela por causa dele levava o `!num(pf)` a devolver FiO₂ 40% para
  // quem o aplicativo não mediu, com `presetAdmissao` falso, ou seja, sem nada
  // na tela dizendo que o número nasceu de dado nenhum. E 40% é sugestão BAIXA
  // onde o padrão seguro sem informação é o 100% do preset.
  const semOxigenacao = !num(pf) && !num(spo2);
  let base: AlvoPeepFio2;
  if (semOxigenacao) {
    base = { fio2: 100, peep: 5, faixaPeep: null, presetAdmissao: true };
  } else {
    let fio2: number;
    if (!num(pf)) fio2 = 40;
    else if (pf >= 300) fio2 = 30;
    else if (pf >= 200) fio2 = 40;
    else if (pf >= 100) fio2 = 60;
    else fio2 = 80;
    if (num(spo2) && spo2 < 90) fio2 = Math.min(100, fio2 + 10);
    const row = ARDSNET_LOW.find((r) => r.fio2 >= fio2) ?? ARDSNET_LOW[ARDSNET_LOW.length - 1];
    base = { fio2: row.fio2, peep: row.peep, faixaPeep: null, presetAdmissao: false };
  }

  if (!obstrutivo) return semModulacao(base);

  // As duas marcadas: aplica-se o teto da asma, e a modulação declara as duas.
  // Não é precedência clínica: o mentor não foi perguntado sobre o paciente com
  // as duas patologias.
  //
  // O teto da asma NÃO é comparado com o do DPOC, e o texto não afirma que
  // seja. Os dois são tetos, mas com auto-PEEP baixo o limite do DPOC cai
  // abaixo de 5, e aí o teto aplicado deixa de ser o menor dos dois. Afirmar
  // "o mais conservador" seria uma comparação que o código não faz. Tomar o
  // menor dos dois resolveria sozinho uma pergunta que ninguém respondeu, e é
  // decisão do mentor, não daqui.
  if (temAsma) {
    const motivo = temDpoc
      ? "Asma e DPOC marcadas: aplicado o teto de 5 cmH₂O da asma. A PEEP externa alta agrava o aprisionamento aéreo. Este teto não é comparado com o do auto-PEEP: com auto-PEEP baixo, o limite do DPOC seria menor que 5. Ninguém decidiu qual dos dois vale no paciente com as duas patologias."
      : "Asma: PEEP externa limitada a 5 cmH₂O. A tabela do ARDSnet não se aplica ao obstrutivo.";
    return {
      valor: { ...base, peep: Math.min(base.peep!, PEEP_MAX_ASMA) },
      base,
      modulacoes: [{ motivo, sourceKey: "obstrutivo" }],
    };
  }

  // DPOC sem oxigenação E sem auto-PEEP: o 5 do preset continua, porque é o
  // ponto de partida para montar o ventilador, mas deixa de sair calado. Sem
  // esta linha o paciente via "5 cmH₂O · tabela ARDSnet" e nada mais.
  //
  // Vem DEPOIS do ramo da asma, e isso é o ponto. Enquanto vinha antes, a asma
  // caía aqui e o texto mandava registrar o auto-PEEP — medida que a regra da
  // asma não usa: o teto dela é 5 fixo, e com auto-PEEP 10 o mesmo paciente
  // continua recebendo 5. E como o AdmissionCard sempre chama com `pf`, `spo2`
  // e `autoPeep` nulos, TODA admissão de asmático mostrava esse pedido inútil.
  // É a confusão de "obstrutivo genérico" que o cabeçalho desta função proíbe.
  if (semOxigenacao && !num(autoPeep)) {
    return {
      valor: base,
      base,
      modulacoes: [
        {
          motivo:
            "DPOC: 5 cmH₂O é ponto de partida inicial para montar o ventilador, não o alvo deste paciente — a tabela do ARDSnet não se aplica ao obstrutivo. Registre o auto-PEEP para o alvo da patologia aparecer.",
          sourceKey: "obstrutivo",
        },
      ],
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
  // Auto-PEEP exatamente ZERO é medida, e boa: não há aprisionamento aéreo a
  // limitar a PEEP externa. A premissa de Ranieri e de Demoule simplesmente não
  // existe nesse paciente, e nenhuma das duas diz "auto-PEEP zero, logo PEEP
  // zero" — multiplicar o zero por 0,8 prescrevia ZEEP a partir de um achado
  // favorável.
  //
  // Isto NÃO é confundir zero com ausência: os dois caminhos recusam número, e
  // recusam por razões diferentes, escritas em textos diferentes. O corte é em
  // zero exato e só nele, porque zero é a ausência do fenômeno, não um limiar:
  // "auto-PEEP abaixo de 2 também recusa" seria número clínico sem fonte, e é
  // pergunta para o mentor.
  if (autoPeep === 0) {
    return {
      valor: { ...base, peep: null, faixaPeep: null },
      base,
      modulacoes: [
        {
          motivo:
            "DPOC: o auto-PEEP medido foi zero, ou seja, não há aprisionamento aéreo a limitar a PEEP externa. A regra dos 80 a 85% do auto-PEEP perde o referente aqui, e o aplicativo não converte esse achado favorável em alvo de PEEP. A tabela do ARDSnet continua não se aplicando — titule pela resposta do paciente.",
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

/** Piso de frequência do clamp. */
const FR_MIN_PADRAO = 12;

/**
 * Frequência e volume-minuto.
 *
 * O obstrutivo NÃO recebe frequência diferente. A modulação existe porque a
 * orientação de Demoule 2020 é real e publicada, mas ela informa: o alvo é a
 * relação I:E de 1:4 a 1:6, e quem regula a frequência é o terapeuta.
 *
 * Houve aqui um piso obstrutivo de 10, e ele era falso duas vezes. Primeiro
 * porque o peso predito se cancela na conta — `veL` é `predBW * 100 / 1000` e
 * `vcTargetMl` é `predBW * 6` ou `predBW * 7` —, então `bruto` é sempre 17 ou
 * 14 e nenhum dos dois pisos jamais entra em vigor: a tela afirmava um
 * rebaixamento que nunca acontecia. Segundo porque o 10 não é publicado nem é
 * parecer do mentor: nenhuma fonte publica piso de frequência em obstrutivo, e
 * a pergunta está aberta com ele. Não reintroduza um número aqui.
 *
 * `valor` igual a `base` com `modulacoes` não vazia é legítimo, e é o mesmo que
 * `alvoPaco2` faz: a modulação carrega informação, não alteração de número.
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
    valor: base,
    base,
    modulacoes: [
      {
        motivo:
          "Obstrutivo (DPOC ou asma): o alvo é a relação I:E de 1:4 a 1:6, para dar tempo de expirar. Quem regula a frequência é o terapeuta, à beira do leito: o aplicativo não altera a frequência sugerida e não calcula a relação I:E, porque não conhece o tempo inspiratório configurado no ventilador.",
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
