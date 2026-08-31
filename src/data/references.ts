// ============================================================
// Catálogo de fontes — Ventila Fisio
// Conferidas contra a fonte primária em 31/08/2026.
// `verificada` = revisada pelo mentor clínico. Nasce false de propósito:
// a página /fontes mostra o pendente como pendente, em vez de fingir
// autoridade. Mesma convenção de `ventilators.verified`.
// ============================================================

export interface Reference {
  id: string;
  autores: string;
  titulo: string;
  veiculo: string;
  ano: number;
  /** Revisada pelo mentor clínico. */
  verificada: boolean;
  /** Ressalva sobre o alcance da fonte. Aparece na página /fontes. */
  nota?: string;
  /**
   * Como a fonte aparece no rodapé do painel. Explícito de propósito: derivar
   * isso de `autores` por regex significa adivinhar formato de nome próprio,
   * e nome próprio não tem formato.
   */
  citacaoCurta: string;
}

export const REFERENCES: Reference[] = [
  {
    id: "ardsnet_2000",
    autores: "The Acute Respiratory Distress Syndrome Network",
    titulo:
      "Ventilation with lower tidal volumes as compared with traditional tidal volumes for acute lung injury and the acute respiratory distress syndrome",
    veiculo: "N Engl J Med 2000;342:1301-1308",
    ano: 2000,
    citacaoCurta: "ARDSnet, 2000",
    verificada: false,
  },
  {
    id: "amato_2015",
    autores: "Amato MBP, Meade MO, Slutsky AS, et al.",
    titulo: "Driving pressure and survival in the acute respiratory distress syndrome",
    veiculo: "N Engl J Med 2015;372:747-755",
    ano: 2015,
    citacaoCurta: "Amato, 2015",
    verificada: false,
    nota:
      "Demonstra a driving pressure como a variável mais associada à sobrevida (RR 1,41 por incremento de ~7 cmH₂O). NÃO define o corte de 13 que o app usa hoje: essa faixa segue pendente de fonte.",
  },
  {
    id: "gattinoni_2016",
    autores: "Gattinoni L, Tonetti T, Cressoni M, et al.",
    titulo: "Ventilator-related causes of lung injury: the mechanical power",
    veiculo: "Intensive Care Med 2016;42:1567-1575",
    ano: 2016,
    citacaoCurta: "Gattinoni, 2016",
    verificada: false,
    nota: "Origem da fórmula da mechanical power. Não define o corte de 17 J/min.",
  },
  {
    id: "serpaneto_2018",
    autores: "Serpa Neto A, Deliberato RO, Johnson AEW, et al.",
    titulo:
      "Mechanical power of ventilation is associated with mortality in critically ill patients",
    veiculo: "Intensive Care Med 2018;44:1914-1922",
    ano: 2018,
    citacaoCurta: "Serpa Neto, 2018",
    verificada: false,
    nota: "Origem do corte de 17 J/min, em 8207 pacientes (MIMIC-III e eICU).",
  },
  {
    id: "yangtobin_1991",
    autores: "Yang KL, Tobin MJ",
    titulo:
      "A prospective study of indexes predicting the outcome of trials of weaning from mechanical ventilation",
    veiculo: "N Engl J Med 1991;324:1445-1450",
    ano: 1991,
    citacaoCurta: "Yang & Tobin, 1991",
    verificada: false,
  },
  {
    id: "boles_2007",
    autores: "Boles JM, Bion J, Connors A, et al.",
    titulo: "Weaning from mechanical ventilation",
    veiculo: "Eur Respir J 2007;29:1033-1056",
    ano: 2007,
    citacaoCurta: "Boles, 2007",
    verificada: false,
  },
  {
    id: "amib_sbpt_2024",
    autores: "AMIB e SBPT",
    titulo: "Orientações Práticas em Ventilação Mecânica",
    veiculo: "AMIB/SBPT, edição de 2024",
    ano: 2024,
    citacaoCurta: "AMIB/SBPT, 2024",
    verificada: false,
    nota: "Substitui as Diretrizes Brasileiras de Ventilação Mecânica de 2013.",
  },
  {
    id: "dejonghe_2002",
    autores: "De Jonghe B, Sharshar T, Lefaucheur JP, et al.",
    titulo: "Paresis acquired in the intensive care unit: a prospective multicenter study",
    veiculo: "JAMA 2002;288:2859-2867",
    ano: 2002,
    citacaoCurta: "De Jonghe, 2002",
    verificada: false,
  },
  {
    id: "sessler_2002",
    autores: "Sessler CN, Gosnell MS, Grap MJ, et al.",
    titulo:
      "The Richmond Agitation-Sedation Scale: validity and reliability in adult intensive care unit patients",
    veiculo: "Am J Respir Crit Care Med 2002;166:1338-1344",
    ano: 2002,
    citacaoCurta: "Sessler, 2002",
    verificada: false,
  },
  {
    id: "hodgson_2014",
    autores: "Hodgson C, Needham D, Haines K, et al.",
    titulo: "Feasibility and inter-rater reliability of the ICU Mobility Scale",
    veiculo: "Heart Lung 2014;43:19-24",
    ano: 2014,
    citacaoCurta: "Hodgson, 2014",
    verificada: false,
  },
];
