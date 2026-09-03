# Fase 8 — Alvo por patologia: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development
> (recomendado) ou superpowers:executing-plans para executar este plano tarefa a
> tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** ligar patologia a alvo ventilatório — DPOC e asma modulam PEEP,
frequência e tempo expiratório em direções opostas; lesão cerebral aguda ganha
alvo de PaCO₂; a obesidade ganha o aviso que a evidência sustenta — com cada
modulação carregando razão e fonte, e as doze patologias sem base publicada não
modulando nada.

**Arquitetura:** o `Alvo<T>` da Fase 3 já carrega valor, base e modulações;
esta fase preenche as modulações. `PatologiaKey` deixa de ser `string` e vira
união fechada de três membros. `sugerirPeepFio2` e `sugerirVentilacao` passam a
receber o `PerfilClinico`.

**Stack:** Vite + React 18 + TypeScript, Vitest + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-02-fase8-alvo-por-patologia-design.md`
**Pesquisa clínica:** `docs/dossie-clinico-fase8.md`

## Restrições globais

- **pnpm, nunca npm.** `pnpm test` roda a suíte; `pnpm build` roda
  `tsc --noEmit && vite build`. Um arquivo: `pnpm vitest run <caminho>`.
- **Base de partida: 527 testes em 28 arquivos, verdes, build limpo.**
- **`tsconfig.json` não inclui os tipos de Node.** `node:fs` e `__dirname`
  passam no vitest e **quebram o `pnpm build`**.
- **Repositório PÚBLICO.** Sem segredo, sem dado real de paciente. Parecer é
  sempre `profissional: "Mentor clínico do projeto"`, nunca nome real.
- **Comentários, texto de tela e nome de teste em português.**
- **Commits:** Conventional Commits em português, imperativo, até 72
  caracteres, sem emoji, sem `Co-Authored-By`, sem rodapé de IA, sem travessão.
- **Não refatorar `PatientDetail.tsx`** (~1000 linhas). Desvio registrado.
- **`SourceKey` é união fechada**; `THRESHOLD_SOURCES` e o `LABELS` de
  `src/pages/Sources.tsx` são exaustivos. Chave nova sem rótulo quebra o `tsc`.
- **Nenhum número clínico novo além dos que o spec lista.** Em particular:
  **não existe piso de PEEP para o obeso**, e o DPOC **não recebe um número
  único de teto** — a faixa é 80 a 85%, com as duas fontes citadas.
- **Ausência de dado não é resultado normal.** Auto-PEEP zero é medida
  (ausência de auto-PEEP, achado favorável); auto-PEEP ausente não vira zero.
- **DPOC e asma nunca são tratadas como "obstrutivo" genérico.** A PEEP vai em
  direções opostas, e confundi-las erra uma das duas.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/data/references.ts` | 5 publicações e 1 parecer novos |
| `src/lib/references.ts` | chaves `obstrutivo`, `obesidadeVentilacao`, `lesaoCerebral` |
| `src/pages/Sources.tsx` | rótulo das 3 chaves |
| `src/data/comorbidities.ts` | `lesao_cerebral_aguda` |
| `src/lib/perfil.ts` | `PatologiaKey` fechada; `derivarPerfil` filtra |
| `src/types/index.ts` | `auto_peep` em `DailyEvolution` |
| `src/lib/measurement-limits.ts` | plausibilidade do `auto_peep` |
| `supabase/schema.sql` | coluna `auto_peep` |
| `src/lib/alvos.ts` | modulações de PEEP, frequência e o alvo de PaCO₂ |
| `src/components/patient/LinhaModulacaoSimples.tsx` | linha de modulação sem faixa base |
| `src/components/patient/Dashboard.tsx` | consome os alvos modulados |
| `src/pages/PatientDetail.tsx` | `AdmissionCard` idem |

---

### Task 1: Fontes e chaves

**Files:**
- Modify: `src/data/references.ts`
- Modify: `src/lib/references.ts`
- Modify: `src/pages/Sources.tsx`
- Test: `src/lib/references.test.ts`

**Interfaces:**
- Produces: as chaves `"obstrutivo"`, `"obesidadeVentilacao"` e
  `"lesaoCerebral"` em `SourceKey`, usadas pelas Tasks 4, 5 e 6.

Existe um teste que proíbe referência órfã: toda entrada do catálogo precisa
ser citada por pelo menos uma chave. Catálogo e chaves no mesmo commit.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao fim de `src/lib/references.test.ts`:

```ts
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

  it("vcKg passa a citar o parecer junto das publicações", () => {
    expect(sourcesFor("vcKg").map((r) => r.id)).toContain("parecer_vc_obeso");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/references.test.ts`
Esperado: FALHA. As chaves e as entradas não existem.

- [ ] **Step 3: Acrescentar as publicações**

Em `src/data/references.ts`, no array `REFERENCES`, antes das entradas de
`Parecer` que já estão no fim:

