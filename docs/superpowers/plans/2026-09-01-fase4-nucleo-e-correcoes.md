# Fase 4 — Correções assinadas e o núcleo de modulação :: Plano

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: use
> `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans`, tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** aplicar o que o mentor clínico validou, e introduzir o núcleo
(`PerfilClinico` e `Alvo<T>`) refatorando a modulação por obesidade que já
existe — sem alterar comportamento nenhum.

**Architecture:** o catálogo de fontes ganha uma segunda procedência, porque
parecer clínico não é citação bibliográfica. As funções de sugestão saem de
`clinical.ts` para `alvos.ts` e passam a devolver `Alvo<T>`, um tipo que torna
impossível modular um número clínico sem declarar razão e fonte. A conversão do
booleano `obese` para esse formato é comportamentalmente idêntica, e a suíte
existente é a prova.

**Tech Stack:** Vite + React 18, TypeScript, Vitest 3 + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-01-arquitetura-blocos-clinicos-design.md`

## Global Constraints

- **pnpm, nunca npm.** `pnpm test`; `pnpm vitest run <caminho>`; `pnpm build`
  roda `tsc --noEmit && vite build`.
- **Baseline a preservar: 260 testes em 19 arquivos, verdes, build limpo.**
- **Proibido em teste:** `node:fs`, `__dirname`, `path`. O tsconfig não inclui
  os tipos de Node: passa no vitest e quebra o `pnpm build`.
- **Nenhum limiar clínico muda de valor nesta fase.** O 13 continua 13; a faixa
  do MRC continua 48. O que muda é de onde eles dizem que vêm.
- **O teste `references.test.ts` proíbe referência órfã.** Toda fonte no
  catálogo precisa ser citada por ao menos um `SourceKey`. Acrescentar uma
  fonte sem ligá-la a um limiar **quebra a suíte** — por isso catálogo e
  reatribuição andam no mesmo commit.
- **Ausência de dado não é resultado normal.** Zero é valor clínico legítimo
  em RASS, IMS e MRC.
- **Repositório PÚBLICO.** Nenhum segredo, nenhum dado real de paciente, e
  **nenhum nome de pessoa real** — o parecer clínico entra como "Mentor
  clínico do projeto", sem nome.
- **Regra de negócio em `src/lib/`**, nunca em componente.
- **Não há arquivo CSS.** Tokens de `src/lib/theme.ts` e componentes de
  `src/components/ui.tsx`.
- **Commit é operação do Jeann.** Todo passo "Commit" significa `git add` com
  caminhos explícitos, revisar `git diff --cached`, apresentar a mensagem e
  **parar para pedir OK**.
- **Mensagem de commit:** Conventional Commits em português, imperativo, até 72
  caracteres, sem emoji, sem `Co-Authored-By`, sem rodapé de IA, sem travessão.

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/perfil.ts` | deriva `PerfilClinico` de paciente e evolução |
| `src/lib/perfil.test.ts` | testes da derivação |
| `src/lib/alvos.ts` | motor de sugestão com `Alvo<T>` |
| `src/lib/alvos.test.ts` | testes do motor |

**Modificados:**

| Arquivo | O quê |
|---|---|
| `src/data/references.ts` | procedência dupla; fontes novas; validadas |
| `src/lib/references.ts` | `SourceKey` novo; reatribuições |
| `src/lib/references.test.ts` | cobre parecer e publicação |
| `src/components/SourceFooter.tsx` | pendência só vale para publicação |
| `src/pages/Sources.tsx` | renderiza os dois grupos separados |
| `src/pages/Sources.test.tsx` | testes dos dois grupos |
| `src/lib/clinical.ts` | RASS na triagem; sugestões saem para `alvos.ts` |
| `src/lib/clinical.test.ts` | testes de RASS; testes de sugestão migram |
| `src/components/patient/Dashboard.tsx` | consome `alvos.ts` |
| `src/pages/PatientDetail.tsx` | consome `alvos.ts` |

---

### Task 1: Procedência dupla, fontes novas e reatribuições

Um commit só, e não é escolha estética: o teste de referência órfã reprova a
suíte se uma fonte entrar no catálogo sem estar ligada a um limiar.

