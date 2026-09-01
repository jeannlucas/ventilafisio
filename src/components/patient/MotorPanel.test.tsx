import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MotorPanel } from "./MotorPanel";
import { MRC_GROUPS } from "../../data/scores";
import type { DailyEvolution } from "../../types";
import type { Mrc } from "../../lib/scores";

const completa = (): Mrc =>
  Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 4, e: 4 }]));

const evo = (over: Partial<DailyEvolution> = {}): DailyEvolution =>
  ({ id: "e1", recorded_at: "2026-08-29T12:00:00Z", mrc: {}, ...over } as unknown as DailyEvolution);

const renderPanel = (evolutions: DailyEvolution[]) =>
  render(
    <MemoryRouter>
      <MotorPanel evolutions={evolutions} />
    </MemoryRouter>
  );

describe("MotorPanel", () => {
  it("mostra o total e cada grupo muscular da última avaliação completa", () => {
    renderPanel([evo({ mrc: completa() })]);
    expect(screen.getByText("48")).toBeInTheDocument();
    for (const g of MRC_GROUPS) {
      expect(screen.getByText(g.label)).toBeInTheDocument();
    }
  });

  // O caso que motiva o painel: registrou ventilação hoje sem refazer a força.
  it("usa a última avaliação COMPLETA, não a evolução mais recente", () => {
    renderPanel([
      evo({ id: "antiga", recorded_at: "2026-08-28T12:00:00Z", mrc: completa() }),
      evo({ id: "hoje", recorded_at: "2026-08-30T12:00:00Z", mrc: {} }),
    ]);
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText(/28\/08/)).toBeInTheDocument();
  });

  it("aponta assimetria entre os lados", () => {
    const m = completa();
    m[MRC_GROUPS[0].key] = { d: 4, e: 1 };
    renderPanel([evo({ mrc: m })]);
    expect(screen.getByText(/assimetria/i)).toBeInTheDocument();
  });

  it("não renderiza quando não há nenhuma avaliação completa", () => {
    const { container } = renderPanel([evo({ mrc: {} })]);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza sem evolução alguma", () => {
    const { container } = renderPanel([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("cita a fonte do escore", () => {
    renderPanel([evo({ mrc: completa() })]);
    expect(screen.getByText(/De Jonghe/i)).toBeInTheDocument();
  });
});