```ts
  {
    id: "demoule_2020",
    citacaoCurta: "Demoule, 2020",
    autores:
      "Demoule A, Brochard L, Dres M, Heunks L, Jubran A, Laghi F, Mekontso-Dessap A, Nava S, Ouanes-Besbes L, Peñuelas O, Piquilloud L, Vassilakopoulos T, Mancebo J",
    titulo: "How to ventilate obstructive and asthmatic patients",
    veiculo: "Intensive Care Med 2020;46(12):2436-2449",
    ano: 2020,
    verificada: true,
    nota:
      "Revisão NARRATIVA, sem graduação GRADE. Na asma orienta PEEP externa baixa e relação I:E de 1:4 a 1:6; na DPOC diz que a PEEP externa não altera a hiperinsuflação até se aproximar de 80% do auto-PEEP. São direções OPOSTAS na PEEP para duas doenças obstrutivas.",
  },
  {
    id: "ranieri_1993",
    citacaoCurta: "Ranieri, 1993",
    autores:
      "Ranieri VM, Giuliani R, Cinnella G, Pesce C, Brienza N, Ippolito EL, Pomo V, Fiore T, Gottfried SB, Brienza A",
    titulo:
      "Physiologic effects of positive end-expiratory pressure in patients with chronic obstructive pulmonary disease during acute ventilatory failure and controlled mechanical ventilation",
    veiculo: "Am Rev Respir Dis 1993;147(1):5-13",
    ano: 1993,
    verificada: true,
    nota:
      "Nove pacientes com DPOC em ventilação controlada. Situa o limite em 85% do auto-PEEP, contra os 80% de Demoule 2020. A divergência é real e o aplicativo exibe a faixa em vez de escolher um dos dois.",
  },
  {
    id: "probese_2019",
    citacaoCurta: "PROBESE, 2019",
    autores:
      "Bluth T, Serpa Neto A, Schultz MJ, Pelosi P, Gama de Abreu M, et al. (PROBESE Collaborative Group)",
    titulo:
      "Effect of Intraoperative High Positive End-Expiratory Pressure (PEEP) With Recruitment Maneuvers vs Low PEEP on Postoperative Pulmonary Complications in Obese Patients: A Randomized Clinical Trial",
    veiculo: "JAMA 2019;321(23):2292-2305",
    ano: 2019,
    verificada: true,
    nota:
      "Ensaio randomizado, 2013 adultos obesos, 77 centros. PEEP 12 com recrutamento contra PEEP 4: sem diferença no desfecho primário (21,3% contra 23,6%). É INTRAOPERATÓRIO, não de UTI, e o aplicativo o usa só na direção negativa: não autoriza recrutamento de rotina com PEEP alta. Não sustenta piso de PEEP nenhum.",
  },
  {
    id: "dejong_2020",
    citacaoCurta: "De Jong, 2020",
    autores:
      "De Jong A, Wrigge H, Hedenstierna G, Gattinoni L, Chiumello D, Frat JP, Ball L, Schetz M, Pickkers P, Jaber S",
    titulo: "How to ventilate obese patients in the ICU",
    veiculo: "Intensive Care Med 2020;46(12):2423-2435",
    ano: 2020,
    verificada: true,
    nota:
      "Revisão narrativa. Recomenda volume corrente baixo pelo peso predito nos dois grupos, SDRA e não SDRA, e alerta que o peso predito ESTIMADO tende a ser superestimado no obeso. Dá a faixa de PEEP de 7 a 20 mas declara não propor algoritmo.",
  },
  {
    id: "robba_2020",
    citacaoCurta: "ESICM, 2020",
    autores:
      "Robba C, Poole D, McNett M, Asehnoune K, Bösel J, Bruder N, et al.",
    titulo:
      "Mechanical ventilation in patients with acute brain injury: recommendations of the European Society of Intensive Care Medicine consensus",
    veiculo: "Intensive Care Med 2020;46(12):2397-2410",
    ano: 2020,
    verificada: true,
    nota:
      "Alvo de PaCO₂ de 35 a 45 mmHg em lesão cerebral aguda: recomendação FORTE com evidência de qualidade BAIXA. Vale para o paciente SEM hipertensão intracraniana clinicamente significativa, e o aplicativo não conhece a pressão intracraniana.",
  },
```

- [ ] **Step 4: Acrescentar o parecer**

No mesmo array, junto dos pareceres:

```ts
  {
    id: "parecer_vc_obeso",
    citacaoCurta: "Parecer clínico (VC no obeso), 2026",
    profissional: "Mentor clínico do projeto",
    data: "02/09/2026",
    nota:
      "A faixa de 6 a 8 ml/kg de peso predito no obeso é escolha clínica, reafirmada depois de ver que De Jong 2020 recomenda 6 nos dois grupos e alerta que o peso predito estimado tende a ser superestimado nesse paciente.",
  },
```

- [ ] **Step 5: Acrescentar as chaves**

Em `src/lib/references.ts`, na união `SourceKey`, depois das chaves da mecânica:

```ts
  // alvo por patologia
  | "obstrutivo" | "obesidadeVentilacao" | "lesaoCerebral";
```

Em `THRESHOLD_SOURCES`, acrescente as três e **acrescente o parecer à chave
`vcKg` que já existe**, mantendo as fontes que ela já cita:

```ts
  obstrutivo: ["demoule_2020", "ranieri_1993"],
  obesidadeVentilacao: ["probese_2019", "dejong_2020"],
  lesaoCerebral: ["robba_2020"],
```

- [ ] **Step 6: Acrescentar os rótulos**

Em `src/pages/Sources.tsx`, no `LABELS`:

```ts
  obstrutivo: "Ventilação em DPOC e asma",
  obesidadeVentilacao: "Ventilação no paciente obeso",
  lesaoCerebral: "Alvo de PaCO₂ em lesão cerebral aguda",
```

- [ ] **Step 7: Rodar tudo**

Run: `pnpm test` e `pnpm build`
Esperado: verde, 527 + 6 testes.

- [ ] **Step 8: Commit**

