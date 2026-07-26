import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const db = {
  lastInsert: null as Record<string, unknown> | null,
  insertError: null as { message: string } | null,
};

vi.mock("../lib/supabase", () => ({
  supabaseConfigured: true,
  supabase: {
    from() {
      const chain: Record<string, unknown> = {
        select: () => chain,
        order: () => chain,
        eq: () => chain,
        insert: (values: Record<string, unknown>) => {
          db.lastInsert = values;
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: db.insertError ? null : { id: "novo-paciente" },
                  error: db.insertError,
                }),
            }),
          };
        },
        then: (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }),
      };
      return chain;
    },
  },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

vi.mock("../lib/hospital", () => ({
  useHospital: () => ({
    activeHospitalId: "h-1",
    activeHospital: { id: "h-1", name: "Hospital Teste" },
    loading: false,
  }),
}));

import AdmitPatient from "./AdmitPatient";

function renderAdmit() {
  return render(
    <MemoryRouter>
      <AdmitPatient />
    </MemoryRouter>
  );
}

beforeEach(() => {
  db.lastInsert = null;
  db.insertError = null;
});

describe("admissão de paciente", () => {
  it("admite com dados plausíveis", async () => {
    renderAdmit();
    await userEvent.type(screen.getByLabelText(/nome/i), "Fulano");
    await userEvent.type(screen.getByLabelText(/altura/i), "170");
    await userEvent.type(screen.getByLabelText(/peso/i), "70");
    await userEvent.click(screen.getByRole("button", { name: /admitir paciente/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(db.lastInsert).toMatchObject({ height_cm: 170, weight_kg: 70 });
  });

  // Altura zero era a entrada que produzia IMC infinito, classificava o
  // paciente como obeso e estendia o alvo de volume corrente para 6-8 ml/kg.
  it("recusa altura zero e não admite", async () => {
    renderAdmit();
    await userEvent.type(screen.getByLabelText(/nome/i), "Fulano");
    await userEvent.type(screen.getByLabelText(/altura/i), "0");
    await userEvent.click(screen.getByRole("button", { name: /admitir paciente/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/altura/i);
    expect(db.lastInsert).toBeNull();
  });

  it("recusa peso negativo e não admite", async () => {
    renderAdmit();
    await userEvent.type(screen.getByLabelText(/nome/i), "Fulano");
    await userEvent.type(screen.getByLabelText(/peso/i), "-5");
    await userEvent.click(screen.getByRole("button", { name: /admitir paciente/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/peso/i);
    expect(db.lastInsert).toBeNull();
  });

  it("admite sem altura e sem peso, que continuam opcionais", async () => {
    renderAdmit();
    await userEvent.type(screen.getByLabelText(/nome/i), "Fulano");
    await userEvent.click(screen.getByRole("button", { name: /admitir paciente/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(db.lastInsert).toMatchObject({ height_cm: null, weight_kg: null });
  });

  it("mostra a falha do banco em vez de sumir com o clique", async () => {
    db.insertError = { message: "permission denied" };
    renderAdmit();
    await userEvent.type(screen.getByLabelText(/nome/i), "Fulano");
    await userEvent.click(screen.getByRole("button", { name: /admitir paciente/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission denied/i);
  });
});
