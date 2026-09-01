// ============================================================
// Catálogo do teste de respiração espontânea :: CONTEÚDO VALIDADO
// Critérios de falha validados pelo mentor clínico em 01/09/2026, seguindo as
// Orientações Práticas AMIB/SBPT 2024 e o consenso de Boles 2007.
// O pH é 7,35 por decisão dele: Boles usa 7,32, e a divergência é real.
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
  { key: "saturacao", label: "Queda de saturação", detalhe: "SpO₂ ≤ 90%, ou PaO₂ ≤ 50 mmHg com FiO₂ ≥ 50%" },
  { key: "hipercapnia", label: "Retenção de CO₂", detalhe: "PaCO₂ > 50 mmHg" },
  { key: "acidose", label: "Acidose", detalhe: "pH < 7,35" },
  { key: "taquipneia", label: "Taquipneia", detalhe: "FR > 35/min" },
  { key: "taquicardia", label: "Taquicardia", detalhe: "FC > 140/min" },
  { key: "pressao", label: "Alteração pressórica", detalhe: "PAS > 180 ou < 90 mmHg" },
  { key: "esforco", label: "Sinais de esforço", detalhe: "musculatura acessória, respiração paradoxal, agitação, sudorese" },
];

// Modalidade em que o teste é conduzido :: CONTEÚDO A VALIDAR
// A lista definitiva é pergunta em aberto para o mentor. Nenhum limiar depende
// dela, então não bloqueia.
export const MODALIDADES_TESTE: { v: string; t: string }[] = [
  { v: "psv", t: "PSV" },
  { v: "cpap", t: "CPAP" },
  { v: "tubo_t", t: "Tubo T" },
];
