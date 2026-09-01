import { describe, it, expect } from "vitest";
import {
  criteriosAtingidos,
  sessaoEmAndamento,
  resultadoTreParaTriagem,
  duracaoMinutos,
  pendenciasParaIniciar,
} from "./tre";
import type { TreSession } from "../types";
import { CRITERIO_TRE_APROVADO, type ExtubationReadiness } from "./clinical";

const sessao = (over: Partial<TreSession> = {}): TreSession =>
  ({
    id: "s1", patient_id: "p1", owner_id: "u1",
    iniciado_em: "2026-09-01T10:00:00Z",
    encerrado_em: null, modo_antes: "PCV", modo_durante: "psv",
    desfecho: null, motivo_interrupcao: null, criterios: {},
    ...over,
  } as TreSession);

describe("criteriosAtingidos", () => {
  it("lista só os critérios marcados como atingidos", () => {
    const s = sessao({
      criterios: {
        taquipneia: { atingido: true },
        saturacao: { atingido: false },
      },
    });
    expect(criteriosAtingidos(s)).toEqual(["taquipneia"]);
  });

  // Chave ausente é "não avaliado", presente com false é "avaliado e não
  // atingido". Nenhum dos dois é atingido, mas são estados diferentes.
  it("não confunde critério ausente com critério não atingido", () => {
    const s = sessao({ criterios: { saturacao: { atingido: false } } });
    expect(criteriosAtingidos(s)).toEqual([]);
  });

  it("devolve lista vazia sem critério nenhum", () => {
    expect(criteriosAtingidos(sessao())).toEqual([]);
  });
});

describe("sessaoEmAndamento", () => {
  it("acha a sessão sem desfecho", () => {
    const aberta = sessao({ id: "aberta" });
    const fechada = sessao({ id: "fechada", desfecho: "aprovado" });
    expect(sessaoEmAndamento([fechada, aberta])?.id).toBe("aberta");
  });

  it("devolve null quando todas foram encerradas", () => {
    expect(sessaoEmAndamento([sessao({ desfecho: "falhou" })])).toBeNull();
  });

  it("devolve null sem sessão alguma", () => {
    expect(sessaoEmAndamento([])).toBeNull();
  });

  // Duas sessões abertas não deveriam existir, mas a resposta não pode depender
  // da ordem em que a lista chegou: essa ordem vem do ORDER BY da query, não do
  // domínio. O array vai DESORDENADO de propósito — em ordem cronológica um
  // `.find` ingênuo acertaria por acidente e o teste não provaria nada.
  it("com duas abertas, devolve a mais recente, não a primeira do array", () => {
    const antiga = sessao({ id: "antiga", iniciado_em: "2026-08-30T10:00:00Z" });
    const nova = sessao({ id: "nova", iniciado_em: "2026-09-01T10:00:00Z" });
    expect(sessaoEmAndamento([nova, antiga])?.id).toBe("nova");
    expect(sessaoEmAndamento([antiga, nova])?.id).toBe("nova");
  });
});

