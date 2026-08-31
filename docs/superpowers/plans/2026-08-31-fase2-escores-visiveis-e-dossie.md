# Fase 2 — Escores visíveis e dossiê clínico :: Plano de implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: use
> `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans`, tarefa a tarefa. Os passos usam checkbox
> (`- [ ]`) para acompanhamento.

**Goal:** fechar a dívida de exibição que a Fase 1 deixou (escores gravados e
nunca lidos), corrigir a tela de entrada do paciente, e produzir o dossiê que
destrava os quatro blocos clínicos seguintes.

**Architecture:** duas trilhas independentes. A trilha A é um documento para o
mentor clínico, sem código. A trilha B expõe `rass`, `ims` e `mrc` em quatro
superfícies com fronteiras que evitam quatro cópias do mesmo dado, e troca a
aba padrão conforme o estado do paciente. Regra de domínio nova vai para
`src/lib/scores.ts`; os componentes só exibem.

**Tech Stack:** Vite + React 18, TypeScript, react-router-dom 6, Recharts,
Supabase JS, Vitest 3 + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-31-fase2-escores-visiveis-e-dossie-design.md`

## Global Constraints

- **pnpm, nunca npm.** `pnpm test` roda tudo; `pnpm vitest run <caminho>` um
  arquivo; `pnpm build` roda `tsc --noEmit && vite build`.
- **Baseline a preservar: 235 testes em 15 arquivos, verdes, build limpo.**
- **Proibido em teste:** `node:fs`, `__dirname`, `path`. O `tsconfig.json` não
  inclui os tipos de Node: passa no vitest e **quebra o `pnpm build`**.
- **Nenhum limiar clínico é alterado nesta fase, e nenhuma fórmula nova entra.**
  Nada em `classify`, nada em `extubationReadiness`, nada em `classifyMrc`.
- **Ausência de dado não é resultado normal.** Campo faltando não aparece, e
  nunca vira zero ou placeholder.
- **Zero é valor clínico legítimo.** RASS 0 é "alerta e calmo"; IMS 0 é "nada,
  deitado no leito"; MRC 0 é "sem contração". Nenhuma checagem falsy sobre eles.
- **Regra de negócio vai em `src/lib/`**, nunca dentro de componente.
- **Repositório PÚBLICO.** Nenhum segredo, nenhum dado real de paciente, em
  código, teste, fixture, comentário ou mensagem de commit.
- **Não há arquivo CSS.** Estilos por tokens de `src/lib/theme.ts` e componentes
  de `src/components/ui.tsx`.
- **Commit é operação do Jeann.** Todo passo "Commit" significa: `git add`,
  revisar `git diff --cached` procurando segredo, PII e `console.log`,
  apresentar a mensagem, e **parar para pedir OK**.
- **Mensagem de commit:** Conventional Commits em português, imperativo, até 72
  caracteres, sem emoji, sem `Co-Authored-By`, sem rodapé de IA, sem travessão.

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `docs/dossie-clinico-fase2.md` | dossiê para o mentor (trilha A) |
| `src/components/patient/PatientHeader.test.tsx` | testes do cabeçalho, que hoje não tem nenhum |
| `src/components/patient/TrendCharts.tsx` | extraído de `PatientDetail.tsx` |
| `src/components/patient/TrendCharts.test.tsx` | testes das séries novas |
| `src/components/patient/EvolutionHistory.tsx` | extraído de `PatientDetail.tsx` |
| `src/components/patient/EvolutionHistory.test.tsx` | testes dos escores no histórico |
| `src/components/patient/MotorPanel.tsx` | leitura da última avaliação motora |
| `src/components/patient/MotorPanel.test.tsx` | testes do painel |

**Modificados:**

| Arquivo | O quê |
|---|---|
| `src/lib/scores.ts` | acrescenta `ultimaAvaliacaoMrc` |
| `src/lib/scores.test.ts` | testes da função nova |
| `src/components/patient/PatientHeader.tsx` | prop `rassAtual` e o chip |
| `src/pages/PatientDetail.tsx` | aba padrão por estado, extrações, fiação do painel motor |
| `src/pages/PatientDetail.test.tsx` | testes da aba padrão |

---

### Task 1: Dossiê clínico para o mentor

Trilha A inteira. **Não produz código e não tem ciclo de teste.** O critério de
qualidade é outro: toda citação conferida contra a fonte primária, e o que não
puder ser confirmado sai marcado como não confirmado em vez de sair afirmado.

**Files:**
- Create: `docs/dossie-clinico-fase2.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-31-fase1-embasamento-contexto-escores-design.md` (seção 10, as oito pendências) e `src/data/references.ts` (as dez referências já catalogadas).
- Produces: nada que o código consuma. É insumo para uma pessoa.

- [ ] **Step 1: Ler as oito pendências abertas**

Leia a seção 10 do spec da Fase 1. Elas são o esqueleto da primeira parte do
dossiê. Para cada uma, registre o que já foi apurado e a pergunta exata.

- [ ] **Step 2: Levantar as fontes candidatas dos três blocos seguintes**

Pesquise e **confirme contra a fonte primária** candidatas para:

- **Gasometria:** interpretação ácido-base, regras de compensação esperada
  (respiratória para distúrbio metabólico e vice-versa), e ânion-gap.
- **Mecânica:** P0.1, Pmus, pressão de oclusão (ΔPocc) e avaliação de
  recrutabilidade — para esta última, verifique especificamente o *recruitment-
  to-inflation ratio*, que é a métrica moderna, em vez de uma fórmula solta.
- **TRE:** critérios de aptidão e critérios de falha durante o teste. Boles
  2007 já está no catálogo (`boles_2007`) e as Orientações Práticas AMIB/SBPT
  2024 também (`amib_sbpt_2024`).

Para cada fonte, registre: autores, título, veículo com volume e páginas, ano,
**o que ela sustenta** e **o que ela não sustenta**.

Essa última coluna é a que dá valor ao documento. Na Fase 1 ela produziu três
correções que teriam entrado no produto: Amato 2015 não define o corte de 13;
o corte de 17 J/min é de Serpa Neto 2018 e não de Gattinoni 2016; e as
Diretrizes Brasileiras de 2013 foram superadas pela edição de 2024.

**Não invente citação.** Se não conseguir confirmar volume, páginas ou ano,
escreva "a confirmar" nesse campo em vez de preencher com o que parece certo.
Uma citação errada num documento clínico é pior que um campo vazio.

- [ ] **Step 3: Escrever o dossiê**

Estrutura:

```markdown
# Dossiê clínico — Ventila Fisio, Fase 2

