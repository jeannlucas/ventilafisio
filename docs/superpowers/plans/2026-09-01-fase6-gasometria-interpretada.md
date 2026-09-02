# Fase 6 — Gasometria interpretada: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development
> (recomendado) ou superpowers:executing-plans para executar este plano tarefa a
> tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** interpretar a gasometria da última evolução — distúrbio primário,
temporalidade, compensação, ânion gap corrigido e condutas — com cada número
citando a fonte que o sustenta.

**Arquitetura:** um módulo puro `src/lib/gasometria.ts` recebe os valores e
devolve um objeto de interpretação; um painel novo na aba Evolução só desenha o
que ele devolveu, inclusive as chaves de fonte do rodapé. `Conduta`, tipo novo
sem campo de dose, nasce em `src/lib/condutas.ts` para ser reusado pela Fase 7.

**Stack:** Vite + React 18 + TypeScript, Vitest + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-01-fase6-gasometria-interpretada-design.md`
**Pesquisa clínica:** `docs/dossie-clinico-fase6.md`

## Restrições globais

- **pnpm, nunca npm.** `pnpm test` roda a suíte; `pnpm build` roda
  `tsc --noEmit && vite build`. Um arquivo: `pnpm vitest run <caminho>`.
- **Base de partida: 364 testes em 23 arquivos, verdes, build limpo.**
- **`tsconfig.json` não inclui os tipos de Node.** `node:fs` e `__dirname`
  passam no vitest e **quebram o `pnpm build`**.
- **Repositório PÚBLICO.** Sem segredo, sem dado real de paciente. Fixture é
  sempre inventada.
- **Comentários, texto de tela e nome de teste em português.**
- **Commits:** Conventional Commits em português, imperativo, até 72
  caracteres, sem emoji, sem `Co-Authored-By`, sem rodapé de IA, sem travessão.
- **Não refatorar `PatientDetail.tsx`** (~1000 linhas, 10 componentes). É desvio
  registrado e aceito.
- **`SourceKey` é união fechada**, `THRESHOLD_SOURCES` é
  `Record<SourceKey, string[]>` e `LABELS` em `src/pages/Sources.tsx` também.
  Chave nova sem rótulo quebra o `tsc`.
- **Ausência de dado não é resultado normal.** Zero é valor clínico legítimo
  neste projeto (PEEP 0 é ZEEP, RASS 0, MRC 0) e **BE zero é o valor normal**.
  Guarda é o `num()` de `clinical.ts`, nunca teste de veracidade.
- **O aplicativo diz "compatível com", nunca "é"**, na temporalidade e na
  cronicidade.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/data/references.ts` | catálogo: 6 publicações e 4 pareceres novos |
| `src/lib/references.ts` | 3 chaves novas de `SourceKey` e suas fontes |
| `src/pages/Sources.tsx` | rótulo das 3 chaves novas |
| `src/types/index.ts` | 5 campos novos em `DailyEvolution` |
| `src/lib/measurement-limits.ts` | plausibilidade dos 5 campos |
| `supabase/schema.sql` | 3 colunas novas; `hco3` e `be` saem da lista de sem uso |
| `src/lib/condutas.ts` | tipo `Conduta`, sem campo de dose |
| `src/lib/gasometria.ts` | distúrbio, temporalidade, compensação, ânion gap, condutas |
| `src/components/patient/GasometriaPanel.tsx` | painel |
| `src/pages/PatientDetail.tsx` | campos no formulário e montagem do painel |

---

### Task 1: Fontes e chaves

**Files:**
- Modify: `src/data/references.ts`
- Modify: `src/lib/references.ts`
- Modify: `src/pages/Sources.tsx`
- Test: `src/lib/references.test.ts`

**Interfaces:**
- Consumes: `Publicacao`, `Parecer`, `Reference` de `src/data/references.ts`.
- Produces: as chaves `"acidoBase"`, `"anionGap"` e `"dpocOxigenio"` em
  `SourceKey`, usadas pelas Tasks 6, 7 e 8.

Existe um teste que proíbe referência órfã: toda entrada do catálogo precisa
ser citada por pelo menos uma chave. Por isso o catálogo e as chaves entram no
mesmo commit.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao fim de `src/lib/references.test.ts`, seguindo o estilo do arquivo:

```ts
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
```

Confira no topo do arquivo se `REFERENCES`, `ehParecer` e `sourcesFor` já estão
importados; se faltar algum, acrescente ao import existente.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/references.test.ts`
Esperado: FALHA. As chaves não existem em `SourceKey`, então o TypeScript
reclama e os testes não passam.

- [ ] **Step 3: Acrescentar as publicações**

Em `src/data/references.ts`, dentro do array `REFERENCES`, antes das entradas
de `Parecer` que já estão no fim:

```ts
  {
    id: "berend_2014",
    citacaoCurta: "Berend, 2014",
    autores: "Berend K, de Vries APJ, Gans ROB",
    titulo: "Physiological approach to assessment of acid-base disturbances",
    veiculo: "N Engl J Med 2014;371(15):1434-1445",
    ano: 2014,
    verificada: true,
    nota:
      "Revisão de referência. A Tabela 1 traz as regras de compensação por 10 mmHg de PaCO₂ em bicarbonato. Registra que na acidose respiratória crônica o pH pode estar normal ou acima de 7,40.",
  },
  {
    id: "albert_1967",
    citacaoCurta: "Albert, 1967",
    autores: "Albert MS, Dell RB, Winters RW",
    titulo:
      "Quantitative displacement of acid-base equilibrium in metabolic acidosis",
    veiculo: "Ann Intern Med 1967;66(2):312-322",
    ano: 1967,
    verificada: true,
    nota:
      "Fonte primária da fórmula de Winters, PaCO₂ esperada = 1,5 × HCO₃⁻ + 8 ± 2. Cobre APENAS acidose metabólica: não existe Winters para alcalose.",
  },
  {
    id: "martinu_2003",
    citacaoCurta: "Martinu, 2003",
    autores: "Martinu T, Menzies D, Dial S",
    titulo:
      "Re-evaluation of acid-base prediction rules in patients with chronic respiratory acidosis",
    veiculo: "Can Respir J 2003;10(6):311-315",
    ano: 2003,
    verificada: true,
    nota:
      "Mediu a compensação crônica em DPOC estável: HCO₃⁻ +5,1 por 10 mmHg de PaCO₂, acima da faixa de 4 a 5 da revisão do NEJM.",
  },
  {
    id: "figge_1998",
    citacaoCurta: "Figge, 1998",
    autores: "Figge J, Jabor A, Kazda A, Fencl V",
    titulo: "Anion gap and hypoalbuminemia",
    veiculo: "Crit Care Med 1998;26(11):1807-1810",
    ano: 1998,
    verificada: true,
    nota:
      "Correção do ânion gap pela albumina, medida em 152 pacientes criticamente enfermos. Sem ela, hipoalbuminemia esconde acidose por ânion gap elevado.",
  },
  {
    id: "odriscoll_2017",
    citacaoCurta: "BTS, 2017",
    autores: "O'Driscoll BR, Howard LS, Earis J, Mak V",
    titulo:
      "British Thoracic Society guideline for oxygen use in adults in healthcare and emergency settings",
    veiculo: "BMJ Open Respir Res 2017;4(1):e000170",
    ano: 2017,
    verificada: true,
    nota:
      "Alvo de SpO₂ de 88 a 92% em DPOC e demais fatores de risco para insuficiência respiratória hipercápnica, com GRAU A para DPOC. Traz também o critério de hipercapnia de longa data por pH e bicarbonato.",
  },
  {
    id: "austin_2010",
    citacaoCurta: "Austin, 2010",
    autores: "Austin MA, Wills KE, Blizzard L, Walters EH, Wood-Baker R",
    titulo:
      "Effect of high flow oxygen on mortality in chronic obstructive pulmonary disease patients in prehospital setting: randomised controlled trial",
    veiculo: "BMJ 2010;341:c5462",
    ano: 2010,
    verificada: true,
    nota:
      "Ensaio randomizado, 405 pacientes. Oxigênio titulado contra liberal na exacerbação de DPOC: mortalidade menor no grupo titulado, e o efeito é maior no subgrupo com DPOC confirmada. É o que sustenta que saturação acima da faixa não é melhor.",
  },
