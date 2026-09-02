import { describe, it, expect } from "vitest";
import {
  classificarDrive, classificarEsforco, estimarEsforco,
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
