# Fase 5 — TRE passo a passo :: Plano de implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: use
> `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans`, tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** transformar o teste de respiração espontânea, hoje um campo único
`'pass' | 'fail'`, num procedimento acompanhado ao vivo — com sessão retomável,
avaliação critério a critério e quatro desfechos distintos.

**Architecture:** tabela própria `tre_sessions`, na mesma natureza do
`care_actions`: evento com hora e autor. Um módulo puro `src/lib/tre.ts` resolve
sessão mais coluna legada num tri-estado, de modo que `extubationReadiness` não
precisa mudar — e "interrompido não é reprovado" cai fora naturalmente.

**Tech Stack:** Vite + React 18, TypeScript, Supabase JS, Vitest 3 + Testing
Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-01-fase5-tre-passo-a-passo-design.md`

## Global Constraints

- **pnpm, nunca npm.** `pnpm test`; `pnpm vitest run <caminho>`; `pnpm build`
  roda `tsc --noEmit && vite build`.
- **Baseline a preservar: 289 testes em 21 arquivos, verdes, build limpo.**
- **Proibido em teste:** `node:fs`, `__dirname`, `path`. O tsconfig não inclui
  os tipos de Node: passa no vitest e quebra o `pnpm build`.
- **Nenhum limiar clínico muda de valor.** Os sete critérios de falha entram com
  os valores que o mentor validou, incluindo **pH < 7,35** e não 7,32.
- **"Interrompido" nunca é reprovado.** Um TRE parado por exame ou transporte
  cai em não medido. TRE reprovado é bloqueador absoluto da triagem, então
  confundir os dois reprova um paciente que não falhou em nada.
- **Ausência de dado não é resultado normal.** Critério ausente do jsonb é "não
  avaliado", diferente de presente com `atingido: false`.
- **O app nunca encerra sessão sozinho.** Inventar desfecho de teste clínico é
  pior que deixar a sessão aberta.
- **O app não cronometra os cinco minutos** de persistência de cada critério.
  Quem julga é o terapeuta, e isso precisa estar dito na tela.
- **Regra de negócio em `src/lib/`**, catálogo em `src/data/`, nunca em componente.
- **Repositório PÚBLICO.** Nenhum segredo, nenhum dado real de paciente.
- **Não há arquivo CSS.** Tokens de `src/lib/theme.ts`, componentes de `src/components/ui.tsx`.
- **O SQL não é verificado por teste nenhum.** Sai revisado, não verificado, e
  quem aplica no Supabase é o Jeann.
- **Commit é operação do Jeann.** Todo passo "Commit" significa `git add` com
  caminhos explícitos, revisar `git diff --cached`, apresentar a mensagem e
  **parar para pedir OK**.
- **Mensagem de commit:** Conventional Commits em português, imperativo, até 72
  caracteres, sem emoji, sem `Co-Authored-By`, sem rodapé de IA, sem travessão.

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `src/data/tre.ts` | catálogo dos sete critérios e das modalidades de teste |
| `src/lib/tre.ts` | avaliação, aptidão, e a resolução sessão + legado |
| `src/lib/tre.test.ts` | testes do módulo |
| `src/components/patient/TrePanel.tsx` | a tela do teste |
| `src/components/patient/TrePanel.test.tsx` | testes da tela |

**Modificados:**

| Arquivo | O quê |
|---|---|
| `supabase/schema.sql` | tabela `tre_sessions` e RLS |
| `src/types/index.ts` | tipo `TreSession` |
| `src/lib/references.ts` | chave `treFalha` |
| `src/pages/PatientDetail.tsx` | carga, fiação do painel na aba Desmame |
| `src/pages/PatientDetail.test.tsx` | teste de fiação; correção de cinco fixtures |

---

### Task 1: Schema e tipo

**ATENÇÃO:** este SQL **não é executado por nada** neste ambiente. Não há banco.
Não tente conectar, não procure string de conexão, não instale cliente Postgres.
A verificação desta tarefa é `pnpm build`, não vitest. **Quem aplica no Supabase
é o Jeann.**

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `interface TreSession` com os campos da tabela.

- [ ] **Step 1: Acrescentar o DDL**

Em `supabase/schema.sql`, antes da seção de colunas sem uso. A RLS espelha
`care_actions` — leia aquele bloco antes de escrever este.

```sql
-- ---------- TRE SESSIONS (teste de respiração espontânea) ----------
-- Um TRE é procedimento cronometrado: começa, roda de 30 a 120 minutos e pode
-- ser interrompido. Isso é EVENTO, não atributo do dia — mesma natureza do
-- care_actions.
-- `desfecho` nulo significa EM ANDAMENTO, e não dado faltando.
-- 'interrompido' (exame, transporte) NÃO é 'falhou': o paciente não reprovou,
-- o teste não aconteceu. A triagem trata os dois de forma diferente.
create table if not exists public.tre_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  iniciado_em timestamptz not null default now(),
  encerrado_em timestamptz,
  modo_antes text,
  modo_durante text,
  desfecho text check (desfecho is null or desfecho in ('aprovado','falhou','interrompido')),
  motivo_interrupcao text,
  criterios jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.tre_sessions enable row level security;

