// ============================================================
// Teste de respiração espontânea — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Critérios validados pelo mentor clínico em 01/09/2026.
// ============================================================
import type { TreSession } from "../types";
// O rótulo vem de clinical.ts, onde ele é construído. Duplicá-lo aqui como
// string literal deixava a exclusão do critério quebrar em silêncio: bastava
// renomear o rótulo lá para `pendenciasParaIniciar` parar de excluir nada, com
// a suíte inteira verde.
import { CRITERIO_TRE_APROVADO, type ExtubationReadiness } from "./clinical";

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
 * A resposta vem da sessão CONCLUÍDA mais recente. Sessão em andamento não
 * apaga o que já foi concluído: iniciar um teste novo uma hora depois de um
 * 'falhou' não pode derrubar o bloqueador enquanto o teste corre.
 *
 * `sessoes === null` significa que a busca falhou — não que não há sessão. Aí
 * a resposta é null, "não medido", e o campo legado NÃO é consultado: usá-lo
 * deixaria um erro de rede apagar da tela uma reprovação real.
 *
 * Sem sessão alguma, cai no campo legado `daily_evolutions.tre_result`, para
 * não apagar o histórico de quem foi registrado antes da Fase 5.
 */
export function resultadoTreParaTriagem(
  sessoes: TreSession[] | null,
  treResultLegado: string | null
): "pass" | "fail" | null {
  if (sessoes == null) return null;
  const concluidas = sessoes
    .filter((s) => s.desfecho != null)
    .sort((a, b) => new Date(a.iniciado_em).getTime() - new Date(b.iniciado_em).getTime());
  const ultima = concluidas[concluidas.length - 1];
  if (ultima) {
    if (ultima.desfecho === "aprovado") return "pass";
    if (ultima.desfecho === "falhou") return "fail";
    return null; // interrompido
  }
  // Só há sessão em andamento, nenhuma concluída: nada foi decidido AQUI ainda,
  // então o campo legado continua valendo. Pelo mesmo motivo da regra acima —
  // teste em andamento não apaga resultado já concluído, e um 'fail' antigo é
  // um bloqueador real até que um teste novo o substitua.
  if (treResultLegado === "pass") return "pass";
  if (treResultLegado === "fail") return "fail";
  return null;
}

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
  return r.failed.filter((label) => label !== CRITERIO_TRE_APROVADO);
}

export function duracaoMinutos(s: TreSession, agora: Date = new Date()): number {
  const fim = s.encerrado_em ? new Date(s.encerrado_em) : agora;
  return Math.floor((fim.getTime() - new Date(s.iniciado_em).getTime()) / 60000);
}