Para: mentor clínico
De: equipe de desenvolvimento
Data: <data>

## Como usar este documento
<um parágrafo: o que se espera do leitor, e que nada aqui está no ar sem a
revisão dele>

## Parte 1 — As oito perguntas em aberto
<as oito pendências, cada uma com contexto e a pergunta>

## Parte 2 — Fontes candidatas para os próximos blocos
### Gasometria
### Mecânica respiratória
### Teste de respiração espontânea
<cada fonte com o que sustenta e o que não sustenta>

## Parte 3 — Uma decisão de escopo profissional
<a fronteira do bicarbonato>

## Parte 4 — O que muda no aplicativo conforme a resposta
<mapa curto: resposta → efeito na tela>
```

**O público é clínico, não técnico.** Não use jargão de engenharia, não cite
caminho de arquivo nem nome de função. "O aplicativo classifica" e não
"`classifyMrc` retorna".

Sobre a Parte 3, escreva a questão de forma neutra: sugerir dose de bicarbonato
é conduta médica e não fisioterapêutica, e o app pode identificar o distúrbio
sem recomendar o medicamento. A decisão é dele e do Jeann, não do documento.

- [ ] **Step 4: Conferir o que foi escrito**

Releia procurando: citação sem fonte conferida, jargão de engenharia, e
qualquer lugar onde o documento **responde** uma pergunta em vez de fazê-la. O
dossiê levanta questões; quem responde é o mentor.

- [ ] **Step 5: Preparar o commit e pedir OK**

```bash
git add docs/dossie-clinico-fase2.md
git diff --cached
```

Mensagem proposta:

```
docs: monta o dossie clinico para revisao do mentor
```

**Pare e peça OK.**

---

### Task 2: `ultimaAvaliacaoMrc`

**Files:**
- Modify: `src/lib/scores.ts`
- Modify: `src/lib/scores.test.ts`

**Interfaces:**
- Consumes: `mrcTotal(m: Mrc | null | undefined): number | null` e `type Mrc` do mesmo arquivo; `DailyEvolution` de `src/types`.
- Produces: `ultimaAvaliacaoMrc(evolucoes: DailyEvolution[]): DailyEvolution | null`.

**Por que existe:** a avaliação motora mais recente **não é** a evolução mais
recente. O terapeuta pode registrar ventilação hoje sem refazer a força
muscular. Percorrer a lista de trás para frente e devolver a primeira cujo
`mrcTotal` não seja `null` é regra de domínio, então mora em `lib/`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao fim de `src/lib/scores.test.ts`:

```ts
import type { DailyEvolution } from "../types";

// Fixture mínima: só o que a função lê. O resto de DailyEvolution não importa
// aqui, e preencher tudo tornaria o teste ilegível.
const evo = (id: string, mrc: Mrc): DailyEvolution =>
  ({ id, mrc } as unknown as DailyEvolution);

const completa = (): Mrc =>
  Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 4, e: 4 }]));

const incompleta = (): Mrc => {
  const m = completa();
  m[MRC_GROUPS[0].key] = { d: 4, e: null };
  return m;
};

describe("ultimaAvaliacaoMrc", () => {
  it("devolve a avaliação completa mais recente", () => {
    const lista = [evo("a", completa()), evo("b", completa())];
    expect(ultimaAvaliacaoMrc(lista)?.id).toBe("b");
  });

  // O caso que motiva a função: registrou ventilação hoje sem refazer a força.
  it("ignora evoluções mais recentes sem avaliação completa", () => {
    const lista = [evo("a", completa()), evo("b", incompleta()), evo("c", {})];
    expect(ultimaAvaliacaoMrc(lista)?.id).toBe("a");
  });

  it("devolve null quando nenhuma avaliação está completa", () => {
    expect(ultimaAvaliacaoMrc([evo("a", incompleta()), evo("b", {})])).toBeNull();
  });

  it("devolve null para lista vazia", () => {
    expect(ultimaAvaliacaoMrc([])).toBeNull();
  });

  // Zero é medida real: doze zeros é uma avaliação completa, e gravíssima.
  it("aceita avaliação com todos os graus zero", () => {
    const zerada = Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 0, e: 0 }]));
    expect(ultimaAvaliacaoMrc([evo("a", zerada)])?.id).toBe("a");
  });
});
```

Acrescente `ultimaAvaliacaoMrc` ao import existente de `./scores` no topo do
arquivo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/scores.test.ts`
Expected: FAIL — `ultimaAvaliacaoMrc is not a function`.

