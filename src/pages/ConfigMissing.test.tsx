import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfigMissing from "./ConfigMissing";

// Antes deste conserto, faltar .env.local dava tela branca: a mensagem
// existia, mas só no console do navegador.
describe("ConfigMissing", () => {
  it("diz na tela que falta configuração, em vez de não renderizar nada", () => {
    render(<ConfigMissing />);
    expect(screen.getByRole("heading")).toHaveTextContent(/configura/i);
  });

  it("nomeia as duas variáveis que precisam ser preenchidas", () => {
    render(<ConfigMissing />);
    expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_ANON_KEY/)).toBeInTheDocument();
  });

  it("diz qual arquivo criar", () => {
    render(<ConfigMissing />);
    expect(screen.getByText(/\.env\.local/)).toBeInTheDocument();
  });
});