drop policy if exists "tre_select_member" on public.tre_sessions;
create policy "tre_select_member"
  on public.tre_sessions for select using (public.can_access_patient(patient_id));
drop policy if exists "tre_insert_member" on public.tre_sessions;
create policy "tre_insert_member"
  on public.tre_sessions for insert with check (public.can_access_patient(patient_id) and auth.uid() = owner_id);
drop policy if exists "tre_update_member" on public.tre_sessions;
create policy "tre_update_member"
  on public.tre_sessions for update using (public.can_access_patient(patient_id));
drop policy if exists "tre_delete_member" on public.tre_sessions;
create policy "tre_delete_member"
  on public.tre_sessions for delete using (public.can_access_patient(patient_id));

create index if not exists idx_tre_patient on public.tre_sessions (patient_id, iniciado_em desc);
```

O `check` no `desfecho` é seguro aqui, diferente do `action` do `care_actions`:
são três valores fechados de domínio, não um catálogo que cresce.

- [ ] **Step 2: Registrar a coluna legada**

Na seção "COLUNAS SEM USO NO APP" ao fim do arquivo, acrescente:

```
--   daily_evolutions.tre_result  legada desde 01/09/2026 (Fase 5): substituída
--     por public.tre_sessions. Continua sendo LIDA como fallback para pacientes
--     registrados antes da mudança; deixou de ser escrita. Não derrubar.
```

- [ ] **Step 3: Acrescentar o tipo**

Ao fim de `src/types/index.ts`:

```ts
/** Desfecho de um TRE. `null` significa em andamento, não dado faltando. */
export type TreDesfecho = "aprovado" | "falhou" | "interrompido";

/**
 * Estado de um critério de falha. A AUSÊNCIA da chave no jsonb significa
 * "não avaliado" — diferente de presente com `atingido: false`, que significa
 * avaliado e não atingido.
 */
export interface TreCriterio {
  atingido: boolean;
  observacao?: string;
}

export interface TreSession {
  id: string;
  patient_id: string;
  owner_id: string;
  iniciado_em: string;
  encerrado_em: string | null;
  modo_antes: string | null;
  modo_durante: string | null;
  desfecho: TreDesfecho | null;
  motivo_interrupcao: string | null;
  criterios: Record<string, TreCriterio>;
}
```

- [ ] **Step 4: Rodar o compilador**

Run: `pnpm build`
Expected: **sai limpo.** Nada consome `TreSession` ainda, então não há erro a
corrigir. Se sair limpo, a tarefa está certa — **não procure trabalho**.

- [ ] **Step 5: Suíte**

Run: `pnpm test`
Expected: 289 verdes, inalterados.

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add supabase/schema.sql src/types/index.ts
git diff --cached
```

Mensagem proposta:

```
feat(tre): declara a tabela de sessoes de TRE e seu tipo
```

**Ao pedir OK, avise que este DDL precisa ser aplicado à mão no Supabase pelo
Jeann, e que nenhum teste o cobre.**

---

### Task 2: Catálogo dos critérios

**Files:**
- Create: `src/data/tre.ts`

**Interfaces:**
- Produces:
  - `CRITERIOS_FALHA: { key: string; label: string; detalhe: string }[]` — sete entradas
  - `MODALIDADES_TESTE: { v: string; t: string }[]`

- [ ] **Step 1: Escrever o catálogo**

Crie `src/data/tre.ts`:

