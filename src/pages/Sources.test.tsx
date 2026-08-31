import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sources from "./Sources";
import { REFERENCES } from "../data/references";

const renderPage = () =>
  render(
    <MemoryRouter>
      <Sources />
    </MemoryRouter>
  );

describe("página de fontes", () => {
  it("lista todas as referências do catálogo", () => {
    renderPage();
    for (const r of REFERENCES) {
      expect(screen.getByText(r.veiculo)).toBeInTheDocument();
    }
  });

  it("marca como pendente o que o mentor ainda não verificou", () => {
    renderPage();
    const pendentes = REFERENCES.filter((r) => !r.verificada);
    expect(screen.getAllByText(/pendente de revis/i)).toHaveLength(pendentes.length);
  });

  it("mostra a ressalva de que Amato 2015 não define o corte de 13", () => {
    renderPage();
    expect(screen.getByText(/NÃO define o corte de 13/i)).toBeInTheDocument();
  });

  it("mostra qual limiar cada fonte sustenta", () => {
    renderPage();
    // Duas fontes sustentam a Mechanical Power: gattinoni (titulo, nota,
    // Sustenta) e serpaneto (titulo, Sustenta). São cinco ocorrências no total.
    expect(screen.getAllByText(/Mechanical Power/i)).toHaveLength(5);
  });
});
