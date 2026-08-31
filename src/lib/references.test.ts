import { describe, it, expect } from "vitest";
import { REFERENCES } from "../data/references";
import { THRESHOLD_SOURCES, sourcesFor, shortCite } from "./references";
import { classify } from "./clinical";

describe("catálogo de referências", () => {
  it("não tem id duplicado", () => {
    const ids = REFERENCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marca toda referência com o estado de verificação", () => {
    for (const r of REFERENCES) {
      expect(typeof r.verificada).toBe("boolean");
    }
  });
});

// Esta é a garantia que sobrevive a quem escreveu o código: mexeu no limiar
// sem mexer na fonte, a suíte reprova.
describe("cobertura de fonte", () => {
  it("toda classificação de clinical.ts tem fonte registrada", () => {
    for (const k of Object.keys(classify)) {
      expect(THRESHOLD_SOURCES).toHaveProperty(k);
      expect(sourcesFor(k as keyof typeof THRESHOLD_SOURCES).length).toBeGreaterThan(0);
    }
  });

  it("todo id citado existe no catálogo", () => {
    const ids = new Set(REFERENCES.map((r) => r.id));
    for (const citados of Object.values(THRESHOLD_SOURCES)) {
      for (const id of citados) expect(ids).toContain(id);
    }
  });

  it("não deixa referência órfã no catálogo", () => {
    const citados = new Set(Object.values(THRESHOLD_SOURCES).flat());
    for (const r of REFERENCES) expect(citados).toContain(r.id);
  });
});

describe("sourcesFor", () => {
  it("cita as duas fontes da mechanical power: fórmula e corte", () => {
    const ids = sourcesFor("mp").map((r) => r.id);
    expect(ids).toContain("gattinoni_2016");
    expect(ids).toContain("serpaneto_2018");
  });

  it("não inventa fonte para chave desconhecida", () => {
    // @ts-expect-error chave fora do domínio, de propósito
    expect(sourcesFor("naoexiste")).toEqual([]);
  });
});

describe("shortCite", () => {
  it("resume autor e ano para caber no rodapé", () => {
    expect(shortCite(sourcesFor("tobin"))).toBe("Yang & Tobin, 1991");
  });

  it("junta múltiplas fontes com ponto médio", () => {
    expect(shortCite(sourcesFor("mp"))).toBe("Gattinoni, 2016 · Serpa Neto, 2018");
  });

  it("devolve string vazia sem fonte", () => {
    expect(shortCite([])).toBe("");
  });
});