```ts
// ============================================================
// Catálogo do teste de respiração espontânea :: CONTEÚDO VALIDADO
// Critérios de falha validados pelo mentor clínico em 01/09/2026, seguindo as
// Orientações Práticas AMIB/SBPT 2024 e o consenso de Boles 2007.
// O pH é 7,35 por decisão dele: Boles usa 7,32, e a divergência é real.
// ATENÇÃO: os critérios valem "persistindo por 5 minutos ou mais". O APP NÃO
// CRONOMETRA cada critério — quem julga a persistência é o terapeuta, que está
// ao lado do paciente. O app cronometra a sessão.
// ============================================================

export interface CriterioFalha {
  key: string;
  label: string;
  /** O valor que caracteriza a falha, mostrado ao lado do rótulo. */
  detalhe: string;
}

export const CRITERIOS_FALHA: CriterioFalha[] = [
  { key: "saturacao", label: "Queda de saturação", detalhe: "SpO₂ ≤ 90%, ou PaO₂ ≤ 50 mmHg com FiO₂ ≥ 50%" },
  { key: "hipercapnia", label: "Retenção de CO₂", detalhe: "PaCO₂ > 50 mmHg" },
  { key: "acidose", label: "Acidose", detalhe: "pH < 7,35" },
  { key: "taquipneia", label: "Taquipneia", detalhe: "FR > 35/min" },
  { key: "taquicardia", label: "Taquicardia", detalhe: "FC > 140/min" },
  { key: "pressao", label: "Alteração pressórica", detalhe: "PAS > 180 ou < 90 mmHg" },
  { key: "esforco", label: "Sinais de esforço", detalhe: "musculatura acessória, respiração paradoxal, agitação, sudorese" },
];

// Modalidade em que o teste é conduzido :: CONTEÚDO A VALIDAR
// A lista definitiva é pergunta em aberto para o mentor. Nenhum limiar depende
// dela, então não bloqueia.
export const MODALIDADES_TESTE: { v: string; t: string }[] = [
  { v: "psv", t: "PSV" },
  { v: "cpap", t: "CPAP" },
  { v: "tubo_t", t: "Tubo T" },
];
```

- [ ] **Step 2: Conferir o build**

Run: `pnpm build && pnpm test`
Expected: limpo, 289 verdes. Catálogo sem consumidor ainda não quebra nada.

- [ ] **Step 3: Preparar o commit e pedir OK**

```bash
git add src/data/tre.ts
git diff --cached
```

Mensagem proposta:

```
feat(tre): cataloga os criterios de falha e as modalidades
```

**Pare e peça OK.**

---

### Task 3: `src/lib/tre.ts`

O coração clínico da fase. Funções puras, sem React e sem Supabase.

**Files:**
- Create: `src/lib/tre.ts`
- Create: `src/lib/tre.test.ts`

**Interfaces:**
- Consumes: `CRITERIOS_FALHA` da Task 2; `TreSession`, `TreDesfecho`, `TreCriterio` da Task 1.
- Produces:
  - `criteriosAtingidos(s: TreSession): string[]`
  - `sessaoEmAndamento(sessoes: TreSession[]): TreSession | null`
  - `resultadoTreParaTriagem(sessoes: TreSession[], treResultLegado: string | null): "pass" | "fail" | null`
  - `duracaoMinutos(s: TreSession, agora?: Date): number`
  - `pendenciasParaIniciar(r: ExtubationReadiness): string[]`

**A função que define a fase é a terceira.** Ela resolve sessão mais coluna
legada num tri-estado que `extubationReadiness` já sabe consumir — por isso
`clinical.ts` **não muda nesta fase**.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/lib/tre.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  criteriosAtingidos,
  sessaoEmAndamento,
  resultadoTreParaTriagem,
  duracaoMinutos,
  pendenciasParaIniciar,
} from "./tre";
import type { TreSession } from "../types";
import type { ExtubationReadiness } from "./clinical";

const sessao = (over: Partial<TreSession> = {}): TreSession =>
  ({
    id: "s1", patient_id: "p1", owner_id: "u1",
    iniciado_em: "2026-09-01T10:00:00Z",
    encerrado_em: null, modo_antes: "PCV", modo_durante: "psv",
    desfecho: null, motivo_interrupcao: null, criterios: {},
    ...over,
  } as TreSession);

describe("criteriosAtingidos", () => {
  it("lista só os critérios marcados como atingidos", () => {
    const s = sessao({
      criterios: {
        taquipneia: { atingido: true },
        saturacao: { atingido: false },
      },
    });
    expect(criteriosAtingidos(s)).toEqual(["taquipneia"]);
  });

  // Chave ausente é "não avaliado", presente com false é "avaliado e não
  // atingido". Nenhum dos dois é atingido, mas são estados diferentes.
  it("não confunde critério ausente com critério não atingido", () => {
    const s = sessao({ criterios: { saturacao: { atingido: false } } });
    expect(criteriosAtingidos(s)).toEqual([]);
  });

  it("devolve lista vazia sem critério nenhum", () => {
    expect(criteriosAtingidos(sessao())).toEqual([]);
  });
});