```bash
git add src/data/references.ts src/lib/references.ts src/lib/references.test.ts src/pages/Sources.tsx
git commit -m "feat(alvo): cataloga as fontes do alvo por patologia"
```

---

### Task 2: O auto-PEEP

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/measurement-limits.ts`
- Modify: `src/pages/PatientDetail.tsx` (`EV_FIELDS`, `EV_SECTIONS`)
- Modify: `supabase/schema.sql`
- Test: `src/lib/measurement-limits.test.ts`

**Interfaces:**
- Produces: `auto_peep: number | null` em `DailyEvolution`, consumido pela
  Task 4.

**A armadilha:** **auto-PEEP zero é medida** — significa ausência de
auto-PEEP, que é achado real e favorável. `ACIMA_DE_ZERO` aqui barraria
justamente o paciente que não tem aprisionamento aéreo.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/lib/measurement-limits.test.ts`:

```ts
describe("auto-PEEP da Fase 8", () => {
  // Zero é MEDIDA: ausência de auto-PEEP, achado real e favorável.
  it("aceita auto-PEEP zero", () => {
    expect(invalidMeasurements({ auto_peep: "0" })).toEqual([]);
  });

  it("aceita auto-PEEP positivo", () => {
    expect(invalidMeasurements({ auto_peep: "8" })).toEqual([]);
  });

  it("barra auto-PEEP negativo", () => {
    expect(invalidMeasurements({ auto_peep: "-1" }).length).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/measurement-limits.test.ts`
Esperado: FALHA em "barra auto-PEEP negativo". Sem entrada no mapa,
`invalidMeasurements` ignora o campo em silêncio — é por isso que o teste de
aceitação sozinho não provaria nada.

- [ ] **Step 3: Acrescentar o limite**

Em `MEASUREMENT_LIMITS`, junto dos parâmetros de ventilação:

```ts
  // Auto-PEEP: ZERO É MEDIDA, e favorável — significa ausência de
  // aprisionamento aéreo. Nunca ACIMA_DE_ZERO aqui.
  auto_peep: { min: 0 },
```

- [ ] **Step 4: Acrescentar ao tipo**

Em `src/types/index.ts`, em `DailyEvolution`, junto de `peep`:

```ts
  auto_peep: number | null;
```

- [ ] **Step 5: Acrescentar ao formulário**

Em `EV_FIELDS`, depois de `{ k: "peep", label: "PEEP", unit: "cmH₂O" }`:

```ts
  { k: "auto_peep", label: "Auto-PEEP", unit: "cmH₂O" },
```

E acrescente `"auto_peep"` às `keys` da seção "Parâmetros do ventilador" em
`EV_SECTIONS`, logo depois de `"peep"`.

O payload do `save` percorre `EV_FIELDS`, então o campo passa a ser gravado sem
mudança no `save`. **Confirme isso lendo o código antes de seguir.**

- [ ] **Step 6: Acrescentar a coluna**

Em `supabase/schema.sql`, junto dos outros `alter table ... add column if not
exists` de `daily_evolutions`:

```sql
-- Auto-PEEP da Fase 8. Zero é medida (ausência de aprisionamento aéreo), não
-- campo vazio. Sustenta o teto de PEEP no DPOC, que é 80 a 85% deste valor.
alter table public.daily_evolutions add column if not exists auto_peep numeric;
```

- [ ] **Step 7: Rodar tudo**

Run: `pnpm test` e `pnpm build`
Esperado: verde. Fixtures de `DailyEvolution` sem cast podem quebrar por campo
faltando — acrescente `auto_peep: null`, **não** torne o campo opcional.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/lib/measurement-limits.ts src/lib/measurement-limits.test.ts src/pages/PatientDetail.tsx supabase/schema.sql
git commit -m "feat(alvo): captura o auto-PEEP na evolucao diaria"
```

Se algum arquivo de teste precisou do campo nas fixtures, acrescente-o ao
`git add` com caminho explícito e diga qual no relatório.

---

### Task 3: O vocabulário de patologia

**Files:**
- Modify: `src/data/comorbidities.ts`
- Modify: `src/lib/perfil.ts`
- Test: `src/lib/perfil.test.ts` (crie se não existir)

**Interfaces:**
- Produces: `PatologiaKey = "dpoc" | "asma" | "lesao_cerebral_aguda"` e
  `derivarPerfil` filtrando para essas três. Consumido pelas Tasks 4 e 5.

**A obesidade NÃO entra na união, e isso é deliberado.** Ela já modula o volume
corrente pelo `perfil.obeso`, derivado do IMC e não da caixinha — um paciente
obeso sem a comorbidade marcada continua recebendo a faixa 6-8, que é o
comportamento certo. Pôr `"obesidade"` também em `patologias` criaria duas
fontes de verdade para a mesma pergunta.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/lib/perfil.test.ts` (ou acrescente ao existente):

```ts
import { describe, it, expect } from "vitest";
import { derivarPerfil } from "./perfil";
import type { Patient } from "../types";

const paciente = (over: Partial<Patient> = {}): Patient =>
  ({
    id: "p-1", owner_id: "u-1", hospital_id: null, name: "Paciente Teste",
    age: 60, sex: "M", diagnosis: null, comorbidities: [],
    intubation_date: null, airway: "tot", height_cm: 170, weight_kg: 70,
    ventilator_id: null, current_mode: null, status: "active",
    discharge_reason: null, discharge_date: null,
    created_at: "2026-09-02T10:00:00Z", updated_at: "2026-09-02T10:00:00Z",
    ...over,
  }) as Patient;

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

  // As doze sem base publicada não modulam NADA, e isso é decisão registrada,
  // não lacuna. Provado na origem: se a chave não entra em `patologias`,
  // nenhuma função de alvo consegue reagir a ela.
  it.each([
    "fibrose", "bronquiectasia", "sahos", "tabagismo", "icc",
    "has", "dm", "drc", "neoplasia", "neuro", "obesidade",
  ])("%s não entra em patologias", (chave) => {
    expect(derivarPerfil(paciente({ comorbidities: [chave] })).patologias).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/perfil.test.ts`
