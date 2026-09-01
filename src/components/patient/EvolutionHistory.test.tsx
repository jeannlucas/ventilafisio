import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvolutionHistory } from "./EvolutionHistory";
import { MRC_GROUPS } from "../../data/scores";
import type { DailyEvolution } from "../../types";
import type { Mrc } from "../../lib/scores";

const completa = (): Mrc =>
  Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 4, e: 4 }]));

const evo = (over: Partial<DailyEvolution> = {}): DailyEvolution =>
  ({
    id: "e1", patient_id: "p1", owner_id: "u1",
    recorded_at: "2026-08-30T12:00:00Z",
    mrc: {}, rass: null, ims: null, notes: null,
    imaging: {}, iv_meds: {}, feeding: {},
    ...over,
  } as unknown as DailyEvolution);

const renderHist = (evolutions: DailyEvolution[]) =>
  render(<EvolutionHistory evolutions={evolutions} authors={{ u1: "Fisio de Teste" }} />);

describe("EvolutionHistory — escores do dia", () => {
  it("mostra MRC, RASS e IMS registrados naquele dia", () => {
    renderHist([evo({ mrc: completa(), rass: -2, ims: 3 })]);
    expect(screen.getByText(/MRC 48/)).toBeInTheDocument();
    expect(screen.getByText(/RASS −2/)).toBeInTheDocument();
    expect(screen.getByText(/IMS 3/)).toBeInTheDocument();
  });

  // Zero é medida. Um dia com RASS 0 e IMS 0 mostra os dois, não os esconde.
  it("mostra RASS 0 e IMS 0 como medidas", () => {
    renderHist([evo({ rass: 0, ims: 0 })]);
    expect(screen.getByText(/RASS 0/)).toBeInTheDocument();
    expect(screen.getByText(/IMS 0/)).toBeInTheDocument();
  });

  it("não mostra escore que não foi registrado", () => {
    renderHist([evo()]);
    expect(screen.queryByText(/MRC/)).not.toBeInTheDocument();
    expect(screen.queryByText(/RASS/)).not.toBeInTheDocument();
    expect(screen.queryByText(/IMS/)).not.toBeInTheDocument();
  });

  // MRC incompleto não vira total parcial: mrcTotal devolve null.
  it("não mostra MRC quando a avaliação está incompleta", () => {
    const parcial = completa();
    parcial[MRC_GROUPS[0].key] = { d: 4, e: null };
    renderHist([evo({ mrc: parcial })]);
    expect(screen.queryByText(/MRC/)).not.toBeInTheDocument();
  });
});