describe("sessaoEmAndamento", () => {
  it("acha a sessão sem desfecho", () => {
    const aberta = sessao({ id: "aberta" });
    const fechada = sessao({ id: "fechada", desfecho: "aprovado" });
    expect(sessaoEmAndamento([fechada, aberta])?.id).toBe("aberta");
  });

  it("devolve null quando todas foram encerradas", () => {
    expect(sessaoEmAndamento([sessao({ desfecho: "falhou" })])).toBeNull();
  });

  it("devolve null sem sessão alguma", () => {
    expect(sessaoEmAndamento([])).toBeNull();
  });
});

describe("resultadoTreParaTriagem", () => {
  it("um TRE aprovado atende o critério", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: "aprovado" })], null)).toBe("pass");
  });

  it("um TRE falhado reprova", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: "falhou" })], null)).toBe("fail");
  });

  // O ACHADO CENTRAL DA FASE. Um teste parado por tomografia ou transporte não
  // é um paciente que reprovou — é um teste que não aconteceu. E TRE reprovado
  // é bloqueador ABSOLUTO da triagem, então confundir os dois reprova alguém
  // que não falhou em nada.
  it("um TRE interrompido NÃO reprova: cai em não medido", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: "interrompido" })], null)).toBeNull();
  });

  it("um TRE em andamento ainda não tem resultado", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: null })], null)).toBeNull();
  });

  it("usa a sessão mais recente quando há várias", () => {
    const antiga = sessao({ iniciado_em: "2026-08-30T10:00:00Z", desfecho: "falhou" });
    const nova = sessao({ iniciado_em: "2026-09-01T10:00:00Z", desfecho: "aprovado" });
    expect(resultadoTreParaTriagem([antiga, nova], null)).toBe("pass");
  });

  // Sem sessão, cai no campo antigo: paciente registrado antes desta fase não
  // perde o que foi anotado.
  it("sem sessão nenhuma, cai no campo legado", () => {
    expect(resultadoTreParaTriagem([], "pass")).toBe("pass");
    expect(resultadoTreParaTriagem([], "fail")).toBe("fail");
    expect(resultadoTreParaTriagem([], null)).toBeNull();
  });

  // A sessão é a fonte de verdade quando existe: o legado não a sobrepõe.
  it("a sessão tem precedência sobre o campo legado", () => {
    expect(resultadoTreParaTriagem([sessao({ desfecho: "falhou" })], "pass")).toBe("fail");
  });

  it("ignora valor legado fora do domínio", () => {
    expect(resultadoTreParaTriagem([], "success")).toBeNull();
  });
});

describe("pendenciasParaIniciar", () => {
  // Aptidão para INICIAR não é a mesma pergunta que prontidão para EXTUBAR.
  // Os critérios são os mesmos, menos o do próprio TRE — que só existe depois
  // do teste. Sem essa exclusão a pergunta se morde: para iniciar o teste você
  // precisaria já ter feito o teste.
  const triagem = (over: Partial<ExtubationReadiness> = {}): ExtubationReadiness =>
    ({ level: "borderline", score: 0, max: 9, met: [], failed: [], notMeasured: [], ...over });

  it("lista os critérios reprovados que impedem iniciar", () => {
    const r = triagem({ failed: ["PEEP ≤ 8", "FiO₂ ≤ 40%"] });
    expect(pendenciasParaIniciar(r)).toEqual(["PEEP ≤ 8", "FiO₂ ≤ 40%"]);
  });

  it("NÃO conta o próprio TRE como pendência para iniciar o TRE", () => {
    const r = triagem({ failed: ["TRE aprovado", "PEEP ≤ 8"] });
    expect(pendenciasParaIniciar(r)).toEqual(["PEEP ≤ 8"]);
  });

  it("não trata critério não medido como pendência", () => {
    const r = triagem({ notMeasured: ["PImax ≤ -20"] });
    expect(pendenciasParaIniciar(r)).toEqual([]);
  });

  it("devolve vazio quando nada reprovou", () => {
    expect(pendenciasParaIniciar(triagem())).toEqual([]);
  });
});

describe("duracaoMinutos", () => {
  it("mede da abertura ao encerramento", () => {
    const s = sessao({
      iniciado_em: "2026-09-01T10:00:00Z",
      encerrado_em: "2026-09-01T10:45:00Z",
    });
    expect(duracaoMinutos(s)).toBe(45);
  });

  it("mede até agora quando a sessão está aberta", () => {
    const s = sessao({ iniciado_em: "2026-09-01T10:00:00Z" });
    expect(duracaoMinutos(s, new Date("2026-09-01T10:30:00Z"))).toBe(30);
  });
});
```

Note o último teste de `resultadoTreParaTriagem`: `"success"` não é valor do
domínio (`'pass' | 'fail' | null`) e precisa cair em não medido, não em
reprovado. É exatamente o valor que aparece em cinco fixtures hoje.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/tre.test.ts`
Expected: FAIL — `Failed to resolve import "./tre"`.

