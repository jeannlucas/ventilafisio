import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sources from "./Sources";
import { REFERENCES, ehParecer } from "../data/references";

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
      // Publicação mostra o veículo; parecer não tem veículo e mostra a
      // citação curta em seu lugar.
      if (ehParecer(r)) {
        expect(screen.getByText(r.citacaoCurta)).toBeInTheDocument();
      } else {
        expect(screen.getByText(r.veiculo)).toBeInTheDocument();
      }
    }
  });

  it("marca como pendente o que o mentor ainda não verificou", () => {
    renderPage();
    // Parecer não tem `verificada` e nunca mostra "pendente de revisão":
    // a contagem cobre só publicações não verificadas.
    const pendentes = REFERENCES.filter((r) => !ehParecer(r) && !r.verificada);
    expect(screen.getAllByText(/pendente de revis/i)).toHaveLength(pendentes.length);
  });

  it("mostra que o corte de 13 é sustentado por Guérin 2016, não por Amato", () => {
    renderPage();
    expect(
      screen.getByText(/o corte de 13 usado pelo app é sustentado por Guérin 2016/i)
    ).toBeInTheDocument();
  });

  it("mostra qual limiar cada fonte sustenta", () => {
    renderPage();
    // Duas fontes sustentam a Mechanical Power: gattinoni e serpaneto.
    // Valida especificamente a função usos() que popula a linha "Sustenta:",
    // não uma contagem page-wide. Busca elementos que começam com "Sustenta:"
    // e contêm o rótulo correto — descarta matches em titulo/nota/ancestrais.
    const sustentaMp = screen.getAllByText(
      (_, el) =>
        !!el?.textContent?.trim().startsWith("Sustenta:") &&
        /Mechanical Power/i.test(el.textContent)
    );
    expect(sustentaMp).toHaveLength(2);
  });
});
