import { describe, it, expect } from "vitest";
import { MRC_GROUPS, RASS_LEVELS, IMS_LEVELS } from "../data/scores";
import { mrcTotal, classifyMrc, mrcAsymmetry, type Mrc } from "./scores";

// MRC completo com 5 em tudo: o máximo da escala.
const cheio = (): Mrc =>
  Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 5, e: 5 }]));

describe("catálogo dos escores", () => {
  it("tem 6 grupos musculares, testados bilateralmente", () => {
    expect(MRC_GROUPS).toHaveLength(6);
  });

  it("cobre o RASS inteiro, de +4 a -5", () => {
    expect(RASS_LEVELS).toHaveLength(10);
    expect(RASS_LEVELS.map((l) => l.v)).toContain("-5");
    expect(RASS_LEVELS.map((l) => l.v)).toContain("4");
  });

  it("cobre o IMS de 0 a 10", () => {
    expect(IMS_LEVELS).toHaveLength(11);
  });
});

describe("mrcTotal", () => {
  it("soma os 12 valores até o máximo de 60", () => {
    expect(mrcTotal(cheio())).toBe(60);
  });

  it("soma um caso parcial corretamente", () => {
    const m = cheio();
    m[MRC_GROUPS[0].key] = { d: 3, e: 2 };
    expect(mrcTotal(m)).toBe(55);
  });

  // Armadilha 5: ausência de dado não é resultado normal. Soma parcial
  // apresentada como total é dado falso, e aqui viraria "fraqueza" inventada.
  it("devolve null se algum lado não foi medido", () => {
    const m = cheio();
    m[MRC_GROUPS[2].key] = { d: 4, e: null };
    expect(mrcTotal(m)).toBeNull();
  });

  it("devolve null se falta um grupo inteiro", () => {
    const m = cheio();
    delete m[MRC_GROUPS[4].key];
    expect(mrcTotal(m)).toBeNull();
  });

  it("devolve null sem dado nenhum", () => {
    expect(mrcTotal(null)).toBeNull();
    expect(mrcTotal(undefined)).toBeNull();
    expect(mrcTotal({})).toBeNull();
  });

  // MRC 0 é "sem contração": uma medida real, e a mais grave da escala.
  // Uma guarda falsy trataria isto como dado ausente e devolveria null,
  // escondendo a tetraparesia completa em vez de mostrá-la.
  it("soma 12 zeros como total 0, não como ausência de dado", () => {
    const m = Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 0, e: 0 }]));
    expect(mrcTotal(m)).toBe(0);
  });

  it("conta o grau 0 na soma, sem anular o total", () => {
    const m = cheio();
    m[MRC_GROUPS[0].key] = { d: 0, e: 0 };
    expect(mrcTotal(m)).toBe(50);
  });
});

describe("classifyMrc", () => {
  it("abaixo de 48 sinaliza fraqueza adquirida na UTI", () => {
    expect(classifyMrc(47)).toEqual({ s: "danger", t: "Fraqueza adquirida na UTI" });
  });

  it("48 já não é fraqueza: o corte é estrito", () => {
    expect(classifyMrc(48)!.s).not.toBe("danger");
  });

  it("60 é força preservada", () => {
    expect(classifyMrc(60)).toEqual({ s: "ok", t: "Força preservada" });
  });

  it("não classifica o que não foi medido", () => {
    expect(classifyMrc(null)).toBeNull();
  });

  it("classifica o total 0 como fraqueza, não como não medido", () => {
    expect(classifyMrc(0)).toEqual({ s: "danger", t: "Fraqueza adquirida na UTI" });
  });
});

describe("mrcAsymmetry", () => {
  it("aponta o lado mais fraco e a diferença", () => {
    const m = cheio();
    m[MRC_GROUPS[0].key] = { d: 5, e: 2 };
    expect(mrcAsymmetry(m)).toEqual({ lado: "e", delta: 3 });
  });

  it("não aponta assimetria quando os lados empatam", () => {
    expect(mrcAsymmetry(cheio())).toBeNull();
  });

  it("não avalia assimetria com medida faltando", () => {
    const m = cheio();
    m[MRC_GROUPS[1].key] = { d: null, e: 4 };
    expect(mrcAsymmetry(m)).toBeNull();
  });

  it("reconhece o lado com grau 0 como o mais fraco", () => {
    const m = cheio();
    m[MRC_GROUPS[0].key] = { d: 5, e: 0 };
    expect(mrcAsymmetry(m)).toEqual({ lado: "e", delta: 5 });
  });
});
