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
    expect(p.pbw).toBeCloseTo(66.016, 2);
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

  it("deriva as patologias das comorbidades registradas, filtrando as que modulam alvo", () => {
    const p = derivarPerfil(paciente({ comorbidities: ["dpoc", "has"] }));
    expect(p.patologias).toEqual(["dpoc"]);
  });

  it("devolve lista vazia sem comorbidade", () => {
    expect(derivarPerfil(paciente()).patologias).toEqual([]);
  });
});

describe("derivarPerfil: patologias", () => {
  it("filtra para as que modulam alvo", () => {
    const p = derivarPerfil(paciente({ comorbidities: ["dpoc", "has", "dm"] }));
    expect(p.patologias).toEqual(["dpoc"]);
  });

  it("mantém a ordem e aceita mais de uma", () => {
    const p = derivarPerfil(paciente({ comorbidities: ["asma", "dpoc"] }));
    expect(p.patologias).toEqual(["asma", "dpoc"]);
  });

  it("reconhece lesão cerebral aguda", () => {
    const p = derivarPerfil(paciente({ comorbidities: ["lesao_cerebral_aguda"] }));
    expect(p.patologias).toEqual(["lesao_cerebral_aguda"]);
  });

  // "Doença neurológica" pega desde TCE agudo até neuromuscular crônico. O
  // alvo de PaCO₂ vale só para a lesão aguda, e é por isso que ela tem caixa
  // própria.
  it("doença neurológica genérica NÃO é lesão cerebral aguda", () => {
    const p = derivarPerfil(paciente({ comorbidities: ["neuro"] }));
    expect(p.patologias).toEqual([]);
  });

  // A obesidade vem do IMC, não da caixinha: paciente obeso sem a comorbidade
  // marcada continua recebendo a faixa deslocada de volume corrente.
  it("obesidade não entra em patologias, e continua vindo do IMC", () => {
    const p = derivarPerfil(paciente({ comorbidities: ["obesidade"], weight_kg: 120, height_cm: 170 }));
    expect(p.patologias).toEqual([]);
    expect(p.obeso).toBe(true);
  });

  it("sem comorbidade nenhuma, patologias é vazio", () => {
    expect(derivarPerfil(paciente()).patologias).toEqual([]);
  });

  // As onze sem base publicada não modulam NADA, e isso é decisão registrada,
  // não lacuna. Provado na origem: se a chave não entra em `patologias`,
  // nenhuma função de alvo consegue reagir a ela.
  it.each([
    "fibrose", "bronquiectasia", "sahos", "tabagismo", "icc",
    "has", "dm", "drc", "neoplasia", "neuro", "obesidade",
  ])("%s não entra em patologias", (chave) => {
    expect(derivarPerfil(paciente({ comorbidities: [chave] })).patologias).toEqual([]);
  });
});
