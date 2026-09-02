# Fase 7 — Mecânica, esforço e recrutabilidade: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development
> (recomendado) ou superpowers:executing-plans para executar este plano tarefa a
> tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** medir e interpretar drive e esforço do paciente (P0.1, ΔPocc,
Pmus, ΔP_L,dyn) e registrar a manobra de recrutabilidade, com cada número
citando a fonte que o sustenta e sem emitir veredito onde a literatura não
sustenta um.

**Arquitetura:** um módulo puro `src/lib/mecanica.ts` faz todo o cálculo; dois
painéis desenham o que ele devolve. As medidas pontuais (P0.1, ΔPocc) são
colunas na evolução diária; a manobra de recrutabilidade é tabela própria com
desfecho, do mesmo desenho do `tre_sessions` da Fase 5. Pmus e ΔP_L,dyn são
derivadas e **nunca gravadas**.

**Stack:** Vite + React 18 + TypeScript, Vitest + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-02-fase7-mecanica-esforco-recrutabilidade-design.md`
**Pesquisa clínica:** `docs/dossie-clinico-fase7.md`

## Restrições globais

- **pnpm, nunca npm.** `pnpm test` roda a suíte; `pnpm build` roda
  `tsc --noEmit && vite build`. Um arquivo: `pnpm vitest run <caminho>`.
- **Base de partida: 444 testes em 25 arquivos, verdes, build limpo.**
- **`tsconfig.json` não inclui os tipos de Node.** `node:fs` e `__dirname`
  passam no vitest e **quebram o `pnpm build`**.
- **Repositório PÚBLICO.** Sem segredo, sem dado real de paciente. Fixture é
  sempre inventada. Parecer clínico é sempre
  `profissional: "Mentor clínico do projeto"`, nunca um nome real.
- **Comentários, texto de tela e nome de teste em português.**
- **Commits:** Conventional Commits em português, imperativo, até 72
  caracteres, sem emoji, sem `Co-Authored-By`, sem rodapé de IA, sem travessão.
- **Não refatorar `PatientDetail.tsx`** (~1000 linhas, 10 componentes). Desvio
  registrado e aceito.
- **`SourceKey` é união fechada**; `THRESHOLD_SOURCES` e o `LABELS` de
  `src/pages/Sources.tsx` são `Record<SourceKey, …>` e exaustivos. Chave nova
  sem rótulo quebra o `tsc`.
- **Nenhuma lógica clínica nos componentes.** Todo número exibido vem de um
  campo devolvido por `src/lib/mecanica.ts`.
- **Ausência de dado não é resultado normal.** Guarda é o `num()` do módulo
  (`Number.isFinite`), nunca teste de veracidade. **Zero é valor clínico
  legítimo** em P0.1, em ΔPocc e no R/I.
- **O aplicativo não diz se o paciente é recrutável.** Nunca.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/data/references.ts` | 3 publicações e 2 pareceres novos |
| `src/lib/references.ts` | chaves `drive`, `esforco`, `recrutabilidade` |
| `src/pages/Sources.tsx` | rótulo das 3 chaves |
| `src/types/index.ts` | `p01` e `pocc` em `DailyEvolution`; tipos da manobra |
| `src/lib/measurement-limits.ts` | plausibilidade de `p01` e `pocc` |
| `supabase/schema.sql` | 2 colunas e a tabela `recruitment_maneuvers` |
| `src/lib/mecanica.ts` | drive, esforço e R/I |
| `src/components/patient/MecanicaPanel.tsx` | painel de drive e esforço |
| `src/components/patient/RecrutabilidadePanel.tsx` | manobra, três estados |
| `src/pages/PatientDetail.tsx` | campos no formulário e montagem dos painéis |

---

### Task 1: Fontes e chaves

**Files:**
- Modify: `src/data/references.ts`
- Modify: `src/lib/references.ts`
- Modify: `src/pages/Sources.tsx`
- Test: `src/lib/references.test.ts`

**Interfaces:**
- Produces: as chaves `"drive"`, `"esforco"` e `"recrutabilidade"` em
  `SourceKey`, usadas pelas Tasks 3, 5, 6 e 7.

Existe um teste que proíbe referência órfã: toda entrada do catálogo precisa
ser citada por pelo menos uma chave. Catálogo e chaves entram no mesmo commit.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao fim de `src/lib/references.test.ts`, seguindo o estilo do arquivo:

```ts
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
```

Confira no topo do arquivo se `REFERENCES`, `ehParecer` e `sourcesFor` já estão
importados; se faltar algum, acrescente ao import existente.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/references.test.ts`
Esperado: FALHA. As chaves não existem em `SourceKey`, então o TypeScript
reclama e os testes não passam.

- [ ] **Step 3: Acrescentar as publicações**

Em `src/data/references.ts`, no array `REFERENCES`, antes das entradas de
`Parecer` que já estão no fim:

```ts
  {
    id: "telias_2020",
    citacaoCurta: "Telias, 2020",
    autores:
      "Telias I, Junhasavasdikul D, Rittayamai N, Piquilloud L, Chen L, Ferguson ND, Goligher EC, Brochard L",
    titulo:
      "Airway Occlusion Pressure As an Estimate of Respiratory Drive and Inspiratory Effort during Assisted Ventilation",
    veiculo: "Am J Respir Crit Care Med 2020;201(9):1086-1098",
    ano: 2020,
    verificada: true,
    nota:
      "P0.1 acima de 3,5 cmH₂O sugere esforço elevado (sensibilidade 80%, especificidade 77%). O limite INFERIOR publicado é 1,0, não 1,5. As duas medidas foram feitas contra esforço esofágico (PTPmus/min ≥ 200), não contra desfecho clínico.",
  },
  {
    id: "bertoni_2019",
    citacaoCurta: "Bertoni, 2019",
    autores:
      "Bertoni M, Telias I, Urner M, Long M, Del Sorbo L, Fan E, Sinderby C, Beck J, Liu L, Qiu H, Wong J, Slutsky AS, Ferguson ND, Brochard L, Goligher EC",
    titulo:
      "A novel non-invasive method to detect excessively high respiratory effort and dynamic transpulmonary driving pressure during mechanical ventilation",
    veiculo: "Critical Care 2019;23:346",
    ano: 2019,
    verificada: true,
    nota:
      "Valida a oclusão expiratória como estimativa de esforço: Pmus ≈ 0,75 × |ΔPocc| e ΔP_L,dyn ≈ ΔPaw + 2/3 × |ΔPocc|. Coorte pequena: 16 pacientes na derivação e 12 na validação externa. Valida a CONVERSÃO, não faixas de interpretação.",
  },
  {
    id: "chen_2020",
    citacaoCurta: "Chen, 2020",
    autores:
      "Chen L, Del Sorbo L, Grieco DL, Junhasavasdikul D, Rittayamai N, Soliman I, Sklar MC, Rauseo M, Ferguson ND, Fan E, Richard JCM, Brochard L",
    titulo:
      "Potential for Lung Recruitment Estimated by the Recruitment-to-Inflation Ratio in Acute Respiratory Distress Syndrome. A Clinical Trial",
    veiculo: "Am J Respir Crit Care Med 2020;201(2):178-187",
    ano: 2020,
    verificada: true,
    nota:
      "Introduz a razão R/I. O valor de 0,5 que circula como corte é a MEDIANA da coorte de derivação (n = 45), usada ali para dicotomizar a análise: não é ponto de corte validado contra desfecho. O erro de medida em torno de 0,5 é da ordem da distância entre os limiares propostos na literatura.",
  },
