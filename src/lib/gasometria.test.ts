import { describe, it, expect } from "vitest";
import { disturbioPrimario, type EntradaGasometria } from "./gasometria";

const gaso = (over: Partial<EntradaGasometria> = {}): EntradaGasometria => ({
  ph: 7.4, paco2: 40, hco3: 24, be: 0,
  na: null, cl: null, albumina: null,
  ...over,
});

describe("disturbioPrimario", () => {
  it("os três dentro da faixa é sem distúrbio", () => {
    expect(disturbioPrimario(gaso())).toBe("sem_disturbio");
  });

  it("pH baixo com PaCO₂ alta é acidose respiratória", () => {
    expect(disturbioPrimario(gaso({ ph: 7.25, paco2: 60, hco3: 26 })))
      .toBe("acidose_respiratoria");
  });

  it("pH baixo com bicarbonato baixo é acidose metabólica", () => {
    expect(disturbioPrimario(gaso({ ph: 7.25, paco2: 28, hco3: 12 })))
      .toBe("acidose_metabolica");
  });

  it("pH alto com PaCO₂ baixa é alcalose respiratória", () => {
    expect(disturbioPrimario(gaso({ ph: 7.52, paco2: 28, hco3: 22 })))
      .toBe("alcalose_respiratoria");
  });

  it("pH alto com bicarbonato alto é alcalose metabólica", () => {
    expect(disturbioPrimario(gaso({ ph: 7.5, paco2: 45, hco3: 34 })))
      .toBe("alcalose_metabolica");
  });

  // Os dois empurram para o mesmo lado: nenhum está compensando o outro.
  it("PaCO₂ alta E bicarbonato baixo com pH baixo é acidose mista", () => {
    expect(disturbioPrimario(gaso({ ph: 7.15, paco2: 55, hco3: 18 })))
      .toBe("acidose_mista");
  });

  it("PaCO₂ baixa E bicarbonato alto com pH alto é alcalose mista", () => {
    expect(disturbioPrimario(gaso({ ph: 7.58, paco2: 30, hco3: 32 })))
      .toBe("alcalose_mista");
  });

  // O ACHADO CENTRAL DA FASE. Berend 2014 registra que o pH pode estar normal
  // na acidose respiratória crônica. Se o pH sozinho decidisse, este paciente
  // sairia como "sem distúrbio" — e ele é um retentor crônico compensado.
  it("retentor crônico compensado NÃO é sem distúrbio", () => {
    expect(disturbioPrimario(gaso({ ph: 7.38, paco2: 60, hco3: 34 })))
      .toBe("acidose_respiratoria");
  });

  it("pH normal com bicarbonato baixo não é sem distúrbio", () => {
    expect(disturbioPrimario(gaso({ ph: 7.36, paco2: 30, hco3: 18 })))
      .toBe("acidose_metabolica");
  });

  // Comportamento fixado de propósito: 7,40 exato com par compensatório é
  // ambíguo pela gasometria isolada, e o critério tem que ser explícito.
  it("pH exatamente 7,40 cai no lado alcalino", () => {
    expect(disturbioPrimario(gaso({ ph: 7.4, paco2: 60, hco3: 36 })))
      .toBe("alcalose_metabolica");
  });

  it("devolve null sem algum dos três parâmetros", () => {
    expect(disturbioPrimario(gaso({ ph: null }))).toBeNull();
    expect(disturbioPrimario(gaso({ paco2: null }))).toBeNull();
    expect(disturbioPrimario(gaso({ hco3: null }))).toBeNull();
  });
});
