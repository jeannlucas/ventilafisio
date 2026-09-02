// ============================================================
// Conduta sugerida — Ventila Fisio
// ============================================================
import type { SourceKey } from "./references";

/**
 * Sugestão de conduta.
 *
 * O TIPO NÃO TEM CAMPO DE DOSE, e isso é deliberado: não existe onde escrever
 * um número de mEq. Quem quiser prescrever no futuro terá de alterar este
 * tipo, e aí é decisão consciente e não deslize de implementação.
 *
 * `alcada` "medica" aparece na tela visualmente distinta e sempre acompanhada
 * de que quem decide é a equipe médica.
 */
export interface Conduta {
  texto: string;
  alcada: "fisio" | "medica";
  sourceKey: SourceKey;
}