```

- [ ] **Step 4: Acrescentar os dois pareceres**

No mesmo array, junto dos pareceres que já existem:

```ts
  {
    id: "parecer_p01_faixa",
    citacaoCurta: "Parecer clínico (faixa do P0.1), 2026",
    profissional: "Mentor clínico do projeto",
    data: "02/09/2026",
    nota:
      "O limite inferior de 1,5 cmH₂O é escolha clínica, reafirmada depois de ver que Telias 2020 publica 1,0 (sensibilidade 100%, especificidade 92% para esforço baixo). O limite superior de 3,5 é o publicado.",
  },
  {
    id: "parecer_pmus_faixas",
    citacaoCurta: "Parecer clínico (faixas de Pmus), 2026",
    profissional: "Mentor clínico do projeto",
    data: "02/09/2026",
    nota:
      "A leitura do Pmus estimado por faixas (muito baixo abaixo de 4, adequado de 4 a 8, aumentado de 8 a 12, elevado acima de 12) é prática dele. Bertoni 2019 valida a conversão do ΔPocc em Pmus, não estas faixas.",
  },
```

- [ ] **Step 5: Acrescentar as chaves**

Em `src/lib/references.ts`, na união `SourceKey`, depois das chaves da
gasometria:

```ts
  // mecânica: drive, esforço e recrutabilidade
  | "drive" | "esforco" | "recrutabilidade";
```

E em `THRESHOLD_SOURCES`:

```ts
  drive: ["telias_2020", "parecer_p01_faixa"],
  esforco: ["bertoni_2019", "parecer_pmus_faixas"],
  recrutabilidade: ["chen_2020"],
```

- [ ] **Step 6: Acrescentar os rótulos**

Em `src/pages/Sources.tsx`, no `LABELS`:

```ts
  drive: "Drive respiratório pelo P0.1",
  esforco: "Esforço inspiratório e pressão transpulmonar dinâmica",
  recrutabilidade: "Recrutabilidade pela razão R/I",
```

- [ ] **Step 7: Rodar tudo**

Run: `pnpm test` e `pnpm build`
Esperado: verde, 444 + 6 testes. Se o teste de referência órfã reprovar, alguma
entrada nova não está citada por chave nenhuma.

- [ ] **Step 8: Commit**

```bash
git add src/data/references.ts src/lib/references.ts src/lib/references.test.ts src/pages/Sources.tsx
git commit -m "feat(mecanica): cataloga as fontes de drive e recrutabilidade"
```

---

### Task 2: Os dois campos novos

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/measurement-limits.ts`
- Modify: `src/pages/PatientDetail.tsx` (`EV_FIELDS` ~460, `EV_SECTIONS` ~485)
- Modify: `supabase/schema.sql`
- Test: `src/lib/measurement-limits.test.ts`

**Interfaces:**
- Produces: `p01` e `pocc` em `DailyEvolution`, os dois `number | null`.
  Consumidos pelas Tasks 3, 6 e 8.

**As duas armadilhas desta tarefa, e elas são opostas.**

**P0.1 é positivo e ZERO É VALOR VÁLIDO E GRAVE**: significa ausência de drive.
Pôr `ACIMA_DE_ZERO` aqui barraria justamente o achado mais sério que este campo
pode ter.

**ΔPocc é NEGATIVO por definição** — é a deflexão abaixo da PEEP. Pôr `min: 0`
aqui barraria toda medida que existe, exatamente como `min: 0` barraria todo BE
de paciente acidótico.