**Files:**
- Modify: `src/data/references.ts`
- Modify: `src/lib/references.ts`
- Modify: `src/lib/references.test.ts`
- Modify: `src/components/SourceFooter.tsx`
- Modify: `src/pages/Sources.tsx`
- Modify: `src/pages/Sources.test.tsx`

**Interfaces:**
- Produces:
  - `interface Publicacao { id, citacaoCurta, autores, titulo, veiculo, ano, verificada, nota? }`
  - `interface Parecer { id, citacaoCurta, profissional, data, nota? }`
  - `type Reference = Publicacao | Parecer`
  - `ehParecer(r: Reference): r is Parecer`
  - `SourceKey` ganha nada novo nesta tarefa; muda o mapeamento.

**Por que a procedência dupla:** o mentor validou duas coisas que **não são
citações**. A faixa 48–59 do MRC ele aprovou por julgamento — De Jonghe 2002
não a define. Registrar isso como referência bibliográfica seria mentira, e é o
tipo exato de mentira que as Fases 1 e 2 existiram para eliminar.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/lib/references.test.ts`:

```ts
import { REFERENCES, ehParecer } from "../data/references";

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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/references.test.ts`
Expected: FAIL — `ehParecer` não existe.

- [ ] **Step 3: Reestruturar o tipo**

Em `src/data/references.ts`, substitua `interface Reference` por:

```ts
/** Artigo, diretriz ou revisão publicada. */
export interface Publicacao {
  id: string;
  citacaoCurta: string;
  autores: string;
  titulo: string;
  veiculo: string;
  ano: number;
  /** Revisada pelo mentor clínico. */
  verificada: boolean;
  /** Ressalva sobre o alcance da fonte. Aparece na página /fontes. */
  nota?: string;
}

/**
 * Julgamento clínico do mentor sobre um valor que a literatura não define.
 * Não carrega `verificada` de propósito: o parecer É a manifestação dele,
 * então não existe revisão pendente. Registrar isso como publicação seria
 * fingir que é literatura.
 */
export interface Parecer {
  id: string;
  citacaoCurta: string;
  profissional: string;
  data: string;
  nota?: string;
}

export type Reference = Publicacao | Parecer;

export const ehParecer = (r: Reference): r is Parecer => "profissional" in r;
```

As dez referências existentes já têm exatamente os campos de `Publicacao` — não
precisam mudar.

- [ ] **Step 4: Acrescentar as fontes novas**

Ao fim de `REFERENCES`:

```ts
  {
    id: "guerin_2016",
    citacaoCurta: "Guérin, 2016",
    autores: "Guérin C, Papazian L, Reignier J, et al.",
    titulo:
      "Effect of driving pressure on mortality in ARDS patients during lung protective mechanical ventilation in two randomized controlled trials",
    veiculo: "Crit Care 2016;20:384",
    ano: 2016,
    verificada: false,
    nota:
      "Reanálise dos ensaios Acurasys e Proseva, 787 pacientes com dado do 1º dia. Sobrevida significativamente maior com driving pressure ≤ 13 cmH₂O, e 5% de aumento no risco de morte por cmH₂O acima. É esta fonte que sustenta o corte de 13, que Amato 2015 não define.",
  },
  {
    id: "ferreira_2021",
    citacaoCurta: "Ferreira, 2021",
    autores: "Ferreira NA, Ferreira AS, Guimarães FS",
    titulo:
      "Cough peak flow to predict extubation outcome: a systematic review and meta-analysis",
    veiculo: "Rev Bras Ter Intensiva 2021;33(3):445-456",
    ano: 2021,
    verificada: false,
    nota:
      "Corte entre 55 e 65 L/min útil como medida COMPLEMENTAR antes da extubação; desempenho diagnóstico baixo a moderado. Sustenta o uso do pico de tosse como um critério entre outros, nunca isolado.",
  },
  {
    id: "duan_2021",
    citacaoCurta: "Duan, 2021",
    autores: "Duan J, Zhang X, Song J",
    titulo:
      "Predictive power of extubation failure diagnosed by cough strength: a systematic review and meta-analysis",
    veiculo: "Crit Care 2021;25:357",
    ano: 2021,
    verificada: false,
    nota:
      "Falha de extubação de 36,2% com tosse fraca contra 6,3% com tosse forte.",
  },
  {
    id: "parecer_mrc_faixa",
    citacaoCurta: "Parecer clínico, 2026",
    profissional: "Mentor clínico do projeto",
    data: "01/09/2026",
    nota:
      "A faixa de 48 a 59 no somatório MRC, classificada como força reduzida, foi validada por julgamento clínico. De Jonghe 2002 estabelece o corte < 48 para fraqueza adquirida na UTI, mas não define esta segunda faixa.",
  },
