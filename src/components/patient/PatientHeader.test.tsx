import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PatientHeader } from "./PatientHeader";
import type { Patient } from "../../types";

vi.mock("../../lib/supabase", () => ({
  supabaseConfigured: true,
  isSupabaseConfigured: () => true,
  supabase: { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) },
}));

const paciente = (over: Partial<Patient> = {}): Patient =>
  ({
    id: "p1", owner_id: "u1", hospital_id: null, name: "Paciente Teste",
    age: 60, sex: "M", diagnosis: null, comorbidities: [], intubation_date: null,
    airway: null, height_cm: 170, weight_kg: 70, ventilator_id: null,
    current_mode: "VCV", status: "active", discharge_reason: null,
    discharge_date: null, created_at: "", updated_at: "", ...over,
  } as Patient);

const renderHeader = (rassAtual: number | null, over: Partial<Patient> = {}) =>
  render(
    <PatientHeader
      patient={paciente(over)}
      vent={undefined}
      ventilators={[]}
      onUpdate={vi.fn()}
      rassAtual={rassAtual}
    />
  );

describe("PatientHeader — chip de RASS", () => {
  it("mostra o RASS atual como chip", () => {
    renderHeader(-2);
    expect(screen.getByText(/RASS −2/)).toBeInTheDocument();
  });

  // RASS 0 é "alerta e calmo": medida real, e a mais relevante para decidir
  // se o paciente participa de mobilização. Uma checagem falsy a apagaria.
  it("mostra RASS 0, que é medida e não ausência", () => {
    renderHeader(0);
    expect(screen.getByText(/RASS 0/)).toBeInTheDocument();
  });

  it("não mostra chip de RASS quando não há RASS", () => {
    renderHeader(null);
    expect(screen.queryByText(/RASS/)).not.toBeInTheDocument();
  });

  it("mostra o contexto do paciente junto do RASS", () => {
    renderHeader(-2, { comorbidities: ["dpoc"], airway: "tot" });
    expect(screen.getByText("DPOC")).toBeInTheDocument();
    expect(screen.getByText("TOT")).toBeInTheDocument();
    expect(screen.getByText(/RASS −2/)).toBeInTheDocument();
  });
});
