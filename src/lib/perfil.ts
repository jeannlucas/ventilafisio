// ============================================================
// Perfil clínico — Ventila Fisio
// Derivado uma vez do paciente e passado inteiro ao motor de alvos, em vez
// de booleanos enfiados em cada assinatura. Característica nova depois não
// muda assinatura nenhuma.
// ============================================================
import { pbwOrEstimate, bmi } from "./clinical";
import type { Patient } from "../types";

/**
 * Patologia que modula algum alvo ventilatório. União fechada e curta de
 * propósito: só entram as que a Fase 8 decidiu, com fonte, que mudam um
 * número. Onze das comorbidades registradas não modulam nada, e isso é
 * decisão registrada, não lacuna.
 *
 * A OBESIDADE não está aqui: ela já modula o volume corrente pelo
 * `perfil.obeso`, derivado do IMC e não da caixinha. Um paciente obeso sem a
 * comorbidade marcada continua recebendo a faixa deslocada, que é o
 * comportamento certo — e pôr a chave aqui também criaria duas fontes de
 * verdade para a mesma pergunta.
 */
export type PatologiaKey = "dpoc" | "asma" | "lesao_cerebral_aguda";

const PATOLOGIAS_QUE_MODULAM: readonly PatologiaKey[] = [
  "dpoc",
  "asma",
  "lesao_cerebral_aguda",
] as const;

const ehPatologia = (k: string): k is PatologiaKey =>
  (PATOLOGIAS_QUE_MODULAM as readonly string[]).includes(k);

export interface PerfilClinico {
  pbw: number;
  pbwEstimado: boolean;
  obeso: boolean;
  /** Sem IMC não dá para afirmar. Assume-se a faixa protetora, mas sinalizado. */
  obesoIndeterminado: boolean;
  /**
   * O que muda algum alvo ventilatório, não o que o paciente tem. Filtrado
   * das comorbidades registradas pela união fechada de `PatologiaKey` — as
   * onze comorbidades fora dela ficam de fora daqui mesmo que o paciente as
   * tenha marcadas, porque nenhuma delas tem fonte publicada que module um
   * número. Achados de imagem (`imaging`) ainda não entram neste campo.
   */
  patologias: PatologiaKey[];
}

export function derivarPerfil(patient: Patient): PerfilClinico {
  const { value: pbw, estimated } = pbwOrEstimate(
    (patient.sex ?? "M") as "M" | "F",
    patient.height_cm
  );
  const imc = bmi(patient.weight_kg, patient.height_cm);
  return {
    pbw,
    pbwEstimado: estimated,
    obeso: imc != null ? imc >= 30 : false,
    obesoIndeterminado: imc == null,
    patologias: (patient.comorbidities ?? []).filter(ehPatologia),
  };
}