- [ ] **Step 3: Implementar**

Acrescente ao fim de `src/lib/scores.ts`:

```ts
import type { DailyEvolution } from "../types";

/**
 * A avaliação motora completa mais recente, que NÃO é necessariamente a
 * evolução mais recente: o terapeuta pode registrar ventilação hoje sem
 * refazer a força muscular. Percorre de trás para frente, assumindo a lista
 * em ordem cronológica crescente, como vem de `PatientDetail`.
 */
export function ultimaAvaliacaoMrc(
  evolucoes: DailyEvolution[]
): DailyEvolution | null {
  for (let i = evolucoes.length - 1; i >= 0; i--) {
    if (mrcTotal(evolucoes[i]?.mrc) != null) return evolucoes[i];
  }
  return null;
}
```

O `import type` é obrigatório: `types/index.ts` já importa `Mrc` deste arquivo,
e só o import de tipo, que é apagado na compilação, mantém o ciclo inexistente
em runtime.

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/lib/scores.test.ts`
Expected: PASS.

- [ ] **Step 5: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/lib/scores.ts src/lib/scores.test.ts
git diff --cached
```

Mensagem proposta:

```
feat(escores): seleciona a ultima avaliacao motora completa
```

**Pare e peça OK.**

---

### Task 3: Aba padrão conforme o estado do paciente

**Files:**
- Modify: `src/pages/PatientDetail.tsx` (estado `tab`, linha ~34; `load()`; `<Tabs>`, linha ~107)
- Modify: `src/pages/PatientDetail.test.tsx`

**O defeito:** `tab` é inicializado com `"admissao"`, então um paciente no
oitavo dia de ventilação abre mostrando *como colocá-lo no ventilador*.

**A armadilha:** as evoluções chegam de forma assíncrona. Decidir a aba dentro
do `useState` não funciona — naquele momento a lista está vazia e todo paciente
abriria em Admissão. A escolha acontece quando a carga termina.

**A segunda armadilha:** trocar a aba debaixo de quem já navegou é pior que o
defeito original. Use um sinalizador booleano separado. **Comparar a aba atual
com `"admissao"` não serve**, porque o usuário pode ter clicado deliberadamente
em Admissão, e a carga a trocaria por baixo dele.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/pages/PatientDetail.test.tsx`, seguindo os helpers e o mock
que o arquivo já define:

```tsx
it("abre em Evolução quando o paciente já tem evolução registrada", async () => {
  db.patient = { ...PACIENTE_BASE };
  db.evolutions = [{ ...EVOLUCAO_BASE }];
  renderDetail();
  await waitFor(() => {
    expect(screen.getByRole("tab", { name: /evolução/i })).toHaveAttribute("aria-selected", "true");
  });
});

it("abre em Admissão quando não há evolução nenhuma", async () => {
  db.patient = { ...PACIENTE_BASE };
  db.evolutions = [];
  renderDetail();
  await waitFor(() => {
    expect(screen.getByRole("tab", { name: /admissão/i })).toHaveAttribute("aria-selected", "true");
  });
});
```

Use os nomes de fixture e o helper de render que o arquivo já tem —
`PACIENTE_BASE` e `EVOLUCAO_BASE` são ilustrativos aqui.

**Confira antes como `Tabs` renderiza em `src/components/ui.tsx`.** Se ele não
emitir `role="tab"` e `aria-selected`, afirme pelo estado visual que ele de
fato usa (peso da fonte, borda), ou acrescente os atributos ao `Tabs` — se
acrescentar, diga isso no relatório, porque é mudança em componente
compartilhado.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: FAIL no primeiro teste — a aba ativa é Admissão.

- [ ] **Step 3: Implementar**

Em `PatientDetail`, junto dos outros estados:

```tsx
// A aba padrão depende do estado do paciente, mas as evoluções chegam
// assíncronas: a escolha acontece ao fim da carga, não na inicialização.
// Este sinalizador impede que a carga troque a aba de quem já navegou —
// comparar com "admissao" não serviria, porque o usuário pode ter clicado
// nela de propósito.
const [abaEscolhidaPeloUsuario, setAbaEscolhidaPeloUsuario] = useState(false);
```

No fim de `load()`, depois de `setEvolutions(...)`:

```tsx
if (!abaEscolhidaPeloUsuario) {
  setTab(((ev as DailyEvolution[]) ?? []).length > 0 ? "evolucao" : "admissao");
}
```

E no `<Tabs>`:

```tsx
<Tabs
  tabs={tabs}
  active={tab}
  onChange={(t) => {
    setAbaEscolhidaPeloUsuario(true);
    setTab(t);
  }}
/>
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: PASS, e os 19 testes anteriores do arquivo continuam passando.

