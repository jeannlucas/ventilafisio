import { describe, it, expect } from "vitest";
import {
  MEASUREMENT_LIMITS,
  limitsFor,
  invalidMeasurements,
  inconsistentMeasurements,
} from "./measurement-limits";

// Estes limites barram apenas o fisicamente impossível. Não são faixa clínica
// nem alvo terapêutico: um valor dentro do limite ainda pode ser gravíssimo.
describe("MEASUREMENT_LIMITS", () => {
  it("prende a FiO2 entre o ar ambiente e o oxigênio puro", () => {
    expect(limitsFor("fio2")).toEqual({ min: 21, max: 100 });
  });

  it("permite PEEP zero, que é uma regulagem real (ZEEP)", () => {
    expect(limitsFor("peep")!.min).toBe(0);
  });

  it("exige PImax não positiva, porque é pressão negativa por convenção", () => {
    expect(limitsFor("pimax")!.max).toBe(0);
  });

  it("prende a escala de Glasgow entre 3 e 15", () => {
    expect(limitsFor("glasgow")).toEqual({ min: 3, max: 15 });
  });

  it("prende SpO2 e saturações em porcentagem válida", () => {
    expect(limitsFor("spo2")).toEqual({ min: 0, max: 100 });
  });

  it("prende o pH à escala de pH", () => {
    expect(limitsFor("ph")).toEqual({ min: 0, max: 14 });
  });

  it("exige grandeza positiva onde zero não existe", () => {
    for (const campo of ["fr", "vc", "ppico", "pplat", "flow", "pao2", "paco2"]) {
      expect(limitsFor(campo)!.min).toBeGreaterThan(0);
    }
  });

  it("não inventa limite para campo sem impossibilidade física conhecida", () => {
    expect(limitsFor("campo_inexistente")).toBeUndefined();
  });
});

describe("invalidMeasurements", () => {
  it("aceita um conjunto de valores plausíveis", () => {
    expect(
      invalidMeasurements({ fio2: "40", peep: "8", vc: "420", glasgow: "15" })
    ).toEqual([]);
  });

  it("aceita campo vazio, porque medida ausente não é medida inválida", () => {
    expect(invalidMeasurements({ fio2: "", peep: "", vc: "" })).toEqual([]);
  });

  it("rejeita FiO2 abaixo do ar ambiente", () => {
    const erros = invalidMeasurements({ fio2: "0" });
    expect(erros).toHaveLength(1);
    expect(erros[0].field).toBe("fio2");
  });

  it("rejeita FiO2 acima de oxigênio puro", () => {
    expect(invalidMeasurements({ fio2: "500" })).toHaveLength(1);
  });

  it("rejeita altura zero, a entrada que produzia IMC infinito", () => {
    expect(invalidMeasurements({ height_cm: "0" })).toHaveLength(1);
  });

  it("rejeita volume corrente negativo", () => {
    expect(invalidMeasurements({ vc: "-400" })).toHaveLength(1);
  });

  it("rejeita Glasgow fora da escala", () => {
    expect(invalidMeasurements({ glasgow: "2" })).toHaveLength(1);
    expect(invalidMeasurements({ glasgow: "16" })).toHaveLength(1);
  });

  it("rejeita PImax positiva", () => {
    expect(invalidMeasurements({ pimax: "30" })).toHaveLength(1);
  });

  it("aceita PEEP zero", () => {
    expect(invalidMeasurements({ peep: "0" })).toEqual([]);
  });

  it("rejeita texto que não é número", () => {
    const erros = invalidMeasurements({ vc: "abc" });
    expect(erros).toHaveLength(1);
    expect(erros[0].message).toMatch(/número/i);
  });

  it("acumula todos os campos inválidos, não para no primeiro", () => {
    const erros = invalidMeasurements({ fio2: "500", glasgow: "99", vc: "-1" });
    expect(erros.map((e) => e.field).sort()).toEqual(["fio2", "glasgow", "vc"]);
  });

  it("a mensagem diz o rótulo do campo e o limite violado", () => {
    const [erro] = invalidMeasurements({ fio2: "500" });
    expect(erro.message).toContain("FiO₂");
    expect(erro.message).toContain("100");
  });

  it("ignora campo sem limite conhecido", () => {
    expect(invalidMeasurements({ notes: "qualquer texto" })).toEqual([]);
  });
});