```

**Não acrescente Telias, Bertoni, De Jong nem Winters nesta tarefa.** Nenhuma
delas tem limiar correspondente ainda, e o teste de referência órfã reprovaria.
Elas entram nas fases dos blocos que as usam.

- [ ] **Step 5: Marcar como verificadas apenas as que o mentor de fato revisou**

Troque `verificada: false` por `true` **apenas** em `dejonghe_2002` e
`sessler_2002`. As outras continuam `false`, **inclusive as duas novas**.

**Por que tão pouco.** `verificada` significa "o mentor revisou esta citação".
Ele revisou duas coisas: aprovou a faixa do MRC (De Jonghe) e decidiu manter o
RASS (Sessler). Não revisou mais nada.

Guérin e Ferreira **entram como `false`** ainda que eu as tenha conferido
contra a fonte primária, porque conferência bibliográfica e endosso clínico são
coisas diferentes, e o campo só declara a segunda. O mentor pediu o embasamento
do 13 e pediu a evidência do pico de tosse; recebeu as duas, mas ainda não
disse que aceita. Marcá-las como revisadas seria colocar palavra na boca dele.

`boles_2007` e `amib_sbpt_2024` também ficam `false`: ele escolheu o pH 7,35 em
vez de 7,32, o que é decidir um valor, não revisar uma referência.

Consequência visível e correta: o rodapé da driving pressure continua mostrando
"pendente de revisão" até ele confirmar. É honesto — a fonte existe, o endosso
não.

- [ ] **Step 6: Reatribuir os limiares**

Em `src/lib/references.ts`, no `THRESHOLD_SOURCES`:

```ts
  dp: ["amato_2015", "guerin_2016"],
  extubation: ["boles_2007", "amib_sbpt_2024", "ferreira_2021", "duan_2021"],
  mrc: ["dejonghe_2002", "parecer_mrc_faixa"],
