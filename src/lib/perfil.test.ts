import { describe, it, expect } from "vitest";
import { derivarPerfil } from "./perfil";
import type { Patient } from "../types";

const paciente = (over: Partial<Patient> = {}): Patient =>
  ({
    id: "p1", owner_id: "u1", hospital_id: null, name: "Paciente Teste",
    age: 60, sex: "M", diagnosis: null, comorbidities: [], intubation_date: null,
    airway: null, height_cm: 170, weight_kg: 70, ventilator_id: null,
    current_mode: "VCV", status: "active", discharge_reason: null,
    discharge_date: null, created_at: "", updated_at: "", ...over,
  } as Patient);

describe("derivarPerfil", () => {
  it("calcula o peso predito a partir da altura", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 170 }));
    expect(p.pbw).toBeCloseTo(65.99, 1);
    expect(p.pbwEstimado).toBe(false);
  });

  it("estima o peso predito e sinaliza quando não há altura", () => {
    const p = derivarPerfil(paciente({ height_cm: null }));
    expect(p.pbwEstimado).toBe(true);
  });

  it("marca obeso quando o IMC alcança 30", () => {
    // 95 kg e 1,70 m dão IMC ~32,9
    const p = derivarPerfil(paciente({ height_cm: 170, weight_kg: 95 }));
    expect(p.obeso).toBe(true);
    expect(p.obesoIndeterminado).toBe(false);
  });

  // Sem IMC não dá para afirmar que não é obeso. Assumir a faixa protetora é
  // seguro, mas o app precisa saber que assumiu — armadilha 5 do projeto.
  it("sinaliza quando não dá para saber se é obeso", () => {
    const p = derivarPerfil(paciente({ weight_kg: null }));
    expect(p.obeso).toBe(false);
    expect(p.obesoIndeterminado).toBe(true);
  });

  it("deriva as patologias das comorbidades registradas", () => {
    const p = derivarPerfil(paciente({ comorbidities: ["dpoc", "has"] }));
    expect(p.patologias).toEqual(["dpoc", "has"]);
  });

  it("devolve lista vazia sem comorbidade", () => {
    expect(derivarPerfil(paciente()).patologias).toEqual([]);
  });
});