- [ ] **Step 3: Implementar**

Crie `src/lib/tre.ts`:

```ts
// ============================================================
// Teste de respiração espontânea — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Critérios validados pelo mentor clínico em 01/09/2026.
// ============================================================
import type { TreSession } from "../types";
import type { ExtubationReadiness } from "./clinical";

/** Critérios marcados como atingidos. Chave ausente é "não avaliado". */
export function criteriosAtingidos(s: TreSession): string[] {
  return Object.entries(s.criterios ?? {})
    .filter(([, c]) => c?.atingido === true)
    .map(([k]) => k);
}

/** A sessão ainda sem desfecho, se houver. */
export function sessaoEmAndamento(sessoes: TreSession[]): TreSession | null {
  return sessoes.find((s) => s.desfecho == null) ?? null;
}

/**
 * Traduz o histórico de TRE no tri-estado que a triagem de extubação consome.
 *
 * 'interrompido' devolve null DE PROPÓSITO: um teste parado por exame ou
 * transporte não é um paciente que reprovou, é um teste que não aconteceu — e
 * um TRE reprovado é bloqueador absoluto da triagem.
 *
 * Sem sessão alguma, cai no campo legado `daily_evolutions.tre_result`, para
 * não apagar o histórico de quem foi registrado antes da Fase 5.
 */
export function resultadoTreParaTriagem(
  sessoes: TreSession[],
  treResultLegado: string | null
): "pass" | "fail" | null {
  const ordenadas = [...sessoes].sort(
    (a, b) => new Date(a.iniciado_em).getTime() - new Date(b.iniciado_em).getTime()
  );
  const ultima = ordenadas[ordenadas.length - 1];
  if (ultima) {
    if (ultima.desfecho === "aprovado") return "pass";
    if (ultima.desfecho === "falhou") return "fail";
    return null; // interrompido ou em andamento
  }
  if (treResultLegado === "pass") return "pass";
  if (treResultLegado === "fail") return "fail";
  return null;
}

/** Rótulo do critério de TRE dentro da triagem, para poder ser excluído. */
const CRITERIO_TRE = "TRE aprovado";

/**
 * O que reprova hoje e impede iniciar um TRE — os mesmos critérios da triagem,
 * MENOS o do próprio TRE, que só existe depois do teste. Sem essa exclusão a
 * pergunta se morde: para iniciar o teste seria preciso já tê-lo feito.
 *
 * Critério não medido NÃO é pendência: ausência de dado não reprova, como em
 * todo o resto do projeto. E o app não bloqueia o início — quem decide é o
 * terapeuta; isto é o que ele vê antes de decidir.
 */
export function pendenciasParaIniciar(r: ExtubationReadiness): string[] {
  return r.failed.filter((label) => label !== CRITERIO_TRE);
}

export function duracaoMinutos(s: TreSession, agora: Date = new Date()): number {
  const fim = s.encerrado_em ? new Date(s.encerrado_em) : agora;
  return Math.floor((fim.getTime() - new Date(s.iniciado_em).getTime()) / 60000);
}
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/lib/tre.test.ts`
Expected: PASS.

- [ ] **Step 5: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/lib/tre.ts src/lib/tre.test.ts
git diff --cached
```

Mensagem proposta:

```
feat(tre): resolve o resultado do TRE para a triagem de extubacao
```

**Pare e peça OK.**

---

### Task 4: A triagem passa a ler a sessão

**Files:**
- Modify: `src/pages/PatientDetail.tsx` (`load()` linha ~49; `ExtubationCard` linha ~611)
- Modify: `src/pages/PatientDetail.test.tsx` (cinco fixtures; teste novo)

**Interfaces:**
- Consumes: `resultadoTreParaTriagem` da Task 3.

**`src/lib/clinical.ts` NÃO muda nesta tarefa.** O tri-estado que `tre.ts`
devolve é exatamente o que `ExtubationInput.treResult` já aceita.

- [ ] **Step 1: Corrigir os cinco fixtures errados**

`src/pages/PatientDetail.test.tsx` usa `tre_result: "success"` em cinco lugares.
O domínio é `'pass' | 'fail' | null`, e `extubationReadiness` compara com
`"pass"` — então hoje esses fixtures são lidos como critério **reprovado**.

Troque os cinco para `tre_result: "pass"`. Rode o arquivo e confirme que
continua verde: se algum teste mudar de resultado, ele dependia do valor errado
e isso precisa ir no relatório.

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`

- [ ] **Step 2: Escrever o teste de fiação que falha**

Acrescente ao mesmo arquivo, seguindo os helpers e o mock que ele já define:

