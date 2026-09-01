// ============================================================
// Teste de respiração espontânea — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Critérios validados pelo mentor clínico em 01/09/2026.
// ============================================================
import type { TreSession } from "../types";
import type { ExtubationReadiness } from "./clinical";

/** Critérios marcados como atingidos. Chave ausente é "não avaliado". */
export function criteriosAtingidos(s: TreSession): string[] {
  return Object.entries(s.criterios ?? {})
    .filter(([, c]) => c?.atingido === true)
    .map(([k]) => k);
}

/**
 * A sessão ainda sem desfecho, se houver — a mais recente delas.
 *
 * Ordena por `iniciado_em` em vez de confiar na ordem do array: essa ordem vem
 * do ORDER BY da query do Supabase, que nenhum teste fixa. Duas sessões abertas
 * não deveriam existir, mas se existirem a resposta não pode depender de como a
 * lista chegou. Mesma ordenação de `resultadoTreParaTriagem`.
 */
export function sessaoEmAndamento(sessoes: TreSession[]): TreSession | null {
  const abertas = sessoes
    .filter((s) => s.desfecho == null)
    .sort((a, b) => new Date(a.iniciado_em).getTime() - new Date(b.iniciado_em).getTime());
  return abertas[abertas.length - 1] ?? null;
}

/**
 * Traduz o histórico de TRE no tri-estado que a triagem de extubação consome.
 *
 * 'interrompido' devolve null DE PROPÓSITO: um teste parado por exame ou
 * transporte não é um paciente que reprovou, é um teste que não aconteceu — e
 * um TRE reprovado é bloqueador absoluto da triagem.
 *
 * Sem sessão alguma, cai no campo legado `daily_evolutions.tre_result`, para
 * não apagar o histórico de quem foi registrado antes da Fase 5.
 */
export function resultadoTreParaTriagem(
  sessoes: TreSession[],
  treResultLegado: string | null
): "pass" | "fail" | null {
  const ordenadas = [...sessoes].sort(
    (a, b) => new Date(a.iniciado_em).getTime() - new Date(b.iniciado_em).getTime()
  );
  const ultima = ordenadas[ordenadas.length - 1];
  if (ultima) {
    if (ultima.desfecho === "aprovado") return "pass";
    if (ultima.desfecho === "falhou") return "fail";
    return null; // interrompido ou em andamento
  }
  if (treResultLegado === "pass") return "pass";
  if (treResultLegado === "fail") return "fail";
  return null;
}

/** Rótulo do critério de TRE dentro da triagem, para poder ser excluído. */
const CRITERIO_TRE = "TRE aprovado";

/**
 * O que reprova hoje e impede iniciar um TRE — os mesmos critérios da triagem,
 * MENOS o do próprio TRE, que só existe depois do teste. Sem essa exclusão a
 * pergunta se morde: para iniciar o teste seria preciso já tê-lo feito.
 *
 * Critério não medido NÃO é pendência: ausência de dado não reprova, como em
 * todo o resto do projeto. E o app não bloqueia o início — quem decide é o
 * terapeuta; isto é o que ele vê antes de decidir.
 */
export function pendenciasParaIniciar(r: ExtubationReadiness): string[] {
  return r.failed.filter((label) => label !== CRITERIO_TRE);
}

export function duracaoMinutos(s: TreSession, agora: Date = new Date()): number {
  const fim = s.encerrado_em ? new Date(s.encerrado_em) : agora;
  return Math.floor((fim.getTime() - new Date(s.iniciado_em).getTime()) / 60000);
}
