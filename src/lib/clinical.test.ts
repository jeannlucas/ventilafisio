import { describe, it, expect } from "vitest";
import {
  pbw,
  pbwOrEstimate,
  AVG_HEIGHT,
  bmi,
  pfRatio,
  vcPerKg,
  drivingPressure,
  mechanicalPower,
  cStat,
  cDyn,
  raw,
  tobin,
  map,
  diasEmVentilacao,
  classify,
  extubationReadiness,
  ventilationCorrelations,
  CRITERIO_TRE_APROVADO,
} from "./clinical";
import type { DailyEvolution } from "../types";

// Evolução mínima: só os campos que o motor lê importam.
function ev(partial: Partial<DailyEvolution>): DailyEvolution {
  return { imaging: {}, iv_meds: {}, feeding: {}, ...partial } as DailyEvolution;
}

// ============================================================
// Peso predito e antropometria
// ============================================================
describe("pbw", () => {
  it("aplica a fórmula ARDSnet masculina", () => {
    // 50 + 0.91 * (170 - 152.4)
    expect(pbw("M", 170)).toBeCloseTo(66.016, 3);
  });

  it("aplica a fórmula ARDSnet feminina", () => {
    // 45.5 + 0.91 * (160 - 152.4)
    expect(pbw("F", 160)).toBeCloseTo(52.416, 3);
  });

  it("devolve null sem altura", () => {
    expect(pbw("M", null)).toBeNull();
    expect(pbw("M", undefined)).toBeNull();
  });

  it("altura zero ou negativa é impossível e não vira peso predito", () => {
    expect(pbw("M", 0)).toBeNull();
    expect(pbw("F", -10)).toBeNull();
  });
});

describe("pbwOrEstimate", () => {
  it("usa a altura informada e marca como não estimado", () => {
    const r = pbwOrEstimate("M", 170);
    expect(r.estimated).toBe(false);
    expect(r.value).toBeCloseTo(66.016, 3);
  });

  it("cai na altura média do sexo e marca como estimado", () => {
    const m = pbwOrEstimate("M", null);
    expect(m.estimated).toBe(true);
    expect(m.value).toBeCloseTo(pbw("M", AVG_HEIGHT.M)!, 6);

    const f = pbwOrEstimate("F", null);
    expect(f.estimated).toBe(true);
    expect(f.value).toBeCloseTo(pbw("F", AVG_HEIGHT.F)!, 6);
  });

  it("altura impossível cai na estimativa em vez de propagar lixo", () => {
    const r = pbwOrEstimate("M", 0);
    expect(r.estimated).toBe(true);
    expect(Number.isFinite(r.value)).toBe(true);
  });
});

describe("bmi", () => {
  it("calcula peso sobre altura ao quadrado", () => {
    expect(bmi(70, 170)).toBeCloseTo(24.221, 3);
  });

  it("devolve null sem peso ou sem altura", () => {
    expect(bmi(null, 170)).toBeNull();
    expect(bmi(70, null)).toBeNull();
  });

  // Defeito B2: altura zero produzia Infinity, e Infinity >= 30 classificava
  // o paciente como obeso, subindo o alvo de VC de 4-6 para 6-8 ml/kg.
  it("altura zero não produz IMC infinito", () => {
    expect(bmi(70, 0)).toBeNull();
  });

  it("altura negativa não produz IMC", () => {
    expect(bmi(70, -170)).toBeNull();
  });
});

// ============================================================
// Trocas gasosas e mecânica
// ============================================================
describe("pfRatio", () => {
  it("divide a PaO2 pela fração inspirada", () => {
    expect(pfRatio(100, 50)).toBe(200);
    expect(pfRatio(90, 30)).toBe(300);
  });

  it("devolve null sem PaO2 ou sem FiO2", () => {
    expect(pfRatio(null, 50)).toBeNull();
    expect(pfRatio(100, null)).toBeNull();
  });

  // Defeito B1: FiO2 zero produzia Infinity, e classify.pf(Infinity) devolvia
  // "Normal" em verde para um paciente gravemente hipoxêmico.
  it("FiO2 zero não produz relação infinita", () => {
    expect(pfRatio(60, 0)).toBeNull();
  });

  it("FiO2 negativa não produz relação", () => {
    expect(pfRatio(60, -21)).toBeNull();
  });
});