```

O Amato **fica** no `dp`: ele sustenta o conceito, e o Guérin sustenta o número.
São coisas diferentes e as duas são verdade.

- [ ] **Step 7: Ajustar `SourceFooter`**

O rodapé marca "pendente de revisão" quando alguma fonte não foi verificada.
Parecer não tem esse campo, então a checagem precisa ignorá-lo:

```tsx
const pendente = unicas.some((r) => !ehParecer(r) && !r.verificada);
```

Importe `ehParecer` de `../data/references`.

- [ ] **Step 8: Ajustar a página `/fontes`**

`src/pages/Sources.tsx` renderiza campos de publicação. Separe em dois grupos:
publicações primeiro, pareceres depois, com um subtítulo que deixe a diferença
explícita — algo como "Pareceres clínicos" e uma linha dizendo que são
julgamentos do mentor sobre valores que a literatura não define. Parecer nunca
mostra "pendente de revisão".

Leia o JSX existente e siga o estilo dele; não invente cartão novo.

- [ ] **Step 9: Ajustar `Sources.test.tsx`**

O teste "marca como pendente o que o mentor ainda não verificou" conta
`pendentes.length` sobre todas as referências. Agora precisa contar só
publicações não verificadas. Ajuste o cálculo — **não relaxe a asserção**.

- [ ] **Step 10: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 11: Preparar o commit e pedir OK**

```bash
git add src/data/references.ts src/lib/references.ts src/lib/references.test.ts src/components/SourceFooter.tsx src/pages/Sources.tsx src/pages/Sources.test.tsx
git diff --cached
```

Mensagem proposta:

```
feat(fontes): separa parecer clinico de publicacao e reatribui limiares
```

**Pare e peça OK.**

---

### Task 2: RASS na triagem de extubação

**Files:**
- Modify: `src/lib/clinical.ts` (`ExtubationInput`, `extubationReadiness`, linhas ~174-228)
- Modify: `src/lib/clinical.test.ts`
- Modify: `src/pages/PatientDetail.tsx` (`ExtubationCard`, onde monta o input)

**O que o mentor decidiu:** mantém Glasgow **e** RASS juntos. E acrescentou o
motivo clínico: o paciente precisa estar **desperto** para iniciar o TRE — por
isso o RASS entra, já que a resposta verbal do Glasgow não é avaliável em
paciente intubado.

**O limiar:** RASS entre −2 e +1 indica paciente desperto o bastante. Abaixo de
−2 é sedação que impede o teste; acima de +1 é agitação. Este intervalo entra
como critério novo, citando `sessler_2002`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao `describe("extubationReadiness")` existente em
`src/lib/clinical.test.ts`:

```ts
  it("conta RASS entre -2 e +1 como critério atendido", () => {
    const r = extubationReadiness({ rass: -1 });
    expect(r.met).toContain("RASS entre −2 e +1");
  });

  // RASS 0 é "alerta e calmo": o melhor valor possível para iniciar um TRE.
  // Uma checagem falsy o trataria como não medido.
  it("aceita RASS 0, que é o paciente alerta e calmo", () => {
    const r = extubationReadiness({ rass: 0 });
    expect(r.met).toContain("RASS entre −2 e +1");
  });

  it("reprova RASS -4, sedação que impede o teste", () => {
    const r = extubationReadiness({ rass: -4 });
    expect(r.failed).toContain("RASS entre −2 e +1");
  });

  it("reprova RASS +3, agitação", () => {
    const r = extubationReadiness({ rass: 3 });
    expect(r.failed).toContain("RASS entre −2 e +1");
  });

  // Ausência não é reprovação: continua valendo a regra da Fase 1.
  it("não conta RASS ausente como reprovado", () => {
    const r = extubationReadiness({});
    expect(r.notMeasured).toContain("RASS entre −2 e +1");
    expect(r.failed).not.toContain("RASS entre −2 e +1");
  });
```

Use o menos tipográfico `−` (U+2212), o mesmo de `src/data/scores.ts`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/clinical.test.ts`
Expected: FAIL — o critério não existe.

- [ ] **Step 3: Implementar**

Em `ExtubationInput`, acrescente:

```ts
  rass?: number | null;
```

Em `extubationReadiness`, acrescente ao array `checks`, logo após o de Glasgow:

```ts
    // O paciente precisa estar desperto para iniciar o TRE, e a resposta
    // verbal do Glasgow não é avaliável em paciente intubado. Decisão do
    // mentor clínico em 01/09/2026: manter os dois critérios.
    { label: "RASS entre −2 e +1", pass: num(i.rass) ? i.rass! >= -2 && i.rass! <= 1 : null },
```

`num()` já trata `0` corretamente — é `v != null && Number.isFinite(v)`, sem
checagem falsy. Não introduza uma.

Atenção: `MIN_CRITERIOS_AVALIADOS` é 4 e o total de critérios passa de 8 para 9.
O corte de "insuficiente" continua sendo 4 avaliados; não mexa nele.

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/lib/clinical.test.ts`
Expected: PASS.

- [ ] **Step 5: Ligar na tela**

Em `src/pages/PatientDetail.tsx`, no `ExtubationCard`, acrescente `rass: ev.rass`
ao objeto passado para `extubationReadiness`.

- [ ] **Step 6: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/lib/clinical.ts src/lib/clinical.test.ts src/pages/PatientDetail.tsx
git diff --cached
```

Mensagem proposta:

```
feat(desmame): inclui RASS na triagem de prontidao para extubacao
```

**Pare e peça OK.**

---

### Task 3: `PerfilClinico`

**Files:**
- Create: `src/lib/perfil.ts`
- Create: `src/lib/perfil.test.ts`

