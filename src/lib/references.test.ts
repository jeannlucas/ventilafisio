import { describe, it, expect } from "vitest";
import { REFERENCES, ehParecer } from "../data/references";
import { THRESHOLD_SOURCES, sourcesFor, shortCite } from "./references";
import { classify } from "./clinical";

describe("catálogo de referências", () => {
  it("não tem id duplicado", () => {
    const ids = REFERENCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marca toda publicação com o estado de verificação", () => {
    // Parecer não tem `verificada` — ele é a manifestação do mentor, não há
    // revisão pendente sobre a própria opinião dele.
    for (const r of REFERENCES) {
      if (!ehParecer(r)) expect(typeof r.verificada).toBe("boolean");
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

describe("procedência", () => {
  it("distingue parecer clínico de publicação", () => {
    const pareceres = REFERENCES.filter(ehParecer);
    expect(pareceres.length).toBeGreaterThan(0);
    for (const p of pareceres) {
      expect(p).toHaveProperty("profissional");
      expect(p).toHaveProperty("data");
      // Parecer não tem `verificada`: ele É a manifestação do mentor,
      // então não há o que revisar.
      expect(p).not.toHaveProperty("verificada");
    }
  });

  it("não nomeia pessoa real — o repositório é público", () => {
    for (const p of REFERENCES.filter(ehParecer)) {
      expect(p.profissional).toBe("Mentor clínico do projeto");
    }
  });

  it("a driving pressure passa a citar Guérin, que sustenta o corte de 13", () => {
    expect(THRESHOLD_SOURCES.dp).toContain("guerin_2016");
  });

  // Conferência bibliográfica não é endosso clínico. As fontes novas entram
  // como não verificadas até o mentor dizer que aceita.
  it("mantém as fontes novas pendentes de revisão do mentor", () => {
    const novas = REFERENCES.filter((r) =>
      ["guerin_2016", "ferreira_2021", "duan_2021"].includes(r.id)
    );
    expect(novas).toHaveLength(3);
    for (const r of novas) {
      expect(ehParecer(r)).toBe(false);
      if (!ehParecer(r)) expect(r.verificada).toBe(false);
    }
  });

  it("mantém Amato citado no conceito de driving pressure", () => {
    expect(THRESHOLD_SOURCES.dp).toContain("amato_2015");
  });

  it("a triagem de extubação passa a citar a revisão do pico de tosse", () => {
    expect(THRESHOLD_SOURCES.extubation).toContain("ferreira_2021");
  });

  it("a faixa do MRC passa a citar o parecer clínico", () => {
    expect(THRESHOLD_SOURCES.mrc).toContain("parecer_mrc_faixa");
  });
});
