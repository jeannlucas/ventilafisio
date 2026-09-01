// ============================================================
// Catálogo de fontes — Ventila Fisio
// Conferidas contra a fonte primária em 31/08/2026.
// `verificada` = revisada pelo mentor clínico. Nasce false de propósito:
// a página /fontes mostra o pendente como pendente, em vez de fingir
// autoridade. Mesma convenção de `ventilators.verified`.
//
// Duas procedências, não uma: `Publicacao` é literatura, com citação
// bibliográfica de verdade. `Parecer` é julgamento do mentor clínico sobre
// um valor que a literatura não define — registrar isso como publicação
// seria fingir que é literatura. Por isso `Parecer` não tem `verificada`:
// ele É a manifestação do mentor, não há o que revisar.
// ============================================================

/** Artigo, diretriz ou revisão publicada. */
export interface Publicacao {
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

/**
 * Julgamento clínico do mentor sobre um valor que a literatura não define.
 * Não carrega `verificada` de propósito: o parecer É a manifestação dele,
 * então não existe revisão pendente. Registrar isso como publicação seria
 * fingir que é literatura.
 */
export interface Parecer {
  id: string;
  citacaoCurta: string;
  profissional: string;
  data: string;
  nota?: string;
}

export type Reference = Publicacao | Parecer;

export const ehParecer = (r: Reference): r is Parecer => "profissional" in r;

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
      "Demonstra a driving pressure como a variável mais associada à sobrevida (RR 1,41 por incremento de ~7 cmH₂O). O corte de 13 usado pelo app é sustentado por Guérin 2016, não por este artigo.",
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
    verificada: true,
  },
  {
    id: "sessler_2002",
    autores: "Sessler CN, Gosnell MS, Grap MJ, et al.",
    titulo:
      "The Richmond Agitation-Sedation Scale: validity and reliability in adult intensive care unit patients",
    veiculo: "Am J Respir Crit Care Med 2002;166:1338-1344",
    ano: 2002,
    citacaoCurta: "Sessler, 2002",
    verificada: true,
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
  {
    id: "guerin_2016",
    citacaoCurta: "Guérin, 2016",
    autores: "Guérin C, Papazian L, Reignier J, et al.",
    titulo:
      "Effect of driving pressure on mortality in ARDS patients during lung protective mechanical ventilation in two randomized controlled trials",
    veiculo: "Crit Care 2016;20:384",
    ano: 2016,
    verificada: false,
    nota:
      "Reanálise dos ensaios Acurasys e Proseva, 787 pacientes com dado do 1º dia. Sobrevida significativamente maior com driving pressure ≤ 13 cmH₂O, e 5% de aumento no risco de morte por cmH₂O acima. É esta fonte que sustenta o corte de 13, que Amato 2015 não define.",
  },
  {
    id: "ferreira_2021",
    citacaoCurta: "Ferreira, 2021",
    autores: "Ferreira NA, Ferreira AS, Guimarães FS",
    titulo:
      "Cough peak flow to predict extubation outcome: a systematic review and meta-analysis",
    veiculo: "Rev Bras Ter Intensiva 2021;33(3):445-456",
    ano: 2021,
    verificada: false,
    nota:
      "Corte entre 55 e 65 L/min útil como medida COMPLEMENTAR antes da extubação; desempenho diagnóstico baixo a moderado. Sustenta o uso do pico de tosse como um critério entre outros, nunca isolado.",
  },
  {
    id: "duan_2021",
    citacaoCurta: "Duan, 2021",
    autores: "Duan J, Zhang X, Song J",
    titulo:
      "Predictive power of extubation failure diagnosed by cough strength: a systematic review and meta-analysis",
    veiculo: "Crit Care 2021;25:357",
    ano: 2021,
    verificada: false,
    nota:
      "Falha de extubação de 36,2% com tosse fraca contra 6,3% com tosse forte.",
  },
  {
    id: "parecer_mrc_faixa",
    citacaoCurta: "Parecer clínico, 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "A faixa de 48 a 59 no somatório MRC, classificada como força reduzida, foi validada por julgamento clínico. De Jonghe 2002 estabelece o corte < 48 para fraqueza adquirida na UTI, mas não define esta segunda faixa.",
  },
];