**Interfaces:**
- Consumes: `pbwOrEstimate` e `bmi` de `src/lib/clinical.ts`; `Patient` de `src/types`.
- Produces:
  - `type PatologiaKey = string`
  - `interface PerfilClinico { pbw: number; pbwEstimado: boolean; obeso: boolean; obesoIndeterminado: boolean; patologias: PatologiaKey[] }`
  - `derivarPerfil(patient: Patient): PerfilClinico`

**Por que existe:** hoje o booleano `obese` é enfiado em cada assinatura —
`suggestVc(predBW, obese)`, `classify.vcKg(v, obese)`. Acrescentar patologia do
mesmo jeito faz a assinatura crescer a cada característica nova. O perfil é
derivado uma vez e passado inteiro.

**`patologias` fica vazia nesta fase, de propósito.** A lista de patologias que
modulam alvo é conteúdo clínico da Fase 8, decidida com o mentor. O que esta
tarefa fixa é que o campo existe e é derivado de `patients.comorbidities` — não
o conteúdo dele. **Não invente uma lista de patologias aqui.**

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/lib/perfil.test.ts`:

```ts
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
```

Confira o valor do peso predito antes de confiar: `pbw` masculino é
`50 + 0,91 × (altura − 152,4)`, então 170 cm dá `50 + 0,91 × 17,6 ≈ 66,0`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/perfil.test.ts`
Expected: FAIL — `Failed to resolve import "./perfil"`.

- [ ] **Step 3: Implementar**

Crie `src/lib/perfil.ts`:

```ts
// ============================================================
// Perfil clínico — Ventila Fisio
// Derivado uma vez do paciente e passado inteiro ao motor de alvos, em vez
// de booleanos enfiados em cada assinatura. Característica nova depois não
// muda assinatura nenhuma.
// ============================================================
import { pbwOrEstimate, bmi } from "./clinical";
import type { Patient } from "../types";

/**
 * Chave de patologia que pode modular alvo ventilatório. A LISTA de quais
 * patologias modulam o quê é conteúdo clínico da Fase 8, decidida com o
 * mentor. Aqui só se registra o que o paciente tem.
 */
export type PatologiaKey = string;

export interface PerfilClinico {
  pbw: number;
  pbwEstimado: boolean;
  obeso: boolean;
  /** Sem IMC não dá para afirmar. Assume-se a faixa protetora, mas sinalizado. */
  obesoIndeterminado: boolean;
  patologias: PatologiaKey[];
}

export function derivarPerfil(patient: Patient): PerfilClinico {
  const { value: pbw, estimated } = pbwOrEstimate(
    (patient.sex ?? "M") as "M" | "F",
    patient.height_cm
  );
  const imc = bmi(patient.weight_kg, patient.height_cm);
  return {
    pbw,
    pbwEstimado: estimated,
    obeso: imc != null ? imc >= 30 : false,
    obesoIndeterminado: imc == null,
    patologias: patient.comorbidities ?? [],
  };
}
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/lib/perfil.test.ts`
Expected: PASS.

- [ ] **Step 5: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/lib/perfil.ts src/lib/perfil.test.ts
git diff --cached
```

Mensagem proposta:

```
feat(alvos): deriva o perfil clinico do paciente
```

**Pare e peça OK.**

---

### Task 4: `alvos.ts` e o tipo `Alvo`

O coração da fase. **Movimentação e conversão, sem alterar comportamento** — a
suíte existente é a prova de que nada mudou.

**Files:**
- Create: `src/lib/alvos.ts`
- Create: `src/lib/alvos.test.ts`
- Modify: `src/lib/clinical.ts` (remove `suggestVc`, `suggestPeepFio2`, `suggestVentilation`, `admissionSuggestion`, `ARDSNET_LOW`)
- Modify: `src/lib/clinical.test.ts` (os `describe` dessas quatro migram)
- Modify: `src/components/patient/Dashboard.tsx` (linhas ~19-21)
- Modify: `src/pages/PatientDetail.tsx` (`AdmissionCard`, linha ~342)

**Interfaces:**
- Consumes: `PerfilClinico` da Task 3; `SourceKey` de `src/lib/references.ts`.
- Produces:
  - `interface Modulacao { motivo: string; sourceKey: SourceKey }`
  - `interface Alvo<T> { valor: T; base: T; modulacoes: Modulacao[] }`
  - `sugerirVc(perfil: PerfilClinico): Alvo<{ lowKg: number; highKg: number; targetKg: number; low: number; high: number; target: number }>`

**Sem `| null`, e isso é deliberado.** A `suggestVc` antiga devolvia `null`
quando o peso predito não era número. Mas `PerfilClinico.pbw` é sempre número —
`pbwOrEstimate` estima pela média populacional quando falta altura. O caso nulo
era inalcançável a partir de um perfil, e carregá-lo obrigaria todo chamador a
tratar um ramo que nunca ocorre. Isso não é mudança de comportamento: para
qualquer entrada real, a função antiga também nunca devolvia `null`.
  - `sugerirPeepFio2`, `sugerirVentilacao`, `sugestaoAdmissao` — assinaturas na Step 3

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/lib/alvos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sugerirVc } from "./alvos";
import type { PerfilClinico } from "./perfil";

const perfil = (over: Partial<PerfilClinico> = {}): PerfilClinico => ({
  pbw: 70, pbwEstimado: false, obeso: false, obesoIndeterminado: false,
  patologias: [], ...over,
});

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
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/alvos.test.ts`
Expected: FAIL — `Failed to resolve import "./alvos"`.