```tsx
it("não reprova a triagem quando o TRE foi interrompido", async () => {
  db.patient = { ...PACIENTE_BASE };
  db.evolutions = [{ ...EVOLUCAO_BASE, tre_result: null }];
  db.treSessions = [
    { id: "s1", patient_id: "p1", owner_id: "u1",
      iniciado_em: "2026-09-01T10:00:00Z", encerrado_em: "2026-09-01T10:20:00Z",
      modo_antes: "PCV", modo_durante: "psv",
      desfecho: "interrompido", motivo_interrupcao: "tomografia", criterios: {} },
  ];
  renderDetail();
  await user.click(await screen.findByRole("tab", { name: /desmame/i }));
  const cartao = screen.getByText("Prontidão para extubação").closest("section")!;
  expect(within(cartao).getByText(/TRE aprovado/)).toBeInTheDocument();
  // Está em "não medido", e não entre os reprovados.
  expect(within(cartao).queryByText(/Critérios desfavoráveis/)).not.toBeInTheDocument();
});
```

Você precisará estender o mock do supabase para servir `tre_sessions` — o
arquivo já tem um `rowsOf(table)` que despacha por nome de tabela. Siga o
padrão, não invente outro.

Ajuste os nomes ao que o arquivo realmente usa; os acima são ilustrativos.

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: FAIL — nada busca `tre_sessions` ainda.

- [ ] **Step 4: Carregar as sessões**

Em `load()`, o `Promise.all` hoje destrutura **CINCO** elementos: patients,
ventilators, daily_evolutions, asynchronies, care_actions. `tre_sessions` é o
**sexto**.

```tsx
supabase.from("tre_sessions").select("*").eq("patient_id", id).order("iniciado_em", { ascending: true }),
```

Acrescente `, { data: tre }` ao final da desestruturação e
`setTreSessions((tre as TreSession[]) ?? []);` junto dos demais setters.

**Pôr no lugar do quinto sobrescreveria `careActions` com as sessões e
quebraria a aba Cuidados em silêncio** — os dois são arrays e o compilador não
acusaria. Esse erro exato já aconteceu numa fase anterior deste projeto.

- [ ] **Step 5: Ligar no `ExtubationCard`**

O cartão recebe hoje apenas `ev`. Passe também as sessões, e troque a leitura:

```tsx
treResult: resultadoTreParaTriagem(treSessions, ev.tre_result),
```

- [ ] **Step 6: Rodar até passar**

Run: `pnpm test && pnpm build`

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/pages/PatientDetail.tsx src/pages/PatientDetail.test.tsx
git diff --cached
```

Mensagem proposta:

```
feat(tre): triagem le a sessao de TRE e nao reprova interrompido
```

**Pare e peça OK.**

---

### Task 5: O painel do TRE

**Files:**
- Create: `src/components/patient/TrePanel.tsx`
- Create: `src/components/patient/TrePanel.test.tsx`

**Interfaces:**
- Consumes: `CRITERIOS_FALHA`, `MODALIDADES_TESTE` da Task 2;
  `sessaoEmAndamento`, `criteriosAtingidos`, `duracaoMinutos` da Task 3;
  `TreSession` da Task 1; `supabase`; `Panel`, `Alert`, `Field`, `Btn` de `../ui`.
- Produces:
  `<TrePanel patientId={string} ownerId={string} modoAtual={string | null} sessoes={TreSession[]} pendencias={string[]} onChange={() => void} />`

**Três estados de tela**, e o painel decide qual mostrar:

1. **Sem sessão aberta** — botão de iniciar, com a modalidade a escolher e o
   modo atual pré-preenchido como `modo_antes`.
2. **Em andamento** — tempo decorrido, os sete critérios para marcar, e as três
   formas de encerrar.
3. **Histórico** — as sessões encerradas, com desfecho, duração e critérios.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/components/patient/TrePanel.test.tsx`. O mock do supabase segue o
formato de `CareBundlePanel.test.tsx` — leia aquele arquivo antes.

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TrePanel } from "./TrePanel";
import { CRITERIOS_FALHA } from "../../data/tre";
import type { TreSession } from "../../types";

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

const sessao = (over: Partial<TreSession> = {}): TreSession =>
  ({
    id: "s1", patient_id: "p1", owner_id: "u1",
    iniciado_em: "2026-09-01T10:00:00Z", encerrado_em: null,
    modo_antes: "PCV", modo_durante: "psv",
    desfecho: null, motivo_interrupcao: null, criterios: {},
    ...over,
  } as TreSession);