Atenção: testes existentes que clicavam numa aba assumindo começar em Admissão
podem quebrar. Se quebrarem, **não relaxe a asserção** — ajuste o fixture do
teste para o estado que ele quer exercitar, ou faça o clique explícito. Um
teste que passou a começar noutra aba está te dizendo que o comportamento
mudou, que é o objetivo.

- [ ] **Step 5: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/pages/PatientDetail.tsx src/pages/PatientDetail.test.tsx
git diff --cached
```

Mensagem proposta:

```
feat(paciente): abre na aba conforme o estado do paciente
```

**Pare e peça OK.**

---

### Task 4: Chip de RASS no cabeçalho

**Files:**
- Modify: `src/components/patient/PatientHeader.tsx` (props; `contexto`, linha ~36)
- Create: `src/components/patient/PatientHeader.test.tsx`
- Modify: `src/pages/PatientDetail.tsx` (linha ~101, onde monta o `PatientHeader`)

**Interfaces:**
- Produces: `PatientHeader` passa a aceitar `rassAtual: number | null`.

**Por que um escalar e não a evolução inteira:** `PatientHeader` hoje não
conhece `DailyEvolution`, e não há motivo para passar a conhecer só para exibir
um número. Passar `rassAtual` mantém o componente testável sem construir uma
evolução de mentira.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/patient/PatientHeader.test.tsx`. O componente usa
`supabase` para salvar, então o mock é necessário mesmo sem exercitar o salvar:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PatientHeader } from "./PatientHeader";
import type { Patient } from "../../types";

vi.mock("../../lib/supabase", () => ({
  supabaseConfigured: true,
  isSupabaseConfigured: () => true,
  supabase: { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) },
}));

const paciente = (over: Partial<Patient> = {}): Patient =>
  ({
    id: "p1", owner_id: "u1", hospital_id: null, name: "Paciente Teste",
    age: 60, sex: "M", diagnosis: null, comorbidities: [], intubation_date: null,
    airway: null, height_cm: 170, weight_kg: 70, ventilator_id: null,
    current_mode: "VCV", status: "active", discharge_reason: null,
    discharge_date: null, created_at: "", updated_at: "", ...over,
  } as Patient);

const renderHeader = (rassAtual: number | null, over: Partial<Patient> = {}) =>
  render(
    <PatientHeader
      patient={paciente(over)}
      vent={undefined}
      ventilators={[]}
      onUpdate={vi.fn()}
      rassAtual={rassAtual}
    />
  );

describe("PatientHeader — chip de RASS", () => {
  it("mostra o RASS atual como chip", () => {
    renderHeader(-2);
    expect(screen.getByText(/RASS −2/)).toBeInTheDocument();
  });

  // RASS 0 é "alerta e calmo": medida real, e a mais relevante para decidir
  // se o paciente participa de mobilização. Uma checagem falsy a apagaria.
  it("mostra RASS 0, que é medida e não ausência", () => {
    renderHeader(0);
    expect(screen.getByText(/RASS 0/)).toBeInTheDocument();
  });

  it("não mostra chip de RASS quando não há RASS", () => {
    renderHeader(null);
    expect(screen.queryByText(/RASS/)).not.toBeInTheDocument();
  });

  it("mostra o contexto do paciente junto do RASS", () => {
    renderHeader(-2, { comorbidities: ["dpoc"], airway: "tot" });
    expect(screen.getByText("DPOC")).toBeInTheDocument();
    expect(screen.getByText("TOT")).toBeInTheDocument();
    expect(screen.getByText(/RASS −2/)).toBeInTheDocument();
  });
});
```

Note o sinal: o rótulo usa o menos tipográfico `−` (U+2212), como o
`RASS_LEVELS` de `src/data/scores.ts`. Confira aquele arquivo e use o mesmo
caractere no código e no teste, senão o teste passa a depender de qual menos
você digitou.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/PatientHeader.test.tsx`
Expected: FAIL — a prop `rassAtual` não existe.

- [ ] **Step 3: Implementar**

Em `src/components/patient/PatientHeader.tsx`, acrescente a prop à assinatura:

```tsx
export function PatientHeader({
  patient, vent, ventilators, onUpdate, rassAtual,
}: {
  patient: Patient;
  vent?: Ventilator;
  ventilators: Ventilator[];
  onUpdate: () => void;
  /** RASS da evolução mais recente. null quando não foi registrado. */
  rassAtual: number | null;
}) {
```

E no array `contexto` (linha ~36), como último item:

```tsx
    rassAtual != null ? `RASS ${rassAtual < 0 ? `−${Math.abs(rassAtual)}` : rassAtual}` : null,
```

A comparação é `!= null`, nunca falsy: `rassAtual` zero é medida.

- [ ] **Step 4: Ligar em `PatientDetail`**

Na linha ~101:

```tsx
<PatientHeader
  patient={patient}
  vent={vent}
  ventilators={ventilators}
  onUpdate={load}
  rassAtual={last?.rass ?? null}
/>
```

`last` é a última evolução, já calculada no componente.

- [ ] **Step 5: Rodar até passar**

Run: `pnpm vitest run src/components/patient/PatientHeader.test.tsx`
Expected: PASS.

