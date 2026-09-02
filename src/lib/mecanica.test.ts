import { describe, it, expect } from "vitest";
import {
  classificarDrive, classificarEsforco, estimarEsforco, calcularRi,
  type RecrutabilidadeEntrada,
} from "./mecanica";

describe("classificarDrive", () => {
  // ZERO É MEDIDA, E GRAVE: ausência de drive. Nunca "sem dado".
  it("P0.1 zero é drive baixo, não dado faltando", () => {
    expect(classificarDrive(0)).toBe("baixo");
  });

  it("abaixo de 1,5 é baixo", () => {
    expect(classificarDrive(1.2)).toBe("baixo");
  });

  it("1,5 exato já é adequado", () => {
    expect(classificarDrive(1.5)).toBe("adequado");
  });

  it("3,5 exato ainda é adequado", () => {
    expect(classificarDrive(3.5)).toBe("adequado");
  });

  it("acima de 3,5 é elevado", () => {
    expect(classificarDrive(4)).toBe("elevado");
  });

  it("sem medida devolve null", () => {
    expect(classificarDrive(null)).toBeNull();
  });
});

describe("classificarEsforco", () => {
  // As fronteiras vêm do parecer do mentor: 4, 8 e 12. As bordas que ele
  // escreveu eram difusas ("< 3-4", "> 12-15") e código precisa de número.
  it("abaixo de 4 é muito baixo", () => {
    expect(classificarEsforco(3.9)).toBe("muito_baixo");
  });

  it("4 exato já é adequado", () => {
    expect(classificarEsforco(4)).toBe("adequado");
  });

  it("8 exato já é aumentado", () => {
    expect(classificarEsforco(8)).toBe("aumentado");
  });

  it("12 exato já é elevado", () => {
    expect(classificarEsforco(12)).toBe("elevado");
  });

  it("Pmus zero é muito baixo, não dado faltando", () => {
    expect(classificarEsforco(0)).toBe("muito_baixo");
  });
});

describe("estimarEsforco", () => {
  it("converte o ΔPocc em Pmus", () => {
    const e = estimarEsforco(-10, null, null)!;
    expect(e.pmus).toBeCloseTo(7.5, 5);
    expect(e.faixa).toBe("adequado");
  });

  // O sinal do que foi gravado não pode mudar a leitura: alguns serviços
  // anotam o módulo, outros o valor negativo.
  it("o sinal do ΔPocc não muda o Pmus", () => {
    expect(estimarEsforco(10, null, null)!.pmus)
      .toBeCloseTo(estimarEsforco(-10, null, null)!.pmus, 5);
  });

  // ΔPocc zero em paciente que dispara é esforço não detectado: medida, não
  // ausência. Mesmo formato do BE zero da Fase 6.
  it("ΔPocc zero produz Pmus zero e faixa muito baixa", () => {
    const e = estimarEsforco(0, null, null)!;
    expect(e.pmus).toBe(0);
    expect(e.faixa).toBe("muito_baixo");
  });

  it("ΔPocc de -20 cai na faixa elevada", () => {
    expect(estimarEsforco(-20, null, null)!.faixa).toBe("elevado");
  });

  it("sem ΔPocc não há esforço estimado", () => {
    expect(estimarEsforco(null, 30, 10)).toBeNull();
  });

  it("calcula a ΔP_L,dyn quando há pico e PEEP", () => {
    expect(estimarEsforco(-12, 30, 10)!.dpLDinamica).toBeCloseTo(28, 5);
  });

  // Sem pico ou sem PEEP a estimativa de estresse não existe, mas o Pmus
  // continua: são duas perguntas diferentes.
  it("sem pico ou sem PEEP, a ΔP_L,dyn é null e o Pmus permanece", () => {
    const e = estimarEsforco(-12, null, 10)!;
    expect(e.dpLDinamica).toBeNull();
    expect(e.pmus).toBeCloseTo(9, 5);
  });
});

const manobra = (over: Partial<RecrutabilidadeEntrada> = {}): RecrutabilidadeEntrada => ({
  passivo: true,
  fechamentoViaAerea: false,
  pressaoAbertura: null,
  peepAlta: 15,
  peepBaixa: 5,
  volumeExpiradoExtra: 450,
  pplatBaixa: 20,
  vcBaixa: 450,
  ...over,
});

describe("calcularRi", () => {
  // C_baixa = 450/(20-5) = 30; V_inflado = 30×10 = 300;
  // V_recrutado = 450-300 = 150; R/I = 150/300 = 0,5.
  it("calcula a razão pela fórmula de Chen", () => {
    const r = calcularRi(manobra())!;
    expect(r.cBaixa).toBeCloseTo(30, 5);
    expect(r.vInflado).toBeCloseTo(300, 5);
    expect(r.vRecrutado).toBeCloseTo(150, 5);
    expect(r.ri).toBeCloseTo(0.5, 5);
  });

  // R/I zero é RESULTADO: não recrutou nada. Diferente de manobra não feita.
  it("R/I zero é resultado, não ausência", () => {
    const r = calcularRi(manobra({ volumeExpiradoExtra: 300 }))!;
    expect(r.ri).toBe(0);
  });

  // Com fechamento de via aérea a PEEP baixa efetiva é a pressão de ABERTURA.
  // Sem essa substituição a conta erra exatamente no paciente em que ela mais
  // importa: aqui daria 0,5 em vez de 5/7.
  it("usa a pressão de abertura quando há fechamento de via aérea", () => {
    const r = calcularRi(manobra({ fechamentoViaAerea: true, pressaoAbertura: 8 }))!;
    expect(r.peepBaixaEfetiva).toBe(8);
    expect(r.ri).toBeCloseTo(5 / 7, 5);
    expect(r.ri).not.toBeCloseTo(0.5, 2);
  });

  it("sem pressão de abertura declarada, o fechamento não pode ser aplicado", () => {
    expect(calcularRi(manobra({ fechamentoViaAerea: true, pressaoAbertura: null })))
      .toBeNull();
  });

  // A manobra exige paciente passivo. Não sendo, não há número a devolver.
  it("paciente não passivo não produz razão", () => {
    expect(calcularRi(manobra({ passivo: false }))).toBeNull();
  });

  it("sem saber se é passivo, não produz razão", () => {
    expect(calcularRi(manobra({ passivo: null }))).toBeNull();
  });

  it("falta de qualquer medida devolve null", () => {
    expect(calcularRi(manobra({ vcBaixa: null }))).toBeNull();
    expect(calcularRi(manobra({ pplatBaixa: null }))).toBeNull();
    expect(calcularRi(manobra({ volumeExpiradoExtra: null }))).toBeNull();
  });

  // Divisão por zero produz Infinity, que passa por isNaN e chegaria à tela
  // como se fosse número.
  it("ΔPEEP não positivo devolve null", () => {
    expect(calcularRi(manobra({ peepAlta: 5 }))).toBeNull();
  });

  it("complacência não positiva devolve null", () => {
    expect(calcularRi(manobra({ pplatBaixa: 5 }))).toBeNull();
  });

  // O tipo não tem onde guardar um veredito, e isto prende essa decisão.
  it("não devolve veredito de recrutabilidade", () => {
    const r = calcularRi(manobra())!;
    expect(r).not.toHaveProperty("recrutavel");
    expect(r).not.toHaveProperty("veredito");
  });
});
