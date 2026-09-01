// ============================================================
// Perfil clínico — Ventila Fisio
// Derivado uma vez do paciente e passado inteiro ao motor de alvos, em vez
// de booleanos enfiados em cada assinatura. Característica nova depois não
// muda assinatura nenhuma.
// ============================================================
import { pbwOrEstimate, bmi } from "./clinical";
import type { Patient } from "../types";

/**
 * Chave de patologia que pode modular alvo ventilatório. A LISTA de quais
 * patologias modulam o quê é conteúdo clínico da Fase 8, decidida com o
 * mentor. Aqui só se registra o que o paciente tem.
 */
export type PatologiaKey = string;

export interface PerfilClinico {
  pbw: number;
  pbwEstimado: boolean;
  obeso: boolean;
  /** Sem IMC não dá para afirmar. Assume-se a faixa protetora, mas sinalizado. */
  obesoIndeterminado: boolean;
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
    patologias: patient.comorbidities ?? [],
  };
}