- [ ] **Step 6: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/components/patient/PatientHeader.tsx src/components/patient/PatientHeader.test.tsx src/pages/PatientDetail.tsx
git diff --cached
```

Mensagem proposta:

```
feat(escores): mostra o RASS atual no cabecalho do paciente
```

**Pare e peça OK.**

---

### Task 5: Extrair `TrendCharts` e `EvolutionHistory`

Movimentação pura, antes de alterar os dois. **Nenhuma mudança de
comportamento.** `PatientDetail.test.tsx` é a rede de segurança e roda antes e
depois, sem ser editado.

**Files:**
- Create: `src/components/patient/TrendCharts.tsx` (de `PatientDetail.tsx:698`)
- Create: `src/components/patient/EvolutionHistory.tsx` (de `PatientDetail.tsx:607`)
- Modify: `src/pages/PatientDetail.tsx`

- [ ] **Step 1: Registrar o verde de partida**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Anote quantos testes passaram. É o número a reproduzir no fim.

- [ ] **Step 2: Mover `EvolutionHistory`**

Recorte `function EvolutionHistory` (linha ~607) para
`src/components/patient/EvolutionHistory.tsx`, como `export function`.

Ela usa `boardSummary` e os mapas `IMAGING_LABEL`, `TUBE_LABEL`, `DIET_LABEL`,
definidos em `PatientDetail.tsx`. **Grepe cada um antes de mover:** se só
`EvolutionHistory` usa, mova junto; se algo mais usa, deixe onde está e
importe. **Não duplique nenhum deles** — dois mapas de rótulo divergem com o
tempo, e o revisor trata bloco de lógica copiado como defeito.

Ajuste os caminhos: `../../lib/...`, `../../data/...`, `../../types`, `../ui`.

- [ ] **Step 3: Rodar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: PASS, mesmo número do Step 1.

- [ ] **Step 4: Mover `TrendCharts`**

Mesmo procedimento para `function TrendCharts` (linha ~698). Ela importa de
`recharts` (`LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`,
`ResponsiveContainer`) e usa `* as C` de `clinical`. Leve os imports que ela
usa e remova de `PatientDetail.tsx` os que ficaram órfãos — `tsc --noEmit`
acusa se sobrar algo sem uso configurado como erro, mas confira à mão também.

- [ ] **Step 5: Rodar tudo**

Run: `pnpm test && pnpm build`
Expected: 235 verdes, build limpo. Qualquer teste que **mude de resultado**
significa que a extração alterou comportamento — desfaça e refaça.

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/components/patient/ src/pages/PatientDetail.tsx
git diff --cached
```

Mensagem proposta:

```
refactor: extrai TrendCharts e EvolutionHistory de PatientDetail
```

**Pare e peça OK.**

---

### Task 6: Séries de escores nos gráficos

**Files:**
- Modify: `src/components/patient/TrendCharts.tsx`
- Create: `src/components/patient/TrendCharts.test.tsx`

**Interfaces:**
- Consumes: `mrcTotal` de `src/lib/scores.ts`.

**A decisão que define esta tarefa:** as séries existentes usam
`connectNulls` no `<Line>`. Para elas tudo bem — derivam de parâmetros
registrados quase todo dia. Para o MRC **não**: `mrcTotal` devolve `null` de
propósito sempre que qualquer um dos 12 valores falta, e conectar esses nulos
desenharia uma trajetória de recuperação muscular que ninguém mediu. É a
armadilha nº 5 do `CLAUDE.md` em forma de gráfico.

As três séries novas entram **sem `connectNulls`**. As existentes **não são
alteradas**: mudar comportamento fora do escopo no mesmo diff é o que torna
uma revisão impossível.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/patient/TrendCharts.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendCharts } from "./TrendCharts";
import { MRC_GROUPS } from "../../data/scores";
import type { Patient, DailyEvolution } from "../../types";

// Recharts não desenha em jsdom sem dimensões: ResponsiveContainer resolve
// para 0x0 e o gráfico não renderiza. Fixa-se o tamanho do elemento pai.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 300 });
});

const paciente = { id: "p1", sex: "M", height_cm: 170 } as unknown as Patient;

const completa = () => Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 4, e: 4 }]));

const evo = (over: Partial<DailyEvolution>): DailyEvolution =>
  ({ recorded_at: "2026-08-30T12:00:00Z", mrc: {}, rass: null, ims: null, ...over } as unknown as DailyEvolution);

describe("TrendCharts — séries de escores", () => {
  it("mostra os gráficos de MRC, IMS e RASS", () => {
    render(
      <TrendCharts
        patient={paciente}
        evolutions={[
          evo({ recorded_at: "2026-08-29T12:00:00Z", mrc: completa(), rass: -2, ims: 3 }),
          evo({ recorded_at: "2026-08-30T12:00:00Z", mrc: completa(), rass: 0, ims: 4 }),
        ]}
      />
    );
    expect(screen.getByText(/força muscular/i)).toBeInTheDocument();
    expect(screen.getByText(/mobilidade/i)).toBeInTheDocument();
    expect(screen.getByText(/sedação/i)).toBeInTheDocument();
  });
});
```

Se o mock de dimensões acima não bastar para o Recharts renderizar em jsdom,
**não force o teste a passar afirmando menos**. Afirme sobre os dados que o
componente monta, extraindo a construção das séries para uma função pura
exportada do mesmo arquivo — e diga no relatório que fez isso.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/TrendCharts.test.tsx`
Expected: FAIL — os títulos novos não existem.

- [ ] **Step 3: Implementar**

Em `TrendCharts.tsx`, acrescente ao objeto que `data` monta:

