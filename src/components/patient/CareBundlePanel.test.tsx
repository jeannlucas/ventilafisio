import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CareBundlePanel } from "./CareBundlePanel";
import type { CareAction } from "../../types";

const db = { lastInsert: null as Record<string, unknown> | null, insertError: null as { message: string } | null };

vi.mock("../../lib/supabase", () => ({
  supabaseConfigured: true,
  isSupabaseConfigured: () => true,
  supabase: {
    from: () => ({
      insert: (values: Record<string, unknown>) => {
        db.lastInsert = values;
        return Promise.resolve({ error: db.insertError });
      },
    }),
  },
}));

beforeEach(() => {
  db.lastInsert = null;
  db.insertError = null;
});

const acao = (over: Partial<CareAction> = {}): CareAction => ({
  id: "a1",
  patient_id: "p1",
  owner_id: "u1",
  action: "aspiracao_tot",
  at: "2026-08-31T08:12:00.000Z",
  note: null,
  ...over,
});

const renderPanel = (actions: CareAction[] = []) =>
  render(
    <MemoryRouter>
      <CareBundlePanel
        patientId="p1"
        ownerId="u1"
        actions={actions}
        authors={{ u1: "Fisio de Teste" }}
        onChange={vi.fn()}
      />
    </MemoryRouter>
  );

describe("CareBundlePanel", () => {
  it("oferece as ações do bundle", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /aspiração de tot/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cuffometria/i })).toBeInTheDocument();
  });

  it("grava a CHAVE do catálogo, não o rótulo", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /aspiração de tot/i }));
    await waitFor(() => {
      expect(db.lastInsert).toMatchObject({
        patient_id: "p1",
        owner_id: "u1",
        action: "aspiracao_tot",
      });
    });
  });

  it("lista o que já foi feito, com hora e autor", () => {
    renderPanel([acao()]);
    // O rótulo aparece tanto no botão do catálogo quanto na linha do
    // histórico; escopar em cuidados-historico evita o falso "múltiplos
    // elementos" quando os dois textos coincidem.
    const historico = within(screen.getByTestId("cuidados-historico"));
    expect(historico.getByText(/aspiração de tot/i)).toBeInTheDocument();
    expect(historico.getByText(/Fisio de Teste/)).toBeInTheDocument();
  });

  it("conta as repetições da mesma ação", () => {
    renderPanel([acao({ id: "a1" }), acao({ id: "a2" }), acao({ id: "a3" })]);
    expect(screen.getByText("3×")).toBeInTheDocument();
  });

  it("avisa quando o registro falha, em vez de fingir sucesso", async () => {
    const user = userEvent.setup();
    db.insertError = { message: "sem permissão" };
    renderPanel();
    await user.click(screen.getByRole("button", { name: /higiene oral/i }));
    await waitFor(() => {
      expect(screen.getByText(/sem permiss/i)).toBeInTheDocument();
    });
  });
});