describe("vcPerKg", () => {
  it("divide o volume corrente pelo peso predito", () => {
    expect(vcPerKg(420, 70)).toBe(6);
  });

  it("devolve null sem volume ou sem peso predito", () => {
    expect(vcPerKg(null, 70)).toBeNull();
    expect(vcPerKg(420, null)).toBeNull();
  });

  it("peso predito zero não produz volume por quilo infinito", () => {
    expect(vcPerKg(420, 0)).toBeNull();
  });
});

describe("drivingPressure", () => {
  it("subtrai a PEEP do platô", () => {
    expect(drivingPressure(28, 10)).toBe(18);
  });

  it("devolve null sem platô ou sem PEEP", () => {
    expect(drivingPressure(null, 10)).toBeNull();
    expect(drivingPressure(28, null)).toBeNull();
  });

  // Defeito B3: platô menor que PEEP é fisicamente impossível, mas devolvia
  // um número negativo que classify.dp rotulava como "Ideal" em verde.
  it("platô abaixo da PEEP é impossível e não vira driving pressure", () => {
    expect(drivingPressure(10, 18)).toBeNull();
  });

  it("platô igual à PEEP não vira driving pressure zero", () => {
    expect(drivingPressure(15, 15)).toBeNull();
  });
});

describe("mechanicalPower", () => {
  it("aplica a fórmula de Gattinoni simplificada com VC em litros", () => {
    // 0.098 * 20 * 0.4 * (30 - 0.5 * 15)
    expect(mechanicalPower(20, 400, 30, 15)).toBeCloseTo(17.64, 5);
  });

  it("devolve null com qualquer parcela ausente", () => {
    expect(mechanicalPower(null, 400, 30, 15)).toBeNull();
    expect(mechanicalPower(20, null, 30, 15)).toBeNull();
    expect(mechanicalPower(20, 400, null, 15)).toBeNull();
    expect(mechanicalPower(20, 400, 30, null)).toBeNull();
  });
});

describe("cStat", () => {
  it("divide o volume corrente pela driving pressure", () => {
    expect(cStat(400, 28, 8)).toBe(20);
  });

  it("devolve null quando a driving pressure não existe", () => {
    expect(cStat(400, 15, 15)).toBeNull();
  });

  // Defeito B3: complacência negativa era plotada no gráfico de tendência.
  it("platô abaixo da PEEP não produz complacência negativa", () => {
    expect(cStat(400, 10, 18)).toBeNull();
  });
});

describe("cDyn", () => {
  it("divide o volume corrente pela diferença entre pico e PEEP", () => {
    expect(cDyn(400, 30, 10)).toBe(20);
  });

  it("devolve null quando pico e PEEP se anulam", () => {
    expect(cDyn(400, 15, 15)).toBeNull();
  });

  it("pico abaixo da PEEP não produz complacência negativa", () => {
    expect(cDyn(400, 10, 18)).toBeNull();
  });
});

describe("raw", () => {
  it("divide a diferença entre pico e platô pelo fluxo", () => {
    expect(raw(30, 24, 60)).toBeCloseTo(0.1, 6);
  });

  it("devolve null com fluxo zero", () => {
    expect(raw(30, 24, 0)).toBeNull();
  });

  it("pico abaixo do platô é impossível e não vira resistência negativa", () => {
    expect(raw(24, 30, 60)).toBeNull();
  });
});

describe("tobin", () => {
  it("divide a frequência pelo volume corrente em litros", () => {
    expect(tobin(20, 400)).toBe(50);
  });

  it("devolve null com volume corrente zero", () => {
    expect(tobin(20, 0)).toBeNull();
  });

  it("volume corrente negativo não produz índice", () => {
    expect(tobin(20, -400)).toBeNull();
  });
});

describe("map", () => {
  it("aplica a média de uma sistólica e duas diastólicas", () => {
    expect(map(120, 60)).toBe(80);
  });

  it("devolve null sem sistólica ou sem diastólica", () => {
    expect(map(null, 60)).toBeNull();
    expect(map(120, null)).toBeNull();
  });
});

