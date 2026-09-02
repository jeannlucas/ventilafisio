import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MecanicaPanel } from "./MecanicaPanel";
import type { DailyEvolution } from "../../types";

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
  it("diz que o corte do P0.1 foi medido contra esforço, não contra desfecho", () => {
    montar(ev({ p01: 5 }));
    expect(screen.getByTestId("mec-drive-ressalva")).toHaveTextContent(/esforço/i);
  });

  it("mostra o Pmus estimado e a faixa", () => {
    montar(ev({ pocc: -20 }));
    const bloco = screen.getByTestId("mec-esforco");
    expect(bloco).toHaveTextContent("15");
    expect(bloco).toHaveTextContent(/elevado/i);
  });

  it("mostra a ΔP_L,dyn quando há pico e PEEP", () => {
    montar(ev({ pocc: -12, ppico: 30, peep: 10 }));
    expect(screen.getByTestId("mec-dpl")).toHaveTextContent("28");
  });

  // DECISÃO DE NÃO EXIBIR: o mentor não foi perguntado sobre limiares da
  // ΔP_L,dyn. Se este teste começar a falhar porque alguém classificou o
  // número, a implementação é que está errada.
  it("a ΔP_L,dyn aparece SEM faixa de classificação", () => {
    montar(ev({ pocc: -12, ppico: 30, peep: 10 }));
    expect(screen.getByTestId("mec-dpl"))
      .not.toHaveTextContent(/elevad|adequad|aument|alto|normal/i);
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
});
