import { describe, it, expect } from "vitest";
import {
  disturbioPrimario,
  temporalidade,
  hipercapniaCronica,
  compensacao,
  anionGap,
  interpretar,
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

  // "sem_disturbio" e "indeterminado" precisam ficar distintos: um diz que
  // não há nada errado, o outro diz que os números não batem entre si. Um
  // painel pintando o segundo de verde repetiria o defeito do FiO₂ zero.
  it("pH fora da faixa com PaCO₂ e HCO₃⁻ normais é indeterminado, não sem distúrbio", () => {
    const resultado = disturbioPrimario(gaso({ ph: 7.3, paco2: 40, hco3: 24 }));
    expect(resultado).toBe("indeterminado");
    expect(resultado).not.toBe("sem_disturbio");
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

describe("compensacao", () => {
  // Winters: 1,5 × 12 + 8 = 26, margem ± 2.
  it("acidose metabólica: usa Winters", () => {
    const c = compensacao(gaso({ ph: 7.25, paco2: 26, hco3: 12 }));
    expect(c).not.toBeNull();
    expect(c!.esperada).toBeCloseTo(26, 5);
    expect(c!.margem).toBe(2);
    expect(c!.adequada).toBe(true);
  });

  it("acidose metabólica: PaCO₂ fora da margem é compensação inadequada", () => {
    const c = compensacao(gaso({ ph: 7.2, paco2: 34, hco3: 12 }));
    expect(c!.adequada).toBe(false);
  });

  // DECISÃO DO MENTOR, 01/09/2026: na alcalose metabólica o app NÃO dá número.
  // A fórmula de 0,7 tem estudo primário em CÃES e Berend 2014 avisa em nota
  // de rodapé que a previsão aqui é difícil. Se este teste começar a falhar
  // porque alguém implementou o cálculo, a implementação é que está errada.
  it("alcalose metabólica NÃO tem número de compensação", () => {
    expect(compensacao(gaso({ ph: 7.5, paco2: 45, hco3: 34 }))).toBeNull();
  });

  it("distúrbio respiratório não usa Winters", () => {
    expect(compensacao(gaso({ ph: 7.25, paco2: 60, hco3: 26 }))).toBeNull();
  });
});

describe("anionGap", () => {
  it("calcula sem potássio", () => {
    const ag = anionGap(gaso({ na: 140, cl: 105, hco3: 20 }));
    expect(ag!.bruto).toBeCloseTo(15, 5);
  });

  // Em UTI a albumina baixa derruba o gap calculado. Sem correção o app
  // deixaria de enxergar acidose exatamente na população que ele atende.
  it("corrige pela albumina", () => {
    const ag = anionGap(gaso({ na: 140, cl: 105, hco3: 20, albumina: 2.0 }));
    expect(ag!.corrigido).toBeCloseTo(20, 5);
    expect(ag!.albuminaUsada).toBe(2.0);
  });

  it("albumina normal não muda o valor", () => {
    const ag = anionGap(gaso({ na: 140, cl: 105, hco3: 20, albumina: 4.0 }));
    expect(ag!.corrigido).toBeCloseTo(15, 5);
  });

  // Sem albumina o app NÃO adivinha: não usa 4,0 como se fosse medida, e não
  // rotula o bruto como corrigido.
  it("sem albumina, corrigido é null", () => {
    const ag = anionGap(gaso({ na: 140, cl: 105, hco3: 20 }));
    expect(ag!.corrigido).toBeNull();
    expect(ag!.albuminaUsada).toBeNull();
  });

  it("sem sódio ou sem cloro, não há ânion gap", () => {
    expect(anionGap(gaso({ na: null, cl: 105, hco3: 20 }))).toBeNull();
    expect(anionGap(gaso({ na: 140, cl: null, hco3: 20 }))).toBeNull();
  });
});

describe("interpretar", () => {
  it("devolve null sem os três parâmetros mínimos", () => {
    expect(interpretar(gaso({ hco3: null }))).toBeNull();
  });

  it("o retentor crônico sai completo", () => {
    const r = interpretar(gaso({ ph: 7.38, paco2: 60, hco3: 34 }))!;
    expect(r.disturbio).toBe("acidose_respiratoria");
    expect(r.temporalidade).toBe("cronica");
    expect(r.hipercapniaCronica).toBe(true);
    expect(r.compensacao).toBeNull();
  });

  // Gatilho do mentor: pH < 7,20.
  it("sinaliza bicarbonato abaixo de 7,20", () => {
    const r = interpretar(gaso({ ph: 7.15, paco2: 26, hco3: 10 }))!;
    const c = r.condutas.find((x) => /bicarbonato/i.test(x.texto));
    expect(c).toBeDefined();
    expect(c!.alcada).toBe("medica");
  });

  it("não sinaliza bicarbonato em 7,25", () => {
    const r = interpretar(gaso({ ph: 7.25, paco2: 28, hco3: 12 }))!;
    expect(r.condutas.some((x) => /bicarbonato/i.test(x.texto))).toBe(false);
  });

  // O tipo Conduta não tem campo de dose, e nenhum texto pode trazer número
  // de mEq: quem prescreve é a equipe médica.
  it("nenhuma conduta carrega dose", () => {
    const r = interpretar(gaso({ ph: 7.1, paco2: 26, hco3: 8 }))!;
    for (const c of r.condutas) {
      expect(c).not.toHaveProperty("dose");
      expect(c.texto).not.toMatch(/\d+\s*(mEq|mg|ml|mL)\b/);
    }
  });

  it("hipercapnia crônica traz o alvo de saturação do DPOC", () => {
    const r = interpretar(gaso({ ph: 7.38, paco2: 60, hco3: 34 }))!;
    const c = r.condutas.find((x) => /88/.test(x.texto));
    expect(c).toBeDefined();
    expect(c!.alcada).toBe("fisio");
  });

  it("as chaves de fonte cobrem o ânion gap só quando ele existe", () => {
    const sem = interpretar(gaso({ ph: 7.4, paco2: 40, hco3: 24 }))!;
    expect(sem.sourceKeys).not.toContain("anionGap");
    const com = interpretar(gaso({ ph: 7.4, paco2: 40, hco3: 24, na: 140, cl: 105 }))!;
    expect(com.sourceKeys).toContain("anionGap");
  });

  it("as chaves de fonte cobrem o DPOC só na hipercapnia crônica", () => {
    const sem = interpretar(gaso({ ph: 7.25, paco2: 60, hco3: 26 }))!;
    expect(sem.sourceKeys).not.toContain("dpocOxigenio");
    const com = interpretar(gaso({ ph: 7.38, paco2: 60, hco3: 34 }))!;
    expect(com.sourceKeys).toContain("dpocOxigenio");
  });
});