// ============================================================
// Classificações: os limites clínicos. Nenhum destes números muda.
// ============================================================
describe("classify.pf", () => {
  it("classifica pelas faixas de SDRA", () => {
    expect(classify.pf(300)).toEqual({ s: "ok", t: "Normal" });
    expect(classify.pf(299)).toEqual({ s: "warn", t: "Leve" });
    expect(classify.pf(200)).toEqual({ s: "warn", t: "Leve" });
    expect(classify.pf(199)).toEqual({ s: "warn", t: "Moderada" });
    expect(classify.pf(100)).toEqual({ s: "warn", t: "Moderada" });
    expect(classify.pf(99)).toEqual({ s: "danger", t: "Grave" });
  });

  it("devolve null sem valor", () => {
    expect(classify.pf(null)).toBeNull();
  });

  // Defeito B1: um valor não finito era rotulado como "Normal" em verde.
  it("valor não finito não é classificado como normal", () => {
    expect(classify.pf(Infinity)).toBeNull();
  });
});

describe("classify.vcKg", () => {
  it("usa a faixa protetora 4 a 6 para o não obeso", () => {
    expect(classify.vcKg(3.9)).toEqual({ s: "danger", t: "Muito baixo" });
    expect(classify.vcKg(4)).toEqual({ s: "ok", t: "Ideal" });
    expect(classify.vcKg(6)).toEqual({ s: "ok", t: "Ideal" });
    expect(classify.vcKg(7)).toEqual({ s: "warn", t: "Aceitável" });
    expect(classify.vcKg(8.1)).toEqual({ s: "danger", t: "Alto" });
  });

  it("estende a faixa ideal até 8 para o obeso", () => {
    expect(classify.vcKg(7, true)).toEqual({ s: "ok", t: "Ideal" });
    expect(classify.vcKg(8, true)).toEqual({ s: "ok", t: "Ideal" });
    expect(classify.vcKg(8.1, true)).toEqual({ s: "danger", t: "Alto" });
  });

  it("devolve null sem valor", () => {
    expect(classify.vcKg(null)).toBeNull();
  });
});

describe("classify.pplat", () => {
  it("marca risco de lesão a partir de 30", () => {
    expect(classify.pplat(29)).toEqual({ s: "ok", t: "Adequado" });
    expect(classify.pplat(30)).toEqual({ s: "danger", t: "Risco de lesão" });
  });
});

describe("classify.dp", () => {
  it("classifica pelas faixas de driving pressure", () => {
    expect(classify.dp(12)).toEqual({ s: "ok", t: "Ideal" });
    expect(classify.dp(13)).toEqual({ s: "warn", t: "Atenção" });
    expect(classify.dp(15)).toEqual({ s: "warn", t: "Atenção" });
    expect(classify.dp(16)).toEqual({ s: "danger", t: "Alto risco" });
  });

  // Defeito B3: driving pressure negativa era rotulada como "Ideal" em verde.
  it("driving pressure negativa não é classificada como ideal", () => {
    expect(classify.dp(-8)).toBeNull();
  });
});

describe("classify.mp", () => {
  it("marca potência elevada a partir de 17", () => {
    expect(classify.mp(16.9)).toEqual({ s: "ok", t: "Adequado" });
    expect(classify.mp(17)).toEqual({ s: "danger", t: "Elevado" });
  });
});

describe("classify.tobin", () => {
  it("marca desfavorável a partir de 105", () => {
    expect(classify.tobin(104)).toEqual({ s: "ok", t: "Favorável" });
    expect(classify.tobin(105)).toEqual({ s: "warn", t: "Desfavorável" });
  });
});

describe("classify.pimax", () => {
  it("classifica pelas faixas de pressão inspiratória máxima", () => {
    expect(classify.pimax(-30)).toEqual({ s: "ok", t: "Ideal" });
    expect(classify.pimax(-25)).toEqual({ s: "warn", t: "Aceitável" });
    expect(classify.pimax(-20)).toEqual({ s: "warn", t: "Aceitável" });
    expect(classify.pimax(-19)).toEqual({ s: "danger", t: "Insuficiente" });
  });
});

