import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MecanicaPanel } from "./MecanicaPanel";
import { statusColor } from "../../lib/theme";
import type { DailyEvolution } from "../../types";

/**
 * O tema guarda cor em hexadecimal; o jsdom devolve estilo inline já
 * normalizado em `rgb(...)`. A conversão fica aqui para que a asserção compare
 * com `statusColor(...)` de verdade, e não com um literal que envelhece calado
 * se o tema mudar de paleta.
 */
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const ev = (over: Partial<DailyEvolution> = {}): DailyEvolution =>
  ({
    id: "e-1", patient_id: "p-1", owner_id: "u-1",
    recorded_at: "2026-09-02T10:00:00Z",
    mode: null, fr: null, vc: null, peep: null, fio2: null,
    ppico: null, pplat: null, flow: null, p01: null, pocc: null,
    ph: null, pao2: null, paco2: null, spo2: null, hco3: null, be: null,
    na: null, cl: null, albumina: null,
    pimax: null, peak_cough_flow: null, glasgow: null, rass: null, ims: null,
    mrc: {}, tre_result: null, hr: null, sbp: null, dbp: null, lactate: null,
    vasopressor: null, notes: null, imaging: {}, iv_meds: {}, feeding: {},
    ...over,
  }) as DailyEvolution;

const montar = (e: DailyEvolution) =>
  render(<MemoryRouter><MecanicaPanel ev={e} /></MemoryRouter>);