```tsx
      mrc: mrcTotal(e.mrc),
      ims: e.ims,
      rass: e.rass,
```

Importe `mrcTotal` de `../../lib/scores`.

Acrescente ao array `charts`:

```tsx
    { title: "Força muscular (MRC)", keys: [{ k: "mrc", c: T.purple, n: "MRC" }], semLigarNulos: true },
    { title: "Mobilidade (IMS)", keys: [{ k: "ims", c: T.ok, n: "IMS" }], semLigarNulos: true },
    { title: "Sedação (RASS)", keys: [{ k: "rass", c: T.accent, n: "RASS" }], semLigarNulos: true },
```

Acrescente `semLigarNulos?: boolean` ao tipo do array e use no `<Line>`:

```tsx
                    connectNulls={!ch.semLigarNulos}
```

As quatro entradas existentes não recebem a chave, então `!undefined` é `true`
e o comportamento delas fica idêntico.

- [ ] **Step 4: Escrever o teste da regressão que importa**

Este é o teste que justifica a tarefa. Acrescente:

```tsx
  // Dia sem avaliação completa não vira ponto interpolado: o MRC é null de
  // propósito, e ligar os nulos desenharia uma recuperação que ninguém mediu.
  it("não liga os nulos na série de MRC", () => {
    const { container } = render(
      <TrendCharts
        patient={paciente}
        evolutions={[
          evo({ recorded_at: "2026-08-28T12:00:00Z", mrc: completa() }),
          evo({ recorded_at: "2026-08-29T12:00:00Z", mrc: {} }),
          evo({ recorded_at: "2026-08-30T12:00:00Z", mrc: completa() }),
        ]}
      />
    );
    // Com connectNulls, a série vira UMA path contínua ligando 28 e 30.
    // Sem, viram duas paths separadas.
    const mrcPaths = container.querySelectorAll("path.recharts-curve");
    expect(mrcPaths.length).toBeGreaterThan(0);
  });
```

**Ajuste a asserção ao que o Recharts realmente produz na versão instalada** —
inspecione o DOM renderizado e afirme sobre a diferença observável entre ligar
e não ligar os nulos. Depois **prove**: troque `connectNulls={!ch.semLigarNulos}`
por `connectNulls` fixo em `true`, rode o teste, confirme que fica **vermelho**,
reverta. Ponha o comando e a saída no relatório. Se você não conseguir escrever
uma asserção que distinga os dois casos, **diga isso** em vez de escrever um
teste que passa nos dois — um teste que não distingue é pior que teste nenhum.

- [ ] **Step 5: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/components/patient/TrendCharts.tsx src/components/patient/TrendCharts.test.tsx
git diff --cached
```

Mensagem proposta:

```
feat(escores): plota MRC, IMS e RASS sem interpolar dia sem medida
```

**Pare e peça OK.**

---

### Task 7: Escores no histórico de evoluções

**Files:**
- Modify: `src/components/patient/EvolutionHistory.tsx`
- Create: `src/components/patient/EvolutionHistory.test.tsx`

**Interfaces:**
- Consumes: `mrcTotal` de `src/lib/scores.ts`; `RASS_LEVELS` e `IMS_LEVELS` de `src/data/scores.ts`.

O card de cada dia já mostra achado de imagem, medicamento venoso e
sonda/dieta, montados por `boardSummary`. Os três escores entram na mesma
linha, seguindo o mesmo padrão: **o que não foi registrado simplesmente não
aparece**, sem traço e sem zero.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/patient/EvolutionHistory.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvolutionHistory } from "./EvolutionHistory";
import { MRC_GROUPS } from "../../data/scores";
import type { DailyEvolution } from "../../types";

const completa = () => Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 4, e: 4 }]));

const evo = (over: Partial<DailyEvolution> = {}): DailyEvolution =>
  ({
    id: "e1", patient_id: "p1", owner_id: "u1",
    recorded_at: "2026-08-30T12:00:00Z",
    mrc: {}, rass: null, ims: null, notes: null,
    imaging: {}, iv_meds: {}, feeding: {},
    ...over,
  } as unknown as DailyEvolution);

const renderHist = (evolutions: DailyEvolution[]) =>
  render(<EvolutionHistory evolutions={evolutions} authors={{ u1: "Fisio de Teste" }} />);

describe("EvolutionHistory — escores do dia", () => {
  it("mostra MRC, RASS e IMS registrados naquele dia", () => {
    renderHist([evo({ mrc: completa(), rass: -2, ims: 3 })]);
    expect(screen.getByText(/MRC 48/)).toBeInTheDocument();
    expect(screen.getByText(/RASS −2/)).toBeInTheDocument();
    expect(screen.getByText(/IMS 3/)).toBeInTheDocument();
  });

  // Zero é medida. Um dia com RASS 0 e IMS 0 mostra os dois, não os esconde.
  it("mostra RASS 0 e IMS 0 como medidas", () => {
    renderHist([evo({ rass: 0, ims: 0 })]);
    expect(screen.getByText(/RASS 0/)).toBeInTheDocument();
    expect(screen.getByText(/IMS 0/)).toBeInTheDocument();
  });

  it("não mostra escore que não foi registrado", () => {
    renderHist([evo()]);
    expect(screen.queryByText(/MRC/)).not.toBeInTheDocument();
    expect(screen.queryByText(/RASS/)).not.toBeInTheDocument();
    expect(screen.queryByText(/IMS/)).not.toBeInTheDocument();
  });

  // MRC incompleto não vira total parcial: mrcTotal devolve null.
  it("não mostra MRC quando a avaliação está incompleta", () => {
    const parcial = completa();
    parcial[MRC_GROUPS[0].key] = { d: 4, e: null };
    renderHist([evo({ mrc: parcial })]);
    expect(screen.queryByText(/MRC/)).not.toBeInTheDocument();
  });
});
```

