import { describe, it, expect } from "vitest";
import { sugerirVc, sugerirPeepFio2, sugerirVentilacao, sugestaoAdmissao } from "./alvos";
import { derivarPerfil } from "./perfil";
import type { PerfilClinico, PatologiaKey } from "./perfil";
import type { Patient } from "../types";

const perfil = (over: Partial<PerfilClinico> = {}): PerfilClinico => ({
  pbw: 70, pbwEstimado: false, obeso: false, obesoIndeterminado: false,
  patologias: [], ...over,
});

const perfilCom = (patologias: PatologiaKey[], over: Partial<PerfilClinico> = {}): PerfilClinico => ({
  pbw: 70, pbwEstimado: false, obeso: false, obesoIndeterminado: false,
  patologias, ...over,
});

// Mesma fixture mínima de perfil.test.ts: só os campos que derivarPerfil lê
// importam para estes testes.
const paciente = (over: Partial<Patient> = {}): Patient =>
  ({
    id: "p1", owner_id: "u1", hospital_id: null, name: "Paciente Teste",
    age: 60, sex: "M", diagnosis: null, comorbidities: [], intubation_date: null,
    airway: null, height_cm: 170, weight_kg: 70, ventilator_id: null,
    current_mode: "VCV", status: "active", discharge_reason: null,
    discharge_date: null, created_at: "", updated_at: "", ...over,
  } as Patient);

describe("sugerirVc", () => {
  it("mantém a faixa de 4 a 6 ml/kg no paciente não obeso", () => {
    const a = sugerirVc(perfil())!;
    expect(a.valor.lowKg).toBe(4);
    expect(a.valor.highKg).toBe(6);
  });

  // Sem modulação, `base` é igual a `valor` e a lista fica vazia.
  it("não declara modulação quando não modulou", () => {
    const a = sugerirVc(perfil())!;
    expect(a.modulacoes).toEqual([]);
    expect(a.base).toEqual(a.valor);
  });

  it("desloca a faixa para 6 a 8 ml/kg no paciente obeso", () => {
    const a = sugerirVc(perfil({ obeso: true }))!;
    expect(a.valor.lowKg).toBe(6);
    expect(a.valor.highKg).toBe(8);
  });

  // O ponto da fase: o número que mudou carrega quem mandou mudar.
  it("declara a modulação da obesidade, com razão e fonte", () => {
    const a = sugerirVc(perfil({ obeso: true }))!;
    expect(a.modulacoes).toHaveLength(1);
    expect(a.modulacoes[0].motivo).toMatch(/obes/i);
    expect(a.modulacoes[0].sourceKey).toBe("vcKg");
  });

  // `base` guarda o que seria sem modulação: é isso que a tela mostra como
  // "padrão seria", e sem ele o avaliador não vê que houve ajuste.
  it("preserva em base o alvo que valeria sem a modulação", () => {
    const a = sugerirVc(perfil({ obeso: true }))!;
    expect(a.base.lowKg).toBe(4);
    expect(a.base.highKg).toBe(6);
  });

  // Não há teste de retorno nulo: PerfilClinico.pbw é sempre número, porque
  // pbwOrEstimate estima pela média populacional quando falta altura. Um
  // teste com pbw: 0 passaria pelo `num()` da implementação antiga (zero é
  // finito) e não provaria nada.

  it("usa a faixa protetora 4 a 6 com alvo 6 para o não obeso (migrado de clinical.test.ts)", () => {
    const a = sugerirVc(perfil({ pbw: 70, obeso: false }));
    expect(a.valor).toMatchObject({ lowKg: 4, highKg: 6, targetKg: 6 });
    expect(a.valor.low).toBe(280);
    expect(a.valor.high).toBe(420);
    expect(a.valor.target).toBe(420);
    expect(a.valor.ml6).toBe(420);
    expect(a.valor.ml8).toBe(560);
  });

  it("usa a faixa 6 a 8 com alvo 7 para o obeso (migrado de clinical.test.ts)", () => {
    const a = sugerirVc(perfil({ pbw: 70, obeso: true }));
    expect(a.valor).toMatchObject({ lowKg: 6, highKg: 8, targetKg: 7 });
    expect(a.valor.low).toBe(420);
    expect(a.valor.high).toBe(560);
    expect(a.valor.target).toBe(490);
  });
});

// ============================================================
// Migrado de clinical.test.ts — sem modulação nesta fase.
// ============================================================
describe("sugerirPeepFio2", () => {
  it("sem gasometria e sem oximetria devolve o preset de admissão", () => {
    const a = sugerirPeepFio2(null, null, perfil(), null);
    expect(a.valor).toEqual({ fio2: 100, peep: 5, faixaPeep: null, presetAdmissao: true });
    expect(a.modulacoes).toEqual([]);
  });

  it("desce na tabela ARDSnet conforme a relação P/F", () => {
    expect(sugerirPeepFio2(350, null, perfil(), null).valor).toMatchObject({ fio2: 30, peep: 5 });
    expect(sugerirPeepFio2(250, null, perfil(), null).valor).toMatchObject({ fio2: 40, peep: 5 });
    expect(sugerirPeepFio2(150, null, perfil(), null).valor).toMatchObject({ fio2: 60, peep: 10 });
    expect(sugerirPeepFio2(50, null, perfil(), null).valor).toMatchObject({ fio2: 80, peep: 14 });
  });

  it("sobe a FiO2 um degrau quando a saturação está abaixo de 90", () => {
    expect(sugerirPeepFio2(350, 85, perfil(), null).valor).toMatchObject({ fio2: 40, peep: 5 });
  });

  it("sem gasometria mas com oximetria parte de FiO2 40", () => {
    expect(sugerirPeepFio2(null, 95, perfil(), null).valor).toMatchObject({
      fio2: 40,
      peep: 5,
      presetAdmissao: false,
    });
  });
});

