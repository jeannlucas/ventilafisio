import { describe, it, expect } from "vitest";
import {
  disturbioPrimario,
  temporalidade,
  hipercapniaCronica,
  type EntradaGasometria,
} from "./gasometria";

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

describe("temporalidade", () => {
  // PaCO₂ 60 é 20 acima de 40, ou seja 2 unidades de 10 mmHg.
  // Agudo esperaria 24 + 2×1 = 26. Crônico esperaria 24 + 2×5,0 = 34.
  it("bicarbonato próximo do agudo é compatível com quadro agudo", () => {
    expect(temporalidade(gaso({ ph: 7.25, paco2: 60, hco3: 26 }))).toBe("aguda");
  });

  it("bicarbonato próximo do crônico é compatível com quadro crônico", () => {
    expect(temporalidade(gaso({ ph: 7.38, paco2: 60, hco3: 34 }))).toBe("cronica");
  });

  // Longe dos dois: o app não escolhe. Dizer "indeterminada" nunca afirma algo
  // clínico que a gasometria não sustenta.
  // HCO₃⁻ 22 continua DENTRO da faixa normal, então o distúrbio é respiratório
  // puro. Com PaCO₂ 60 o agudo esperaria 26 e o crônico 34: 22 está a 4 do mais
  // próximo, além da tolerância. Não usar HCO₃⁻ baixo aqui, que viraria
  // acidose mista e devolveria null por outro motivo.
  it("bicarbonato longe dos dois é indeterminada", () => {
    expect(temporalidade(gaso({ ph: 7.2, paco2: 60, hco3: 22 }))).toBe("indeterminada");
  });

  it("alcalose respiratória aguda", () => {
    expect(temporalidade(gaso({ ph: 7.52, paco2: 28, hco3: 22 }))).toBe("aguda");
  });

  it("distúrbio metabólico não tem temporalidade", () => {
    expect(temporalidade(gaso({ ph: 7.25, paco2: 28, hco3: 12 }))).toBeNull();
  });

  it("distúrbio misto não tem temporalidade", () => {
    expect(temporalidade(gaso({ ph: 7.15, paco2: 55, hco3: 18 }))).toBeNull();
  });
});

describe("hipercapniaCronica", () => {
  // Resposta do mentor a dois casos concretos: qualquer um dos dois basta.
  it("caso A: só o pH bate", () => {
    expect(hipercapniaCronica(gaso({ ph: 7.36, paco2: 55, hco3: 26 }))).toBe(true);
  });

  it("caso B: só o bicarbonato bate", () => {
    expect(hipercapniaCronica(gaso({ ph: 7.3, paco2: 55, hco3: 30 }))).toBe(true);
  });

  it("nenhum dos dois bate", () => {
    expect(hipercapniaCronica(gaso({ ph: 7.25, paco2: 55, hco3: 26 }))).toBe(false);
  });

  // O E externo continua sendo E: sem PaCO₂ elevada não há hipercapnia.
  it("sem PaCO₂ elevada é falso mesmo com bicarbonato alto", () => {
    expect(hipercapniaCronica(gaso({ ph: 7.45, paco2: 40, hco3: 32 }))).toBe(false);
  });
});