describe("MecanicaPanel", () => {
  it("sem P0.1 e sem ΔPocc, avisa em vez de interpretar", () => {
    montar(ev());
    expect(screen.getByTestId("mec-incompleto")).toBeInTheDocument();
    expect(screen.queryByTestId("mec-drive")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mec-esforco")).not.toBeInTheDocument();
    // Fonte sem afirmação acima dela é ruído: o estado vazio não pode citar
    // fonte nenhuma, e este projeto já teve rodapé descolado do que a tela
    // mostrava.
    expect(screen.queryByTestId("mec-fonte")).not.toBeInTheDocument();
  });

  // P0.1 ZERO É MEDIDA, e das graves. Se o painel o tratar como campo vazio,
  // o achado mais sério que este campo pode ter desaparece da tela.
  it("P0.1 zero aparece e é lido como drive baixo", () => {
    montar(ev({ p01: 0 }));
    expect(screen.getByTestId("mec-drive")).toHaveTextContent(/baixo/i);
  });

  it("nomeia o drive elevado", () => {
    montar(ev({ p01: 5 }));
    expect(screen.getByTestId("mec-drive")).toHaveTextContent(/elevado/i);
  });

  // As operating characteristics de Telias foram medidas contra esforço
  // esofágico, não contra desfecho. A tela não pode sugerir o contrário.
  // A asserção é na CLÁUSULA, não na palavra "esforço": ela aparece na frase
  // por outros motivos, e apagar "e não contra desfecho clínico" — que é a
  // ressalva inteira — deixava este teste verde. É essa cláusula que impede a
  // tela de sugerir que a sensibilidade e a especificidade de Telias preveem
  // desfecho do paciente.
  it("diz que o corte do P0.1 foi medido contra esforço, não contra desfecho", () => {
    montar(ev({ p01: 5 }));
    expect(screen.getByTestId("mec-drive-ressalva")).toHaveTextContent(
      /e não contra desfecho clínico/i
    );
  });

  it("mostra o Pmus estimado e a faixa", () => {
    montar(ev({ pocc: -20 }));
    const bloco = screen.getByTestId("mec-esforco");
    expect(bloco).toHaveTextContent("15.0");
    expect(bloco).toHaveTextContent(/elevado/i);
  });

  // O 15 é ênfase de cópia, não uma quarta fronteira: as fronteiras são 4, 8
  // e 12. Essa frase mora de propósito em `mec-esforco-ressalva`, separada do
  // valor em `mec-esforco`, para que nenhum teste do valor a ateste de graça.
  it("na faixa elevada, a ressalva cita 15 e P-SILI", () => {
    montar(ev({ pocc: -20 }));
    const ressalva = screen.getByTestId("mec-esforco-ressalva");
    expect(ressalva).toHaveTextContent("15");
    expect(ressalva).toHaveTextContent(/P-SILI/);
  });

  it("mostra a ΔP_L,dyn quando há pico e PEEP", () => {
    montar(ev({ pocc: -12, ppico: 30, peep: 10 }));
    expect(screen.getByTestId("mec-dpl")).toHaveTextContent("28.0");
  });

  // DECISÃO DE NÃO EXIBIR: o mentor não foi perguntado sobre limiares da
  // ΔP_L,dyn. Se este teste começar a falhar porque alguém classificou o
  // número, a implementação é que está errada.
  it("a ΔP_L,dyn aparece SEM faixa de classificação", () => {
    montar(ev({ pocc: -12, ppico: 30, peep: 10 }));
    expect(screen.getByTestId("mec-dpl"))
      .not.toHaveTextContent(/elevad|adequad|aument|alto|normal/i);
  });

  // O teste acima olha um elemento só, e escopo de elemento não cobre texto
  // escrito logo ao lado dele — foi por isso que a promessa do painel de
  // recrutabilidade ganhou uma asserção de `container.textContent`. O fixture
  // aqui é escolhido de propósito: com Pmus na faixa mais baixa, NENHUM outro
  // texto da tela carrega essas palavras, então o que a asserção de painel
  // inteiro está proibindo é faixa para a ΔP_L,dyn, em qualquer canto.
  it("nenhum canto do painel dá faixa à ΔP_L,dyn", () => {
    const { container } = montar(ev({ pocc: -4, ppico: 30, peep: 10 }));
    expect(screen.getByTestId("mec-dpl")).toHaveTextContent("22.7");
    expect(container.textContent ?? "").not.toMatch(/elevad|adequad|aument|alto|normal/i);
  });

  // A ausência de faixa vem de `caixa(T.dim)`, e T.dim é exatamente
  // `statusColor(null)`. Trocar por `caixa(statusColor(...))` não mudaria UMA
  // LETRA na tela: o número ganharia borda verde, âmbar ou vermelha e todos os
  // testes de texto continuariam verdes. Quem prova a decisão de não
  // classificar é a cor, e por isso ela é asserida aqui.
  it("a ΔP_L,dyn não carrega cor de status", () => {
    montar(ev({ pocc: -12, ppico: 30, peep: 10 }));
    const borda = screen.getByTestId("mec-dpl").style.borderLeftColor;
    expect(borda).toBe(rgb(statusColor(null)));
    for (const s of ["ok", "warn", "danger"] as const) {
      expect(borda).not.toBe(rgb(statusColor(s)));
    }
  });

  it("sem pico não mostra ΔP_L,dyn, mas mostra o Pmus", () => {
    montar(ev({ pocc: -12 }));
    expect(screen.queryByTestId("mec-dpl")).not.toBeInTheDocument();
    expect(screen.getByTestId("mec-esforco")).toBeInTheDocument();
  });

  it("cita as fontes do que exibe", () => {
    montar(ev({ p01: 2, pocc: -10 }));
    const fonte = screen.getByTestId("mec-fonte");
    expect(fonte).toHaveTextContent(/Telias, 2020/);
    expect(fonte).toHaveTextContent(/Bertoni, 2019/);
    expect(fonte).toHaveTextContent(/Parecer clínico \(faixas de Pmus\), 2026/);
  });

  it("sem ΔPocc não cita a fonte do esforço", () => {
    montar(ev({ p01: 2 }));
    const fonte = screen.getByTestId("mec-fonte");
    expect(fonte).toHaveTextContent(/Telias, 2020/);
    expect(fonte).not.toHaveTextContent(/Bertoni, 2019/);
  });

  // Drive adequado (verde) e esforço elevado (vermelho) discordam. O módulo
  // nunca decidiu qual dos dois manda na borda do painel, então a borda não
  // pode sair colorida a favor do drive: o `<section>` do Panel volta à cor
  // padrão (T.line), em vez de assumir a rgba do verde do drive.
  it("com drive e esforço discordantes, a borda não carrega a cor do drive", () => {
    const { container } = montar(ev({ p01: 2, pocc: -20 }));
    expect(screen.getByTestId("mec-drive")).toHaveTextContent(/adequado/i);
    expect(screen.getByTestId("mec-esforco")).toHaveTextContent(/elevado/i);
    const painel = container.querySelector("section") as HTMLElement;
    expect(painel.style.borderColor).toBe("rgb(31, 42, 56)");
  });
});