`MRC 48` é 6 grupos × 2 lados × 4 = 48. Confira a conta antes de confiar nela.

O componente pode renderizar o quadro clínico do dia só quando expandido —
leia `EvolutionHistory` e, se for o caso, expanda no teste antes de afirmar, ou
afirme sobre o resumo fechado, conforme onde você decidir colocar os escores.
Diga no relatório qual escolheu.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/EvolutionHistory.test.tsx`
Expected: FAIL — os escores não aparecem.

- [ ] **Step 3: Implementar**

Em `EvolutionHistory.tsx`, dentro de `boardSummary` (ou junto dele, conforme
onde ele mora após a extração da Task 5):

```ts
  // Escores do dia. `!= null` e nunca falsy: RASS 0 e IMS 0 são medidas.
  const rassLabel = e.rass != null
    ? `RASS ${e.rass < 0 ? `−${Math.abs(e.rass)}` : e.rass}`
    : null;
  const imsLabel = e.ims != null ? `IMS ${e.ims}` : null;
  const mrcVal = mrcTotal(e.mrc);
  const mrcLabel = mrcVal != null ? `MRC ${mrcVal}/60` : null;
  const escores = [mrcLabel, rassLabel, imsLabel].filter((x): x is string => x != null);
```

Inclua `escores.length > 0` no cálculo de `hasContent`, e renderize os itens no
mesmo estilo dos chips que o card já usa para achado de imagem e medicamento —
leia o JSX existente e siga, sem inventar estilo novo.

Use o mesmo menos tipográfico `−` de `src/data/scores.ts`.

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/components/patient/EvolutionHistory.test.tsx`
Expected: PASS.

- [ ] **Step 5: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/components/patient/EvolutionHistory.tsx src/components/patient/EvolutionHistory.test.tsx
git diff --cached
```

Mensagem proposta:

```
feat(escores): mostra MRC, RASS e IMS no historico de evolucoes
```

**Pare e peça OK.**

---

### Task 8: Painel de fisioterapia motora

Fecha a fase. É o único lugar com o detalhe dos 12 valores e a assimetria entre
lados — as outras três superfícies mostram total, trajetória ou valor do dia.

**Files:**
- Create: `src/components/patient/MotorPanel.tsx`
- Create: `src/components/patient/MotorPanel.test.tsx`
- Modify: `src/pages/PatientDetail.tsx` (aba `evolucao`, acima do formulário)

**Interfaces:**
- Consumes: `ultimaAvaliacaoMrc`, `mrcTotal`, `classifyMrc`, `mrcAsymmetry`, `type Mrc` de `src/lib/scores.ts`; `MRC_GROUPS` de `src/data/scores.ts`; `SourceFooter` de `src/components/SourceFooter.tsx`.
- Produces: `<MotorPanel evolutions={DailyEvolution[]} />`.

**O que ele é, e o que ele não é:** leitura da **última avaliação completa
registrada**, que pode ser de dias atrás. É distinto do `ScoresPanel` do
formulário, que **captura a de hoje**. Os dois aparecem na mesma aba de
propósito: o terapeuta vê "MRC 40/60 em 29/08, assimetria à esquerda" enquanto
preenche a avaliação de hoje.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/patient/MotorPanel.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MotorPanel } from "./MotorPanel";
import { MRC_GROUPS } from "../../data/scores";
import type { DailyEvolution } from "../../types";
import type { Mrc } from "../../lib/scores";

const completa = (): Mrc =>
  Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 4, e: 4 }]));

const evo = (over: Partial<DailyEvolution> = {}): DailyEvolution =>
  ({ id: "e1", recorded_at: "2026-08-29T12:00:00Z", mrc: {}, ...over } as unknown as DailyEvolution);

const renderPanel = (evolutions: DailyEvolution[]) =>
  render(
    <MemoryRouter>
      <MotorPanel evolutions={evolutions} />
    </MemoryRouter>
  );

describe("MotorPanel", () => {
  it("mostra o total e cada grupo muscular da última avaliação completa", () => {
    renderPanel([evo({ mrc: completa() })]);
    expect(screen.getByText("48")).toBeInTheDocument();
    for (const g of MRC_GROUPS) {
      expect(screen.getByText(g.label)).toBeInTheDocument();
    }
  });

  // O caso que motiva o painel: registrou ventilação hoje sem refazer a força.
  it("usa a última avaliação COMPLETA, não a evolução mais recente", () => {
    renderPanel([
      evo({ id: "antiga", recorded_at: "2026-08-28T12:00:00Z", mrc: completa() }),
      evo({ id: "hoje", recorded_at: "2026-08-30T12:00:00Z", mrc: {} }),
    ]);
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText(/28\/08/)).toBeInTheDocument();
  });

  it("aponta assimetria entre os lados", () => {
    const m = completa();
    m[MRC_GROUPS[0].key] = { d: 4, e: 1 };
    renderPanel([evo({ mrc: m })]);
    expect(screen.getByText(/assimetria/i)).toBeInTheDocument();
  });

  it("não renderiza quando não há nenhuma avaliação completa", () => {
    const { container } = renderPanel([evo({ mrc: {} })]);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza sem evolução alguma", () => {
    const { container } = renderPanel([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("cita a fonte do escore", () => {
    renderPanel([evo({ mrc: completa() })]);
    expect(screen.getByText(/De Jonghe/i)).toBeInTheDocument();
  });
});
```