describe("resultadoTreParaTriagem", () => {
  it("um TRE aprovado atende o critério", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: "aprovado" })], null)).toBe("pass");
  });

  it("um TRE falhado reprova", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: "falhou" })], null)).toBe("fail");
  });

  // O ACHADO CENTRAL DA FASE. Um teste parado por tomografia ou transporte não
  // é um paciente que reprovou — é um teste que não aconteceu. E TRE reprovado
  // é bloqueador ABSOLUTO da triagem, então confundir os dois reprova alguém
  // que não falhou em nada.
  it("um TRE interrompido NÃO reprova: cai em não medido", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: "interrompido" })], null)).toBeNull();
  });

  // Sessão aberta e nada concluído: "não medido". A resposta não pode vir de um
  // teste que ainda não terminou.
  it("um TRE em andamento ainda não tem resultado", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: null })], null)).toBeNull();
  });

  // Pelo mesmo motivo do teste acima, na outra ponta: se nada foi concluído
  // AQUI, o campo legado continua valendo. Abrir uma sessão não pode derrubar
  // um 'fail' antigo, que é bloqueador real até um teste novo substituí-lo.
  it("uma sessão em andamento não apaga o campo legado", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: null })], "fail")).toBe("fail");
    expect(resultadoTreParaTriagem([sessao({ desfecho: null })], "pass")).toBe("pass");
  });

  // Iniciar um teste novo não apaga o resultado do anterior. Antes, a resposta
  // vinha da sessão mais recente qualquer que fosse ela: abrir uma sessão uma
  // hora depois de um 'falhou' devolvia null e derrubava o bloqueador absoluto
  // da triagem enquanto o teste corria.
  it("uma sessão em andamento não apaga a falha já concluída", () => {
    const falhou = sessao({ id: "a", iniciado_em: "2026-09-01T08:00:00Z", desfecho: "falhou",
                            encerrado_em: "2026-09-01T08:30:00Z" });
    const emAndamento = sessao({ id: "b", iniciado_em: "2026-09-01T09:00:00Z", desfecho: null });
    expect(resultadoTreParaTriagem([falhou, emAndamento], null)).toBe("fail");
    expect(resultadoTreParaTriagem([emAndamento, falhou], null)).toBe("fail");
  });

  it("uma sessão em andamento não apaga a aprovação já concluída", () => {
    const aprovado = sessao({ id: "a", iniciado_em: "2026-09-01T08:00:00Z", desfecho: "aprovado",
                              encerrado_em: "2026-09-01T08:30:00Z" });
    const emAndamento = sessao({ id: "b", iniciado_em: "2026-09-01T09:00:00Z", desfecho: null });
    expect(resultadoTreParaTriagem([aprovado, emAndamento], null)).toBe("pass");
  });

  // A busca falhou: `null` não é "não há sessão nenhuma". Cair no legado aqui
  // fazia um erro de rede apagar da tela um TRE reprovado hoje, substituído
  // por um `tre_result: "pass"` de antes da Fase 5.
  it("com a busca falhando, NÃO cai no campo legado", () => {
    expect(resultadoTreParaTriagem(null, "pass")).toBeNull();
    expect(resultadoTreParaTriagem(null, "fail")).toBeNull();
    expect(resultadoTreParaTriagem(null, null)).toBeNull();
  });

  // O array vai DESORDENADO de propósito. Com [antiga, nova] uma implementação
  // que jogasse o sort fora e lesse o último elemento passaria igual, e o teste
  // não provaria que existe ordenação nenhuma.
  it("usa a sessão mais recente quando há várias, não a última do array", () => {
    const antiga = sessao({ iniciado_em: "2026-08-30T10:00:00Z", desfecho: "falhou" });
    const nova = sessao({ iniciado_em: "2026-09-01T10:00:00Z", desfecho: "aprovado" });
    expect(resultadoTreParaTriagem([nova, antiga], null)).toBe("pass");
    expect(resultadoTreParaTriagem([antiga, nova], null)).toBe("pass");
  });

  // Sem sessão, cai no campo antigo: paciente registrado antes desta fase não
  // perde o que foi anotado.
  it("sem sessão nenhuma, cai no campo legado", () => {
    expect(resultadoTreParaTriagem([], "pass")).toBe("pass");
    expect(resultadoTreParaTriagem([], "fail")).toBe("fail");
    expect(resultadoTreParaTriagem([], null)).toBeNull();
  });

  // A sessão é a fonte de verdade quando existe: o legado não a sobrepõe.
  it("a sessão tem precedência sobre o campo legado", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: "falhou" })], "pass")).toBe("fail");
  });

  it("ignora valor legado fora do domínio", () => {
    expect(resultadoTreParaTriagem([], "success")).toBeNull();
  });
});

describe("pendenciasParaIniciar", () => {
  // Aptidão para INICIAR não é a mesma pergunta que prontidão para EXTUBAR.
  // Os critérios são os mesmos, menos o do próprio TRE — que só existe depois
  // do teste. Sem essa exclusão a pergunta se morde: para iniciar o teste você
  // precisaria já ter feito o teste.
  const triagem = (over: Partial<ExtubationReadiness> = {}): ExtubationReadiness =>
    ({ level: "borderline", score: 0, max: 9, met: [], failed: [], notMeasured: [], ...over });

  it("lista os critérios reprovados que impedem iniciar", () => {
    const r = triagem({ failed: ["PEEP ≤ 8", "FiO₂ ≤ 40%"] });
    expect(pendenciasParaIniciar(r)).toEqual(["PEEP ≤ 8", "FiO₂ ≤ 40%"]);
  });

  it("NÃO conta o próprio TRE como pendência para iniciar o TRE", () => {
    const r = triagem({ failed: ["TRE aprovado", "PEEP ≤ 8"] });
    expect(pendenciasParaIniciar(r)).toEqual(["PEEP ≤ 8"]);
  });

  // O rótulo excluído é o de clinical.ts, não uma cópia. Com a string literal
  // duplicada aqui, renomear o critério lá fazia a exclusão parar de funcionar
  // em silêncio — e a pergunta voltava a se morder.
  it("exclui exatamente o rótulo que clinical.ts constrói", () => {
    const r = triagem({ failed: [CRITERIO_TRE_APROVADO, "PEEP ≤ 8"] });
    expect(pendenciasParaIniciar(r)).toEqual(["PEEP ≤ 8"]);
  });

  it("não trata critério não medido como pendência", () => {
    const r = triagem({ notMeasured: ["PImax ≤ -20"] });
    expect(pendenciasParaIniciar(r)).toEqual([]);
  });

  it("devolve vazio quando nada reprovou", () => {
    expect(pendenciasParaIniciar(triagem())).toEqual([]);
  });
});

describe("duracaoMinutos", () => {
  it("mede da abertura ao encerramento", () => {
    const s = sessao({
      iniciado_em: "2026-09-01T10:00:00Z",
      encerrado_em: "2026-09-01T10:45:00Z",
    });
    expect(duracaoMinutos(s)).toBe(45);
  });

  it("mede até agora quando a sessão está aberta", () => {
    const s = sessao({ iniciado_em: "2026-09-01T10:00:00Z" });
    expect(duracaoMinutos(s, new Date("2026-09-01T10:30:00Z"))).toBe(30);
  });
});