const renderPanel = (
  sessoes: TreSession[] = [],
  over: { pendencias?: string[] } = {}
) =>
  render(
    <MemoryRouter>
      <TrePanel
        patientId="p1"
        ownerId="u1"
        modoAtual="PCV"
        sessoes={sessoes}
        pendencias={over.pendencias ?? []}
        onChange={vi.fn()}
      />
    </MemoryRouter>
  );

describe("TrePanel — sem sessão aberta", () => {
  it("oferece iniciar o teste", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /iniciar/i })).toBeInTheDocument();
  });

  it("grava a sessão com o modo anterior e a modalidade", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /iniciar/i }));
    await waitFor(() => {
      expect(db.lastInsert).toMatchObject({
        patient_id: "p1", owner_id: "u1", modo_antes: "PCV",
      });
    });
  });

  it("avisa quando a gravação falha, em vez de fingir que iniciou", async () => {
    const user = userEvent.setup();
    db.erro = { message: "sem permissão" };
    renderPanel();
    await user.click(screen.getByRole("button", { name: /iniciar/i }));
    await waitFor(() => {
      expect(screen.getByText(/sem permiss/i)).toBeInTheDocument();
    });
  });
});

describe("TrePanel — em andamento", () => {
  it("mostra os sete critérios de falha", () => {
    renderPanel([sessao()]);
    for (const c of CRITERIOS_FALHA) {
      expect(screen.getByText(c.label)).toBeInTheDocument();
    }
  });

  // O app não mede os 5 minutos de persistência de cada sinal: quem julga é o
  // terapeuta. Isso precisa estar dito na tela, não só no spec.
  it("diz que a persistência de 5 minutos é julgada pelo terapeuta", () => {
    renderPanel([sessao()]);
    expect(screen.getByText(/5 min/i)).toBeInTheDocument();
  });

  it("mostra o que ainda reprova na triagem sem bloquear o início", () => {
    // A prop `pendencias` vem da página, que já calcula a triagem.
    renderPanel([], { pendencias: ["PEEP ≤ 8"] });
    expect(screen.getByText(/PEEP ≤ 8/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar/i })).toBeEnabled();
  });
});

describe("TrePanel — em andamento", () => {
  it("oferece as três formas de encerrar", () => {
    renderPanel([sessao()]);
    expect(screen.getByRole("button", { name: /aprovado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /falhou/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /interromper/i })).toBeInTheDocument();
  });

  it("encerra gravando o desfecho", async () => {
    const user = userEvent.setup();
    renderPanel([sessao()]);
    await user.click(screen.getByRole("button", { name: /aprovado/i }));
    await waitFor(() => {
      expect(db.lastUpdate).toMatchObject({ desfecho: "aprovado" });
      expect(db.lastUpdate).toHaveProperty("encerrado_em");
    });
  });

  // O app nunca encerra sozinho: um "aprovado" automático entraria na triagem
  // de extubação como critério atendido.
  it("mostra o tempo decorrido de uma sessão esquecida sem encerrá-la", () => {
    const ontem = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
    renderPanel([sessao({ iniciado_em: ontem })]);
    expect(screen.getByText(/840 min|14 h/i)).toBeInTheDocument();
    expect(db.lastUpdate).toBeNull();
  });
});

describe("TrePanel — histórico", () => {
  it("mostra o desfecho de uma sessão encerrada", () => {
    renderPanel([
      sessao({ desfecho: "interrompido", motivo_interrupcao: "tomografia",
               encerrado_em: "2026-09-01T10:20:00Z" }),
    ]);
    expect(screen.getByText(/interrompido/i)).toBeInTheDocument();
    expect(screen.getByText(/tomografia/i)).toBeInTheDocument();
  });
});
```

O teste do tempo decorrido usa `Date.now()` com deslocamento, e não uma data
fixa, para não depender do relógio da máquina — o mesmo cuidado que a Fase 1
teve que aprender com o bug de fuso.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/TrePanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./TrePanel"`.

- [ ] **Step 3: Implementar**

Crie `src/components/patient/TrePanel.tsx`. Estrutura obrigatória, detalhes de
layout a seu critério dentro dos tokens existentes:

- Um `Panel` por estado, no estilo do `CareBundlePanel`.
- **Sem sessão aberta:** seletor de modalidade (`MODALIDADES_TESTE`), campo do
  modo anterior pré-preenchido com `modoAtual` e editável, e o botão de iniciar.
  O insert grava `patient_id`, `owner_id`, `modo_antes`, `modo_durante`.
  **Acima do botão, as pendências de `pendenciasParaIniciar`**, quando houver:
  uma lista do que hoje reprova na triagem, para o terapeuta ver antes de
  decidir. **O botão NÃO é desabilitado por causa delas** — quem decide é ele,
  conforme o enquadramento do mentor de que a sugestão não determina a conduta.
