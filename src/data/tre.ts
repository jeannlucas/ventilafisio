// ============================================================
// Catálogo do teste de respiração espontânea :: CONTEÚDO VALIDADO
// Critérios de falha validados pelo mentor clínico em 01/09/2026, seguindo as
// Orientações Práticas AMIB/SBPT 2024 e o consenso de Boles 2007.
// O pH é 7,35 por decisão dele: Boles usa 7,32, e a divergência é real. O
// AMIB/SBPT 2024, lido na íntegra em 04/09/2026, traz o mesmo 7,35: a decisão
// do mentor tem fonte publicada, e não é só parecer contra o Boles.
//
// Dois critérios foram alinhados ao AMIB/SBPT 2024 em 04/09/2026, por decisão
// do mentor ("adota o documento mais atual"). É a única das três diretrizes
// lidas que publica critério de falha com número, então "o mais atual" resolve
// para ela sem ambiguidade.
// ATENÇÃO: os critérios valem "persistindo por 5 minutos ou mais". O APP NÃO
// CRONOMETRA cada critério — quem julga a persistência é o terapeuta, que está
// ao lado do paciente. O app cronometra a sessão.
// ============================================================

export interface CriterioFalha {
  key: string;
  label: string;
  /** O valor que caracteriza a falha, mostrado ao lado do rótulo. */
  detalhe: string;
}

export const CRITERIOS_FALHA: CriterioFalha[] = [
  { key: "saturacao", label: "Queda de saturação", detalhe: "SpO₂ persistentemente < 90% com FiO₂ ≥ 40%, ou PaO₂ < 60 mmHg com FiO₂ ≥ 40%" },
  // As duas ressalvas são do AMIB/SBPT 2024 e entraram por decisão do mentor em
  // 04/09/2026. Sem elas o retentor crônico de CO₂ FALHA O TESTE POR SER O QUE
  // ELE SEMPRE FOI: o basal dele já é maior que 50. É a armadilha nº 5 do
  // projeto noutra roupa, e a mais cara, porque reprova quem não falhou.
  //
  // Sem PaCO₂ basal registrada, vale o 50 puro — decisão dele, perguntada
  // explicitamente. O app NÃO tem onde guardar esse basal e não calcula nada
  // aqui: quem compara com o basal é o terapeuta, como já julga a persistência
  // de cinco minutos de todos os outros critérios.
  { key: "hipercapnia", label: "Retenção de CO₂", detalhe: "PaCO₂ > 50 mmHg, exceto em previamente hipercápnicos; ou elevação > 8 mmHg sobre o basal" },
  { key: "acidose", label: "Acidose", detalhe: "pH < 7,35" },
  { key: "taquipneia", label: "Taquipneia", detalhe: "FR > 35/min" },
  { key: "taquicardia", label: "Taquicardia", detalhe: "FC > 140/min" },
  { key: "pressao", label: "Alteração pressórica", detalhe: "PAS > 180 ou < 90 mmHg" },
  { key: "esforco", label: "Sinais de esforço", detalhe: "musculatura acessória, respiração paradoxal, agitação, sudorese" },
];

// Modalidade em que o teste é conduzido :: CONTEÚDO VALIDADO
//
// Validada pelo mentor em 04/09/2026, depois da pesquisa registrada em
// `docs/dossie-modalidades-tre.md`: "pode manter as 3 sim sem problemas, desde
// que sejam sempre a cunho informativo e sugestões". O campo é descritivo, e
// nenhum limiar do app depende dele.
//
// As três NÃO são equivalentes nas diretrizes, e vale saber qual é qual:
//   PSV     ATS/CHEST 2017 RECOMENDA (5-8 cmH₂O, condicional, certeza
//           moderada); AMIB/SBPT 2024 "Sugere-se" (5-7 cmH₂O, PEEP 0-5,
//           30-60 min); AARC 2024 permite.
//   Tubo T  permitido pelas três, e "Sugere-se" no traqueostomizado no
//           AMIB/SBPT 2024. O ATS/CHEST 2017 sugere CONTRA para o teste
//           inicial.
//   CPAP    NENHUMA diretriz o nomeia favoravelmente. A AARC 2024 diz
//           literalmente que não foi estudado, e o ATS/CHEST 2017 o coloca no
//           braço contra o qual sugere. Fica na lista assim mesmo porque é
//           usado em cerca de 11% dos testes, e tirá-lo faria o terapeuta
//           registrar modalidade falsa num campo puramente descritivo.
//
// A compensação automática de tubo (ATC) NÃO entra: o mentor manteve as três.
// Ela tem seção própria no AMIB/SBPT 2024, mas no capítulo de modos e não no
// de desmame, e nenhuma diretriz a recomenda como modalidade de TRE.
export const MODALIDADES_TESTE: { v: string; t: string }[] = [
  { v: "psv", t: "PSV" },
  { v: "cpap", t: "CPAP" },
  { v: "tubo_t", t: "Tubo T" },
];