**Atenção ao import de `Mrc`:** `src/types/index.ts` *importa* `Mrc` de
`../lib/scores` mas **não o reexporta**, então `import type { Mrc } from
"../../types"` não compila. Importe de `../../lib/scores`, como está acima.
Verificado em 31/08/2026.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/MotorPanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./MotorPanel"`.

- [ ] **Step 3: Implementar**

Crie `src/components/patient/MotorPanel.tsx`:

```tsx
import { Panel } from "../ui";
import { SourceFooter } from "../SourceFooter";
import { MRC_GROUPS } from "../../data/scores";
import { ultimaAvaliacaoMrc, mrcTotal, classifyMrc, mrcAsymmetry } from "../../lib/scores";
import { T, statusColor } from "../../lib/theme";
import type { DailyEvolution } from "../../types";

/**
 * Leitura da última avaliação motora COMPLETA, que pode ser de dias atrás.
 * Distinto do ScoresPanel do formulário, que captura a de hoje: aqui o
 * terapeuta consulta a referência anterior enquanto preenche a nova.
 */
export function MotorPanel({ evolutions }: { evolutions: DailyEvolution[] }) {
  const ultima = ultimaAvaliacaoMrc(evolutions);
  if (!ultima) return null;

  const total = mrcTotal(ultima.mrc);
  const cls = classifyMrc(total);
  const assim = mrcAsymmetry(ultima.mrc);
  const quando = new Date(ultima.recorded_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <Panel
      title="Avaliação motora"
      sub={`Última avaliação completa, em ${quando}`}
      accent={T.purple}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 26, color: T.txt }}>{total}</strong>
          <span style={{ fontSize: 12, color: T.dim }}>/ 60</span>
          {cls && (
            <span style={{ fontSize: 12, color: statusColor(cls.s), fontWeight: 700 }}>
              {cls.t}
            </span>
          )}
          {assim && (
            <span style={{ fontSize: 12, color: T.warn }}>
              ⚠ assimetria à {assim.lado === "d" ? "direita" : "esquerda"} ({assim.delta})
            </span>
          )}
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          {MRC_GROUPS.map((g) => {
            const lado = ultima.mrc[g.key];
            return (
              <div
                key={g.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 40px 40px",
                  gap: 8,
                  fontSize: 12.5,
                  color: T.txt,
                  padding: "3px 0",
                  borderBottom: `1px solid ${T.line}`,
                }}
              >
                <span>{g.label}</span>
                <span style={{ textAlign: "center", color: T.dim }}>{lado?.d}</span>
                <span style={{ textAlign: "center", color: T.dim }}>{lado?.e}</span>
              </div>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 40px", gap: 8, fontSize: 10.5, color: T.dim }}>
            <span />
            <span style={{ textAlign: "center" }}>D</span>
            <span style={{ textAlign: "center" }}>E</span>
          </div>
        </div>

        <SourceFooter sourceKeys={["mrc"]} />
      </div>
    </Panel>
  );
}
```

- [ ] **Step 4: Ligar em `PatientDetail`**

Na aba `evolucao`, acima do `<Grid>` que contém o formulário:

```tsx
<MotorPanel evolutions={evolutions} />
```

Importe de `../components/patient/MotorPanel`.

- [ ] **Step 5: Rodar até passar**

Run: `pnpm vitest run src/components/patient/MotorPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Suíte, build e varredura da fase**

```bash
pnpm test && pnpm build
git diff dev...HEAD --stat
git diff dev...HEAD | grep -nEi "console\.log|service_role|SUPABASE_.*KEY|[0-9]{11}|@gmail|@hotmail"
```

Expected: suíte verde, build limpo, e nenhuma ocorrência na varredura. O
repositório é público. Se o único casamento for o próprio comando de grep
dentro deste plano, diga isso — é falso positivo conhecido.

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/components/patient/MotorPanel.tsx src/components/patient/MotorPanel.test.tsx src/pages/PatientDetail.tsx
git diff --cached
```

Mensagem proposta:

```
feat(escores): adiciona painel de avaliacao motora
```

**Pare e peça OK.**

---

## Depois do plano

1. **Levar o dossiê da Task 1 ao mentor.** É o que destrava gasometria,
   mecânica nova, TRE passo a passo e alvo por patologia — os quatro blocos que
   esta fase deliberadamente não toca.
2. **Promoção e push são do Jeann**, na ordem do `CLAUDE.md`:
   `git push origin dev`, depois `git checkout main && git merge --ff-only dev`,
   depois `git push origin main`.
3. **Dizer ao cliente o que ainda falta.** A Fase 2 fecha a dívida de exibição e
   corrige a tela de entrada. A "análise do caso em um todo" continua adiante.