- [ ] **Step 3: Criar `alvos.ts` movendo as quatro funções**

Crie `src/lib/alvos.ts` com o cabeçalho, os tipos, e as quatro funções
**recortadas de `clinical.ts`** — incluindo a constante `ARDSNET_LOW`, que só
elas usam.

```ts
// ============================================================
// Motor de alvos ventilatórios — Ventila Fisio
// Nenhum alvo é número solto: todo valor vem com o que ele seria sem
// modulação e com a lista do que o modificou. O tipo obriga cada modulação
// a declarar razão e fonte, então não há como mudar um número clínico em
// silêncio.
// ============================================================
import type { SourceKey } from "./references";
import type { PerfilClinico } from "./perfil";

export interface Modulacao {
  /** O que mudou e por quê, na língua do usuário. */
  motivo: string;
  /** Quem sustenta a modulação. */
  sourceKey: SourceKey;
}

export interface Alvo<T> {
  /** O que o app sugere. */
  valor: T;
  /** O que sugeriria sem modulação. Igual a `valor` quando não houve. */
  base: T;
  modulacoes: Modulacao[];
}

/** Alvo sem modulação alguma: base igual ao valor, lista vazia. */
const semModulacao = <T,>(valor: T): Alvo<T> => ({
  valor,
  base: valor,
  modulacoes: [],
});
```

Converta `suggestVc` em `sugerirVc(perfil)`: calcule a faixa **não obesa** como
`base`, a faixa efetiva como `valor`, e quando `perfil.obeso` for verdadeiro
acrescente uma `Modulacao` com motivo mencionando obesidade e
`sourceKey: "vcKg"`.

As outras três (`sugerirPeepFio2`, `sugerirVentilacao`, `sugestaoAdmissao`) são
movidas **sem modulação nenhuma nesta fase** — devolvem `semModulacao(...)`.
Elas ganham modulação na Fase 8. Não invente modulações agora.

`sugestaoAdmissao` passa a receber `PerfilClinico` em vez de sexo, altura e
peso soltos, mais os mesmos `pf`, `spo2` e `currentMode` de hoje.

- [ ] **Step 4: Migrar os testes existentes**

Mova os `describe` de `suggestVc`, `suggestPeepFio2`, `suggestVentilation` e
`admissionSuggestion` de `clinical.test.ts` para `alvos.test.ts`, adaptando as
chamadas ao novo formato — os valores esperados **não mudam**. É isso que prova
que a conversão não alterou comportamento.

Onde o teste antigo fazia `suggestVc(70, true).lowKg`, o novo faz
`sugerirVc(perfil({ pbw: 70, obeso: true })).valor.lowKg` — mesmo número.

- [ ] **Step 5: Ligar os dois consumidores**