describe("sugerirVentilacao", () => {
  it("deriva a frequência do volume-minuto de 100 ml por kg de peso predito", () => {
    const a = sugerirVentilacao(70, 420)!;
    expect(a.valor.veL).toBeCloseTo(7, 6);
    expect(a.valor.fr).toBe(17);
  });

  it("limita a frequência ao piso de 12", () => {
    expect(sugerirVentilacao(70, 1000)!.valor.fr).toBe(12);
  });

  it("limita a frequência ao teto de 35", () => {
    expect(sugerirVentilacao(70, 100)!.valor.fr).toBe(35);
  });

  it("devolve null sem peso predito ou sem volume alvo", () => {
    expect(sugerirVentilacao(null, 420)).toBeNull();
    expect(sugerirVentilacao(70, null)).toBeNull();
  });
});

describe("sugestaoAdmissao", () => {
  it("com altura e peso completos não sinaliza estimativa", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 170, weight_kg: 70 }));
    const s = sugestaoAdmissao(p, null, null, "PCV");
    expect(s.pbwEstimado).toBe(false);
    expect(s.obesoIndeterminado).toBe(false);
    expect(s.obeso).toBe(false);
    expect(s.modo).toBe("PCV");
  });

  it("sem altura estima o peso predito e sinaliza", () => {
    const p = derivarPerfil(paciente({ sex: "F", height_cm: null, weight_kg: null }));
    const s = sugestaoAdmissao(p, null, null, null);
    expect(s.pbwEstimado).toBe(true);
    expect(s.obesoIndeterminado).toBe(true);
    expect(s.modo).toBe("VCV");
  });

  it("assume a faixa protetora quando não há IMC", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 170, weight_kg: null }));
    const s = sugestaoAdmissao(p, null, null, null);
    expect(s.obesoIndeterminado).toBe(true);
    expect(s.obeso).toBe(false);
    expect(s.vc.valor).toMatchObject({ lowKg: 4, highKg: 6 });
  });

  it("reconhece o obeso pelo IMC e estende a faixa de volume", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 170, weight_kg: 95 }));
    const s = sugestaoAdmissao(p, null, null, null);
    expect(s.obeso).toBe(true);
    expect(s.vc.valor).toMatchObject({ lowKg: 6, highKg: 8 });
  });

  // Defeito B2 (histórico): altura zero produzia IMC infinito e classificava
  // como obeso, estendendo o alvo de volume corrente para 6 a 8 ml/kg.
  it("altura impossível não classifica o paciente como obeso", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 0, weight_kg: 70 }));
    const s = sugestaoAdmissao(p, null, null, null);
    expect(s.obeso).toBe(false);
    expect(s.obesoIndeterminado).toBe(true);
  });
});

describe("sugerirPeepFio2 por patologia", () => {
  it("sem patologia, devolve a tabela ARDSnet e nenhuma modulação", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom([]), null);
    expect(a.valor.peep).toBe(10);
    expect(a.valor.faixaPeep).toBeNull();
    expect(a.modulacoes).toEqual([]);
  });

  // A tabela daria 10; a asma limita a 5. Direção OPOSTA à do DPOC.
  it("asma limita a PEEP a 5", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["asma"]), null);
    expect(a.valor.peep).toBe(5);
    expect(a.base.peep).toBe(10);
    expect(a.modulacoes.length).toBe(1);
    expect(a.modulacoes[0].sourceKey).toBe("obstrutivo");
  });

  it("asma não eleva a PEEP quando a tabela já dá menos de 5", () => {
    const a = sugerirPeepFio2(400, 98, perfilCom(["asma"]), null);
    expect(a.valor.peep).toBe(5);
  });

  // Sem auto-PEEP medido o aplicativo NÃO tem número de PEEP para o DPOC.
  // Devolver o da tabela seria afirmar que ela se aplica, e ela não se aplica.
  it("DPOC sem auto-PEEP não produz número de PEEP", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), null);
    expect(a.valor.peep).toBeNull();
    expect(a.valor.faixaPeep).toBeNull();
    expect(a.modulacoes.length).toBe(1);
  });

  // 80 a 85% de 10 = 8 a 8,5. A FAIXA, não um número: Ranieri diz 85% e
  // Demoule diz 80%, e fundir os dois esconderia a divergência.
  it("DPOC com auto-PEEP produz a faixa de 80 a 85% dele", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), 10);
    expect(a.valor.peep).toBeNull();
    expect(a.valor.faixaPeep).toEqual({ min: 8, max: 8.5 });
  });

  // Auto-PEEP ZERO é medida: ausência de aprisionamento. A faixa é 0 a 0, e
  // isso é resultado, não dado faltando.
  it("auto-PEEP zero produz faixa zero, não ausência de faixa", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), 0);
    expect(a.valor.faixaPeep).toEqual({ min: 0, max: 0 });
  });

  // Duas patologias marcadas: prevalece o teto mais conservador, e a
  // modulação declara as duas. Não é precedência clínica — é a recusa de
  // escolher entre duas quando ninguém decidiu.
  it("asma e DPOC juntas aplicam o teto da asma e declaram as duas", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc", "asma"]), 10);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.faixaPeep).toBeNull();
    expect(a.modulacoes.some((m) => /asma/i.test(m.motivo) && /DPOC/i.test(m.motivo))).toBe(true);
  });

  it("o preset de admissão continua valendo sem gasometria nem oximetria", () => {
    const a = sugerirPeepFio2(null, null, perfilCom([]), null);
    expect(a.valor.presetAdmissao).toBe(true);
  });
});
