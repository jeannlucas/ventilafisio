import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ---------- Estado controlável do banco falso ----------
const db = {
  patient: null as Record<string, unknown> | null,
  patientError: null as { message: string } | null,
  ventilators: [] as Record<string, unknown>[],
  evolutions: [] as Record<string, unknown>[],
  asynchronies: [] as Record<string, unknown>[],
  updateError: null as { message: string } | null,
  insertError: null as { message: string } | null,
  deleteError: null as { message: string } | null,
  lastUpdate: null as Record<string, unknown> | null,
  lastInsert: null as Record<string, unknown> | null,
  deletedFrom: [] as string[],
};

function rowsOf(table: string) {
  if (table === "ventilators") return { data: db.ventilators, error: null };
  if (table === "daily_evolutions") return { data: db.evolutions, error: null };
  if (table === "asynchronies") return { data: db.asynchronies, error: null };
  return { data: [], error: null };
}

vi.mock("../lib/supabase", () => ({
  supabaseConfigured: true,
  isSupabaseConfigured: () => true,
  supabase: {
    from(table: string) {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        single: () =>
          Promise.resolve(
            table === "patients"
              ? { data: db.patient, error: db.patientError }
              : { data: null, error: null }
          ),
        update: (values: Record<string, unknown>) => {
          db.lastUpdate = values;
          return { eq: () => Promise.resolve({ error: db.updateError }) };
        },
        insert: (values: Record<string, unknown>) => {
          db.lastInsert = values;
          return Promise.resolve({ error: db.insertError });
        },
        delete: () => ({
          eq: () => {
            db.deletedFrom.push(table);
            return Promise.resolve({ error: db.deleteError });
          },
        }),
        then: (resolve: (v: unknown) => unknown) => resolve(rowsOf(table)),
      };
      return chain;
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1" } },
    profile: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

import PatientDetail from "./PatientDetail";

const PACIENTE_BASE = {
  id: "p-1",
  owner_id: "user-1",
  hospital_id: "h-1",
  name: "Paciente Teste",
  age: 60,
  sex: "M",
  diagnosis: "SDRA",
  height_cm: 170,
  weight_kg: 70,
  comorbidities: [],
  ventilator_id: null,
  current_mode: "VCV",
  active: true,
  status: "active",
  discharge_reason: null,
  discharge_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/paciente/p-1"]}>
      <Routes>
        <Route path="/paciente/:id" element={<PatientDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  db.patient = { ...PACIENTE_BASE };
  db.patientError = null;
  db.ventilators = [];
  db.evolutions = [];
  db.asynchronies = [];
  db.updateError = null;
  db.insertError = null;
  db.deleteError = null;
  db.lastUpdate = null;
  db.lastInsert = null;
  db.deletedFrom = [];
  // jsdom não implementa a área de transferência.
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

// ============================================================
// C2: paciente inacessível travava em "Carregando…" para sempre
// ============================================================
describe("carga do paciente", () => {
  it("mostra o paciente quando a carga funciona", async () => {
    renderDetail();
    expect(await screen.findByText("Paciente Teste")).toBeInTheDocument();
  });

  it("informa a falha em vez de ficar carregando para sempre", async () => {
    db.patient = null;
    db.patientError = { message: "row not found" };
    renderDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /não foi possível abrir este paciente/i
    );
    expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
  });

  it("trata paciente inexistente sem erro explícito do banco", async () => {
    db.patient = null;
    db.patientError = null;
    renderDetail();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// C1: altura e peso só podiam ser informados na admissão, e a tela
// pedia para informá-los depois
// ============================================================
describe("edição dos dados do paciente", () => {
  it("oferece campos de altura e peso na edição", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));

    expect(screen.getByLabelText(/altura/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/peso/i)).toBeInTheDocument();
  });

  it("grava a altura corrigida", async () => {
    db.patient = { ...PACIENTE_BASE, height_cm: null };
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    await userEvent.type(screen.getByLabelText(/altura/i), "180");
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(db.lastUpdate).toMatchObject({ height_cm: 180 });
  });

  it("recusa altura impossível e não grava", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    const altura = screen.getByLabelText(/altura/i);
    await userEvent.clear(altura);
    await userEvent.type(altura, "0");
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/altura/i);
    expect(db.lastUpdate).toBeNull();
  });
});

// ============================================================
// C3: erro de escrita era descartado, o botão simplesmente não fazia nada
// ============================================================
describe("erro de escrita", () => {
  it("mostra a falha ao salvar os dados do paciente", async () => {
    db.updateError = { message: "permission denied" };
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission denied/i);
  });

  it("mostra a falha ao arquivar o paciente", async () => {
    db.updateError = { message: "permission denied" };
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /dar alta/i }));
    await userEvent.click(screen.getByRole("button", { name: /extubação/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission denied/i);
  });
});

// ============================================================
// A2: link de plantão era permanente e não havia como revogar
// ============================================================
describe("compartilhamento", () => {
  it("avisa o prazo de validade ao gerar o link", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /compartilhar/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(await screen.findByText(/7 dias/i)).toBeInTheDocument();
  });

  it("revoga links pendentes e acessos já concedidos", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /revogar acessos/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirmar revoga/i }));

    await waitFor(() => expect(db.deletedFrom).toContain("patient_shares"));
    expect(db.deletedFrom).toContain("patient_access");
  });

  it("mostra a falha quando o banco recusa a revogação", async () => {
    db.deleteError = { message: "permission denied" };
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /revogar acessos/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirmar revoga/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission denied/i);
  });

  it("não revoga nada sem a confirmação", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /revogar acessos/i }));
    expect(db.deletedFrom).toEqual([]);
  });
});

// ============================================================
// C5: o formulário aceitava qualquer número, inclusive o impossível
// ============================================================
describe("validação da evolução", () => {
  it("bloqueia FiO2 impossível e não grava", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.type(screen.getByLabelText(/FiO₂/), "500");
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/FiO₂/);
    expect(db.lastInsert).toBeNull();
  });

  it("bloqueia platô abaixo da PEEP, que produzia driving pressure negativa", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.type(screen.getByLabelText(/P\. platô/), "10");
    await userEvent.type(screen.getByLabelText(/PEEP/), "18");
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/platô/i);
    expect(db.lastInsert).toBeNull();
  });

  it("grava quando os valores são plausíveis", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.type(screen.getByLabelText(/FiO₂/), "40");
    await userEvent.type(screen.getByLabelText(/PEEP/), "8");
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(db.lastInsert).toMatchObject({ fio2: 40, peep: 8 });
  });

  it("não marca vasopressor como avaliado quando ninguém tocou no chip", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(db.lastInsert!.vasopressor).toBeNull();
  });
});