São os dois erros de reflexo mais prováveis da fase, e são em direções
contrárias no mesmo commit.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/lib/measurement-limits.test.ts`:

```ts
describe("mecânica da Fase 7", () => {
  // P0.1 zero é ausência de drive: medida real e grave, não campo vazio.
  it("aceita P0.1 zero", () => {
    expect(invalidMeasurements({ p01: "0" })).toEqual([]);
  });

  it("aceita P0.1 positivo", () => {
    expect(invalidMeasurements({ p01: "2.5" })).toEqual([]);
  });

  it("barra P0.1 negativo", () => {
    expect(invalidMeasurements({ p01: "-1" }).length).toBe(1);
  });

  // ΔPocc é negativo por definição. Um piso em zero rejeitaria toda medida.
  it("aceita ΔPocc negativo", () => {
    expect(invalidMeasurements({ pocc: "-12" })).toEqual([]);
  });

  it("aceita ΔPocc zero", () => {
    expect(invalidMeasurements({ pocc: "0" })).toEqual([]);
  });

  it("barra ΔPocc positivo", () => {
    expect(invalidMeasurements({ pocc: "5" }).length).toBe(1);
  });

  it("barra ΔPocc fisicamente impossível", () => {
    expect(invalidMeasurements({ pocc: "-90" }).length).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/measurement-limits.test.ts`
Esperado: FALHA nos três testes de reprovação. Sem entrada no mapa,
`invalidMeasurements` ignora o campo em silêncio e devolve lista vazia — é por
isso que os testes de aceitação sozinhos não provariam nada.

- [ ] **Step 3: Acrescentar os limites**

Em `src/lib/measurement-limits.ts`, em `MEASUREMENT_LIMITS`, depois do bloco de
gasometria:

```ts
  // Esforço e drive
  // P0.1 é positivo por convenção de tela, e ZERO É VALOR VÁLIDO E GRAVE:
  // ausência de drive. Nunca ACIMA_DE_ZERO aqui.
  p01: { min: 0, max: 30 },
  // ΔPocc é NEGATIVO por definição: deflexão abaixo da PEEP. Piso em zero
  // rejeitaria toda medida real, como `min: 0` rejeitaria todo BE de paciente
  // acidótico. Cerca de plausibilidade, não faixa clínica.
  pocc: { min: -60, max: 0 },
```

- [ ] **Step 4: Acrescentar aos tipos**

Em `src/types/index.ts`, em `DailyEvolution`, junto dos parâmetros de
ventilação:

```ts
  p01: number | null;
  pocc: number | null;
```

- [ ] **Step 5: Acrescentar ao formulário**

Em `src/pages/PatientDetail.tsx`, em `EV_FIELDS`, depois de
`{ k: "flow", label: "Fluxo", unit: "L/min" }`:

```ts
  { k: "p01", label: "P0.1", unit: "cmH₂O" },
  { k: "pocc", label: "ΔPocc", unit: "cmH₂O" },
```

E em `EV_SECTIONS`, acrescente as duas chaves ao fim da lista de
`"Parâmetros do ventilador"`:

```ts
  { title: "Parâmetros do ventilador", color: T.accent, keys: ["fr", "vc", "peep", "fio2", "ppico", "pplat", "flow", "p01", "pocc"] },
```

O payload do `save` é montado percorrendo `EV_FIELDS`, então os dois campos
passam a ser gravados sem mudança no `save`. **Confirme isso lendo o código
antes de seguir**; se o payload for montado por lista explícita, acrescente os
dois lá.

- [ ] **Step 6: Acrescentar as colunas ao schema**

Em `supabase/schema.sql`, junto dos outros `alter table ... add column if not
exists` de `daily_evolutions`:

```sql
-- Esforço e drive da Fase 7. `pocc` é NEGATIVO por definição (deflexão abaixo
-- da PEEP); `p01` é positivo e zero significa ausência de drive.
alter table public.daily_evolutions add column if not exists p01 numeric;
alter table public.daily_evolutions add column if not exists pocc numeric;
```

- [ ] **Step 7: Rodar tudo**

Run: `pnpm test` e `pnpm build`
Esperado: verde. Fixtures de `DailyEvolution` sem cast podem quebrar por campo
faltando — acrescente os dois como `null`, **não** torne os campos opcionais no
tipo.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/lib/measurement-limits.ts src/lib/measurement-limits.test.ts src/pages/PatientDetail.tsx supabase/schema.sql
git commit -m "feat(mecanica): captura P0.1 e delta Pocc na evolucao"
```

Se algum arquivo de teste precisou dos dois campos nas fixtures, acrescente-o
ao `git add` com caminho explícito e diga quais no relatório.

---

### Task 3: Drive e esforço

**Files:**
- Create: `src/lib/mecanica.ts`
- Create: `src/lib/mecanica.test.ts`

**Interfaces:**
- Produces: `FaixaDrive`, `FaixaEsforco`, `Esforco`, `classificarDrive`,
  `classificarEsforco`, `estimarEsforco`. Consumidos pelas Tasks 5, 6 e 8.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/lib/mecanica.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  classificarDrive, classificarEsforco, estimarEsforco,
} from "./mecanica";

describe("classificarDrive", () => {
  // ZERO É MEDIDA, E GRAVE: ausência de drive. Nunca "sem dado".
  it("P0.1 zero é drive baixo, não dado faltando", () => {
    expect(classificarDrive(0)).toBe("baixo");
  });

  it("abaixo de 1,5 é baixo", () => {
    expect(classificarDrive(1.2)).toBe("baixo");
  });

  it("1,5 exato já é adequado", () => {
    expect(classificarDrive(1.5)).toBe("adequado");
  });

  it("3,5 exato ainda é adequado", () => {
    expect(classificarDrive(3.5)).toBe("adequado");
  });

  it("acima de 3,5 é elevado", () => {
    expect(classificarDrive(4)).toBe("elevado");
  });

  it("sem medida devolve null", () => {
    expect(classificarDrive(null)).toBeNull();
  });
});

describe("classificarEsforco", () => {
  // As fronteiras vêm do parecer do mentor: 4, 8 e 12. As bordas que ele
  // escreveu eram difusas ("< 3-4", "> 12-15") e código precisa de número.
  it("abaixo de 4 é muito baixo", () => {
    expect(classificarEsforco(3.9)).toBe("muito_baixo");
  });

  it("4 exato já é adequado", () => {
    expect(classificarEsforco(4)).toBe("adequado");
  });

  it("8 exato já é aumentado", () => {
    expect(classificarEsforco(8)).toBe("aumentado");
  });

  it("12 exato já é elevado", () => {
    expect(classificarEsforco(12)).toBe("elevado");
  });

  it("Pmus zero é muito baixo, não dado faltando", () => {
    expect(classificarEsforco(0)).toBe("muito_baixo");
  });
});

describe("estimarEsforco", () => {
  it("converte o ΔPocc em Pmus", () => {
    const e = estimarEsforco(-10, null, null)!;
    expect(e.pmus).toBeCloseTo(7.5, 5);
    expect(e.faixa).toBe("adequado");
  });

  // O sinal do que foi gravado não pode mudar a leitura: alguns serviços
  // anotam o módulo, outros o valor negativo.
  it("o sinal do ΔPocc não muda o Pmus", () => {
    expect(estimarEsforco(10, null, null)!.pmus)
      .toBeCloseTo(estimarEsforco(-10, null, null)!.pmus, 5);
  });

  // ΔPocc zero em paciente que dispara é esforço não detectado: medida, não
  // ausência. Mesmo formato do BE zero da Fase 6.
  it("ΔPocc zero produz Pmus zero e faixa muito baixa", () => {
    const e = estimarEsforco(0, null, null)!;
    expect(e.pmus).toBe(0);
    expect(e.faixa).toBe("muito_baixo");
  });

  it("ΔPocc de -20 cai na faixa elevada", () => {
    expect(estimarEsforco(-20, null, null)!.faixa).toBe("elevado");
  });

  it("sem ΔPocc não há esforço estimado", () => {
    expect(estimarEsforco(null, 30, 10)).toBeNull();
  });

  it("calcula a ΔP_L,dyn quando há pico e PEEP", () => {
    expect(estimarEsforco(-12, 30, 10)!.dpLDinamica).toBeCloseTo(28, 5);
  });

  // Sem pico ou sem PEEP a estimativa de estresse não existe, mas o Pmus
  // continua: são duas perguntas diferentes.
  it("sem pico ou sem PEEP, a ΔP_L,dyn é null e o Pmus permanece", () => {
    const e = estimarEsforco(-12, null, 10)!;
    expect(e.dpLDinamica).toBeNull();
    expect(e.pmus).toBeCloseTo(9, 5);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/mecanica.test.ts`
Esperado: FALHA, o módulo não existe.

- [ ] **Step 3: Implementar**

Crie `src/lib/mecanica.ts`:

```ts
// ============================================================
// Mecânica: drive, esforço e recrutabilidade — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Conversões de Bertoni 2019; faixas de interpretação são parecer do mentor.
// ============================================================

// Number.isFinite e não isNaN: uma divisão por zero produz Infinity, que passa
// por isNaN e chegaria às classificações como se fosse medida válida.
const num = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v);

export type FaixaDrive = "baixo" | "adequado" | "elevado";

/** Faixa do P0.1. O 3,5 é de Telias 2020; o 1,5 é parecer do mentor. */
export const FAIXA_P01 = { min: 1.5, max: 3.5 } as const;

/**
 * Drive respiratório pelo P0.1.
 *
 * ZERO É MEDIDA, e das graves: significa ausência de drive. Nunca tratar como
 * dado faltando — é a armadilha nº 5 do projeto num campo onde o valor mais
 * sério é justamente o menor.
 *
 * As operating characteristics de Telias 2020 (sensibilidade 80%,
 * especificidade 77% acima de 3,5) foram medidas contra esforço esofágico, não
 * contra desfecho clínico. A tela diz isso.
 */
export function classificarDrive(p01: number | null): FaixaDrive | null {
  if (!num(p01)) return null;
  if (p01 < FAIXA_P01.min) return "baixo";
  if (p01 > FAIXA_P01.max) return "elevado";
  return "adequado";
}

export type FaixaEsforco = "muito_baixo" | "adequado" | "aumentado" | "elevado";

/**
 * Fronteiras da leitura do Pmus, em cmH₂O. Parecer do mentor (02/09/2026).
 *
 * Ele escreveu as bordas de forma difusa ("< 3-4", "> 12-15") e código precisa
 * de número: 4, 8 e 12 produzem quatro faixas contíguas sem buraco. O 15 do
 * texto dele NÃO é uma quarta fronteira — aparece na frase como o ponto onde a
 * preocupação fica mais forte, dentro da faixa `elevado`, e é isso que a tela
 * diz.
 */
export const FRONTEIRAS_PMUS = { adequado: 4, aumentado: 8, elevado: 12 } as const;

export function classificarEsforco(pmus: number): FaixaEsforco {
  if (pmus < FRONTEIRAS_PMUS.adequado) return "muito_baixo";
  if (pmus < FRONTEIRAS_PMUS.aumentado) return "adequado";
  if (pmus < FRONTEIRAS_PMUS.elevado) return "aumentado";
  return "elevado";
}

export interface Esforco {
  /** Sempre positivo, qualquer que seja o sinal do ΔPocc gravado. */
  pmus: number;
  faixa: FaixaEsforco;
  /** Estimativa de estresse pulmonar. SEM FAIXA: o mentor não foi consultado. */
  dpLDinamica: number | null;
}

const COEF_PMUS = 0.75;
const COEF_DPL = 2 / 3;

/**
 * Esforço inspiratório a partir da oclusão expiratória (Bertoni 2019).
 *
 *   Pmus       = 0,75 × |ΔPocc|
 *   ΔP_L,dyn   = (P_pico − PEEP) + 2/3 × |ΔPocc|
 *
 * O MÓDULO do ΔPocc é deliberado: a deflexão é negativa por definição, mas
 * alguns serviços anotam o valor absoluto. O sinal do que foi digitado não
 * pode mudar a leitura clínica.
 *
 * Nada disto é gravado. Guardamos ΔPocc, P_pico e PEEP e recalculamos na
 * exibição: se um coeficiente mudar por decisão do mentor, o histórico inteiro
 * se corrige sozinho, em vez de ficar com números velhos cristalizados no banco
 * afirmando o que a versão anterior achava.
 */
export function estimarEsforco(
  pocc: number | null,
  ppico: number | null,
  peep: number | null
): Esforco | null {
  if (!num(pocc)) return null;
  const modulo = Math.abs(pocc);
  const pmus = COEF_PMUS * modulo;
  const dpLDinamica =
    num(ppico) && num(peep) ? ppico - peep + COEF_DPL * modulo : null;
  return { pmus, faixa: classificarEsforco(pmus), dpLDinamica };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run src/lib/mecanica.test.ts`
Esperado: PASSA, 18 testes.

- [ ] **Step 5: Provar que os testes podem falhar**

Troque `if (!num(p01)) return null;` por `if (!p01) return null;`.
Run: `pnpm vitest run src/lib/mecanica.test.ts`
Esperado: FALHA em "P0.1 zero é drive baixo" — é exatamente a armadilha que o
teste existe para pegar. Reverta.

Depois troque `Math.abs(pocc)` por `pocc`.
Esperado: FALHA em "o sinal do ΔPocc não muda o Pmus" e nas faixas. Reverta.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mecanica.ts src/lib/mecanica.test.ts
git commit -m "feat(mecanica): classifica drive e estima esforco inspiratorio"
```

---

### Task 4: A tabela da manobra

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `RecruitmentManeuver` e `ManobraDesfecho` em `src/types/index.ts`,
  consumidos pelas Tasks 5, 7 e 8.

**Esta tarefa não tem teste, e isso está correto.** Ela declara SQL e tipos, e
`tsc --noEmit` é a verificação. **Nenhum teste deste projeto executa o
`schema.sql`** — não há banco no ambiente de desenvolvimento, e o diff é a única
revisão que este DDL recebe antes de chegar a um banco com dado de paciente.

- [ ] **Step 1: Acrescentar a tabela ao schema**

Em `supabase/schema.sql`, depois do bloco de `tre_sessions`, no mesmo formato:

```sql
-- ---------- RECRUITMENT_MANEUVERS (manobra de recrutabilidade) ----------
-- `desfecho` nulo significa EM ANDAMENTO, e não dado faltando — mesma
-- convenção de tre_sessions.
-- 'abortada' é a manobra que não pôde ser feita (paciente não passivo);
-- 'inconclusiva' é a que foi feita e não produziu número. As duas são
-- diferentes de 'concluida', e nenhuma delas é falha do paciente.
create table if not exists public.recruitment_maneuvers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  realizada_em timestamptz not null default now(),
  passivo boolean,
  fechamento_via_aerea boolean,
  pressao_abertura numeric,
  peep_alta numeric,
  peep_baixa numeric,
  volume_expirado_extra numeric,
  pplat_baixa numeric,
  vc_baixa numeric,
  desfecho text check (desfecho is null or desfecho in ('concluida','abortada','inconclusiva')),
  motivo text,
  created_at timestamptz not null default now()
);

alter table public.recruitment_maneuvers enable row level security;

drop policy if exists "recruitment_select_member" on public.recruitment_maneuvers;
create policy "recruitment_select_member"
  on public.recruitment_maneuvers for select using (public.can_access_patient(patient_id));
drop policy if exists "recruitment_insert_member" on public.recruitment_maneuvers;
create policy "recruitment_insert_member"
  on public.recruitment_maneuvers for insert with check (public.can_access_patient(patient_id) and auth.uid() = owner_id);
drop policy if exists "recruitment_update_member" on public.recruitment_maneuvers;
create policy "recruitment_update_member"
  on public.recruitment_maneuvers for update using (public.can_access_patient(patient_id));
drop policy if exists "recruitment_delete_member" on public.recruitment_maneuvers;
create policy "recruitment_delete_member"
  on public.recruitment_maneuvers for delete using (public.can_access_patient(patient_id));

create index if not exists idx_recruitment_patient
  on public.recruitment_maneuvers (patient_id, realizada_em desc);
```

- [ ] **Step 2: Acrescentar os tipos**

Em `src/types/index.ts`, depois dos tipos do TRE:

```ts
/**
 * Desfecho de uma manobra de recrutabilidade. `null` significa em andamento.
 *
 * 'abortada' é a manobra que não pôde ser feita (paciente não passivo);
 * 'inconclusiva' é a que foi feita e não produziu número. Nenhuma das duas é
 * falha do paciente, e nenhuma é o mesmo que 'concluida'.
 */
export type ManobraDesfecho = "concluida" | "abortada" | "inconclusiva";

export interface RecruitmentManeuver {
  id: string;
  patient_id: string;
  owner_id: string;
  realizada_em: string;
  passivo: boolean | null;
  fechamento_via_aerea: boolean | null;
  pressao_abertura: number | null;
  peep_alta: number | null;
  peep_baixa: number | null;
  volume_expirado_extra: number | null;
  pplat_baixa: number | null;
  vc_baixa: number | null;
  desfecho: ManobraDesfecho | null;
  motivo: string | null;
}
```

- [ ] **Step 3: Rodar tudo**

Run: `pnpm test` e `pnpm build`
Esperado: verde e sem mudança na contagem — nada consome os tipos ainda. Um
build limpo com nada a corrigir é o resultado esperado aqui.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql src/types/index.ts
git commit -m "feat(mecanica): declara a tabela da manobra de recrutabilidade"
```

---

### Task 5: A razão R/I

**Files:**
- Modify: `src/lib/mecanica.ts`
- Modify: `src/lib/mecanica.test.ts`

**Interfaces:**
- Consumes: `num` da Task 3 (privado do módulo, mesmo arquivo).
- Produces: `RecrutabilidadeEntrada`, `Recrutabilidade`, `calcularRi`,
  `FAIXA_RI_OBSERVADA`. Consumidos pela Task 7.

**O aplicativo não diz se o paciente é recrutável.** Esta função devolve
números, nunca veredito, e não existe campo no tipo para um.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/lib/mecanica.test.ts` (e ao import):

```ts
const manobra = (over: Partial<RecrutabilidadeEntrada> = {}): RecrutabilidadeEntrada => ({
  passivo: true,
  fechamentoViaAerea: false,
  pressaoAbertura: null,
  peepAlta: 15,
  peepBaixa: 5,
  volumeExpiradoExtra: 450,
  pplatBaixa: 20,
  vcBaixa: 450,
  ...over,
});

describe("calcularRi", () => {
  // C_baixa = 450/(20-5) = 30; V_inflado = 30×10 = 300;
  // V_recrutado = 450-300 = 150; R/I = 150/300 = 0,5.
  it("calcula a razão pela fórmula de Chen", () => {
    const r = calcularRi(manobra())!;
    expect(r.cBaixa).toBeCloseTo(30, 5);
    expect(r.vInflado).toBeCloseTo(300, 5);
    expect(r.vRecrutado).toBeCloseTo(150, 5);
    expect(r.ri).toBeCloseTo(0.5, 5);
  });

  // R/I zero é RESULTADO: não recrutou nada. Diferente de manobra não feita.
  it("R/I zero é resultado, não ausência", () => {
    const r = calcularRi(manobra({ volumeExpiradoExtra: 300 }))!;
    expect(r.ri).toBe(0);
  });

  // Com fechamento de via aérea a PEEP baixa efetiva é a pressão de ABERTURA.
  // Sem essa substituição a conta erra exatamente no paciente em que ela mais
  // importa: aqui daria 0,5 em vez de 5/7.
  it("usa a pressão de abertura quando há fechamento de via aérea", () => {
    const r = calcularRi(manobra({ fechamentoViaAerea: true, pressaoAbertura: 8 }))!;
    expect(r.peepBaixaEfetiva).toBe(8);
    expect(r.ri).toBeCloseTo(5 / 7, 5);
    expect(r.ri).not.toBeCloseTo(0.5, 2);
  });

  it("sem pressão de abertura declarada, o fechamento não pode ser aplicado", () => {
    expect(calcularRi(manobra({ fechamentoViaAerea: true, pressaoAbertura: null })))
      .toBeNull();
  });

  // A manobra exige paciente passivo. Não sendo, não há número a devolver.
  it("paciente não passivo não produz razão", () => {
    expect(calcularRi(manobra({ passivo: false }))).toBeNull();
  });

  it("sem saber se é passivo, não produz razão", () => {
    expect(calcularRi(manobra({ passivo: null }))).toBeNull();
  });

  it("falta de qualquer medida devolve null", () => {
    expect(calcularRi(manobra({ vcBaixa: null }))).toBeNull();
    expect(calcularRi(manobra({ pplatBaixa: null }))).toBeNull();
    expect(calcularRi(manobra({ volumeExpiradoExtra: null }))).toBeNull();
  });

  // Divisão por zero produz Infinity, que passa por isNaN e chegaria à tela
  // como se fosse número.
  it("ΔPEEP não positivo devolve null", () => {
    expect(calcularRi(manobra({ peepAlta: 5 }))).toBeNull();
  });

  it("complacência não positiva devolve null", () => {
    expect(calcularRi(manobra({ pplatBaixa: 5 }))).toBeNull();
  });

  // O tipo não tem onde guardar um veredito, e isto prende essa decisão.
  it("não devolve veredito de recrutabilidade", () => {
    const r = calcularRi(manobra())!;
    expect(r).not.toHaveProperty("recrutavel");
    expect(r).not.toHaveProperty("veredito");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/mecanica.test.ts`
Esperado: FALHA, a função não existe.

- [ ] **Step 3: Implementar**

Acrescente ao fim de `src/lib/mecanica.ts`:

```ts
export interface RecrutabilidadeEntrada {
  passivo: boolean | null;
  fechamentoViaAerea: boolean | null;
  pressaoAbertura: number | null;
  peepAlta: number | null;
  peepBaixa: number | null;
  volumeExpiradoExtra: number | null;
  pplatBaixa: number | null;
  vcBaixa: number | null;
}

export interface Recrutabilidade {
  cBaixa: number;
  vInflado: number;
  vRecrutado: number;
  ri: number;
  /** A PEEP baixa usada: a medida, ou a de abertura se houve fechamento. */
  peepBaixaEfetiva: number;
}

/**
 * Faixa OBSERVADA na coorte de Chen 2020, para referência descritiva na tela.
 * NÃO é faixa de normalidade e NÃO é limiar de decisão.
 */
export const FAIXA_RI_OBSERVADA = { min: 0, max: 2.0 } as const;

/**
 * Razão de recrutamento sobre insuflação (Chen 2020).
 *
 *   PEEP baixa efetiva = fechamento ? pressão de abertura : PEEP baixa
 *   C_baixa            = VC baixa / (Pplat baixa − PEEP baixa efetiva)
 *   V_inflado          = C_baixa × (PEEP alta − PEEP baixa efetiva)
 *   V_recrutado        = volume expirado extra − V_inflado
 *   R/I                = V_recrutado / V_inflado
 *
 * A substituição pela pressão de abertura quando há fechamento completo de via
 * aérea vem do artigo. Sem ela a conta erra exatamente no paciente em que ela
 * mais importa.
 *
 * ESTA FUNÇÃO NÃO EMITE VEREDITO, e o tipo não tem onde guardar um. O 0,5 que
 * circula como corte é a mediana da coorte de derivação (n = 45), usada ali
 * para dicotomizar a análise, e não ponto de corte validado contra desfecho.
 */
export function calcularRi(e: RecrutabilidadeEntrada): Recrutabilidade | null {
  // A manobra pressupõe paciente passivo. Sem essa confirmação não há número.
  if (e.passivo !== true) return null;

  const peepBaixaEfetiva = e.fechamentoViaAerea
    ? e.pressaoAbertura
    : e.peepBaixa;
  if (!num(peepBaixaEfetiva)) return null;
  if (!num(e.peepAlta) || !num(e.pplatBaixa)) return null;
  if (!num(e.vcBaixa) || !num(e.volumeExpiradoExtra)) return null;

  const deltaPeep = e.peepAlta - peepBaixaEfetiva;
  const deltaPressao = e.pplatBaixa - peepBaixaEfetiva;
  if (deltaPeep <= 0 || deltaPressao <= 0) return null;

  const cBaixa = e.vcBaixa / deltaPressao;
  const vInflado = cBaixa * deltaPeep;
  if (vInflado <= 0) return null;

  const vRecrutado = e.volumeExpiradoExtra - vInflado;
  return { cBaixa, vInflado, vRecrutado, ri: vRecrutado / vInflado, peepBaixaEfetiva };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde.

- [ ] **Step 5: Provar que os testes podem falhar**

Troque `e.fechamentoViaAerea ? e.pressaoAbertura : e.peepBaixa` por
`e.peepBaixa`.
Run: `pnpm vitest run src/lib/mecanica.test.ts`
Esperado: FALHA em "usa a pressão de abertura quando há fechamento" — o R/I cai
de 5/7 para 0,5. Reverta.

Depois troque `if (e.passivo !== true) return null;` por
`if (e.passivo === false) return null;`.
Esperado: FALHA em "sem saber se é passivo". Reverta.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mecanica.ts src/lib/mecanica.test.ts
git commit -m "feat(mecanica): calcula a razao R sobre I sem emitir veredito"
```

---

### Task 6: O painel de mecânica

**Files:**
- Create: `src/components/patient/MecanicaPanel.tsx`
- Create: `src/components/patient/MecanicaPanel.test.tsx`

**Interfaces:**
- Consumes: `classificarDrive`, `estimarEsforco`, `FAIXA_P01` da Task 3;
  `Panel` de `../ui`; `SourceFooter` de `../SourceFooter`.
- Produces: `<MecanicaPanel ev={DailyEvolution} />`, montado na Task 8.

**Leia `src/components/patient/GasometriaPanel.tsx` antes de escrever.** É o
irmão mais próximo: mesmo uso de `Panel`, mesmo `SourceFooter`, mesma convenção
de `data-testid`, mesmo registro em português. Siga.

Os testes do painel renderizam dentro de `MemoryRouter`, porque `SourceFooter`
usa `<Link>` e um painel fora de Router lança.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/components/patient/MecanicaPanel.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MecanicaPanel } from "./MecanicaPanel";
import type { DailyEvolution } from "../../types";

const ev = (over: Partial<DailyEvolution> = {}): DailyEvolution =>
  ({
    id: "e-1", patient_id: "p-1", owner_id: "u-1",
    recorded_at: "2026-09-02T10:00:00Z",
    mode: null, fr: null, vc: null, peep: null, fio2: null,
    ppico: null, pplat: null, flow: null, p01: null, pocc: null,
    ph: null, pao2: null, paco2: null, spo2: null, hco3: null, be: null,
    na: null, cl: null, albumina: null,
    pimax: null, peak_cough_flow: null, glasgow: null, rass: null, ims: null,
    mrc: {}, tre_result: null, hr: null, sbp: null, dbp: null, lactate: null,
    vasopressor: null, notes: null, imaging: {}, iv_meds: {}, feeding: {},
    ...over,
  }) as DailyEvolution;

const montar = (e: DailyEvolution) =>
  render(<MemoryRouter><MecanicaPanel ev={e} /></MemoryRouter>);

describe("MecanicaPanel", () => {
  it("sem P0.1 e sem ΔPocc, avisa em vez de interpretar", () => {
    montar(ev());
    expect(screen.getByTestId("mec-incompleto")).toBeInTheDocument();
    expect(screen.queryByTestId("mec-drive")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mec-esforco")).not.toBeInTheDocument();
  });

  // P0.1 ZERO É MEDIDA, e das graves. Se o painel o tratar como campo vazio,
  // o achado mais sério que este campo pode ter desaparece da tela.
  it("P0.1 zero aparece e é lido como drive baixo", () => {
    montar(ev({ p01: 0 }));
    expect(screen.getByTestId("mec-drive")).toHaveTextContent(/baixo/i);
  });

  it("nomeia o drive elevado", () => {
    montar(ev({ p01: 5 }));
    expect(screen.getByTestId("mec-drive")).toHaveTextContent(/elevado/i);
  });

  // As operating characteristics de Telias foram medidas contra esforço
  // esofágico, não contra desfecho. A tela não pode sugerir o contrário.
  it("diz que o corte do P0.1 foi medido contra esforço, não contra desfecho", () => {
    montar(ev({ p01: 5 }));
    expect(screen.getByTestId("mec-drive-ressalva")).toHaveTextContent(/esforço/i);
  });

  it("mostra o Pmus estimado e a faixa", () => {
    montar(ev({ pocc: -20 }));
    const bloco = screen.getByTestId("mec-esforco");
    expect(bloco).toHaveTextContent("15");
    expect(bloco).toHaveTextContent(/elevado/i);
  });

  it("mostra a ΔP_L,dyn quando há pico e PEEP", () => {
    montar(ev({ pocc: -12, ppico: 30, peep: 10 }));
    expect(screen.getByTestId("mec-dpl")).toHaveTextContent("28");
  });

  // DECISÃO DE NÃO EXIBIR: o mentor não foi perguntado sobre limiares da
  // ΔP_L,dyn. Se este teste começar a falhar porque alguém classificou o
  // número, a implementação é que está errada.
  it("a ΔP_L,dyn aparece SEM faixa de classificação", () => {
    montar(ev({ pocc: -12, ppico: 30, peep: 10 }));
    expect(screen.getByTestId("mec-dpl"))
      .not.toHaveTextContent(/elevad|adequad|aument|alto|normal/i);
  });

  it("sem pico não mostra ΔP_L,dyn, mas mostra o Pmus", () => {
    montar(ev({ pocc: -12 }));
    expect(screen.queryByTestId("mec-dpl")).not.toBeInTheDocument();
    expect(screen.getByTestId("mec-esforco")).toBeInTheDocument();
  });

  it("cita as fontes do que exibe", () => {
    montar(ev({ p01: 2, pocc: -10 }));
    const fonte = screen.getByTestId("mec-fonte");
    expect(fonte).toHaveTextContent(/Telias, 2020/);
    expect(fonte).toHaveTextContent(/Bertoni, 2019/);
    expect(fonte).toHaveTextContent(/Parecer clínico \(faixas de Pmus\), 2026/);
  });

  it("sem ΔPocc não cita a fonte do esforço", () => {
    montar(ev({ p01: 2 }));
    const fonte = screen.getByTestId("mec-fonte");
    expect(fonte).toHaveTextContent(/Telias, 2020/);
    expect(fonte).not.toHaveTextContent(/Bertoni, 2019/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/MecanicaPanel.test.tsx`
Esperado: FALHA, o componente não existe.

- [ ] **Step 3: Implementar**

Escreva `src/components/patient/MecanicaPanel.tsx` seguindo o padrão de
`GasometriaPanel.tsx`. Requisitos, todos verificados pelos testes acima:

- `Panel` com título "Mecânica: drive e esforço" e `sub` curto.
- Prop única: `{ ev }: { ev: DailyEvolution }`.
- **Nenhuma lógica clínica no componente.** Todo número vem de
  `classificarDrive(ev.p01)` e `estimarEsforco(ev.pocc, ev.ppico, ev.peep)`.
  Não escreva 1,5, 3,5, 4, 8, 12, 0,75 nem 2/3 neste arquivo. A faixa do P0.1,
  se exibida, sai de `FAIXA_P01`.
- Sem P0.1 e sem ΔPocc, renderiza só `data-testid="mec-incompleto"` dizendo
  quais medidas faltam. Nenhum outro testid de conteúdo, e nem o rodapé.
- `data-testid="mec-drive"` quando há P0.1, com a leitura por extenso. Mapa de
  rótulo cobrindo os três valores de `FaixaDrive`, com fallback para valor fora
  do domínio em vez de `undefined`.
- `data-testid="mec-drive-ressalva"` junto, dizendo que a sensibilidade e a
  especificidade do corte foram medidas contra esforço esofágico e não contra
  desfecho clínico.
- `data-testid="mec-esforco"` quando há ΔPocc, com o Pmus estimado e a faixa
  por extenso. Mapa cobrindo os quatro valores de `FaixaEsforco`, com fallback.
  Na faixa `elevado`, o texto menciona que a preocupação com sobrecarga e
  P-SILI fica mais forte acima de 15 — **sem** transformar 15 em fronteira.
- `data-testid="mec-dpl"` só quando `dpLDinamica` não é `null`, com o valor e o
  rótulo de estimativa. **Sem classificação, sem cor de status, sem adjetivo de
  faixa.**
- Deixe explícito na tela que Pmus e ΔP_L,dyn são **estimativas** derivadas do
  ΔPocc, não medidas.
- `<div data-testid="mec-fonte"><SourceFooter sourceKeys={chaves} /></div>`,
  onde `chaves` é construído a partir do que foi de fato calculado: `"drive"`
  quando há P0.1, `"esforco"` quando há esforço estimado. **Nunca lista fixa** —
  este projeto embarcou três vezes um painel cujo rodapé não cobria o que ele
  exibia.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde.

- [ ] **Step 5: Provar que os testes podem falhar**

Renderize uma classificação junto da ΔP_L,dyn (por exemplo o texto "elevado").
Run: `pnpm vitest run src/components/patient/MecanicaPanel.test.tsx`
Esperado: FALHA em "a ΔP_L,dyn aparece SEM faixa". Reverta.

Depois troque as chaves do rodapé por `["drive", "esforco"]` fixo.
Esperado: FALHA em "sem ΔPocc não cita a fonte do esforço". Reverta.

- [ ] **Step 6: Commit**

```bash
git add src/components/patient/MecanicaPanel.tsx src/components/patient/MecanicaPanel.test.tsx
git commit -m "feat(mecanica): adiciona o painel de drive e esforco"
```

---

### Task 7: O painel da manobra

**Files:**
- Create: `src/components/patient/RecrutabilidadePanel.tsx`
- Create: `src/components/patient/RecrutabilidadePanel.test.tsx`

**Interfaces:**
- Consumes: `calcularRi`, `FAIXA_RI_OBSERVADA` da Task 5;
  `RecruitmentManeuver`, `ManobraDesfecho` da Task 4; `supabase`; `Panel`,
  `Alert`, `Field`, `Btn` de `../ui`.
- Produces:
  `<RecrutabilidadePanel patientId={string} ownerId={string} manobras={RecruitmentManeuver[]} onChange={() => void} />`

**Leia `src/components/patient/TrePanel.tsx` antes de escrever.** É o mesmo
desenho: três estados de tela, mesmo formato de mock do supabase nos testes,
mesma convenção de erro de gravação. Siga.

**Três estados**, e o painel decide qual mostrar:

1. **Sem manobra em andamento** — formulário para registrar uma nova.
2. **Em andamento** (`desfecho` nulo) — os valores já preenchidos e as formas
   de encerrar.
3. **Histórico** — as manobras encerradas, com desfecho, data e R/I quando
   houver.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/components/patient/RecrutabilidadePanel.test.tsx`. O mock do supabase
segue o formato de `TrePanel.test.tsx` — leia aquele arquivo antes, e note que
`fmt` do projeto usa `toFixed`, então a casa decimal sai com **ponto**.

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecrutabilidadePanel } from "./RecrutabilidadePanel";
import type { RecruitmentManeuver } from "../../types";

const db = {
  lastInsert: null as Record<string, unknown> | null,
  lastUpdate: null as Record<string, unknown> | null,
  erro: null as { message: string } | null,
};

vi.mock("../../lib/supabase", () => ({
  supabaseConfigured: true,
  isSupabaseConfigured: () => true,
  supabase: {
    from: () => ({
      insert: (v: Record<string, unknown>) => {
        db.lastInsert = v;
        return Promise.resolve({ error: db.erro });
      },
      update: (v: Record<string, unknown>) => {
        db.lastUpdate = v;
        return { eq: () => Promise.resolve({ error: db.erro }) };
      },
    }),
  },
}));

beforeEach(() => {
  db.lastInsert = null;
  db.lastUpdate = null;
  db.erro = null;
});

const manobra = (over: Partial<RecruitmentManeuver> = {}): RecruitmentManeuver =>
  ({
    id: "m-1", patient_id: "p-1", owner_id: "u-1",
    realizada_em: "2026-09-02T10:00:00Z",
    passivo: true, fechamento_via_aerea: false, pressao_abertura: null,
    peep_alta: 15, peep_baixa: 5, volume_expirado_extra: 450,
    pplat_baixa: 20, vc_baixa: 450,
    desfecho: "concluida", motivo: null,
    ...over,
  } as RecruitmentManeuver);

const renderPanel = (manobras: RecruitmentManeuver[] = []) =>
  render(
    <MemoryRouter>
      <RecrutabilidadePanel
        patientId="p-1"
        ownerId="u-1"
        manobras={manobras}
        onChange={vi.fn()}
      />
    </MemoryRouter>
  );

describe("RecrutabilidadePanel", () => {
  it("sem manobra nenhuma, oferece registrar", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /registrar manobra/i }))
      .toBeInTheDocument();
  });

  // Fixture: C_baixa = 450/(20-5) = 30; V_inflado = 300; V_recrutado = 150;
  // R/I = 0,5.
  it("mostra a razão calculada da manobra concluída", () => {
    renderPanel([manobra()]);
    expect(screen.getByTestId("rec-ri")).toHaveTextContent("0.5");
  });

  // O APLICATIVO NÃO DIZ SE O PACIENTE É RECRUTÁVEL. Nem em 0,5, que é
  // justamente a mediana que circula como corte, nem em nenhum outro valor.
  it("não emite veredito de recrutabilidade", () => {
    renderPanel([manobra()]);
    expect(screen.getByTestId("rec-ri"))
      .not.toHaveTextContent(/recrut[áa]vel|responde|respondedor/i);
  });

  it("diz que o 0,5 é mediana de coorte e não ponto de corte", () => {
    renderPanel([manobra()]);
    expect(screen.getByTestId("rec-ressalva")).toHaveTextContent(/mediana/i);
  });

  // R/I zero é RESULTADO: não recrutou nada. Diferente de manobra sem número.
  it("R/I zero aparece como resultado, não como manobra sem número", () => {
    renderPanel([manobra({ volume_expirado_extra: 300 })]);
    expect(screen.getByTestId("rec-ri")).toHaveTextContent("0");
  });

  it("manobra abortada não mostra razão e diz por quê", () => {
    renderPanel([manobra({ desfecho: "abortada", passivo: false, motivo: "paciente disparando" })]);
    expect(screen.queryByTestId("rec-ri")).not.toBeInTheDocument();
    expect(screen.getByTestId("rec-desfecho")).toHaveTextContent(/abortada/i);
  });

  // Abortada e inconclusiva são coisas diferentes: uma não pôde ser feita, a
  // outra foi feita e não produziu número.
  it("manobra inconclusiva é distinta de abortada", () => {
    renderPanel([manobra({ desfecho: "inconclusiva" })]);
    const texto = screen.getByTestId("rec-desfecho");
    expect(texto).toHaveTextContent(/inconclusiva/i);
    expect(texto).not.toHaveTextContent(/abortada/i);
  });

  // Com fechamento, a PEEP baixa efetiva é a pressão de abertura: R/I = 5/7,
  // e não os 0,5 que sairiam sem a substituição.
  it("com fechamento de via aérea, usa a pressão de abertura", () => {
    renderPanel([manobra({ fechamento_via_aerea: true, pressao_abertura: 8 })]);
    const ri = screen.getByTestId("rec-ri");
    expect(ri).toHaveTextContent("0.7");
    expect(ri).not.toHaveTextContent("0.5");
  });

  it("cita a fonte do que exibe", () => {
    renderPanel([manobra()]);
    expect(screen.getByTestId("rec-fonte")).toHaveTextContent(/Chen, 2020/);
  });
});
```

O rótulo do botão de registrar e a quantidade de casas decimais do R/I são
escolha sua: se o `fmt` do projeto produzir outro número de casas, ajuste a
asserção para o que o componente de fato renderiza, **mantendo** o contraste
entre 0,7 e 0,5 no teste do fechamento — é ele que prova a substituição.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/RecrutabilidadePanel.test.tsx`
Esperado: FALHA, o componente não existe.

- [ ] **Step 3: Implementar**

Escreva `src/components/patient/RecrutabilidadePanel.tsx`. Requisitos:

- Os oito valores da manobra, nos rótulos do domínio: paciente passivo,
  fechamento de via aérea, pressão de abertura (só quando há fechamento),
  PEEP alta, PEEP baixa, volume expirado extra, pressão de platô em PEEP baixa,
  volume corrente em PEEP baixa.
- O R/I vem de `calcularRi`; o componente **não faz conta nenhuma**. Não
  escreva 0,5 nem 2,0 no arquivo — a faixa observada sai de
  `FAIXA_RI_OBSERVADA`.
- `data-testid="rec-ri"` só quando `calcularRi` devolveu resultado.
- `data-testid="rec-ressalva"` dizendo que o 0,5 é mediana da coorte de
  derivação e não ponto de corte validado contra desfecho, e que o aplicativo
  por isso não classifica o resultado.
- `data-testid="rec-desfecho"` com texto distinto para `concluida`, `abortada`
  e `inconclusiva`. Mapa cobrindo os três, com fallback.
- Erro de gravação aparece em `Alert` e `onChange()` só é chamado no sucesso,
  como em `TrePanel`. Nenhum caminho pode alegar sucesso numa gravação que
  falhou.
- `<div data-testid="rec-fonte"><SourceFooter sourceKeys={["recrutabilidade"]} /></div>`.
- **Nunca as palavras "recrutável" ou "não recrutável"**, nem nenhum
  equivalente que classifique o paciente.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde.

- [ ] **Step 5: Provar que os testes podem falhar**

Acrescente ao painel um texto "Paciente recrutável" quando o R/I passar de 0,5.
Run: `pnpm vitest run src/components/patient/RecrutabilidadePanel.test.tsx`
Esperado: FALHA em "não emite veredito de recrutabilidade". Reverta.

- [ ] **Step 6: Commit**

```bash
git add src/components/patient/RecrutabilidadePanel.tsx src/components/patient/RecrutabilidadePanel.test.tsx
git commit -m "feat(mecanica): adiciona o painel da manobra de recrutabilidade"
```

---

### Task 8: Fiação dos dois painéis

**Files:**
- Modify: `src/pages/PatientDetail.tsx`
- Modify: `src/pages/PatientDetail.test.tsx`

Fecha a fase. Os painéis funcionam isolados e isso não prova que estão
montados. Sem estes testes, apagar a linha de qualquer um deles não quebraria
nada — foi exatamente o defeito que a Fase 2 embarcou e teve que corrigir
depois.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/pages/PatientDetail.test.tsx`, seguindo o teste de fiação do
`GasometriaPanel` que já existe no arquivo:

```tsx
it("mostra o painel de mecânica na aba Evolução", async () => {
  db.patient = { ...PACIENTE_BASE };
  db.evolutions = [{ ...EVOLUCAO_BASE, p01: 5, pocc: -20 }];
  renderDetail();
  const painel = (await screen.findByText(/Mecânica/i)).closest("section")!;
  expect(within(painel).getByTestId("mec-drive")).toHaveTextContent(/elevado/i);
});

it("mostra o painel de recrutabilidade na aba Desmame", async () => {
  db.patient = { ...PACIENTE_BASE };
  db.evolutions = [{ ...EVOLUCAO_BASE }];
  db.recruitmentManeuvers = [];
  renderDetail();
  // clique na aba Desmame como os testes do TRE já fazem, e então:
  const painel = (await screen.findByText(/Recrutabilidade/i)).closest("section")!;
  expect(within(painel).getByTestId("rec-fonte")).toBeInTheDocument();
});
```

**Leia como os testes do `TrePanel` navegam até a aba Desmame e como o harness
monta `db`**, e use as constantes e os nomes que existem. Não invente nomes de
fixture.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Esperado: FALHA, os painéis não estão montados.

- [ ] **Step 3: Carregar as manobras**

Em `load()`, acrescente a busca de `recruitment_maneuvers` ao `Promise.all`,
**como último elemento**, e guarde em estado próprio:

```tsx
supabase.from("recruitment_maneuvers").select("*")
  .eq("patient_id", id).order("realizada_em", { ascending: false }),
```

Acrescentar no fim evita sobrescrever qualquer outro destructuring — a Fase 5
teve exatamente esse defeito no plano e ele foi pego na revisão.

Se a busca falhar, o estado fica em lista vazia, e o painel mostra o estado de
"sem manobra" em vez de quebrar.

- [ ] **Step 4: Montar os dois painéis**

Na aba `evolucao`, logo depois do `GasometriaPanel`:

```tsx
          {last && <MecanicaPanel ev={last} />}
```

Na aba `desmame`, depois do `TrePanel`:

```tsx
          <RecrutabilidadePanel
            patientId={patient.id}
            ownerId={session!.user.id}
            manobras={recruitmentManeuvers}
            onChange={load}
          />
```

E os dois imports no topo do arquivo.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde.

- [ ] **Step 6: Provar que os testes podem falhar**

Apague as duas linhas de montagem, uma de cada vez.
Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Esperado: FALHA no teste correspondente, das duas vezes. Restaure.

- [ ] **Step 7: Commit**

```bash
git add src/pages/PatientDetail.tsx src/pages/PatientDetail.test.tsx
git commit -m "feat(mecanica): monta os paineis de mecanica e recrutabilidade"
```

---

## Depois da última tarefa

1. Review final da branch inteira.
2. `CLAUDE.md` ganha a seção da Fase 7: as duas armadilhas opostas de
   plausibilidade, a decisão de não gravar Pmus e ΔP_L,dyn, a de não emitir
   veredito de recrutabilidade, e o estado atualizado da suíte.
3. **O Jeann roda no Supabase** as duas colunas e a tabela nova. Sem isso, o
   formulário falha em `p01` e `pocc`, e o painel de recrutabilidade monta mas
   não grava.
