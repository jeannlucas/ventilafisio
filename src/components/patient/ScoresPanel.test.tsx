import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ScoresPanel } from "./ScoresPanel";
import { MRC_GROUPS } from "../../data/scores";
import type { Mrc } from "../../lib/scores";

const cheio = (): Mrc =>
  Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 5, e: 5 }]));

const renderPanel = (mrc: Mrc) =>
  render(
    <MemoryRouter>
      <ScoresPanel
        mrc={mrc}
        onMrc={vi.fn()}
        rass=""
        onRass={vi.fn()}
        ims=""
        onIms={vi.fn()}
      />
    </MemoryRouter>
  );

describe("ScoresPanel", () => {
  it("mostra os seis grupos musculares", () => {
    renderPanel({});
    for (const g of MRC_GROUPS) {
      expect(screen.getByText(g.label)).toBeInTheDocument();
    }
  });

  it("mostra o total quando os 12 valores estão preenchidos", () => {
    renderPanel(cheio());
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText(/força preservada/i)).toBeInTheDocument();
  });

  // Armadilha 5: soma parcial exibida como total é dado falso.
  it("não mostra total com medida faltando", () => {
    const m = cheio();
    m[MRC_GROUPS[0].key] = { d: 5, e: null };
    renderPanel(m);
    expect(screen.queryByText("55")).not.toBeInTheDocument();
    expect(screen.getByText(/incompleto/i)).toBeInTheDocument();
  });

  it("avisa quando há assimetria entre os lados", () => {
    const m = cheio();
    m[MRC_GROUPS[0].key] = { d: 5, e: 2 };
    renderPanel(m);
    expect(screen.getByText(/assimetria/i)).toBeInTheDocument();
  });

  it("cita a fonte do escore no rodapé", () => {
    renderPanel(cheio());
    expect(screen.getByText(/De Jonghe/i)).toBeInTheDocument();
  });

  // Seis grupos com campo rotulado "D" e seis com "E" ficam ambíguos para
  // leitor de tela e para getByLabelText sem um nome acessível próprio.
  it("dá nome acessível único a cada lado de cada grupo do MRC", () => {
    renderPanel({});
    for (const g of MRC_GROUPS) {
      expect(screen.getByLabelText(`${g.label} — direita`)).toBeInTheDocument();
      expect(screen.getByLabelText(`${g.label} — esquerda`)).toBeInTheDocument();
    }
  });
});