```

- [ ] **Step 4: Acrescentar os quatro pareceres**

No mesmo array, junto de `parecer_mrc_faixa`, `parecer_tre_ph` e
`parecer_tre_validade`:

```ts
  {
    id: "parecer_compensacao_cronica",
    citacaoCurta: "Parecer clínico (compensação crônica), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "O coeficiente de 5,0 mmol/L de HCO₃⁻ por 10 mmHg de PaCO₂ na acidose respiratória crônica é escolha clínica. Berend 2014 dá a faixa de 4 a 5 e Martinu 2003 mediu 5,1 em DPOC estável; nenhuma das duas diz 5,0.",
  },
  {
    id: "parecer_ph_por_10",
    citacaoCurta: "Parecer clínico (pH por 10 mmHg), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "Os coeficientes de 0,08 no quadro agudo e 0,03 no crônico circulam como convenção de livro-texto. A pesquisa desta fase não achou estudo primário, e a Tabela 1 de Berend 2014 não traz pH. Por isso são leitura auxiliar na tela, e quem decide aguda ou crônica é o bicarbonato.",
  },
  {
    id: "parecer_cronicidade_ou",
    citacaoCurta: "Parecer clínico (critério de cronicidade), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "A BTS escreve pH ≥ 7,35 e/ou HCO₃⁻ > 28. Apresentados dois casos concretos, o mentor decidiu que qualquer um dos dois basta. É o critério mais sensível dos dois, e por isso a tela diz compatível com, nunca é.",
  },
  {
    id: "parecer_bicarbonato_gatilho",
    citacaoCurta: "Parecer clínico (bicarbonato), 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "O aplicativo sinaliza bicarbonato a partir de pH < 7,20. Sinaliza o medicamento e nunca a dose: quem prescreve é a equipe médica.",
  },
```

- [ ] **Step 5: Acrescentar as chaves**

Em `src/lib/references.ts`, na união `SourceKey`, depois de `"treFalha"`:

```ts
  // gasometria interpretada
  | "acidoBase" | "anionGap" | "dpocOxigenio";
```

E em `THRESHOLD_SOURCES`:

```ts
  acidoBase: [
    "berend_2014",
    "albert_1967",
    "martinu_2003",
    "parecer_compensacao_cronica",
    "parecer_ph_por_10",
    "parecer_bicarbonato_gatilho",
  ],
  anionGap: ["berend_2014", "figge_1998"],
  dpocOxigenio: ["odriscoll_2017", "austin_2010", "parecer_cronicidade_ou"],
```

- [ ] **Step 6: Acrescentar os rótulos**

Em `src/pages/Sources.tsx`, no `LABELS`:

```ts
  acidoBase: "Distúrbios ácido-base e compensação",
  anionGap: "Ânion gap e correção pela albumina",
  dpocOxigenio: "Oxigenoterapia e hipercapnia crônica no DPOC",
```

- [ ] **Step 7: Rodar tudo**

Run: `pnpm test` e `pnpm build`
Esperado: verde, 364 + 6 testes. Se o teste de referência órfã reprovar, alguma
entrada nova não está citada por chave nenhuma.

- [ ] **Step 8: Commit**

```bash
git add src/data/references.ts src/lib/references.ts src/lib/references.test.ts src/pages/Sources.tsx
git commit -m "feat(gaso): cataloga as fontes da gasometria interpretada"
```

---

### Task 2: Os cinco campos novos

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/measurement-limits.ts`
- Modify: `src/pages/PatientDetail.tsx` (`EV_FIELDS` ~460, `EV_SECTIONS` ~485)
- Modify: `supabase/schema.sql`
- Test: `src/lib/measurement-limits.test.ts`

**Interfaces:**
- Produces: `hco3`, `be`, `na`, `cl`, `albumina` em `DailyEvolution`, todos
  `number | null`. Consumidos pelas Tasks 3 a 8.