// ============================================================
// Prontidão para extubação
// ============================================================
describe("extubationReadiness", () => {
  const completoFavoravel = {
    fio2: 30,
    peep: 5,
    tobinVal: 60,
    pimaxVal: -35,
    glasgow: 15,
    rass: -1,
    vasopressor: false,
    treResult: "pass",
    peakCoughFlow: 80,
  };

  it("marca favorável quando todos os critérios avaliados passam", () => {
    const r = extubationReadiness(completoFavoravel);
    expect(r.level).toBe("favorable");
    expect(r.score).toBe(9);
    expect(r.max).toBe(9);
  });

  // `lib/tre.ts` exclui este rótulo da lista de pendências para INICIAR um TRE
  // (sem a exclusão, iniciar o teste exigiria já ter feito o teste). Ele
  // importa a constante daqui: se o rótulo construído aqui deixar de ser a
  // constante exportada, a exclusão para de casar e este teste reprova.
  it("constrói o critério de TRE com o rótulo exportado", () => {
    const r = extubationReadiness({ fio2: 30, peep: 5, glasgow: 15, tobinVal: 60 });
    expect(r.notMeasured).toContain(CRITERIO_TRE_APROVADO);
    const aprovado = extubationReadiness(completoFavoravel);
    expect(aprovado.met).toContain(CRITERIO_TRE_APROVADO);
  });

  it("TRE falhado é bloqueador mesmo com todo o resto favorável", () => {
    const r = extubationReadiness({ ...completoFavoravel, treResult: "fail" });
    expect(r.level).toBe("unfavorable");
  });

  it("marca desfavorável quando a maioria dos critérios avaliados falha", () => {
    const r = extubationReadiness({
      fio2: 80,
      peep: 14,
      tobinVal: 130,
      pimaxVal: -10,
      glasgow: 6,
      vasopressor: true,
    });
    expect(r.level).toBe("unfavorable");
  });

  // Defeito B4: uma evolução em branco devolvia "borderline", que a tela
  // mostra como "Critérios parciais, reavaliar". Ausência de dado não é
  // avaliação parcial. O corte de 4 critérios já existia na função.
  it("dado nenhum não vira veredito de triagem", () => {
    expect(extubationReadiness({}).level).toBe("insufficient");
  });

  it("menos de quatro critérios avaliados é dado insuficiente", () => {
    expect(extubationReadiness({ fio2: 30 }).level).toBe("insufficient");
    expect(extubationReadiness({ fio2: 30, peep: 5, glasgow: 15 }).level).toBe(
      "insufficient"
    );
  });

  it("a partir de quatro critérios avaliados volta a haver veredito", () => {
    const r = extubationReadiness({
      fio2: 30,
      peep: 5,
      glasgow: 15,
      tobinVal: 60,
    });
    expect(r.level).toBe("favorable");
  });

  // Defeito B5: a lista de pendentes juntava critério REPROVADO com critério
  // NUNCA MEDIDO, e na tela os dois apareciam idênticos.
  it("separa critério reprovado de critério não medido", () => {
    const r = extubationReadiness({
      fio2: 30,
      peep: 5,
      glasgow: 15,
      tobinVal: 130,
    });
    expect(r.failed).toEqual(["Tobin < 105"]);
    expect(r.notMeasured).toEqual([
      "PImax ≤ -20",
      "RASS entre −2 e +1",
      "Sem vasopressor elevado",
      "TRE aprovado",
      "Tosse eficaz (PCF ≥ 60 L/min)",
    ]);
  });

  it("conta como atendido apenas o que foi medido", () => {
    const r = extubationReadiness({ vasopressor: false });
    expect(r.met).toEqual(["Sem vasopressor elevado"]);
    expect(r.score).toBe(1);
  });

  it("conta RASS entre -2 e +1 como critério atendido", () => {
    const r = extubationReadiness({ rass: -1 });
    expect(r.met).toContain("RASS entre −2 e +1");
  });

  // RASS 0 é "alerta e calmo": o melhor valor possível para iniciar um TRE.
  // Uma checagem falsy o trataria como não medido.
  it("aceita RASS 0, que é o paciente alerta e calmo", () => {
    const r = extubationReadiness({ rass: 0 });
    expect(r.met).toContain("RASS entre −2 e +1");
  });

  it("reprova RASS -4, sedação que impede o teste", () => {
    const r = extubationReadiness({ rass: -4 });
    expect(r.failed).toContain("RASS entre −2 e +1");
  });

  it("reprova RASS +3, agitação", () => {
    const r = extubationReadiness({ rass: 3 });
    expect(r.failed).toContain("RASS entre −2 e +1");
  });

  // Ausência não é reprovação: continua valendo a regra da Fase 1.
  it("não conta RASS ausente como reprovado", () => {
    const r = extubationReadiness({});
    expect(r.notMeasured).toContain("RASS entre −2 e +1");
    expect(r.failed).not.toContain("RASS entre −2 e +1");
  });
});