Esperado: FALHA. `derivarPerfil` hoje copia as chaves cruas, então
`["dpoc", "has", "dm"]` volta inteiro.

- [ ] **Step 3: Acrescentar a comorbidade**

Em `src/data/comorbidities.ts`, no array `COMORBIDITIES`, depois de `neuro`:

```ts
  { key: "lesao_cerebral_aguda", label: "Lesão cerebral aguda", pulmonar: false },
```

- [ ] **Step 4: Fechar a união e filtrar**

Em `src/lib/perfil.ts`, substitua a declaração de `PatologiaKey` e o campo de
`derivarPerfil`:

```ts
/**
 * Patologia que modula algum alvo ventilatório. União fechada e curta de
 * propósito: só entram as que a Fase 8 decidiu, com fonte, que mudam um
 * número. Doze das comorbidades registradas não modulam nada, e isso é
 * decisão registrada, não lacuna.
 *
 * A OBESIDADE não está aqui: ela já modula o volume corrente pelo
 * `perfil.obeso`, derivado do IMC e não da caixinha. Um paciente obeso sem a
 * comorbidade marcada continua recebendo a faixa deslocada, que é o
 * comportamento certo — e pôr a chave aqui também criaria duas fontes de
 * verdade para a mesma pergunta.
 */
export type PatologiaKey = "dpoc" | "asma" | "lesao_cerebral_aguda";

const PATOLOGIAS_QUE_MODULAM: readonly PatologiaKey[] = [
  "dpoc",
  "asma",
  "lesao_cerebral_aguda",
] as const;

const ehPatologia = (k: string): k is PatologiaKey =>
  (PATOLOGIAS_QUE_MODULAM as readonly string[]).includes(k);
```

E em `derivarPerfil`, troque a linha de `patologias`:

```ts
    patologias: (patient.comorbidities ?? []).filter(ehPatologia),
```

Ajuste o comentário do campo `patologias` na interface para dizer o que ele
significa agora: **o que muda um alvo**, não o que o paciente tem.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde.

- [ ] **Step 6: Provar que o teste pode falhar**

Troque o filtro por `patient.comorbidities ?? []` de novo.
Run: `pnpm vitest run src/lib/perfil.test.ts`
Esperado: FALHA em "filtra para as que modulam alvo" e em "doença neurológica
genérica NÃO é lesão cerebral aguda". Reverta.

- [ ] **Step 7: Commit**

```bash
git add src/data/comorbidities.ts src/lib/perfil.ts src/lib/perfil.test.ts
git commit -m "feat(alvo): fecha o vocabulario de patologia que modula alvo"
```

---

### Task 4: A PEEP por patologia

**Files:**
- Modify: `src/lib/alvos.ts`
- Test: `src/lib/alvos.test.ts`

**Interfaces:**
- Consumes: `PerfilClinico` e `PatologiaKey` da Task 3.
- Produces: `sugerirPeepFio2(pf, spo2, perfil, autoPeep)` com a assinatura
  nova e `AlvoPeepFio2` com dois campos novos. Consumido pela Task 6.

**A mudança de tipo, e por que ela é necessária.** `AlvoPeepFio2.peep` é hoje
um número. O DPOC precisa de **faixa** (80 a 85% do auto-PEEP) ou de **nada**
(sem auto-PEEP medido). Então:

- `peep: number | null` — `null` quando o aplicativo não tem número a dar;
- `faixaPeep: { min: number; max: number } | null` — a faixa do DPOC.

