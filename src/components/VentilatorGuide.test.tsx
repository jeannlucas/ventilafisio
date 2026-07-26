import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VentilatorGuide from "./VentilatorGuide";
import type { Ventilator } from "../types";

// Teste de contrato do que o guia renderiza, no lugar da rede visual que a
// auditoria pede antes de mexer em código existente (toda tela do app exige
// login real, então screenshot não era viável).
// O corpo do componente veio de pages/PatientDetail.tsx sem alteração, exceto
// o travessão do aviso "Conteúdo não validado", trocado por vírgula.
const VENTILADOR: Ventilator = {
  id: "v-1",
  brand: "Magnamed",
  model: "Oxymag",
  modes: ["VCV", "PCV"],
  param_labels: { vc: "Volume", peep: "PEEP" },
  handling: {
    iniciar: ["Ligar o aparelho", "Escolher o modo"],
    ajuste_vc: "Ajuste o Volume no encoder principal.",
  },
  notes: "Conteúdo inicial",
  verified: false,
};

describe("VentilatorGuide", () => {
  it("identifica marca, modelo e modo atual", () => {
    render(<VentilatorGuide vent={VENTILADOR} mode="VCV" />);
    expect(screen.getByText("Magnamed Oxymag")).toBeInTheDocument();
    expect(screen.getByText(/modo atual: VCV/)).toBeInTheDocument();
  });

  it("mostra traço quando não há modo definido", () => {
    render(<VentilatorGuide vent={VENTILADOR} mode={null} />);
    expect(screen.getByText(/modo atual: —/)).toBeInTheDocument();
  });

  it("avisa quando o conteúdo não foi validado", () => {
    render(<VentilatorGuide vent={VENTILADOR} mode={null} />);
    expect(screen.getByText(/conteúdo não validado/i)).toBeInTheDocument();
  });

  it("omite o aviso quando o conteúdo foi validado", () => {
    render(<VentilatorGuide vent={{ ...VENTILADOR, verified: true }} mode={null} />);
    expect(screen.queryByText(/conteúdo não validado/i)).not.toBeInTheDocument();
  });

  it("traduz a nomenclatura do aparelho", () => {
    render(<VentilatorGuide vent={VENTILADOR} mode={null} />);
    expect(screen.getByText("Volume")).toBeInTheDocument();
    expect(screen.getByText("PEEP")).toBeInTheDocument();
  });

  it("lista o passo a passo inicial", () => {
    render(<VentilatorGuide vent={VENTILADOR} mode={null} />);
    expect(screen.getByText("Ligar o aparelho")).toBeInTheDocument();
    expect(screen.getByText("Escolher o modo")).toBeInTheDocument();
  });

  it("mostra as dicas de manuseio com o rótulo legível", () => {
    render(<VentilatorGuide vent={VENTILADOR} mode={null} />);
    expect(screen.getByText("ajuste vc:")).toBeInTheDocument();
    expect(
      screen.getByText(/Ajuste o Volume no encoder principal/)
    ).toBeInTheDocument();
  });

  it("aguenta um aparelho sem passo a passo e sem dicas", () => {
    render(
      <VentilatorGuide vent={{ ...VENTILADOR, handling: {} }} mode={null} />
    );
    expect(screen.getByText("Magnamed Oxymag")).toBeInTheDocument();
  });
});