- **Em andamento:** o tempo decorrido via `duracaoMinutos`, uma linha por
  critério com um alternador de atingido, e **a frase dizendo que a persistência
  de 5 minutos é julgada pelo terapeuta e não cronometrada pelo app**. Três
  botões de encerrar: aprovado, falhou, interromper. Interromper pede o motivo.
- **Histórico:** as sessões com `desfecho` preenchido, mostrando desfecho,
  duração, critérios atingidos e o motivo quando houver.
- **Erro de escrita aparece num `Alert`.** Silenciar faz o terapeuta acreditar
  que registrou o que não registrou.
- `SourceFooter` com `sourceKeys={["treFalha"]}`.

Acrescente `treFalha` ao `SourceKey` e ao `THRESHOLD_SOURCES` em
`src/lib/references.ts`, apontando para `["boles_2007", "amib_sbpt_2024"]`.
Ambas já estão no catálogo, então nenhuma referência fica órfã.

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/components/patient/TrePanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/components/patient/TrePanel.tsx src/components/patient/TrePanel.test.tsx src/lib/references.ts
git diff --cached
```

Mensagem proposta:

```
feat(tre): adiciona o painel do teste de respiracao espontanea
```

**Pare e peça OK.**

---

### Task 6: Fiação na aba Desmame

Fecha a fase.

**Files:**
- Modify: `src/pages/PatientDetail.tsx` (aba `desmame`, linha ~169)
- Modify: `src/pages/PatientDetail.test.tsx`

- [ ] **Step 1: Escrever o teste de fiação que falha**

O painel funciona isolado e isso não prova que ele está montado. Sem este
teste, apagar a linha do `<TrePanel/>` da página não quebraria nada — foi
exatamente o defeito que a Fase 2 embarcou e teve que corrigir depois.

```tsx
it("mostra o painel de TRE na aba Desmame", async () => {
  db.patient = { ...PACIENTE_BASE };
  db.evolutions = [{ ...EVOLUCAO_BASE }];
  db.treSessions = [];
  renderDetail();
  await user.click(await screen.findByRole("tab", { name: /desmame/i }));
  expect(await screen.findByText("Teste de respiração espontânea")).toBeInTheDocument();
});
```

Ancore numa string que **só o `TrePanel`** produz. O `ExtubationCard` está na
mesma aba e fala de extubação; escolha o título do painel de TRE e diga no
relatório por que ele é inequívoco.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: FAIL — o painel não está montado.

- [ ] **Step 3: Montar na aba**

Na aba `desmame`, acima do `ExtubationCard`:

```tsx
<TrePanel
  patientId={patient.id}
  ownerId={session!.user.id}
  modoAtual={patient.current_mode}
  sessoes={treSessions}
  pendencias={pendenciasParaIniciar(triagem)}
  onChange={load}
/>
```

O painel de TRE vem antes da triagem porque é o teste que alimenta um dos
critérios dela.

`triagem` é o resultado de `extubationReadiness` que o `ExtubationCard` já
calcula. Extraia esse cálculo para o corpo da aba, de modo que os dois
componentes leiam o mesmo objeto em vez de calcularem duas vezes — dois
cálculos independentes do mesmo critério é como eles passam a divergir.

- [ ] **Step 4: Provar que o teste guarda**

Apague a linha do `<TrePanel/>`, rode o arquivo, confirme que o teste novo fica
**vermelho**, restaure. Ponha o comando e a saída no relatório.

- [ ] **Step 5: Suíte, build e varredura da fase**

```bash
pnpm test && pnpm build
git diff dev...HEAD --stat
git diff dev...HEAD | grep -nEi "console\.log|service_role|SUPABASE_.*KEY|@gmail|@hotmail"
```

Expected: verde, build limpo, nenhuma ocorrência. Se o único casamento for o
comando de grep dentro deste plano, diga isso — falso positivo conhecido.

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/pages/PatientDetail.tsx src/pages/PatientDetail.test.tsx
git diff --cached
```

Mensagem proposta:

```
feat(tre): monta o painel de TRE na aba de desmame
```

**Pare e peça OK.**

---

## Depois do plano

1. **O DDL da Task 1 precisa ser aplicado no Supabase pelo Jeann.** Nenhum teste
   o cobre, e sem ele o painel falha ao gravar em produção.
2. **Promoção e push são do Jeann**, na ordem do `CLAUDE.md`.
3. **A Fase 6 é a gasometria**, e depende de uma resposta do mentor que ainda
   não veio: se ele quer ânion-gap. Vale perguntar antes de chegar lá.