Isso obriga os consumidores a tratar o caso "sem número", que é exatamente o
ponto: para um DPOC sem auto-PEEP medido, o aplicativo **genuinamente não tem**
sugestão de PEEP, e fingir que tem seria o defeito.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/lib/alvos.test.ts` (e ao import):

```ts
const perfilCom = (patologias: PatologiaKey[], over: Partial<PerfilClinico> = {}): PerfilClinico => ({
  pbw: 70, pbwEstimado: false, obeso: false, obesoIndeterminado: false,
  patologias, ...over,
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/alvos.test.ts`
Esperado: FALHA, a assinatura tem três parâmetros a menos.

- [ ] **Step 3: Implementar**

Em `src/lib/alvos.ts`, substitua `AlvoPeepFio2` e `sugerirPeepFio2`:

```ts
export interface AlvoPeepFio2 {
  fio2: number;
  /** null quando o aplicativo não tem número a dar. Ver `sugerirPeepFio2`. */
  peep: number | null;
  /** Faixa, usada no DPOC: 80 a 85% do auto-PEEP. null nos demais casos. */
  faixaPeep: { min: number; max: number } | null;
  presetAdmissao: boolean;
}

/** Teto de PEEP externa na asma (Demoule 2020). */
const PEEP_MAX_ASMA = 5;
/**
 * Fração do auto-PEEP que limita a PEEP externa no DPOC.
 *
 * Ranieri 1993 diz 85%; Demoule 2020 diz 80%. NÃO SÃO O MESMO NÚMERO, e o
 * aplicativo exibe a faixa citando as duas em vez de escolher um e esconder a
 * divergência.
 */
const FRACAO_AUTO_PEEP = { min: 0.8, max: 0.85 } as const;

/**
 * PEEP e FiO₂ sugeridas.
 *
 * Base: tabela low do ARDSnet, a partir da P/F e da SpO₂.
 *
 * DPOC e asma modulam em DIREÇÕES OPOSTAS, e o aplicativo nunca as trata como
 * "obstrutivo" genérico: na asma a PEEP externa é baixa; no DPOC o limite é
 * uma fração do auto-PEEP. Confundir as duas erra uma delas.
 *
 * No DPOC a tabela do ARDSnet NÃO SE APLICA. Sem auto-PEEP medido o
 * aplicativo não tem número a dar, e `peep` é null: devolver o da tabela seria
 * afirmar que ela vale ali.
 */
export function sugerirPeepFio2(
  pf: number | null,
  spo2: number | null,
  perfil: PerfilClinico,
  autoPeep: number | null
): Alvo<AlvoPeepFio2> {
  if (!num(pf) && !num(spo2)) {
    return semModulacao({ fio2: 100, peep: 5, faixaPeep: null, presetAdmissao: true });
  }
  let fio2: number;
  if (!num(pf)) fio2 = 40;
  else if (pf >= 300) fio2 = 30;
  else if (pf >= 200) fio2 = 40;
  else if (pf >= 100) fio2 = 60;
  else fio2 = 80;
  if (num(spo2) && spo2 < 90) fio2 = Math.min(100, fio2 + 10);
  const row = ARDSNET_LOW.find((r) => r.fio2 >= fio2) ?? ARDSNET_LOW[ARDSNET_LOW.length - 1];
  const base: AlvoPeepFio2 = {
    fio2: row.fio2, peep: row.peep, faixaPeep: null, presetAdmissao: false,
  };

  const temAsma = perfil.patologias.includes("asma");
  const temDpoc = perfil.patologias.includes("dpoc");
  if (!temAsma && !temDpoc) return semModulacao(base);

  // As duas marcadas: prevalece o teto mais conservador, e a modulação declara
  // as duas. Não é precedência clínica — o mentor não foi perguntado sobre o
  // paciente com as duas, e escolher a mais restritiva é a recusa de inventar
  // uma regra, não uma regra.
  if (temAsma) {
    const motivo = temDpoc
      ? "Asma e DPOC marcadas: aplicado o teto mais conservador, de 5 cmH₂O da asma. A PEEP externa alta agrava o aprisionamento aéreo."
      : "Asma: PEEP externa limitada a 5 cmH₂O. A tabela do ARDSnet não se aplica ao obstrutivo.";
    return {
      valor: { ...base, peep: Math.min(base.peep!, PEEP_MAX_ASMA) },
      base,
      modulacoes: [{ motivo, sourceKey: "obstrutivo" }],
    };
  }

  if (!num(autoPeep)) {
    return {
      valor: { ...base, peep: null, faixaPeep: null },
      base,
      modulacoes: [
        {
          motivo:
            "DPOC: a tabela do ARDSnet não se aplica. O limite da PEEP externa é 80 a 85% do auto-PEEP, que não foi medido — registre o auto-PEEP para o alvo aparecer.",
          sourceKey: "obstrutivo",
        },
      ],
    };
  }
  return {
    valor: {
      ...base,
      peep: null,
      faixaPeep: {
        min: autoPeep * FRACAO_AUTO_PEEP.min,
        max: autoPeep * FRACAO_AUTO_PEEP.max,
      },
    },
    base,
    modulacoes: [
      {
        motivo:
          "DPOC: a tabela do ARDSnet não se aplica. O limite da PEEP externa é 80 a 85% do auto-PEEP medido. Ranieri 1993 situa em 85% e Demoule 2020 em 80%; o aplicativo mostra a faixa em vez de escolher um dos dois.",
        sourceKey: "obstrutivo",
      },
    ],
  };
}
```

- [ ] **Step 4: Consertar os dois chamadores, minimamente**

`sugerirPeepFio2` ganhou dois parâmetros, então `Dashboard.tsx` e o
`sugestaoAdmissao` de `alvos.ts` deixam de compilar. Passe os argumentos:
no Dashboard, `perfil` e `ev.auto_peep`; em `sugestaoAdmissao`, `perfil` e
`null` — na admissão não há evolução, logo não há auto-PEEP medido.

**E onde a PEEP é exibida, troque a interpolação direta por `fmt`.** Hoje o
`SugBox` faz `` `${peepFio2.valor.peep} cmH₂O` ``. Com `peep: number | null`
isso **compila** e imprime `"null cmH₂O"` na tela — pior que quebrar o build,
porque passa silencioso. `fmt` já devolve traço para null.

Não mexa em mais nada nos dois arquivos: as linhas de modulação e o alvo de
PaCO₂ são da Task 6.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde nos dois.

- [ ] **Step 6: Provar que os testes podem falhar**

Faça o ramo do DPOC devolver `peep: base.peep` em vez de `null`.
Run: `pnpm vitest run src/lib/alvos.test.ts`
Esperado: FALHA em "DPOC sem auto-PEEP não produz número de PEEP". Reverta.

Depois troque `Math.min(base.peep!, PEEP_MAX_ASMA)` por `PEEP_MAX_ASMA`.
Esperado: os testes de asma continuam passando — **reporte isso**: com a tabela
sempre dando 5 ou mais nos fixtures usados, o `Math.min` não é distinguido. É
achado sobre o teste, não sobre o código.

- [ ] **Step 7: Commit**

```bash
git add src/lib/alvos.ts src/lib/alvos.test.ts src/components/patient/Dashboard.tsx
git commit -m "feat(alvo): modula a PEEP por DPOC e asma em direcoes opostas"
```

---

### Task 5: Frequência e o alvo de PaCO₂

**Files:**
- Modify: `src/lib/alvos.ts`
- Modify: `src/lib/alvos.test.ts`

**Interfaces:**
- Consumes: `PerfilClinico` da Task 3.
- Produces: `sugerirVentilacao(predBW, vcTargetMl, perfil)`, `AlvoPaco2` e
  `alvoPaco2(perfil)`. Consumidos pela Task 6.

- [ ] **Step 1: Escrever os testes que falham**

```ts
describe("sugerirVentilacao por patologia", () => {
  // O piso de 12 é obstáculo em obstrutivo: Demoule orienta frequência baixa
  // para dar tempo de expirar.
  it("sem patologia, o piso de frequência é 12", () => {
    const a = sugerirVentilacao(70, 700, perfilCom([]))!;
    expect(a.valor.fr).toBe(12);
    expect(a.modulacoes).toEqual([]);
  });

  it("DPOC baixa o piso de frequência para 10", () => {
    const a = sugerirVentilacao(70, 700, perfilCom(["dpoc"]))!;
    expect(a.valor.fr).toBe(10);
    expect(a.base.fr).toBe(12);
    expect(a.modulacoes[0].sourceKey).toBe("obstrutivo");
  });

  it("asma também baixa o piso", () => {
    expect(sugerirVentilacao(70, 700, perfilCom(["asma"]))!.valor.fr).toBe(10);
  });

  // Lesão cerebral aguda não mexe na frequência: o alvo dela é de PaCO₂, e
  // vem por outra função.
  it("lesão cerebral aguda não modula a frequência", () => {
    expect(sugerirVentilacao(70, 700, perfilCom(["lesao_cerebral_aguda"]))!.modulacoes).toEqual([]);
  });

  it("continua devolvendo null sem peso predito ou volume alvo", () => {
    expect(sugerirVentilacao(null, 700, perfilCom([]))).toBeNull();
    expect(sugerirVentilacao(70, null, perfilCom([]))).toBeNull();
  });
});

describe("alvoPaco2", () => {
  it("sem lesão cerebral aguda, não há alvo", () => {
    expect(alvoPaco2(perfilCom([]))).toBeNull();
    expect(alvoPaco2(perfilCom(["dpoc"]))).toBeNull();
  });

  it("com lesão cerebral aguda, devolve 35 a 45", () => {
    const a = alvoPaco2(perfilCom(["lesao_cerebral_aguda"]))!;
    expect(a.valor).toEqual({ min: 35, max: 45 });
    expect(a.modulacoes[0].sourceKey).toBe("lesaoCerebral");
  });

  // A recomendação vale para o paciente SEM hipertensão intracraniana
  // significativa, e o aplicativo não conhece a pressão intracraniana.
  it("a modulação declara a condição da hipertensão intracraniana", () => {
    const a = alvoPaco2(perfilCom(["lesao_cerebral_aguda"]))!;
    expect(a.modulacoes[0].motivo).toMatch(/intracraniana/i);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/alvos.test.ts`
Esperado: FALHA.

- [ ] **Step 3: Implementar**

Substitua `sugerirVentilacao` e acrescente `alvoPaco2`:

```ts
/** Piso de frequência. Cai em obstrutivo, para dar tempo de expirar. */
const FR_MIN_PADRAO = 12;
const FR_MIN_OBSTRUTIVO = 10;

/**
 * Frequência e volume-minuto.
 *
 * O piso de frequência cai de 12 para 10 em DPOC ou asma: Demoule 2020 orienta
 * frequência baixa e relação I:E de 1:4 a 1:6 justamente para dar tempo de
 * expirar, e o piso padrão vira obstáculo nesse paciente.
 *
 * A relação I:E não é calculada aqui: o aplicativo não conhece o tempo
 * inspiratório configurado no ventilador.
 */
export function sugerirVentilacao(
  predBW: number | null,
  vcTargetMl: number | null,
  perfil: PerfilClinico
): Alvo<AlvoVentilacao> | null {
  if (!num(predBW) || !num(vcTargetMl)) return null;
  const veL = (predBW * 100) / 1000;
  const bruto = Math.round(veL / (vcTargetMl / 1000));
  const base: AlvoVentilacao = {
    veL,
    fr: Math.max(FR_MIN_PADRAO, Math.min(35, bruto)),
  };
  const obstrutivo =
    perfil.patologias.includes("dpoc") || perfil.patologias.includes("asma");
  if (!obstrutivo) return semModulacao(base);
  return {
    valor: { veL, fr: Math.max(FR_MIN_OBSTRUTIVO, Math.min(35, bruto)) },
    base,
    modulacoes: [
      {
        motivo:
          "Obstrutivo: piso de frequência baixado para dar tempo de expirar. A relação I:E alvo é de 1:4 a 1:6, e o aplicativo não a calcula porque não conhece o tempo inspiratório configurado.",
        sourceKey: "obstrutivo",
      },
    ],
  };
}

export interface AlvoPaco2 {
  min: number;
  max: number;
}

/**
 * Alvo de PaCO₂ em lesão cerebral aguda, de Robba 2020 (consenso da ESICM):
 * recomendação FORTE com evidência de qualidade BAIXA.
 *
 * É alvo próprio e não modulação: o aplicativo não sugere PaCO₂ em nenhum
 * outro caso, e portanto não há base contra a qual comparar.
 *
 * Devolve null sem lesão cerebral aguda. A caixinha genérica de "Doença
 * neurológica" NÃO dispara este alvo: ela pega desde TCE agudo até
 * neuromuscular crônico, e num neuromuscular com DPOC o alvo empurraria na
 * direção errada.
 */
export function alvoPaco2(perfil: PerfilClinico): Alvo<AlvoPaco2> | null {
  if (!perfil.patologias.includes("lesao_cerebral_aguda")) return null;
  const valor: AlvoPaco2 = { min: 35, max: 45 };
  return {
    valor,
    base: valor,
    modulacoes: [
      {
        motivo:
          "Lesão cerebral aguda: alvo de PaCO₂ de 35 a 45 mmHg. Recomendação forte com evidência de qualidade baixa, e válida para o paciente sem hipertensão intracraniana clinicamente significativa, que o aplicativo não tem como saber.",
        sourceKey: "lesaoCerebral",
      },
    ],
  };
}
```

Atualize também `sugestaoAdmissao`, que chama as duas funções: passe o `perfil`
para `sugerirVentilacao` e `null` como `autoPeep` para `sugerirPeepFio2` — na
admissão não há evolução, logo não há auto-PEEP medido.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde. Se o `pnpm build` reclamar do chamador de
`sugerirVentilacao`, passe o `perfil` ali também — é a mesma correção mínima da
tarefa anterior.

- [ ] **Step 5: Provar que os testes podem falhar**

Troque `FR_MIN_OBSTRUTIVO` para 12.
Esperado: FALHA em "DPOC baixa o piso" e em "asma também baixa o piso".

Depois faça `alvoPaco2` devolver o alvo para qualquer perfil.
Esperado: FALHA em "sem lesão cerebral aguda, não há alvo". Reverta os dois.

- [ ] **Step 6: Commit**

```bash
git add src/lib/alvos.ts src/lib/alvos.test.ts
git commit -m "feat(alvo): baixa o piso de frequencia e alveja PaCO2 no neuro"
```

---

### Task 6: A tela

**Files:**
- Create: `src/components/patient/LinhaModulacaoSimples.tsx`
- Modify: `src/components/patient/Dashboard.tsx`
- Modify: `src/pages/PatientDetail.tsx` (`AdmissionCard`)
- Test: `src/components/patient/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `sugerirPeepFio2(pf, spo2, perfil, autoPeep)`,
  `sugerirVentilacao(predBW, vcTargetMl, perfil)`, `alvoPaco2(perfil)` das
  Tasks 4 e 5.

Fecha a fase e devolve o `pnpm build` ao verde.

**Leia `src/components/patient/LinhaModulacao.tsx` antes de escrever.** Ele
existe e é específico do volume corrente: imprime a faixa base para comparação.
O novo é irmão dele, para modulações que não têm faixa base a comparar.

- [ ] **Step 1: Criar a linha de modulação genérica**

`src/components/patient/LinhaModulacaoSimples.tsx`:

```tsx
import { T } from "../../lib/theme";
import type { Modulacao } from "../../lib/alvos";

/**
 * Linha que mostra as razões de uma modulação, sem a faixa base.
 *
 * Irmã de `LinhaModulacao`, que é específica do volume corrente e imprime a
 * faixa que o alvo teria sem a modulação. Aqui não há faixa a comparar: no
 * DPOC sem auto-PEEP não existe número nenhum, e a comparação com o padrão,
 * quando faz sentido, já vem escrita no próprio `motivo` — que é montado em
 * `alvos.ts`, onde os dois valores estão.
 */
export function LinhaModulacaoSimples({
  modulacoes,
  testid,
}: {
  modulacoes: Modulacao[];
  testid: string;
}) {
  if (modulacoes.length === 0) return null;
  return (
    <p data-testid={testid} style={{ margin: "8px 0 0", fontSize: 11, color: T.dim }}>
      {modulacoes.map((m) => m.motivo).join(" ")}
    </p>
  );
}
```

- [ ] **Step 2: Escrever os testes que falham**

Acrescente a `src/components/patient/Dashboard.test.tsx`, seguindo os helpers e
as fixtures que o arquivo já usa:

```tsx
it("mostra a modulação de PEEP na asma", () => {
  renderDashboard({ comorbidities: ["asma"] }, { pao2: 150, fio2: 100, spo2: 95 });
  expect(screen.getByTestId("peep-modulacao")).toHaveTextContent(/asma/i);
});

// Sem auto-PEEP o aplicativo não tem número de PEEP para o DPOC, e a tela
// precisa dizer isso em vez de mostrar o da tabela como se valesse.
it("DPOC sem auto-PEEP não mostra número de PEEP", () => {
  renderDashboard({ comorbidities: ["dpoc"] }, { pao2: 150, fio2: 100, spo2: 95, auto_peep: null });
  expect(screen.getByTestId("peep-modulacao")).toHaveTextContent(/não foi medido/i);
  expect(screen.getByTestId("sug-peep")).not.toHaveTextContent(/\d/);
});

it("DPOC com auto-PEEP mostra a faixa", () => {
  renderDashboard({ comorbidities: ["dpoc"] }, { pao2: 150, fio2: 100, spo2: 95, auto_peep: 10 });
  expect(screen.getByTestId("sug-peep")).toHaveTextContent("8");
});

// A obesidade não ganha número de PEEP: o PROBESE é intraoperatório e
// negativo, e não sustenta piso nenhum. Ganha o aviso, que é a recusa de um
// alvo — e o teste garante que ninguém "complete" isso com um número.
it("no obeso mostra o aviso de recrutamento, e nenhum número de PEEP novo", () => {
  renderDashboard({ weight_kg: 120, height_cm: 170 }, {});
  const aviso = screen.getByTestId("obeso-recrutamento");
  expect(aviso).toHaveTextContent(/recrutamento/i);
  expect(aviso).not.toHaveTextContent(/\d/);
});

it("sem obesidade não mostra o aviso", () => {
  renderDashboard({ weight_kg: 70, height_cm: 170 }, {});
  expect(screen.queryByTestId("obeso-recrutamento")).not.toBeInTheDocument();
});

it("o alvo de PaCO₂ só aparece na lesão cerebral aguda", () => {
  renderDashboard({ comorbidities: ["dpoc"] }, {});
  expect(screen.queryByTestId("alvo-paco2")).not.toBeInTheDocument();
});

it("na lesão cerebral aguda mostra o alvo e a ressalva", () => {
  renderDashboard({ comorbidities: ["lesao_cerebral_aguda"] }, {});
  const alvo = screen.getByTestId("alvo-paco2");
  expect(alvo).toHaveTextContent("35");
  expect(alvo).toHaveTextContent("45");
  expect(screen.getByTestId("alvo-paco2-ressalva")).toHaveTextContent(/intracraniana/i);
});
```

**Leia como o arquivo monta o Dashboard hoje** e escreva o helper
`renderDashboard(patientOver, evOver)` se ele ainda não existir, reaproveitando
as fixtures que já estão lá. Não invente nomes.

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/Dashboard.test.tsx`
Esperado: FALHA.

- [ ] **Step 4: Ligar os consumidores**

No `Dashboard`:

- `sugerirPeepFio2(pf, ev.spo2, perfil, ev.auto_peep)`
- `sugerirVentilacao(pbwVal, sVc.valor.target, perfil)`
- `const sPaco2 = alvoPaco2(perfil);`
- O `SugBox` da PEEP passa a exibir: o número quando `peep` não é null; a faixa
  quando `faixaPeep` não é null; e um traço quando os dois são null. Dê a ele
  `data-testid="sug-peep"`.
- `<LinhaModulacaoSimples modulacoes={sPeep.modulacoes} testid="peep-modulacao" />`
  abaixo do bloco de sugestões, e outra para `sVent.modulacoes` com
  `testid="ventilacao-modulacao"`.
- O alvo de PaCO₂, quando `sPaco2` não é null, num bloco com
  `data-testid="alvo-paco2"` e a ressalva em irmão com
  `data-testid="alvo-paco2-ressalva"`. **A ressalva fica em elemento irmão, não
  dentro do bloco do número**: este projeto já embarcou um teste que passava
  porque a prosa da ressalva continha o dígito que a asserção procurava.
- **O aviso do obeso sobre recrutamento**, quando `perfil.obeso`, junto da
  modulação de volume corrente que já aparece ali — não como bloco novo: é a
  mesma patologia falando do mesmo paciente. Diga que recrutamento de rotina
  com PEEP alta não está autorizado e que o ensaio que o testou não achou
  benefício. `data-testid="obeso-recrutamento"`. **Não é um alvo, é a recusa de
  um**: não invente número de PEEP, porque a evidência não sustenta nenhum.
- As chaves do `SourceFooter` passam a incluir `"obstrutivo"` quando houver
  modulação obstrutiva, `"lesaoCerebral"` quando houver alvo de PaCO₂ e
  `"obesidadeVentilacao"` quando o aviso do obeso aparecer — derivadas do que
  foi calculado, **nunca lista fixa**.

No `AdmissionCard` de `src/pages/PatientDetail.tsx`: `sugestaoAdmissao` já
recebe o perfil e passa adiante, então só é preciso tratar `peep: number | null`
onde o card o exibe.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm test` e `pnpm build`
Esperado: verde nos dois. É neste commit que o build volta.

- [ ] **Step 6: Provar que os testes podem falhar**

Faça o Dashboard exibir `sPeep.base.peep` quando `valor.peep` é null.
Run: `pnpm vitest run src/components/patient/Dashboard.test.tsx`
Esperado: FALHA em "DPOC sem auto-PEEP não mostra número de PEEP".

Depois troque as chaves do rodapé por lista fixa incluindo `"lesaoCerebral"`.
Esperado: acrescente uma asserção que falhe nesse caso, se ainda não houver —
um paciente sem lesão cerebral aguda não pode citar a fonte dela. Reverta.

- [ ] **Step 7: Commit**

```bash
git add src/components/patient/LinhaModulacaoSimples.tsx src/components/patient/Dashboard.tsx src/components/patient/Dashboard.test.tsx src/pages/PatientDetail.tsx
git commit -m "feat(alvo): exibe as modulacoes por patologia e o alvo de PaCO2"
```

---

## Depois da última tarefa

1. Review final da branch inteira.
2. `CLAUDE.md` ganha a seção da Fase 8: as quatro que modulam e as doze que
   não, a recusa do piso de PEEP no obeso, a faixa de 80 a 85% em vez de um
   número, e o estado atualizado da suíte.
3. **O Jeann roda a coluna `auto_peep` no Supabase.** Sem ela, o formulário
   falha nesse campo e o DPOC nunca recebe alvo de PEEP.
