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
 * Por quantas horas o resultado de um TRE continua valendo na triagem.
 *
 * 24 h é parecer do mentor clínico (01/09/2026), coerente com a cadência
 * diária de AARC 2024 (recomendação 3: avaliar e, se apropriado, testar antes
 * do meio-dia de cada dia — condicional, certeza muito baixa) e de
 * ATS/CHEST 2017. Nenhuma das duas afirma a janela literalmente; ver
 * `parecer_tre_validade` em data/references.ts.
 *
 * Antes da Fase 5 o resultado expirava sozinho, junto com a evolução do dia em
 * que estava gravado. A tabela de sessões perdeu essa expiração natural, e sem
 * a janela um TRE aprovado há cinco dias seguia contando como critério
 * atendido na triagem de hoje.
 */
export const VALIDADE_TRE_HORAS = 24;

const MS_POR_HORA = 3_600_000;

/**
 * Traduz o histórico de TRE no tri-estado que a triagem de extubação consome.
 *
 * Só conta resultado das últimas `VALIDADE_TRE_HORAS` horas. Fora da janela a
 * resposta é null, "não medido".
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
 *
 * @param dataLegado data do registro que trouxe `treResultLegado` (o
 *   `recorded_at` da evolução). `null` significa data desconhecida — ver o
 *   comentário no fim da função.
 * @param agora injetável para o teste não depender do relógio da máquina.
 */
export function resultadoTreParaTriagem(
  sessoes: TreSession[] | null,
  treResultLegado: string | null,
  dataLegado?: string | null,
  agora: Date = new Date()
): "pass" | "fail" | null {
  if (sessoes == null) return null;
  const limite = agora.getTime() - VALIDADE_TRE_HORAS * MS_POR_HORA;
  // O fim da sessão é o que datou o resultado. `encerrado_em` não deveria ser
  // nulo numa sessão concluída, mas o SQL não obriga: sem cair em
  // `iniciado_em`, uma linha assim viraria instante zero e seria descartada
  // como se fosse antiga, apagando da triagem um desfecho real.
  const dentroDaJanela = (s: TreSession) =>
    new Date(s.encerrado_em ?? s.iniciado_em).getTime() >= limite;

  // Filtra DEPOIS de ordenar e antes de pegar a última: procurar a sessão
  // concluída mais recente e só então conferir a validade descartaria uma
  // sessão de 2 horas atrás por causa de outra que ordenasse à frente dela.
  const concluidas = sessoes
    .filter((s) => s.desfecho != null)
    .sort((a, b) => new Date(a.iniciado_em).getTime() - new Date(b.iniciado_em).getTime())
    // A janela vale para 'aprovado' E para 'falhou', DE PROPÓSITO e
    // simetricamente. Parece errado à primeira vista, porque derruba um
    // bloqueador absoluto: um TRE que falhou há 30 horas deixa de reprovar.
    // Mas ele está velho exatamente como um aprovado de 30 horas está — a
    // cadência das diretrizes manda fazer um teste novo, não arrastar o de
    // anteontem. Expirado vira null, "não medido", que NÃO aprova ninguém:
    // só impede que um resultado velho decida o dia de hoje.
    .filter(dentroDaJanela);
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
  //
  // O legado leva a MESMA janela, quando a data dele é conhecida. Sem data
  // (`dataLegado` null ou ilegível) ele é tratado como não expirado: descartar
  // em silêncio um dado só porque não sabemos a idade dele apagaria da tela
  // informação real, e o comportamento anterior a esta janela era justamente
  // esse. Quem chama sabe a data — é o `recorded_at` da evolução — e é por
  // isso que ela é parâmetro, não adivinhação.
  if (dataLegado != null) {
    const t = new Date(dataLegado).getTime();
    if (!Number.isNaN(t) && t < limite) return null;
  }
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
