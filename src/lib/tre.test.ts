import { describe, it, expect } from "vitest";
import {
  criteriosAtingidos,
  sessaoEmAndamento,
  resultadoTreParaTriagem,
  duracaoMinutos,
  pendenciasParaIniciar,
} from "./tre";
import type { TreSession } from "../types";
import type { ExtubationReadiness } from "./clinical";

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

  it("um TRE em andamento ainda não tem resultado", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: null })], null)).toBeNull();
  });

  it("usa a sessão mais recente quando há várias", () => {
    const antiga = sessao({ iniciado_em: "2026-08-30T10:00:00Z", desfecho: "falhou" });
    const nova = sessao({ iniciado_em: "2026-09-01T10:00:00Z", desfecho: "aprovado" });
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
