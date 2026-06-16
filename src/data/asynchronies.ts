// ============================================================
// Catálogo de assincronias paciente-ventilador
// Registro manual pelo fisioterapeuta + sugestão por protocolo.
// Referência geral de fisiologia da VM; sempre confirmar pela curva real.
// ============================================================

export type AsyncSeverity = "mild" | "moderate" | "severe";

export interface AsynchronyDef {
  key: string;
  label: string;
  description: string; // como reconhecer
  causes: string[];
  adjustments: string[]; // o que ajustar (volume, FR, trigger, etc.)
}

export const ASYNCHRONIES: AsynchronyDef[] = [
  {
    key: "double_trigger",
    label: "Duplo disparo",
    description:
      "Dois ciclos seguidos com expiração mínima entre eles. Demanda do paciente maior que a entrega do ventilador.",
    causes: [
      "Tempo inspiratório curto demais para a demanda",
      "Volume corrente insuficiente",
      "Drive respiratório elevado (dor, agitação, acidose)",
    ],
    adjustments: [
      "Aumentar o tempo inspiratório (ou reduzir o fluxo em VCV)",
      "Avaliar aumento do volume corrente dentro da faixa protetora",
      "Tratar a causa do drive elevado (analgesia, sedação, corrigir acidose)",
    ],
  },
  {
    key: "ineffective_effort",
    label: "Esforço inefetivo",
    description:
      "Esforço do paciente que não dispara o ventilador — deflexão na curva sem ciclo correspondente.",
    causes: [
      "Sensibilidade (trigger) pouco sensível",
      "Auto-PEEP / hiperinsuflação dinâmica",
      "Sedação excessiva",
    ],
    adjustments: [
      "Aumentar a sensibilidade do trigger (preferir trigger a fluxo)",
      "Reduzir auto-PEEP: diminuir FR, encurtar tempo inspiratório, aumentar tempo expiratório",
      "Reavaliar nível de sedação",
    ],
  },
  {
    key: "auto_trigger",
    label: "Auto-disparo",
    description:
      "Ventilador cicla sem esforço do paciente — disparos espúrios.",
    causes: [
      "Trigger sensível demais",
      "Vazamento no circuito ou no cuff",
      "Água/condensado no circuito, oscilação cardíaca",
    ],
    adjustments: [
      "Reduzir a sensibilidade do trigger",
      "Checar e corrigir vazamentos (circuito, cuff)",
      "Drenar condensado do circuito",
    ],
  },
  {
    key: "premature_cycling",
    label: "Ciclagem precoce",
    description:
      "Inspiração do ventilador termina antes do fim do esforço inspiratório do paciente.",
    causes: [
      "Tempo inspiratório curto",
      "Critério de ciclagem (% do pico de fluxo) alto demais em PSV",
    ],
    adjustments: [
      "Aumentar o tempo inspiratório",
      "Em PSV, reduzir o critério de ciclagem (ex.: de 30% para 15–20% do pico de fluxo)",
      "Reavaliar a pressão de suporte",
    ],
  },
  {
    key: "delayed_cycling",
    label: "Ciclagem tardia",
    description:
      "Inspiração do ventilador continua após o paciente já querer expirar — comum em DPOC.",
    causes: [
      "Tempo inspiratório longo",
      "Critério de ciclagem baixo demais em PSV",
      "Constante de tempo elevada (obstrução)",
    ],
    adjustments: [
      "Reduzir o tempo inspiratório",
      "Em PSV, aumentar o critério de ciclagem (ex.: para 40–50%)",
      "Tratar broncoespasmo/obstrução",
    ],
  },
  {
    key: "flow_starvation",
    label: "Fome de fluxo (flow starvation)",
    description:
      "Curva de pressão com depressão durante a inspiração — fluxo ofertado abaixo da demanda, típico em VCV.",
    causes: ["Fluxo inspiratório insuficiente", "Drive elevado"],
    adjustments: [
      "Aumentar o fluxo inspiratório (VCV)",
      "Considerar onda de fluxo descendente ou mudar para modo a pressão",
      "Tratar a causa do drive elevado",
    ],
  },
];

export const ASYNC_BY_KEY = Object.fromEntries(
  ASYNCHRONIES.map((a) => [a.key, a])
);