// ============================================================
// Correlação do quadro clínico com a ventilação
// ============================================================
// O motor de sugestão (suggestVc, suggestPeepFio2, suggestVentilation,
// admissionSuggestion) migrou para alvos.ts (sugerirVc, sugerirPeepFio2,
// sugerirVentilacao, sugestaoAdmissao) — testes em alvos.test.ts.

describe("ventilationCorrelations", () => {
  it("não gera correlação quando não há dados", () => {
    expect(ventilationCorrelations(ev({}))).toEqual([]);
  });

  it("BNM ativo gera aviso de drive zerado", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { nmb: { on: true } } }));
    expect(r.some((c) => c.source === "nmb" && c.level === "warn")).toBe(true);
  });

  it("sedação ativa gera info sobre trigger", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { sedation: { on: true } } }));
    expect(r.some((c) => c.source === "sedation" && c.level === "info")).toBe(true);
  });

  it("broncodilatador gera aviso de auto-PEEP", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { bronchodilator: { on: true } } }));
    expect(r.some((c) => c.source === "bronchodilator" && c.level === "warn")).toBe(true);
  });

  it("hiperinsuflação na imagem gera aviso de auto-PEEP", () => {
    const r = ventilationCorrelations(ev({ imaging: { xray: ["hiperinsuflacao"] } }));
    expect(r.some((c) => c.source === "imaging_hiperinsuflacao" && c.level === "warn")).toBe(true);
  });

  it("vasopressor gera info sobre PEEP e retorno venoso", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { vasopressor: { on: true } } }));
    expect(r.some((c) => c.source === "vasopressor")).toBe(true);
  });

  it("infiltrado bilateral sugere padrão SDRA", () => {
    const r = ventilationCorrelations(ev({ imaging: { ct: ["infiltrado_bilateral"] } }));
    expect(r.some((c) => c.source === "imaging_sdra" && c.level === "info")).toBe(true);
  });

  it("pneumotórax gera aviso de pressões", () => {
    const r = ventilationCorrelations(ev({ imaging: { xray: ["pneumotorax"] } }));
    expect(r.some((c) => c.source === "imaging_pneumotorax" && c.level === "warn")).toBe(true);
  });

  it("med desligado (on:false) não gera correlação", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { nmb: { on: false } } }));
    expect(r).toEqual([]);
  });
});

// ============================================================
// Dias em ventilação
// ============================================================
describe("diasEmVentilacao", () => {
  const hoje = new Date("2026-08-31T12:00:00Z");

  it("conta o dia da intubação como 1º dia de ventilação", () => {
    expect(diasEmVentilacao("2026-08-31", hoje)).toBe(1);
  });

  it("conta oito dias para uma intubação de 24/08", () => {
    expect(diasEmVentilacao("2026-08-24", hoje)).toBe(8);
  });

  // Ausência de dado não é zero dia de ventilação (armadilha 5).
  it("devolve null sem data de intubação", () => {
    expect(diasEmVentilacao(null, hoje)).toBeNull();
    expect(diasEmVentilacao(undefined, hoje)).toBeNull();
    expect(diasEmVentilacao("", hoje)).toBeNull();
  });

  it("devolve null para data ilegível", () => {
    expect(diasEmVentilacao("ontem", hoje)).toBeNull();
  });

  // Erro de digitação não vira contagem negativa exibida na tela.
  it("devolve null para data no futuro", () => {
    expect(diasEmVentilacao("2026-09-10", hoje)).toBeNull();
  });

  // `hoje` é lido pelos getters locais, então o que importa é o dia de
  // calendário local — não o instante em UTC. Construir por componentes
  // (e não por string ISO com offset) fixa esse dia em qualquer fuso, então
  // o teste nunca fica vermelho contra código correto.
  // Em fuso negativo, as 21h locais já são o dia seguinte em UTC: é aí que
  // a versão com getUTC* dava "2º dia" no próprio dia da intubação.
  it("não adianta um dia no fim da tarde", () => {
    const fimDaTarde = new Date(2026, 7, 31, 21, 0, 0);
    expect(diasEmVentilacao("2026-08-31", fimDaTarde)).toBe(1);
  });
});