// Coerência entre campos: cada valor é plausível sozinho, mas o conjunto não
// pode existir. É a origem da driving pressure negativa e da resistência
// negativa, que apareciam classificadas em verde na tela.
describe("inconsistentMeasurements", () => {
  it("aceita a ordem fisiológica pico ≥ platô > PEEP", () => {
    expect(
      inconsistentMeasurements({ ppico: "30", pplat: "24", peep: "10" })
    ).toEqual([]);
  });

  it("rejeita platô abaixo da PEEP", () => {
    const erros = inconsistentMeasurements({ pplat: "10", peep: "18" });
    expect(erros).toHaveLength(1);
    expect(erros[0].message).toMatch(/platô/i);
    expect(erros[0].message).toMatch(/PEEP/);
  });

  it("rejeita platô igual à PEEP, que não gera driving pressure", () => {
    expect(inconsistentMeasurements({ pplat: "15", peep: "15" })).toHaveLength(1);
  });

  it("rejeita pico abaixo do platô", () => {
    const erros = inconsistentMeasurements({ ppico: "20", pplat: "28" });
    expect(erros).toHaveLength(1);
    expect(erros[0].message).toMatch(/pico/i);
  });

  it("aceita pico igual ao platô, que é pausa sem componente resistivo", () => {
    expect(inconsistentMeasurements({ ppico: "24", pplat: "24" })).toEqual([]);
  });

  it("não opina quando falta um dos dois valores do par", () => {
    expect(inconsistentMeasurements({ pplat: "10" })).toEqual([]);
    expect(inconsistentMeasurements({ peep: "18" })).toEqual([]);
    expect(inconsistentMeasurements({})).toEqual([]);
  });

  it("acumula as duas incoerências quando as duas existem", () => {
    const erros = inconsistentMeasurements({
      ppico: "5",
      pplat: "10",
      peep: "18",
    });
    expect(erros).toHaveLength(2);
  });
});

describe("gasometria da Fase 6", () => {
  // BE negativo é o achado esperado em acidose metabólica, não erro de digitação.
  it("aceita excesso de base negativo", () => {
    expect(invalidMeasurements({ be: "-12" })).toEqual([]);
  });

  // Zero é o valor NORMAL do BE, não campo vazio.
  it("aceita excesso de base zero", () => {
    expect(invalidMeasurements({ be: "0" })).toEqual([]);
  });

  it("aceita excesso de base positivo", () => {
    expect(invalidMeasurements({ be: "6" })).toEqual([]);
  });

  it("barra excesso de base fisicamente impossível", () => {
    expect(invalidMeasurements({ be: "-90" }).length).toBe(1);
  });

  it("barra bicarbonato zero ou negativo", () => {
    expect(invalidMeasurements({ hco3: "0" }).length).toBe(1);
    expect(invalidMeasurements({ hco3: "-3" }).length).toBe(1);
  });

  it("aceita sódio, cloro e albumina plausíveis", () => {
    expect(invalidMeasurements({ na: "140", cl: "105", albumina: "2.1" })).toEqual([]);
  });

  // O teste de aceitação acima não prova nada: campos desconhecidos são
  // silenciosamente ignorados, então passa mesmo que os limites não existam.
  // É preciso um teste de rejeição por campo para provar que o limite está
  // realmente ligado.
  it("barra sódio zero ou negativo", () => {
    expect(invalidMeasurements({ na: "0" }).length).toBe(1);
    expect(invalidMeasurements({ na: "-10" }).length).toBe(1);
  });

  it("barra cloro zero ou negativo", () => {
    expect(invalidMeasurements({ cl: "0" }).length).toBe(1);
    expect(invalidMeasurements({ cl: "-5" }).length).toBe(1);
  });

  it("barra albumina zero ou negativa", () => {
    expect(invalidMeasurements({ albumina: "0" }).length).toBe(1);
    expect(invalidMeasurements({ albumina: "-1.5" }).length).toBe(1);
  });
});

describe("mecânica da Fase 7", () => {
  // P0.1 zero é ausência de drive: medida real e grave, não campo vazio.
  it("aceita P0.1 zero", () => {
    expect(invalidMeasurements({ p01: "0" })).toEqual([]);
  });

  it("aceita P0.1 positivo", () => {
    expect(invalidMeasurements({ p01: "2.5" })).toEqual([]);
  });

  it("barra P0.1 negativo", () => {
    expect(invalidMeasurements({ p01: "-1" }).length).toBe(1);
  });

  // ΔPocc é negativo por definição. Um piso em zero rejeitaria toda medida.
  it("aceita ΔPocc negativo", () => {
    expect(invalidMeasurements({ pocc: "-12" })).toEqual([]);
  });

  it("aceita ΔPocc zero", () => {
    expect(invalidMeasurements({ pocc: "0" })).toEqual([]);
  });

  it("barra ΔPocc positivo", () => {
    expect(invalidMeasurements({ pocc: "5" }).length).toBe(1);
  });

  it("barra ΔPocc fisicamente impossível", () => {
    expect(invalidMeasurements({ pocc: "-90" }).length).toBe(1);
  });
});
