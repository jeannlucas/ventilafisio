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
    id: "aarc_2024",
    citacaoCurta: "AARC, 2024",
    autores: "Roberts KJ, Goodfellow LT, Battey-Muse CM, et al.",
    titulo:
      "AARC Clinical Practice Guideline: Spontaneous Breathing Trials for Liberation From Adult Mechanical Ventilation",
    veiculo: "Respir Care 2024;69(7):891-901",
    ano: 2024,
    verificada: true,
    nota:
      "A recomendação 3 é avaliação padronizada e, se apropriado, realização de um TRE antes do meio-dia de cada dia. É recomendação CONDICIONAL, com certeza MUITO BAIXA da evidência: sustenta a cadência diária, não a impõe.",
  },
  {
    id: "ats_chest_2017",
    citacaoCurta: "ATS/CHEST, 2017",
    autores: "Girard TD, et al.",
    titulo:
      "An Official ATS/CHEST Clinical Practice Guideline: Liberation from Mechanical Ventilation in Critically Ill Adults",
    veiculo: "Am J Respir Crit Care Med 2017;195(1):120-133",
    ano: 2017,
    verificada: true,
  },
  {
    id: "berend_2014",
    citacaoCurta: "Berend, 2014",
    autores: "Berend K, de Vries APJ, Gans ROB",
    titulo: "Physiological approach to assessment of acid-base disturbances",
    veiculo: "N Engl J Med 2014;371(15):1434-1445",
    ano: 2014,
    verificada: true,
    nota:
      "Revisão de referência. A Tabela 1 traz as regras de compensação por 10 mmHg de PaCO₂ em bicarbonato. Registra que na acidose respiratória crônica o pH pode estar normal ou acima de 7,40.",
  },
  {
    id: "albert_1967",
    citacaoCurta: "Albert, 1967",
    autores: "Albert MS, Dell RB, Winters RW",
    titulo:
      "Quantitative displacement of acid-base equilibrium in metabolic acidosis",
    veiculo: "Ann Intern Med 1967;66(2):312-322",
    ano: 1967,
    verificada: true,
    nota:
      "Fonte primária da fórmula de Winters, PaCO₂ esperada = 1,5 × HCO₃⁻ + 8 ± 2. Cobre APENAS acidose metabólica: não existe Winters para alcalose.",
  },
  {
    id: "martinu_2003",
    citacaoCurta: "Martinu, 2003",
    autores: "Martinu T, Menzies D, Dial S",
    titulo:
      "Re-evaluation of acid-base prediction rules in patients with chronic respiratory acidosis",
    veiculo: "Can Respir J 2003;10(6):311-315",
    ano: 2003,
    verificada: true,
    nota:
      "Mediu a compensação crônica em DPOC estável: HCO₃⁻ +5,1 por 10 mmHg de PaCO₂, acima da faixa de 4 a 5 da revisão do NEJM.",
  },
  {
    id: "figge_1998",
    citacaoCurta: "Figge, 1998",
    autores: "Figge J, Jabor A, Kazda A, Fencl V",
    titulo: "Anion gap and hypoalbuminemia",
    veiculo: "Crit Care Med 1998;26(11):1807-1810",
    ano: 1998,
    verificada: true,
    nota:
      "Correção do ânion gap pela albumina, medida em 152 pacientes criticamente enfermos. Sem ela, hipoalbuminemia esconde acidose por ânion gap elevado.",
  },
  {
    id: "odriscoll_2017",
    citacaoCurta: "BTS, 2017",
    autores: "O'Driscoll BR, Howard LS, Earis J, Mak V",
    titulo:
      "British Thoracic Society guideline for oxygen use in adults in healthcare and emergency settings",
    veiculo: "BMJ Open Respir Res 2017;4(1):e000170",
    ano: 2017,
    verificada: true,
    nota:
      "Alvo de SpO₂ de 88 a 92% em DPOC e demais fatores de risco para insuficiência respiratória hipercápnica, com GRAU A para DPOC. Traz também o critério de hipercapnia de longa data por pH e bicarbonato.",
  },
  {
    id: "austin_2010",
    citacaoCurta: "Austin, 2010",
    autores: "Austin MA, Wills KE, Blizzard L, Walters EH, Wood-Baker R",
    titulo:
      "Effect of high flow oxygen on mortality in chronic obstructive pulmonary disease patients in prehospital setting: randomised controlled trial",
    veiculo: "BMJ 2010;341:c5462",
    ano: 2010,
    verificada: true,
    nota:
      "Ensaio randomizado, 405 pacientes. Oxigênio titulado contra liberal na exacerbação de DPOC: mortalidade menor no grupo titulado, e o efeito é maior no subgrupo com DPOC confirmada. É o que sustenta que saturação acima da faixa não é melhor.",
  },
  {
    id: "parecer_mrc_faixa",
    citacaoCurta: "Parecer clínico, 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "A faixa de 48 a 59 no somatório MRC, classificada como força reduzida, foi validada por julgamento clínico. De Jonghe 2002 estabelece o corte < 48 para fraqueza adquirida na UTI, mas não define esta segunda faixa.",
  },
  {
    id: "parecer_tre_ph",
    citacaoCurta: "Parecer clínico (TRE), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "O corte de pH < 7,35 para interromper o TRE foi validado por julgamento clínico. Boles 2007 usa 7,32.",
  },
  {
    id: "parecer_tre_validade",
    citacaoCurta: "Parecer clínico (validade do TRE), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "A validade de 24 horas do resultado de um TRE é julgamento clínico, coerente com a cadência diária recomendada por AARC 2024 e ATS/CHEST 2017. NENHUMA das duas diretrizes afirma essa janela literalmente: elas recomendam avaliar e testar diariamente, e é dessa cadência que a janela foi derivada.",
  },
  {
    id: "parecer_compensacao_cronica",
    citacaoCurta: "Parecer clínico (compensação crônica), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "O coeficiente de 5,0 mmol/L de HCO₃⁻ por 10 mmHg de PaCO₂ na acidose respiratória crônica é escolha clínica. Berend 2014 dá a faixa de 4 a 5 e Martinu 2003 mediu 5,1 em DPOC estável; nenhuma das duas diz 5,0.",
  },
  {
    id: "parecer_ph_por_10",
    citacaoCurta: "Parecer clínico (pH por 10 mmHg), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "Os coeficientes de 0,08 no quadro agudo e 0,03 no crônico circulam como convenção de livro-texto. A pesquisa desta fase não achou estudo primário, e a Tabela 1 de Berend 2014 não traz pH. Por isso são leitura auxiliar na tela, e quem decide aguda ou crônica é o bicarbonato.",
  },
  {
    id: "parecer_cronicidade_ou",
    citacaoCurta: "Parecer clínico (critério de cronicidade), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "A BTS escreve pH ≥ 7,35 e/ou HCO₃⁻ > 28. Apresentados dois casos concretos, o mentor decidiu que qualquer um dos dois basta. É o critério mais sensível dos dois, e por isso a tela diz compatível com, nunca é.",
  },
  {
    id: "parecer_bicarbonato_gatilho",
    citacaoCurta: "Parecer clínico (bicarbonato), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "O aplicativo sinaliza bicarbonato a partir de pH < 7,20. Sinaliza o medicamento e nunca a dose: quem prescreve é a equipe médica.",
  },
];
