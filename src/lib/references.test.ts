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

describe("fontes da gasometria (Fase 6)", () => {
  it("as três chaves novas resolvem para fontes existentes", () => {
    for (const k of ["acidoBase", "anionGap", "dpocOxigenio"] as const) {
      expect(sourcesFor(k).length).toBeGreaterThan(0);
    }
  });

  // O 5,0 da compensação crônica NÃO está em publicação nenhuma: o NEJM dá a
  // faixa 4 a 5 e Martinu mediu 5,1. Atribuí-lo a uma delas seria pôr na tela
  // uma citação que a fonte não sustenta.
  it("o parecer da compensação crônica é Parecer, não Publicacao", () => {
    const r = REFERENCES.find((x) => x.id === "parecer_compensacao_cronica");
    expect(r).toBeDefined();
    expect(ehParecer(r!)).toBe(true);
  });

  it("a regra do pH por 10 mmHg é Parecer: não tem estudo primário", () => {
    const r = REFERENCES.find((x) => x.id === "parecer_ph_por_10");
    expect(r).toBeDefined();
    expect(ehParecer(r!)).toBe(true);
  });

  it("acidoBase cita o parecer do 5,0 junto das duas publicações", () => {
    const ids = sourcesFor("acidoBase").map((r) => r.id);
    expect(ids).toContain("berend_2014");
    expect(ids).toContain("martinu_2003");
    expect(ids).toContain("parecer_compensacao_cronica");
  });

  it("anionGap cita a correção pela albumina", () => {
    expect(sourcesFor("anionGap").map((r) => r.id)).toContain("figge_1998");
  });

  it("dpocOxigenio cita o ensaio que mediu mortalidade", () => {
    expect(sourcesFor("dpocOxigenio").map((r) => r.id)).toContain("austin_2010");
  });
});

describe("fontes da mecânica (Fase 7)", () => {
  it("as três chaves novas resolvem para fontes existentes", () => {
    for (const k of ["drive", "esforco", "recrutabilidade"] as const) {
      expect(sourcesFor(k).length).toBeGreaterThan(0);
    }
  });

  // O 1,5 do P0.1 NÃO está em publicação nenhuma: Telias 2020 publica 1,0.
  // Atribuí-lo ao artigo seria pôr na tela uma citação que a fonte contradiz.
  it("o parecer da faixa do P0.1 é Parecer, não Publicacao", () => {
    const r = REFERENCES.find((x) => x.id === "parecer_p01_faixa");
    expect(r).toBeDefined();
    expect(ehParecer(r!)).toBe(true);
  });

  // Bertoni 2019 valida a CONVERSÃO; a leitura por faixas é prática do mentor.
  it("as faixas de Pmus são Parecer, não Publicacao", () => {
    const r = REFERENCES.find((x) => x.id === "parecer_pmus_faixas");
    expect(r).toBeDefined();
    expect(ehParecer(r!)).toBe(true);
  });

  it("drive cita Telias junto do parecer do limite inferior", () => {
    const ids = sourcesFor("drive").map((r) => r.id);
    expect(ids).toContain("telias_2020");
    expect(ids).toContain("parecer_p01_faixa");
  });

  it("esforco cita Bertoni junto do parecer das faixas", () => {
    const ids = sourcesFor("esforco").map((r) => r.id);
    expect(ids).toContain("bertoni_2019");
    expect(ids).toContain("parecer_pmus_faixas");
  });

  it("recrutabilidade cita o artigo da razão R/I", () => {
    expect(sourcesFor("recrutabilidade").map((r) => r.id)).toContain("chen_2020");
  });
});

describe("fontes do alvo por patologia (Fase 8)", () => {
  it("as três chaves novas resolvem para fontes existentes", () => {
    for (const k of ["obstrutivo", "obesidadeVentilacao", "lesaoCerebral"] as const) {
      expect(sourcesFor(k).length).toBeGreaterThan(0);
    }
  });

  // Ranieri diz 85% e Demoule diz 80%. A tela exibe a faixa e cita as duas:
  // fundir os dois números seria afirmar precisão que a literatura não tem.
  it("obstrutivo cita as duas fontes que divergem no teto do auto-PEEP", () => {
    const ids = sourcesFor("obstrutivo").map((r) => r.id);
    expect(ids).toContain("demoule_2020");
    expect(ids).toContain("ranieri_1993");
  });

  it("obesidadeVentilacao cita o ensaio que testou recrutamento de rotina", () => {
    expect(sourcesFor("obesidadeVentilacao").map((r) => r.id)).toContain("probese_2019");
  });

  it("lesaoCerebral cita o consenso da ESICM", () => {
    expect(sourcesFor("lesaoCerebral").map((r) => r.id)).toContain("robba_2020");
  });

  // A faixa 6-8 no obeso é escolha do mentor: De Jong 2020 recomenda 6 nos
  // dois grupos. Atribuí-la ao artigo seria citar uma fonte que a contradiz.
  it("o parecer do VC no obeso é Parecer, não Publicacao", () => {
    const r = REFERENCES.find((x) => x.id === "parecer_vc_obeso");
    expect(r).toBeDefined();
    expect(ehParecer(r!)).toBe(true);
  });

  // O parecer tem chave PRÓPRIA. Sob `vcKg` ele era citado no rodapé de todo
  // paciente — inclusive embaixo de um card mostrando a faixa 4-6 do não obeso,
  // que ele não sustenta —, porque `vcKg` aparece em rodapés escritos à mão no
  // Dashboard.
  it("o parecer do VC no obeso tem chave própria e não entra em vcKg", () => {
    expect(sourcesFor("vcKgObeso").map((r) => r.id)).toEqual(["parecer_vc_obeso"]);
    expect(sourcesFor("vcKg").map((r) => r.id)).not.toContain("parecer_vc_obeso");
  });

  it("vcKg volta a citar só as duas publicações", () => {
    expect(sourcesFor("vcKg").map((r) => r.id)).toEqual(["ardsnet_2000", "amib_sbpt_2024"]);
  });
});