`Dashboard.tsx` (linhas ~19-21) e `AdmissionCard` em `PatientDetail.tsx`
(linha ~342) passam a derivar o perfil e chamar `alvos.ts`. **Nesta tarefa a
tela mostra exatamente o que mostrava antes** — leia `.valor` e ignore `.base`
e `.modulacoes`. Usar essa informação é a Task 5.

- [ ] **Step 6: Rodar tudo**

Run: `pnpm test && pnpm build`
Expected: 260 verdes mais os novos de `alvos.test.ts`, build limpo. **Qualquer
teste existente que mude de resultado significa que a conversão alterou
comportamento — desfaça e refaça.**

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/lib/alvos.ts src/lib/alvos.test.ts src/lib/clinical.ts src/lib/clinical.test.ts src/components/patient/Dashboard.tsx src/pages/PatientDetail.tsx
git diff --cached
```

Mensagem proposta:

```
refactor(alvos): move sugestoes para alvos.ts com procedencia por modulacao
```

**Pare e peça OK.**

---

### Task 5: A tela mostra que houve ajuste

Agora a informação nova aparece. Sem isso, o `Alvo<T>` é encanamento morto.

**Files:**
- Modify: `src/components/patient/Dashboard.tsx`
- Modify: `src/components/patient/Dashboard.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/components/patient/Dashboard.test.tsx`, seguindo os fixtures
que o arquivo já define:

```tsx
it("mostra o alvo padrão quando a obesidade deslocou a faixa", () => {
  // 95 kg e 1,70 m dão IMC ~32,9: obeso.
  renderDashboard({ patient: { height_cm: 170, weight_kg: 95 } });
  expect(screen.getByText(/6–8/)).toBeInTheDocument();
  expect(screen.getByText(/padrão.*4–6/i)).toBeInTheDocument();
});

it("não mostra alvo padrão quando não houve modulação", () => {
  renderDashboard({ patient: { height_cm: 170, weight_kg: 70 } });
  expect(screen.queryByText(/padrão/i)).not.toBeInTheDocument();
});
```

Ajuste aos helpers reais do arquivo — os nomes acima são ilustrativos. Confira
a aritmética do IMC antes de confiar: 95 / 1,70² ≈ 32,9.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/Dashboard.test.tsx`
Expected: FAIL — o texto de padrão não existe.

- [ ] **Step 3: Implementar**

No `SugBox` do volume corrente, quando `alvo.modulacoes.length > 0`, acrescente
uma linha discreta com o motivo e o valor base. Estilo: mesmos tokens de
`T.dim` e tamanho já usados no `sub` do `SugBox`; não invente estilo novo.

O texto precisa dizer **as duas coisas**: o que o app sugere e o que sugeriria
sem o ajuste. O avaliador tem de ver que houve modulação para poder discordar —
foi exatamente o que o mentor pediu ao dizer que a sugestão "não quer dizer que
vai ser só aquilo que o avaliador irá fazer".

- [ ] **Step 4: Provar que o teste guarda**

Remova temporariamente a linha de modulação do JSX, rode o arquivo de teste,
confirme que o primeiro teste fica **vermelho** e o segundo continua verde,
restaure. Ponha o comando e a saída no relatório.

- [ ] **Step 5: Suíte, build e varredura da fase**

```bash
pnpm test && pnpm build
git diff dev...HEAD --stat
git diff dev...HEAD | grep -nEi "console\.log|service_role|SUPABASE_.*KEY|@gmail|@hotmail"
```

Expected: verde, build limpo, nenhuma ocorrência. Se o único casamento for o
comando de grep dentro deste plano, diga isso — é falso positivo conhecido.

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/components/patient/Dashboard.tsx src/components/patient/Dashboard.test.tsx
git diff --cached
```

Mensagem proposta:

```
feat(alvos): mostra o alvo padrao quando houve modulacao
```

**Pare e peça OK.**

---

## Depois do plano

1. **Promoção e push são do Jeann**, na ordem do `CLAUDE.md`.
2. **Nenhum DDL nesta fase.** Nada a aplicar no Supabase.
3. **A Fase 5 é o TRE passo a passo**, e depende de tabela nova — aí sim haverá
   DDL para aplicar.
4. **Continua aberto** para as fases seguintes: a fonte primária de Winters, os
   números do DPOC, e se o mentor quer ânion-gap.