**A armadilha desta tarefa.** BE é rotineiramente negativo e **zero é o valor
normal**. Um limite `{ min: 0 }` rejeitaria toda gasometria de paciente
acidótico, e um `if (!be)` mataria o −2 e o 0 na mesma linha. É a armadilha nº 5
do projeto num campo onde zero fica no meio da escala, não na ponta.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/lib/measurement-limits.test.ts`:

```ts
describe("gasometria da Fase 6", () => {
  // BE negativo é o achado esperado em acidose metabólica, não erro de digitação.
  it("aceita excesso de base negativo", () => {
    expect(invalidMeasurements({ be: "-12" })).toEqual([]);
  });

  // Zero é o valor NORMAL do BE, não campo vazio.
  it("aceita excesso de base zero", () => {
    expect(invalidMeasurements({ be: "0" })).toEqual([]);
  });

  it("aceita excesso de base positivo", () => {
    expect(invalidMeasurements({ be: "6" })).toEqual([]);
  });

  it("barra excesso de base fisicamente impossível", () => {
    expect(invalidMeasurements({ be: "-90" }).length).toBe(1);
  });

  it("barra bicarbonato zero ou negativo", () => {
    expect(invalidMeasurements({ hco3: "0" }).length).toBe(1);
    expect(invalidMeasurements({ hco3: "-3" }).length).toBe(1);
  });

  it("aceita sódio, cloro e albumina plausíveis", () => {
    expect(invalidMeasurements({ na: "140", cl: "105", albumina: "2.1" })).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/measurement-limits.test.ts`
Esperado: FALHA em "barra excesso de base fisicamente impossível" e em "barra
bicarbonato zero ou negativo" — sem entrada no mapa, `invalidMeasurements`
ignora o campo e devolve lista vazia.

- [ ] **Step 3: Acrescentar os limites**

Em `src/lib/measurement-limits.ts`, no bloco `// Gasometria` de
`MEASUREMENT_LIMITS`, depois de `spo2`:

```ts
  hco3: { min: ACIMA_DE_ZERO },
  // BE é rotineiramente NEGATIVO e zero é o valor normal. Não existe `min: 0`
  // aqui: ele rejeitaria toda gasometria de paciente acidótico. Os limites são
  // só o fisicamente impossível.
  be: { min: -50, max: 50 },
  na: { min: ACIMA_DE_ZERO },
  cl: { min: ACIMA_DE_ZERO },
  albumina: { min: ACIMA_DE_ZERO },
```

- [ ] **Step 4: Acrescentar aos tipos**

Em `src/types/index.ts`, em `DailyEvolution`, junto dos campos de gasometria
que já existem (`ph`, `pao2`, `paco2`, `spo2`):

```ts
  hco3: number | null;
  be: number | null;
  na: number | null;
  cl: number | null;
  albumina: number | null;
```

- [ ] **Step 5: Acrescentar ao formulário**

Em `src/pages/PatientDetail.tsx`, em `EV_FIELDS`, depois de
`{ k: "spo2", label: "SpO₂", unit: "%" }`:

```ts
  { k: "hco3", label: "HCO₃⁻", unit: "mmol/L" }, { k: "be", label: "BE", unit: "mmol/L" },
  { k: "na", label: "Na⁺", unit: "mmol/L" }, { k: "cl", label: "Cl⁻", unit: "mmol/L" },
  { k: "albumina", label: "Albumina", unit: "g/dL" },
```

E em `EV_SECTIONS`, troque a linha da gasometria por:

```ts
  { title: "Gasometria", color: T.ok, keys: ["ph", "pao2", "paco2", "spo2", "hco3", "be", "na", "cl", "albumina"] },
```

O payload do `save` é montado percorrendo `EV_FIELDS` (linha ~558), então os
cinco campos passam a ser gravados sem mudança nenhuma no `save`. **Confirme
isso lendo o código antes de seguir**; se o payload for montado por lista
explícita, acrescente os cinco lá.

- [ ] **Step 6: Acrescentar as colunas ao schema**

Em `supabase/schema.sql`, junto dos outros `alter table ... add column if not
exists` de `daily_evolutions`:

```sql
-- Gasometria da Fase 6. `hco3` e `be` já existiam desde a criação da tabela;
-- estas três são novas e sustentam o ânion gap corrigido pela albumina.
alter table public.daily_evolutions add column if not exists na numeric;
alter table public.daily_evolutions add column if not exists cl numeric;
alter table public.daily_evolutions add column if not exists albumina numeric;
```

E **remova** as duas linhas de `hco3` e `be` da lista "COLUNAS SEM USO NO APP",
acrescentando-as ao bloco "Saíram desta lista", com a data de hoje e a fase.

- [ ] **Step 7: Rodar tudo**

Run: `pnpm test` e `pnpm build`
Esperado: verde. Testes de `PatientDetail` que montam fixture de
`DailyEvolution` podem quebrar por campo faltando — acrescente os cinco como
`null` nas fixtures, não afrouxe o tipo.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/lib/measurement-limits.ts src/lib/measurement-limits.test.ts src/pages/PatientDetail.tsx src/pages/PatientDetail.test.tsx supabase/schema.sql
git commit -m "feat(gaso): captura bicarbonato, BE, sodio, cloro e albumina"
```

---

### Task 3: Distúrbio primário

**Files:**
- Create: `src/lib/gasometria.ts`
- Create: `src/lib/gasometria.test.ts`

**Interfaces:**
- Produces: `EntradaGasometria`, `DisturbioPrimario`, `disturbioPrimario()`.
  Consumido pelas Tasks 4 a 6.

**O centro da fase.** `sem_disturbio` exige os **três** parâmetros dentro da
faixa. Berend 2014 registra que na acidose respiratória crônica o pH pode estar
normal ou acima de 7,40 — um painel que olhasse só o pH chamaria o retentor
crônico compensado de "sem distúrbio". É o mesmo formato do defeito da FiO₂ zero
produzindo P/F infinita classificada como "Normal" em verde.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/lib/gasometria.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { disturbioPrimario, type EntradaGasometria } from "./gasometria";

const gaso = (over: Partial<EntradaGasometria> = {}): EntradaGasometria => ({
  ph: 7.4, paco2: 40, hco3: 24, be: 0,
  na: null, cl: null, albumina: null,
  ...over,
});

describe("disturbioPrimario", () => {
  it("os três dentro da faixa é sem distúrbio", () => {
    expect(disturbioPrimario(gaso())).toBe("sem_disturbio");
  });

  it("pH baixo com PaCO₂ alta é acidose respiratória", () => {
    expect(disturbioPrimario(gaso({ ph: 7.25, paco2: 60, hco3: 26 })))
      .toBe("acidose_respiratoria");
  });

  it("pH baixo com bicarbonato baixo é acidose metabólica", () => {
    expect(disturbioPrimario(gaso({ ph: 7.25, paco2: 28, hco3: 12 })))
      .toBe("acidose_metabolica");
  });

  it("pH alto com PaCO₂ baixa é alcalose respiratória", () => {
    expect(disturbioPrimario(gaso({ ph: 7.52, paco2: 28, hco3: 22 })))
      .toBe("alcalose_respiratoria");
  });

  it("pH alto com bicarbonato alto é alcalose metabólica", () => {
    expect(disturbioPrimario(gaso({ ph: 7.5, paco2: 45, hco3: 34 })))
      .toBe("alcalose_metabolica");
  });

  // Os dois empurram para o mesmo lado: nenhum está compensando o outro.
  it("PaCO₂ alta E bicarbonato baixo com pH baixo é acidose mista", () => {
    expect(disturbioPrimario(gaso({ ph: 7.15, paco2: 55, hco3: 18 })))
      .toBe("acidose_mista");
  });

  it("PaCO₂ baixa E bicarbonato alto com pH alto é alcalose mista", () => {
    expect(disturbioPrimario(gaso({ ph: 7.58, paco2: 30, hco3: 32 })))
      .toBe("alcalose_mista");
  });

  // O ACHADO CENTRAL DA FASE. Berend 2014 registra que o pH pode estar normal
  // na acidose respiratória crônica. Se o pH sozinho decidisse, este paciente
  // sairia como "sem distúrbio" — e ele é um retentor crônico compensado.
  it("retentor crônico compensado NÃO é sem distúrbio", () => {
    expect(disturbioPrimario(gaso({ ph: 7.38, paco2: 60, hco3: 34 })))
      .toBe("acidose_respiratoria");
  });

  it("pH normal com bicarbonato baixo não é sem distúrbio", () => {
    expect(disturbioPrimario(gaso({ ph: 7.36, paco2: 30, hco3: 18 })))
      .toBe("acidose_metabolica");
  });

  // Comportamento fixado de propósito: 7,40 exato com par compensatório é
  // ambíguo pela gasometria isolada, e o critério tem que ser explícito.
  it("pH exatamente 7,40 cai no lado alcalino", () => {
    expect(disturbioPrimario(gaso({ ph: 7.4, paco2: 60, hco3: 36 })))
      .toBe("alcalose_metabolica");
  });

  it("devolve null sem algum dos três parâmetros", () => {
    expect(disturbioPrimario(gaso({ ph: null }))).toBeNull();
    expect(disturbioPrimario(gaso({ paco2: null }))).toBeNull();
    expect(disturbioPrimario(gaso({ hco3: null }))).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: FALHA, o módulo não existe.

- [ ] **Step 3: Implementar**

Crie `src/lib/gasometria.ts`:

```ts
// ============================================================
// Gasometria interpretada — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Faixas e regras de compensação: Berend 2014 (N Engl J Med).
// Winters: Albert, Dell e Winters, 1967.
// ============================================================

export interface EntradaGasometria {
  ph: number | null;
  paco2: number | null;
  hco3: number | null;
  be: number | null;
  na: number | null;
  cl: number | null;
  albumina: number | null;
}

export type DisturbioPrimario =
  | "acidose_respiratoria"
  | "alcalose_respiratoria"
  | "acidose_metabolica"
  | "alcalose_metabolica"
  | "acidose_mista"
  | "alcalose_mista"
  | "sem_disturbio";

// Number.isFinite e não isNaN: divisão por zero produz Infinity, que passa por
// isNaN. Mesma guarda de clinical.ts.
const num = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v);

export const FAIXAS = {
  ph: { min: 7.35, max: 7.45 },
  paco2: { min: 35, max: 45 },
  hco3: { min: 22, max: 26 },
} as const;

/**
 * Distúrbio ácido-base primário.
 *
 * `sem_disturbio` exige os TRÊS parâmetros dentro da faixa. Berend 2014
 * registra que na acidose respiratória crônica o pH pode estar normal ou acima
 * de 7,40: decidir pelo pH sozinho classificaria o retentor crônico compensado
 * como paciente sem distúrbio.
 *
 * Quando os dois parâmetros empurram na MESMA direção, nenhum está compensando
 * o outro e os dois são causa: o resultado é misto. Não se elege um primário
 * nesse caso, porque desempatar exigiria comparar mmHg com mmol/L.
 */
export function disturbioPrimario(e: EntradaGasometria): DisturbioPrimario | null {
  if (!num(e.ph) || !num(e.paco2) || !num(e.hco3)) return null;

  const paco2Alta = e.paco2 > FAIXAS.paco2.max;
  const paco2Baixa = e.paco2 < FAIXAS.paco2.min;
  const hco3Alto = e.hco3 > FAIXAS.hco3.max;
  const hco3Baixo = e.hco3 < FAIXAS.hco3.min;

  if (!paco2Alta && !paco2Baixa && !hco3Alto && !hco3Baixo) {
    const phNormal = e.ph >= FAIXAS.ph.min && e.ph <= FAIXAS.ph.max;
    if (phNormal) return "sem_disturbio";
  }

  // QUEM DECIDE O LADO É O pH, e não a ordem em que os parâmetros são
  // checados. Uma acidose metabólica compensada tem PaCO₂ BAIXA: perguntar
  // "PaCO₂ está baixa?" antes de olhar o pH a classificaria como alcalose
  // respiratória, invertendo o distúrbio na tela.
  //
  // 7,40 é o meio da faixa, e é onde o pH pende quando o distúrbio está
  // compensado. Exatamente 7,40 com PaCO₂ e HCO₃⁻ desviando em direções
  // opostas é ambíguo pela gasometria isolada; o critério abaixo é explícito
  // para que seja decisão, e não acidente de implementação.
  const ladoAcido = e.ph < 7.4;

  if (ladoAcido) {
    if (paco2Alta && hco3Baixo) return "acidose_mista";
    if (paco2Alta) return "acidose_respiratoria";
    if (hco3Baixo) return "acidose_metabolica";
  } else {
    if (paco2Baixa && hco3Alto) return "alcalose_mista";
    if (paco2Baixa) return "alcalose_respiratoria";
    if (hco3Alto) return "alcalose_metabolica";
  }

  // pH fora da faixa com PaCO₂ e HCO₃⁻ dentro dela: não há como nomear o
  // distúrbio a partir destes três valores.
  return "sem_disturbio";
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: PASSA, 11 testes.

- [ ] **Step 5: Provar que o teste central pode falhar**

Troque a primeira condição de `disturbioPrimario` por uma que olhe só o pH:

```ts
  if (e.ph >= FAIXAS.ph.min && e.ph <= FAIXAS.ph.max) return "sem_disturbio";
```

Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: FALHA em "retentor crônico compensado NÃO é sem distúrbio" e em "pH
normal com bicarbonato baixo não é sem distúrbio". Reverta.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gasometria.ts src/lib/gasometria.test.ts
git commit -m "feat(gaso): classifica o disturbio acido-base primario"
```

---

### Task 4: Temporalidade e cronicidade

**Files:**
- Modify: `src/lib/gasometria.ts`
- Modify: `src/lib/gasometria.test.ts`

**Interfaces:**
- Consumes: `EntradaGasometria`, `disturbioPrimario`, `FAIXAS`, `num` da Task 3.
- Produces: `Temporalidade`, `temporalidade()`, `hipercapniaCronica()`.

Quem decide aguda × crônica é o **bicarbonato**. A regra do pH por 10 mmHg
(0,08 e 0,03) é convenção sem estudo primário e não participa da decisão.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/lib/gasometria.test.ts` (e ao import):

```ts
describe("temporalidade", () => {
  // PaCO₂ 60 é 20 acima de 40, ou seja 2 unidades de 10 mmHg.
  // Agudo esperaria 24 + 2×1 = 26. Crônico esperaria 24 + 2×5,0 = 34.
  it("bicarbonato próximo do agudo é compatível com quadro agudo", () => {
    expect(temporalidade(gaso({ ph: 7.25, paco2: 60, hco3: 26 }))).toBe("aguda");
  });

  it("bicarbonato próximo do crônico é compatível com quadro crônico", () => {
    expect(temporalidade(gaso({ ph: 7.38, paco2: 60, hco3: 34 }))).toBe("cronica");
  });

  // Longe dos dois: o app não escolhe. Dizer "indeterminada" nunca afirma algo
  // clínico que a gasometria não sustenta.
  // HCO₃⁻ 22 continua DENTRO da faixa normal, então o distúrbio é respiratório
  // puro. Com PaCO₂ 60 o agudo esperaria 26 e o crônico 34: 22 está a 4 do mais
  // próximo, além da tolerância. Não usar HCO₃⁻ baixo aqui, que viraria
  // acidose mista e devolveria null por outro motivo.
  it("bicarbonato longe dos dois é indeterminada", () => {
    expect(temporalidade(gaso({ ph: 7.2, paco2: 60, hco3: 22 }))).toBe("indeterminada");
  });

  it("alcalose respiratória aguda", () => {
    expect(temporalidade(gaso({ ph: 7.52, paco2: 28, hco3: 22 }))).toBe("aguda");
  });

  it("distúrbio metabólico não tem temporalidade", () => {
    expect(temporalidade(gaso({ ph: 7.25, paco2: 28, hco3: 12 }))).toBeNull();
  });

  it("distúrbio misto não tem temporalidade", () => {
    expect(temporalidade(gaso({ ph: 7.15, paco2: 55, hco3: 18 }))).toBeNull();
  });
});

describe("hipercapniaCronica", () => {
  // Resposta do mentor a dois casos concretos: qualquer um dos dois basta.
  it("caso A: só o pH bate", () => {
    expect(hipercapniaCronica(gaso({ ph: 7.36, paco2: 55, hco3: 26 }))).toBe(true);
  });

  it("caso B: só o bicarbonato bate", () => {
    expect(hipercapniaCronica(gaso({ ph: 7.3, paco2: 55, hco3: 30 }))).toBe(true);
  });

  it("nenhum dos dois bate", () => {
    expect(hipercapniaCronica(gaso({ ph: 7.25, paco2: 55, hco3: 26 }))).toBe(false);
  });

  // O E externo continua sendo E: sem PaCO₂ elevada não há hipercapnia.
  it("sem PaCO₂ elevada é falso mesmo com bicarbonato alto", () => {
    expect(hipercapniaCronica(gaso({ ph: 7.45, paco2: 40, hco3: 32 }))).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: FALHA, as funções não existem.

- [ ] **Step 3: Implementar**

Acrescente a `src/lib/gasometria.ts`:

```ts
export type Temporalidade = "aguda" | "cronica" | "indeterminada";

/**
 * Variação esperada do HCO₃⁻ por 10 mmHg de desvio da PaCO₂ em relação a 40.
 *
 * O 5,0 da acidose crônica é PARECER do mentor (01/09/2026): Berend 2014 dá a
 * faixa de 4 a 5 e Martinu 2003 mediu 5,1 em DPOC estável. Nenhuma das duas
 * diz 5,0. Os demais são de Berend 2014; o −4,5 da alcalose crônica é o meio
 * da faixa de −4 a −5 que a revisão publica.
 */
const DELTA_HCO3_POR_10 = {
  acidoseAguda: 1,
  acidoseCronica: 5.0,
  alcaloseAguda: 2,
  alcaloseCronica: 4.5,
} as const;

/**
 * Tolerância para o app se recusar a rotular. Não é limiar clínico: é o quanto
 * o bicarbonato medido pode se afastar do mais próximo dos dois valores
 * esperados antes de "indeterminada" ser a resposta honesta.
 */
const TOLERANCIA_HCO3 = 3;

/**
 * Aguda ou crônica, decidida pelo BICARBONATO.
 *
 * A regra do pH por 10 mmHg (0,08 agudo, 0,03 crônico) é convenção de
 * livro-texto sem estudo primário rastreável, e por isso é só leitura auxiliar
 * na tela — ver `parecer_ph_por_10`. Ela não decide nada aqui.
 *
 * Devolve null em distúrbio metabólico ou misto: não há compensação
 * respiratória a datar.
 */
export function temporalidade(e: EntradaGasometria): Temporalidade | null {
  const d = disturbioPrimario(e);
  if (d !== "acidose_respiratoria" && d !== "alcalose_respiratoria") return null;
  if (!num(e.paco2) || !num(e.hco3)) return null;

  const unidades = (e.paco2 - 40) / 10;
  const agudo = d === "acidose_respiratoria"
    ? DELTA_HCO3_POR_10.acidoseAguda
    : DELTA_HCO3_POR_10.alcaloseAguda;
  const cronico = d === "acidose_respiratoria"
    ? DELTA_HCO3_POR_10.acidoseCronica
    : DELTA_HCO3_POR_10.alcaloseCronica;

  // Os coeficientes são MAGNITUDES positivas e quem carrega a direção é
  // `unidades`, que já é negativo quando a PaCO₂ está abaixo de 40. Coeficiente
  // negativo aqui inverteria o sinal duas vezes e faria o bicarbonato esperado
  // SUBIR na alcalose respiratória, que é o oposto do que acontece.
  const esperadoAgudo = 24 + agudo * unidades;
  const esperadoCronico = 24 + cronico * unidades;

  const distAgudo = Math.abs(e.hco3 - esperadoAgudo);
  const distCronico = Math.abs(e.hco3 - esperadoCronico);

  if (Math.min(distAgudo, distCronico) > TOLERANCIA_HCO3) return "indeterminada";
  return distAgudo <= distCronico ? "aguda" : "cronica";
}

/**
 * Critério da BTS para hipercapnia de longa data.
 *
 * A diretriz escreve "pH ≥ 7,35 e/ou HCO₃⁻ > 28". O mentor resolveu o "e/ou"
 * para OU em 01/09/2026, apresentados dois casos concretos. É o critério mais
 * SENSÍVEL dos dois: marca como crônico mais gente do que o E marcaria, e por
 * isso a tela diz "compatível com", nunca "é".
 *
 * O E externo continua sendo E: sem PaCO₂ elevada não há hipercapnia nenhuma.
 */
export function hipercapniaCronica(e: EntradaGasometria): boolean {
  if (!num(e.paco2) || e.paco2 <= FAIXAS.paco2.max) return false;
  const phCompativel = num(e.ph) && e.ph >= 7.35;
  const hco3Compativel = num(e.hco3) && e.hco3 > 28;
  return phCompativel || hco3Compativel;
}
```

Note que `esperadoAgudo` e `esperadoCronico` simplificam para
`24 + coeficiente * unidades` quando o sinal do coeficiente já acompanha a
direção. Se durante a implementação a expressão com `Math.sign` produzir
resultado errado em algum dos testes, substitua pela forma direta
`24 + coeficiente * unidades` e confirme os quatro testes de temporalidade.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: PASSA.

- [ ] **Step 5: Provar que os testes podem falhar**

Troque `DELTA_HCO3_POR_10.acidoseCronica` de `5.0` para `1`.
Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: FALHA em "bicarbonato próximo do crônico".

Depois troque o `||` de `hipercapniaCronica` por `&&`.
Esperado: FALHA nos casos A e B. Reverta os dois.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gasometria.ts src/lib/gasometria.test.ts
git commit -m "feat(gaso): decide aguda ou cronica pelo bicarbonato"
```

---

### Task 5: Compensação e ânion gap

**Files:**
- Modify: `src/lib/gasometria.ts`
- Modify: `src/lib/gasometria.test.ts`

**Interfaces:**
- Produces: `Compensacao`, `AnionGap`, `compensacao()`, `anionGap()`,
  `ALBUMINA_REFERENCIA`.

**A decisão que precisa de teste:** a alcalose metabólica **não** ganha número.
Foi resposta explícita do mentor depois de saber que o estudo primário da
fórmula de 0,7 é em cães e que Berend 2014 registra em nota de rodapé que a
previsão neste distúrbio é difícil. Sem teste, uma fase futura "conserta" a
ausência achando que faltou implementar.

- [ ] **Step 1: Escrever os testes que falham**

```ts
describe("compensacao", () => {
  // Winters: 1,5 × 12 + 8 = 26, margem ± 2.
  it("acidose metabólica: usa Winters", () => {
    const c = compensacao(gaso({ ph: 7.25, paco2: 26, hco3: 12 }));
    expect(c).not.toBeNull();
    expect(c!.esperada).toBeCloseTo(26, 5);
    expect(c!.margem).toBe(2);
    expect(c!.adequada).toBe(true);
  });

  it("acidose metabólica: PaCO₂ fora da margem é compensação inadequada", () => {
    const c = compensacao(gaso({ ph: 7.2, paco2: 34, hco3: 12 }));
    expect(c!.adequada).toBe(false);
  });

  // DECISÃO DO MENTOR, 01/09/2026: na alcalose metabólica o app NÃO dá número.
  // A fórmula de 0,7 tem estudo primário em CÃES e Berend 2014 avisa em nota
  // de rodapé que a previsão aqui é difícil. Se este teste começar a falhar
  // porque alguém implementou o cálculo, a implementação é que está errada.
  it("alcalose metabólica NÃO tem número de compensação", () => {
    expect(compensacao(gaso({ ph: 7.5, paco2: 45, hco3: 34 }))).toBeNull();
  });

  it("distúrbio respiratório não usa Winters", () => {
    expect(compensacao(gaso({ ph: 7.25, paco2: 60, hco3: 26 }))).toBeNull();
  });
});

describe("anionGap", () => {
  it("calcula sem potássio", () => {
    const ag = anionGap(gaso({ na: 140, cl: 105, hco3: 20 }));
    expect(ag!.bruto).toBeCloseTo(15, 5);
  });

  // Em UTI a albumina baixa derruba o gap calculado. Sem correção o app
  // deixaria de enxergar acidose exatamente na população que ele atende.
  it("corrige pela albumina", () => {
    const ag = anionGap(gaso({ na: 140, cl: 105, hco3: 20, albumina: 2.0 }));
    expect(ag!.corrigido).toBeCloseTo(20, 5);
    expect(ag!.albuminaUsada).toBe(2.0);
  });

  it("albumina normal não muda o valor", () => {
    const ag = anionGap(gaso({ na: 140, cl: 105, hco3: 20, albumina: 4.0 }));
    expect(ag!.corrigido).toBeCloseTo(15, 5);
  });

  // Sem albumina o app NÃO adivinha: não usa 4,0 como se fosse medida, e não
  // rotula o bruto como corrigido.
  it("sem albumina, corrigido é null", () => {
    const ag = anionGap(gaso({ na: 140, cl: 105, hco3: 20 }));
    expect(ag!.corrigido).toBeNull();
    expect(ag!.albuminaUsada).toBeNull();
  });

  it("sem sódio ou sem cloro, não há ânion gap", () => {
    expect(anionGap(gaso({ na: null, cl: 105, hco3: 20 }))).toBeNull();
    expect(anionGap(gaso({ na: 140, cl: null, hco3: 20 }))).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: FALHA, as funções não existem.

- [ ] **Step 3: Implementar**

```ts
export interface Compensacao {
  esperada: number;
  medida: number;
  margem: number;
  adequada: boolean;
}

const MARGEM_WINTERS = 2;

/**
 * Compensação respiratória PREVISTA.
 *
 * Só existe na acidose metabólica, pela fórmula de Winters
 * (Albert, Dell e Winters, 1967): PaCO₂ esperada = 1,5 × HCO₃⁻ + 8 ± 2.
 *
 * NA ALCALOSE METABÓLICA O APLICATIVO NÃO DÁ NÚMERO, E ISSO É DELIBERADO.
 * Decisão do mentor em 01/09/2026, tomada depois de saber que o estudo
 * primário da fórmula de 0,7 é em CÃES (Madias 1984) e que Berend 2014
 * registra em nota de rodapé que a previsão neste distúrbio é difícil.
 * A tela diz que se espera hipoventilação e que a previsão quantitativa aqui
 * é pouco confiável. Isto NÃO é implementação faltando.
 */
export function compensacao(e: EntradaGasometria): Compensacao | null {
  if (disturbioPrimario(e) !== "acidose_metabolica") return null;
  if (!num(e.hco3) || !num(e.paco2)) return null;
  const esperada = 1.5 * e.hco3 + 8;
  return {
    esperada,
    medida: e.paco2,
    margem: MARGEM_WINTERS,
    adequada: Math.abs(e.paco2 - esperada) <= MARGEM_WINTERS,
  };
}

export interface AnionGap {
  bruto: number;
  /** null quando não há albumina: a correção não é adivinhada. */
  corrigido: number | null;
  albuminaUsada: number | null;
}

/** Albumina de referência da correção de Figge. Fixa, e visível na tela. */
export const ALBUMINA_REFERENCIA = 4.0;
const CORRECAO_POR_G_DL = 2.5;

/**
 * Ânion gap sem potássio: Na⁺ − (Cl⁻ + HCO₃⁻). Fórmula de Berend 2014,
 * confirmada pelo mentor em 01/09/2026.
 *
 * A correção pela albumina (Figge 1998, medida em 152 pacientes de UTI) não é
 * refinamento acadêmico aqui: hipoalbuminemia é regra em paciente crítico e
 * derruba o gap calculado, escondendo acidose por ânion gap elevado.
 *
 * O aplicativo NÃO afirma faixa de normalidade: ela depende do analisador do
 * laboratório e as fontes divergem de 3-12 a 8,5-15.
 */
export function anionGap(e: EntradaGasometria): AnionGap | null {
  if (!num(e.na) || !num(e.cl) || !num(e.hco3)) return null;
  const bruto = e.na - (e.cl + e.hco3);
  if (!num(e.albumina)) return { bruto, corrigido: null, albuminaUsada: null };
  return {
    bruto,
    corrigido: bruto + CORRECAO_POR_G_DL * (ALBUMINA_REFERENCIA - e.albumina),
    albuminaUsada: e.albumina,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: PASSA.

- [ ] **Step 5: Provar que os testes podem falhar**

Faça `compensacao` calcular também na alcalose metabólica, devolvendo
`{ esperada: 0.7 * (e.hco3! - 24) + 40, ... }`.
Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: FALHA em "alcalose metabólica NÃO tem número de compensação".

Depois faça `anionGap` devolver o bruto como `corrigido` quando não há
albumina. Esperado: FALHA em "sem albumina, corrigido é null". Reverta os dois.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gasometria.ts src/lib/gasometria.test.ts
git commit -m "feat(gaso): calcula Winters e o anion gap corrigido"
```

---

### Task 6: Condutas e a interpretação completa

**Files:**
- Create: `src/lib/condutas.ts`
- Modify: `src/lib/gasometria.ts`
- Modify: `src/lib/gasometria.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 3 a 5.
- Produces: `Conduta` (de `condutas.ts`), `Interpretacao`, `interpretar()`.
  Consumido pelas Tasks 7 e 8.

- [ ] **Step 1: Escrever os testes que falham**

```ts
describe("interpretar", () => {
  it("devolve null sem os três parâmetros mínimos", () => {
    expect(interpretar(gaso({ hco3: null }))).toBeNull();
  });

  it("o retentor crônico sai completo", () => {
    const r = interpretar(gaso({ ph: 7.38, paco2: 60, hco3: 34 }))!;
    expect(r.disturbio).toBe("acidose_respiratoria");
    expect(r.temporalidade).toBe("cronica");
    expect(r.hipercapniaCronica).toBe(true);
    expect(r.compensacao).toBeNull();
  });

  // Gatilho do mentor: pH < 7,20.
  it("sinaliza bicarbonato abaixo de 7,20", () => {
    const r = interpretar(gaso({ ph: 7.15, paco2: 26, hco3: 10 }))!;
    const c = r.condutas.find((x) => /bicarbonato/i.test(x.texto));
    expect(c).toBeDefined();
    expect(c!.alcada).toBe("medica");
  });

  it("não sinaliza bicarbonato em 7,25", () => {
    const r = interpretar(gaso({ ph: 7.25, paco2: 28, hco3: 12 }))!;
    expect(r.condutas.some((x) => /bicarbonato/i.test(x.texto))).toBe(false);
  });

  // O tipo Conduta não tem campo de dose, e nenhum texto pode trazer número
  // de mEq: quem prescreve é a equipe médica.
  it("nenhuma conduta carrega dose", () => {
    const r = interpretar(gaso({ ph: 7.1, paco2: 26, hco3: 8 }))!;
    for (const c of r.condutas) {
      expect(c).not.toHaveProperty("dose");
      expect(c.texto).not.toMatch(/\d+\s*(mEq|mg|ml|mL)\b/);
    }
  });

  it("hipercapnia crônica traz o alvo de saturação do DPOC", () => {
    const r = interpretar(gaso({ ph: 7.38, paco2: 60, hco3: 34 }))!;
    const c = r.condutas.find((x) => /88/.test(x.texto));
    expect(c).toBeDefined();
    expect(c!.alcada).toBe("fisio");
  });

  it("as chaves de fonte cobrem o ânion gap só quando ele existe", () => {
    const sem = interpretar(gaso({ ph: 7.4, paco2: 40, hco3: 24 }))!;
    expect(sem.sourceKeys).not.toContain("anionGap");
    const com = interpretar(gaso({ ph: 7.4, paco2: 40, hco3: 24, na: 140, cl: 105 }))!;
    expect(com.sourceKeys).toContain("anionGap");
  });

  it("as chaves de fonte cobrem o DPOC só na hipercapnia crônica", () => {
    const sem = interpretar(gaso({ ph: 7.25, paco2: 60, hco3: 26 }))!;
    expect(sem.sourceKeys).not.toContain("dpocOxigenio");
    const com = interpretar(gaso({ ph: 7.38, paco2: 60, hco3: 34 }))!;
    expect(com.sourceKeys).toContain("dpocOxigenio");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/gasometria.test.ts`
Esperado: FALHA.

- [ ] **Step 3: Criar `src/lib/condutas.ts`**

```ts
// ============================================================
// Conduta sugerida — Ventila Fisio
// ============================================================
import type { SourceKey } from "./references";

/**
 * Sugestão de conduta.
 *
 * O TIPO NÃO TEM CAMPO DE DOSE, e isso é deliberado: não existe onde escrever
 * um número de mEq. Quem quiser prescrever no futuro terá de alterar este
 * tipo, e aí é decisão consciente e não deslize de implementação.
 *
 * `alcada` "medica" aparece na tela visualmente distinta e sempre acompanhada
 * de que quem decide é a equipe médica.
 */
export interface Conduta {
  texto: string;
  alcada: "fisio" | "medica";
  sourceKey: SourceKey;
}
```

- [ ] **Step 4: Implementar `interpretar`**

Acrescente ao fim de `src/lib/gasometria.ts`:

```ts
import type { Conduta } from "./condutas";
import type { SourceKey } from "./references";

export interface Interpretacao {
  disturbio: DisturbioPrimario;
  /** null em distúrbio metabólico ou misto. */
  temporalidade: Temporalidade | null;
  /** Só na acidose metabólica. Ver `compensacao`. */
  compensacao: Compensacao | null;
  /**
   * Não é opcional: `interpretar` só devolve resultado com os três parâmetros
   * presentes, e com eles o critério da BTS é sempre decidível. Um null que não
   * pode acontecer vira ramo morto que ninguém consegue testar.
   */
  hipercapniaCronica: boolean;
  anionGap: AnionGap | null;
  condutas: Conduta[];
  /** Derivadas do resultado, não escritas à mão no painel. */
  sourceKeys: SourceKey[];
}

/** Limiar do bicarbonato, parecer do mentor em 01/09/2026. */
const PH_BICARBONATO = 7.2;

export function interpretar(e: EntradaGasometria): Interpretacao | null {
  const disturbio = disturbioPrimario(e);
  if (disturbio === null) return null;

  const temp = temporalidade(e);
  const cronica = hipercapniaCronica(e);
  const ag = anionGap(e);
  const condutas: Conduta[] = [];

  if (num(e.ph) && e.ph < PH_BICARBONATO) {
    condutas.push({
      texto:
        "Considerar bicarbonato de sódio. A indicação e a dose são da equipe médica.",
      alcada: "medica",
      sourceKey: "acidoBase",
    });
  }
  if (disturbio === "acidose_respiratoria" && temp === "aguda") {
    condutas.push({
      texto: "Reavaliar o volume-minuto: frequência e volume corrente.",
      alcada: "fisio",
      sourceKey: "acidoBase",
    });
  }
  if (disturbio === "alcalose_respiratoria") {
    condutas.push({
      texto:
        "Verificar hiperventilação induzida pelo ventilador antes de atribuir o quadro ao paciente.",
      alcada: "fisio",
      sourceKey: "acidoBase",
    });
  }
  if (cronica) {
    condutas.push({
      texto:
        "Alvo de SpO₂ de 88 a 92%. Saturação acima da faixa não é melhor neste paciente.",
      alcada: "fisio",
      sourceKey: "dpocOxigenio",
    });
  }

  const sourceKeys: SourceKey[] = ["acidoBase"];
  if (ag) sourceKeys.push("anionGap");
  if (cronica) sourceKeys.push("dpocOxigenio");

  return {
    disturbio,
    temporalidade: temp,
    compensacao: compensacao(e),
    hipercapniaCronica: cronica,
    anionGap: ag,
    condutas,
    sourceKeys,
  };
}
```

Mova o `import type { SourceKey }` para o topo do arquivo, junto dos outros
imports; o bloco acima o repete só para deixar a dependência explícita.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde.

- [ ] **Step 6: Provar que os testes podem falhar**

Troque `PH_BICARBONATO` para `7.4`.
Esperado: FALHA em "não sinaliza bicarbonato em 7,25".

Depois faça `sourceKeys` ser sempre `["acidoBase", "anionGap", "dpocOxigenio"]`.
Esperado: FALHA nos dois testes de cobertura de fonte. Reverta.

- [ ] **Step 7: Commit**

```bash
git add src/lib/condutas.ts src/lib/gasometria.ts src/lib/gasometria.test.ts
git commit -m "feat(gaso): monta a interpretacao completa e as condutas"
```

---

### Task 7: O painel

**Files:**
- Create: `src/components/patient/GasometriaPanel.tsx`
- Create: `src/components/patient/GasometriaPanel.test.tsx`

**Interfaces:**
- Consumes: `interpretar`, `Interpretacao`, `ALBUMINA_REFERENCIA` da Task 6;
  `Panel` de `../ui`; `SourceFooter` de `../SourceFooter`.
- Produces: `<GasometriaPanel ev={DailyEvolution} />`, montado na Task 8.

Leia `src/components/patient/TrePanel.tsx` antes de escrever: mesmo formato de
`Panel`, mesmo uso de `SourceFooter`, mesma convenção de `data-testid`.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GasometriaPanel } from "./GasometriaPanel";
import type { DailyEvolution } from "../../types";

const ev = (over: Partial<DailyEvolution> = {}): DailyEvolution =>
  ({
    id: "e1", patient_id: "p1", owner_id: "u1", recorded_at: "2026-09-01T10:00:00Z",
    mode: null, fr: null, vc: null, peep: null, fio2: null, ppico: null, pplat: null,
    flow: null, ph: 7.4, pao2: null, paco2: 40, spo2: null, hco3: 24, be: 0,
    na: null, cl: null, albumina: null, pimax: null, peak_cough_flow: null,
    glasgow: null, rass: null, ims: null, mrc: {}, tre_result: null, hr: null,
    sbp: null, dbp: null, lactate: null, vasopressor: null, notes: null,
    imaging: {}, iv_meds: {}, feeding: {},
    ...over,
  }) as DailyEvolution;

describe("GasometriaPanel", () => {
  it("sem os três parâmetros, avisa em vez de interpretar", () => {
    render(<GasometriaPanel ev={ev({ hco3: null })} />);
    expect(screen.queryByTestId("gaso-disturbio")).not.toBeInTheDocument();
  });

  it("nomeia o distúrbio do retentor crônico", () => {
    render(<GasometriaPanel ev={ev({ ph: 7.38, paco2: 60, hco3: 34 })} />);
    expect(screen.getByTestId("gaso-disturbio")).toHaveTextContent(/acidose respiratória/i);
  });

  // "Compatível com", nunca "é": a distinção aguda x crônica é temporal e
  // depende da história do paciente, que o app não tem.
  it("diz compatível com, não afirma", () => {
    render(<GasometriaPanel ev={ev({ ph: 7.38, paco2: 60, hco3: 34 })} />);
    expect(screen.getByTestId("gaso-temporalidade")).toHaveTextContent(/compatível com/i);
  });

  // DECISÃO DO MENTOR: na alcalose metabólica não aparece número de PaCO₂
  // esperada. Este teste falha se alguém "consertar" a ausência.
  it("alcalose metabólica não mostra PaCO₂ esperada", () => {
    render(<GasometriaPanel ev={ev({ ph: 7.5, paco2: 45, hco3: 34 })} />);
    expect(screen.queryByTestId("gaso-compensacao")).not.toBeInTheDocument();
    expect(screen.getByTestId("gaso-alcalose-aviso")).toHaveTextContent(/pouco confiável/i);
  });

  it("acidose metabólica mostra a PaCO₂ esperada de Winters", () => {
    render(<GasometriaPanel ev={ev({ ph: 7.25, paco2: 26, hco3: 12 })} />);
    expect(screen.getByTestId("gaso-compensacao")).toHaveTextContent("26");
  });

  it("mostra o ânion gap bruto e o corrigido", () => {
    render(<GasometriaPanel ev={ev({ na: 140, cl: 105, hco3: 20, albumina: 2 })} />);
    const ag = screen.getByTestId("gaso-anion-gap");
    expect(ag).toHaveTextContent("15");
    expect(ag).toHaveTextContent("20");
  });

  it("sem albumina não inventa valor corrigido", () => {
    render(<GasometriaPanel ev={ev({ na: 140, cl: 105, hco3: 20 })} />);
    expect(screen.getByTestId("gaso-anion-gap")).not.toHaveTextContent(/corrigido/i);
  });

  it("sem sódio e cloro não mostra ânion gap nenhum", () => {
    render(<GasometriaPanel ev={ev()} />);
    expect(screen.queryByTestId("gaso-anion-gap")).not.toBeInTheDocument();
  });

  it("conduta de alçada médica avisa de quem é a decisão", () => {
    render(<GasometriaPanel ev={ev({ ph: 7.15, paco2: 26, hco3: 10 })} />);
    expect(screen.getByTestId("gaso-condutas")).toHaveTextContent(/equipe médica/i);
  });

  // O rodapé cita o parecer que sustenta o 5,0, e não só as publicações.
  it("cita as fontes do que exibe", () => {
    render(<GasometriaPanel ev={ev({ ph: 7.38, paco2: 60, hco3: 34 })} />);
    const fonte = screen.getByTestId("gaso-fonte");
    expect(fonte).toHaveTextContent(/Berend, 2014/);
    expect(fonte).toHaveTextContent(/Parecer clínico \(compensação crônica\), 2026/);
    expect(fonte).toHaveTextContent(/Austin, 2010/);
  });

  it("sem hipercapnia crônica não cita o DPOC", () => {
    render(<GasometriaPanel ev={ev({ ph: 7.25, paco2: 60, hco3: 26 })} />);
    expect(screen.getByTestId("gaso-fonte")).not.toHaveTextContent(/Austin, 2010/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/GasometriaPanel.test.tsx`
Esperado: FALHA, o componente não existe.

- [ ] **Step 3: Implementar**

Escreva `src/components/patient/GasometriaPanel.tsx` seguindo o padrão de
`TrePanel.tsx`. Requisitos, todos verificados pelos testes acima:

- `Panel` com título "Gasometria interpretada" e `sub` curto.
- Sem interpretação (`interpretar` devolveu `null`), mostra só a dica de que
  faltam pH, PaCO₂ ou HCO₃⁻. Nenhum `data-testid` de conteúdo é renderizado.
- `data-testid="gaso-disturbio"` com o nome do distúrbio por extenso. Mapa de
  rótulo para cada valor de `DisturbioPrimario`, com fallback para valor fora
  do domínio.
- `data-testid="gaso-temporalidade"`, só em distúrbio respiratório, com o texto
  começando em "Compatível com quadro ...". Nunca "É ...".
- `data-testid="gaso-compensacao"` só quando `compensacao` não é null, com a
  PaCO₂ esperada, a margem e se está adequada.
- `data-testid="gaso-alcalose-aviso"` só na alcalose metabólica, com a frase de
  que se espera hipoventilação e que a previsão quantitativa neste distúrbio é
  pouco confiável. **Sem número.**
- `data-testid="gaso-anion-gap"` só quando `anionGap` não é null. Mostra o
  bruto; mostra "corrigido para albumina X: Y" apenas quando `corrigido` não é
  null. Junto, o aviso de que a faixa normal depende do analisador do
  laboratório e a albumina de referência (`ALBUMINA_REFERENCIA`).
- `data-testid="gaso-condutas"`, lista. Conduta de `alcada: "medica"` sai
  visualmente distinta e acompanhada de "quem decide é a equipe médica".
- Leitura auxiliar do pH por 10 mmHg, rotulada como convenção sem estudo
  primário, em texto secundário.
- `<div data-testid="gaso-fonte"><SourceFooter sourceKeys={r.sourceKeys} /></div>`
  — as chaves vêm do resultado, nunca de lista escrita à mão. Este projeto
  embarcou três vezes um painel cujo rodapé não cobria o que ele exibia.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde.

- [ ] **Step 5: Provar que os testes podem falhar**

Troque `sourceKeys={r.sourceKeys}` por `sourceKeys={["acidoBase"]}`.
Esperado: FALHA em "cita as fontes do que exibe".

Depois renderize um `gaso-compensacao` também na alcalose metabólica.
Esperado: FALHA em "alcalose metabólica não mostra PaCO₂ esperada". Reverta.

- [ ] **Step 6: Commit**

```bash
git add src/components/patient/GasometriaPanel.tsx src/components/patient/GasometriaPanel.test.tsx
git commit -m "feat(gaso): adiciona o painel de gasometria interpretada"
```

---

### Task 8: Fiação na aba Evolução

**Files:**
- Modify: `src/pages/PatientDetail.tsx` (bloco `tab === "evolucao"`, linha ~168)
- Modify: `src/pages/PatientDetail.test.tsx`

Fecha a fase. O painel funciona isolado e isso não prova que está montado. Sem
este teste, apagar a linha do `<GasometriaPanel/>` não quebraria nada — foi
exatamente o defeito que a Fase 2 embarcou e teve que corrigir depois.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
it("mostra o painel de gasometria na aba Evolução", async () => {
  db.patient = { ...PACIENTE_BASE };
  db.evolutions = [{ ...EVOLUCAO_BASE, ph: 7.38, paco2: 60, hco3: 34 }];
  renderDetail();
  const painel = (await screen.findByText(/Gasometria interpretada/i)).closest("section")!;
  expect(within(painel).getByTestId("gaso-disturbio")).toHaveTextContent(/acidose respiratória/i);
});
```

Confira como os outros testes do arquivo montam `db.evolutions` e qual é o nome
real das constantes de fixture antes de escrever; use as que existem.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Esperado: FALHA, "Unable to find ... Gasometria interpretada".

- [ ] **Step 3: Montar o painel**

No bloco `tab === "evolucao"`, logo depois do `Dashboard` e antes do
`MotorPanel`:

```tsx
          {last && <GasometriaPanel ev={last} />}
```

E o import no topo do arquivo.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde.

- [ ] **Step 5: Provar que o teste pode falhar**

Apague a linha do `<GasometriaPanel/>`.
Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Esperado: FALHA no teste novo. Restaure.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PatientDetail.tsx src/pages/PatientDetail.test.tsx
git commit -m "feat(gaso): monta o painel de gasometria na aba evolucao"
```

---

## Depois da última tarefa

1. Review final da branch inteira.
2. `CLAUDE.md` ganha a seção da Fase 6: o `sem_disturbio` que exige os três
   parâmetros, a decisão de não dar número na alcalose metabólica, a armadilha
   do BE, e o estado atualizado da suíte.
3. **O Jeann roda o DDL das três colunas no Supabase.** Sem ele o formulário
   grava normalmente os campos que já existem e falha nos três novos.
