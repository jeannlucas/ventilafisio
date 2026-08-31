# Fase 1 — Embasamento, contexto, escores e bundle :: Plano de implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: use
> `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam
> checkbox (`- [ ]`) para acompanhamento.

**Goal:** dar embasamento citável a todo limiar que o app já afirma, e registrar
contexto do paciente, escores e cuidados de plantão, sem criar nenhuma
afirmação clínica nova.

**Architecture:** catálogo de fontes estático em `src/data/`, ligado aos
limiares por um mapa em `src/lib/references.ts` que um teste obriga a ficar
completo. Escores e tempo de ventilação entram como funções puras em `src/lib/`.
O bundle de cuidados ganha tabela própria no Supabase. `PatientDetail.tsx` é
extraído apenas naquilo que esta fase toca.

**Tech Stack:** Vite + React 18, TypeScript, react-router-dom 6, Supabase JS,
Vitest 3 + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-31-fase1-embasamento-contexto-escores-design.md`

## Global Constraints

Valem para toda tarefa. Vindas do `CLAUDE.md` do projeto e do global.

- **pnpm, nunca npm.** `npm install` gera árvore divergente do lockfile.
- **Testes:** `pnpm test` roda tudo. Um arquivo: `pnpm vitest run <caminho>`.
- **Baseline a preservar:** 171 testes em 9 arquivos, verdes. Não pode regredir.
- **Proibido em teste:** `node:fs`, `__dirname`, `path`. O `tsconfig.json` não
  inclui os tipos de Node: passa no vitest e **quebra o `pnpm build`**, que roda
  `tsc --noEmit` antes. Para ler arquivo, use `?raw` do Vite
  (exemplo em `src/favicon.test.ts`).
- **Nenhum limiar clínico é alterado nesta fase.** Nada em `classify`, nada em
  `extubationReadiness`, nada nas funções de sugestão. Esta fase só documenta.
- **Regra de negócio vai em `src/lib/`**, nunca dentro de componente.
- **Ausência de dado não é resultado normal.** Campo faltando devolve `null`,
  nunca zero e nunca soma parcial. Zero é valor clínico legítimo em RASS
  ("alerta e calmo"), em IMS ("nada, deitado na cama") e em PEEP (ZEEP).
- **Repositório PÚBLICO.** Nenhum segredo, nenhum dado real de paciente, em
  teste, fixture, comentário ou mensagem de commit. Dado de exemplo é inventado.
- **Não há arquivo CSS.** Os estilos globais são injetados por JS em
  `src/main.tsx`. Use os tokens de `src/lib/theme.ts` e os componentes de
  `src/components/ui.tsx`.
- **Commit é operação do Jeann.** Todo passo "Commit" significa: dar `git add`,
  rodar `git diff --cached` procurando segredo, PII e `console.log`, apresentar a
  mensagem, e **parar para pedir OK**. Não commite sozinho.
- **Mensagem de commit:** Conventional Commits em português, imperativo, até 72
  caracteres, sem emoji, sem `Co-Authored-By`, sem rodapé de IA, sem travessão.
- **SQL não é verificado por teste** (armadilha 6). O DDL sai revisado, não
  verificado, e quem aplica no Supabase é o Jeann.

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `src/data/references.ts` | catálogo bruto das fontes bibliográficas |
| `src/lib/references.ts` | liga limiar a fonte; `sourcesFor()` |
| `src/lib/references.test.ts` | garante que nenhum limiar fica sem fonte |
| `src/data/scores.ts` | catálogo dos grupos do MRC e dos níveis de RASS/IMS |
| `src/lib/scores.ts` | soma, classificação e assimetria do MRC |
| `src/lib/scores.test.ts` | testes das funções acima |
| `src/data/comorbidities.ts` | catálogo de comorbidades |
| `src/data/care-bundle.ts` | catálogo das ações do bundle |
| `src/components/SourceFooter.tsx` | rodapé de embasamento do painel |
| `src/pages/Sources.tsx` | página `/fontes` |
| `src/pages/Sources.test.tsx` | testes da página |
| `src/components/patient/PatientHeader.tsx` | extraído; recebe o contexto novo |
| `src/components/patient/Dashboard.tsx` | extraído; recebe o rodapé de fontes |
| `src/components/patient/ScoresPanel.tsx` | MRC, RASS, IMS |
| `src/components/patient/ScoresPanel.test.tsx` | testes do painel |
| `src/components/patient/CareBundlePanel.tsx` | registro de cuidados |
| `src/components/patient/CareBundlePanel.test.tsx` | testes do painel |

**Modificados:**

| Arquivo | O quê |
|---|---|
| `src/types/index.ts` | `Patient` ganha contexto; `DailyEvolution` ganha escores; tipo `CareAction` |
| `src/lib/clinical.ts` | acrescenta `diasEmVentilacao()` |
| `src/lib/clinical.test.ts` | testes de `diasEmVentilacao()` |
| `src/pages/PatientDetail.tsx` | extrações, aba "Cuidados", painéis novos |
| `src/pages/AdmitPatient.tsx` | campos de contexto |
| `src/App.tsx` | rota e aba `/fontes` |
| `supabase/schema.sql` | colunas novas, tabela `care_actions`, RLS |

---

### Task 1: Catálogo de fontes e o mapa limiar → fonte

O coração da fase. Tudo o mais depende deste catálogo existir.

**Files:**
- Create: `src/data/references.ts`
- Create: `src/lib/references.ts`
- Test: `src/lib/references.test.ts`

**Interfaces:**
- Consumes: `classify` de `src/lib/clinical.ts` (objeto exportado, chaves
  `pf`, `vcKg`, `pplat`, `dp`, `mp`, `tobin`, `pimax`).
- Produces:
  - `interface Reference { id: string; autores: string; titulo: string; veiculo: string; ano: number; verificada: boolean; nota?: string }`
  - `REFERENCES: Reference[]`
  - `type SourceKey` e `THRESHOLD_SOURCES: Record<SourceKey, string[]>`
  - `sourcesFor(k: SourceKey): Reference[]`
  - `shortCite(refs: Reference[]): string`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/lib/references.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/references.test.ts`
Expected: FAIL — `Failed to resolve import "../data/references"`.

- [ ] **Step 3: Escrever o catálogo**

Crie `src/data/references.ts`. Todas conferidas contra a fonte primária em
31/08/2026; `verificada` só vira `true` depois da revisão do mentor.

```ts
// ============================================================
// Catálogo de fontes — Ventila Fisio
// Conferidas contra a fonte primária em 31/08/2026.
// `verificada` = revisada pelo mentor clínico. Nasce false de propósito:
// a página /fontes mostra o pendente como pendente, em vez de fingir
// autoridade. Mesma convenção de `ventilators.verified`.
// ============================================================

export interface Reference {
  id: string;
  autores: string;
  titulo: string;
  veiculo: string;
  ano: number;
  /** Revisada pelo mentor clínico. */
  verificada: boolean;
  /** Ressalva sobre o alcance da fonte. Aparece na página /fontes. */
  nota?: string;
  /**
   * Como a fonte aparece no rodapé do painel. Explícito de propósito: derivar
   * isso de `autores` por regex significa adivinhar formato de nome próprio,
   * e nome próprio não tem formato.
   */
  citacaoCurta: string;
}

export const REFERENCES: Reference[] = [
  {
    id: "ardsnet_2000",
    autores: "The Acute Respiratory Distress Syndrome Network",
    titulo:
      "Ventilation with lower tidal volumes as compared with traditional tidal volumes for acute lung injury and the acute respiratory distress syndrome",
    veiculo: "N Engl J Med 2000;342:1301-1308",
    ano: 2000,
    citacaoCurta: "ARDSnet, 2000",
    verificada: false,
  },
  {
    id: "amato_2015",
    autores: "Amato MBP, Meade MO, Slutsky AS, et al.",
    titulo: "Driving pressure and survival in the acute respiratory distress syndrome",
    veiculo: "N Engl J Med 2015;372:747-755",
    ano: 2015,
    citacaoCurta: "Amato, 2015",
    verificada: false,
    nota:
      "Demonstra a driving pressure como a variável mais associada à sobrevida (RR 1,41 por incremento de ~7 cmH₂O). NÃO define o corte de 13 que o app usa hoje: essa faixa segue pendente de fonte.",
  },
  {
    id: "gattinoni_2016",
    autores: "Gattinoni L, Tonetti T, Cressoni M, et al.",
    titulo: "Ventilator-related causes of lung injury: the mechanical power",
    veiculo: "Intensive Care Med 2016;42:1567-1575",
    ano: 2016,
    citacaoCurta: "Gattinoni, 2016",
    verificada: false,
    nota: "Origem da fórmula da mechanical power. Não define o corte de 17 J/min.",
  },
  {
    id: "serpaneto_2018",
    autores: "Serpa Neto A, Deliberato RO, Johnson AEW, et al.",
    titulo:
      "Mechanical power of ventilation is associated with mortality in critically ill patients",
    veiculo: "Intensive Care Med 2018;44:1914-1922",
    ano: 2018,
    citacaoCurta: "Serpa Neto, 2018",
    verificada: false,
    nota: "Origem do corte de 17 J/min, em 8207 pacientes (MIMIC-III e eICU).",
  },
  {
    id: "yangtobin_1991",
    autores: "Yang KL, Tobin MJ",
    titulo:
      "A prospective study of indexes predicting the outcome of trials of weaning from mechanical ventilation",
    veiculo: "N Engl J Med 1991;324:1445-1450",
    ano: 1991,
    citacaoCurta: "Yang & Tobin, 1991",
    verificada: false,
  },
  {
    id: "boles_2007",
    autores: "Boles JM, Bion J, Connors A, et al.",
    titulo: "Weaning from mechanical ventilation",
    veiculo: "Eur Respir J 2007;29:1033-1056",
    ano: 2007,
    citacaoCurta: "Boles, 2007",
    verificada: false,
  },
  {
    id: "amib_sbpt_2024",
    autores: "AMIB e SBPT",
    titulo: "Orientações Práticas em Ventilação Mecânica",
    veiculo: "AMIB/SBPT, edição de 2024",
    ano: 2024,
    citacaoCurta: "AMIB/SBPT, 2024",
    verificada: false,
    nota: "Substitui as Diretrizes Brasileiras de Ventilação Mecânica de 2013.",
  },
  {
    id: "dejonghe_2002",
    autores: "De Jonghe B, Sharshar T, Lefaucheur JP, et al.",
    titulo: "Paresis acquired in the intensive care unit: a prospective multicenter study",
    veiculo: "JAMA 2002;288:2859-2867",
    ano: 2002,
    citacaoCurta: "De Jonghe, 2002",
    verificada: false,
  },
  {
    id: "sessler_2002",
    autores: "Sessler CN, Gosnell MS, Grap MJ, et al.",
    titulo:
      "The Richmond Agitation-Sedation Scale: validity and reliability in adult intensive care unit patients",
    veiculo: "Am J Respir Crit Care Med 2002;166:1338-1344",
    ano: 2002,
    citacaoCurta: "Sessler, 2002",
    verificada: false,
  },
  {
    id: "hodgson_2014",
    autores: "Hodgson C, Needham D, Haines K, et al.",
    titulo: "Feasibility and inter-rater reliability of the ICU Mobility Scale",
    veiculo: "Heart Lung 2014;43:19-24",
    ano: 2014,
    citacaoCurta: "Hodgson, 2014",
    verificada: false,
  },
];
```

- [ ] **Step 4: Escrever o mapa**

Crie `src/lib/references.ts`:

```ts
// ============================================================
// Liga cada limiar que o app afirma à fonte que o sustenta.
// O teste em references.test.ts obriga este mapa a cobrir toda chave de
// `classify`. Mexeu no número sem mexer na fonte, a suíte reprova.
// ============================================================
import { REFERENCES, type Reference } from "../data/references";

export type SourceKey =
  // classificações de clinical.ts
  | "pf" | "vcKg" | "pplat" | "dp" | "mp" | "tobin" | "pimax"
  // motores de sugestão
  | "peepFio2" | "vcTarget" | "extubation"
  // escores desta fase
  | "mrc" | "rass" | "ims";

export const THRESHOLD_SOURCES: Record<SourceKey, string[]> = {
  pf: ["ardsnet_2000", "amib_sbpt_2024"],
  vcKg: ["ardsnet_2000", "amib_sbpt_2024"],
  pplat: ["ardsnet_2000", "amib_sbpt_2024"],
  dp: ["amato_2015"],
  mp: ["gattinoni_2016", "serpaneto_2018"],
  tobin: ["yangtobin_1991"],
  pimax: ["boles_2007", "amib_sbpt_2024"],
  peepFio2: ["ardsnet_2000"],
  vcTarget: ["ardsnet_2000"],
  extubation: ["boles_2007", "amib_sbpt_2024"],
  mrc: ["dejonghe_2002"],
  rass: ["sessler_2002"],
  ims: ["hodgson_2014"],
};

const BY_ID = new Map(REFERENCES.map((r) => [r.id, r]));

export function sourcesFor(k: SourceKey): Reference[] {
  const ids = THRESHOLD_SOURCES[k];
  if (!ids) return [];
  return ids.map((id) => BY_ID.get(id)).filter((r): r is Reference => r != null);
}

/** Citação curta de cada fonte, para caber no rodapé do painel. */
export function shortCite(refs: Reference[]): string {
  return refs.map((r) => r.citacaoCurta).join(" · ");
}
```

- [ ] **Step 5: Rodar até passar**

Run: `pnpm vitest run src/lib/references.test.ts`
Expected: PASS.

- [ ] **Step 6: Conferir a suíte inteira**

Run: `pnpm test`
Expected: os 171 anteriores continuam passando, mais os novos.

- [ ] **Step 7: Conferir o build**

Run: `pnpm build`
Expected: sai limpo (`tsc --noEmit` primeiro).

- [ ] **Step 8: Preparar o commit e pedir OK ao Jeann**

```bash
git add src/data/references.ts src/lib/references.ts src/lib/references.test.ts
git diff --cached
```

Mensagem proposta:

```
feat(fontes): cria catalogo de referencias e mapa por limiar
```

**Pare aqui e peça OK.** Commit é operação do Jeann.

---

### Task 2: Rodapé de embasamento e página `/fontes`

**Files:**
- Create: `src/components/SourceFooter.tsx`
- Create: `src/pages/Sources.tsx`
- Test: `src/pages/Sources.test.tsx`
- Modify: `src/App.tsx` (rota nova; array `tabs` em `GlobalTabs`, linha ~200)

**Interfaces:**
- Consumes: `sourcesFor`, `shortCite`, `SourceKey` da Task 1; `REFERENCES`;
  `Panel` de `src/components/ui.tsx`; `T` de `src/lib/theme.ts`.
- Produces: `<SourceFooter sourceKeys={SourceKey[]} />` e o componente default `Sources`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/pages/Sources.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sources from "./Sources";
import { REFERENCES } from "../data/references";

const renderPage = () =>
  render(
    <MemoryRouter>
      <Sources />
    </MemoryRouter>
  );

describe("página de fontes", () => {
  it("lista todas as referências do catálogo", () => {
    renderPage();
    for (const r of REFERENCES) {
      expect(screen.getByText(r.veiculo)).toBeInTheDocument();
    }
  });

  it("marca como pendente o que o mentor ainda não verificou", () => {
    renderPage();
    const pendentes = REFERENCES.filter((r) => !r.verificada);
    expect(screen.getAllByText(/pendente de revis/i)).toHaveLength(pendentes.length);
  });

  it("mostra a ressalva de que Amato 2015 não define o corte de 13", () => {
    renderPage();
    expect(screen.getByText(/NÃO define o corte de 13/i)).toBeInTheDocument();
  });

  it("mostra qual limiar cada fonte sustenta", () => {
    renderPage();
    // Duas fontes sustentam a Mechanical Power (fórmula e corte), então são
    // dois elementos: getByText lançaria por ambiguidade.
    expect(screen.getAllByText(/Mechanical Power/i)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/pages/Sources.test.tsx`
Expected: FAIL — `Failed to resolve import "./Sources"`.

- [ ] **Step 3: Escrever o `SourceFooter`**

Crie `src/components/SourceFooter.tsx`:

```tsx
import { Link } from "react-router-dom";
import { sourcesFor, shortCite, type SourceKey } from "../lib/references";
import { T } from "../lib/theme";

/**
 * Rodapé de embasamento do painel. Diz de onde vem o número que está acima
 * dele e leva à página com a referência completa.
 */
export function SourceFooter({ sourceKeys }: { sourceKeys: SourceKey[] }) {
  const refs = sourceKeys.flatMap((k) => sourcesFor(k));
  // Fonte repetida entre limiares do mesmo painel aparece uma vez só.
  const unicas = refs.filter((r, i) => refs.findIndex((o) => o.id === r.id) === i);
  if (unicas.length === 0) return null;

  const pendente = unicas.some((r) => !r.verificada);

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: `1px solid ${T.line}`,
        fontSize: 10.5,
        color: T.dim,
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span>Fonte: {shortCite(unicas)}</span>
      {pendente && (
        <span style={{ color: T.warn }} title="Ainda não revisada pelo mentor clínico">
          · pendente de revisão
        </span>
      )}
      <Link to="/fontes" style={{ color: T.accent, textDecoration: "none" }}>
        ver embasamento ›
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Escrever a página `/fontes`**

Crie `src/pages/Sources.tsx`. O rótulo legível de cada limiar mora aqui, junto
da tabela que ele alimenta.

```tsx
import { Panel } from "../components/ui";
import { REFERENCES } from "../data/references";
import { THRESHOLD_SOURCES, type SourceKey } from "../lib/references";
import { T } from "../lib/theme";

// Rótulo legível de cada limiar. As chaves são as de THRESHOLD_SOURCES.
const LABELS: Record<SourceKey, string> = {
  pf: "Relação P/F",
  vcKg: "Volume corrente por peso predito",
  pplat: "Pressão de platô",
  dp: "Driving Pressure",
  mp: "Mechanical Power",
  tobin: "Índice de Tobin",
  pimax: "PImax",
  peepFio2: "Tabela PEEP/FiO₂",
  vcTarget: "Volume corrente alvo",
  extubation: "Triagem de prontidão para extubação",
  mrc: "Escore MRC de força muscular",
  rass: "RASS",
  ims: "IMS",
};

export default function Sources() {
  // Para cada referência, quais limiares ela sustenta.
  const usos = (id: string) =>
    (Object.keys(THRESHOLD_SOURCES) as SourceKey[])
      .filter((k) => THRESHOLD_SOURCES[k].includes(id))
      .map((k) => LABELS[k]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Panel
        title="Embasamento"
        sub="De onde vem cada número que este aplicativo afirma"
      >
        <p style={{ fontSize: 13, color: T.dim, margin: "0 0 4px" }}>
          Este aplicativo é uma prova de conceito e não substitui julgamento
          clínico. As referências abaixo foram conferidas contra a fonte
          primária, mas só valem como embasamento depois da revisão do mentor
          clínico — o que ainda não passou por ela aparece marcado.
        </p>
      </Panel>

      <div style={{ display: "grid", gap: 12 }}>
        {REFERENCES.map((r) => (
          <div
            key={r.id}
            style={{
              background: T.panel,
              border: `1px solid ${r.verificada ? T.line : `${T.warn}55`}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14, color: T.txt }}>{r.autores}</strong>
              <span style={{ fontSize: 12, color: T.dim }}>{r.ano}</span>
              {!r.verificada && (
                <span style={{ fontSize: 11, color: T.warn, fontWeight: 700 }}>
                  pendente de revisão
                </span>
              )}
            </div>
            <span style={{ fontSize: 13, color: T.txt }}>{r.titulo}</span>
            <span style={{ fontSize: 12, color: T.dim }}>{r.veiculo}</span>
            {r.nota && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: T.warn,
                  background: `${T.warn}14`,
                  border: `1px solid ${T.warn}33`,
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                {r.nota}
              </p>
            )}
            <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>
              Sustenta: {usos(r.id).join(" · ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Ligar a rota e a aba**

Em `src/App.tsx`:

1. No topo, junto dos outros imports de página:

```tsx
import Sources from "./pages/Sources";
```

2. Dentro de `<Routes>`, antes da rota `path="*"`:

```tsx
<Route path="/fontes" element={<Sources />} />
```

3. No array `tabs` de `GlobalTabs`, após a entrada da biblioteca:

```tsx
{ to: "/fontes", label: "Fontes", end: false },
```

- [ ] **Step 6: Rodar os testes**

Run: `pnpm vitest run src/pages/Sources.test.tsx`
Expected: PASS.

- [ ] **Step 7: Suíte e build**

Run: `pnpm test && pnpm build`
Expected: tudo verde, build limpo.

- [ ] **Step 8: Preparar o commit e pedir OK**

```bash
git add src/components/SourceFooter.tsx src/pages/Sources.tsx src/pages/Sources.test.tsx src/App.tsx
git diff --cached
```

Mensagem proposta:

```
feat(fontes): adiciona pagina de embasamento e rodape de fonte
```

**Pare e peça OK.**

---

### Task 3: Escores — MRC, RASS e IMS

Funções puras. Nenhuma tela ainda.

**Files:**
- Create: `src/data/scores.ts`
- Create: `src/lib/scores.ts`
- Test: `src/lib/scores.test.ts`

**Interfaces:**
- Produces:
  - `MRC_GROUPS: { key: string; label: string }[]` (6 entradas)
  - `RASS_LEVELS: { v: string; t: string }[]` (10 entradas, +4 a −5)
  - `IMS_LEVELS: { v: string; t: string }[]` (11 entradas, 0 a 10)
  - `type MrcSide = { d: number | null; e: number | null }`
  - `type Mrc = Record<string, MrcSide>`
  - `mrcTotal(m: Mrc | null | undefined): number | null`
  - `classifyMrc(total: number | null): Classified | null`
  - `mrcAsymmetry(m: Mrc | null | undefined): { lado: "d" | "e"; delta: number } | null`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/lib/scores.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/scores.test.ts`
Expected: FAIL — `Failed to resolve import "../data/scores"`.

- [ ] **Step 3: Escrever o catálogo**

Crie `src/data/scores.ts`:

```ts
// ============================================================
// Catálogos dos escores :: CONTEÚDO A VALIDAR
// MRC: seis grupos testados bilateralmente, 0 a 5 cada, máximo 60.
// A chave `cotovelo` é neutra de propósito: a literatura diverge entre
// flexão e extensão no somatório, e é pendência do mentor (spec, seção 10).
// Trocar o RÓTULO depois não exige migração de dado.
// ============================================================

export interface MrcGroup {
  key: string;
  label: string;
}

export const MRC_GROUPS: MrcGroup[] = [
  { key: "ombro_abducao", label: "Abdução de ombro" },
  { key: "cotovelo", label: "Flexão de cotovelo" },
  { key: "punho_extensao", label: "Extensão de punho" },
  { key: "quadril_flexao", label: "Flexão de quadril" },
  { key: "joelho_extensao", label: "Extensão de joelho" },
  { key: "tornozelo_dorsi", label: "Dorsiflexão de tornozelo" },
];

// RASS: 10 níveis, +4 a -5.
export const RASS_LEVELS: { v: string; t: string }[] = [
  { v: "4", t: "+4 Combativo" },
  { v: "3", t: "+3 Muito agitado" },
  { v: "2", t: "+2 Agitado" },
  { v: "1", t: "+1 Inquieto" },
  { v: "0", t: "0 Alerta e calmo" },
  { v: "-1", t: "−1 Sonolento" },
  { v: "-2", t: "−2 Sedação leve" },
  { v: "-3", t: "−3 Sedação moderada" },
  { v: "-4", t: "−4 Sedação profunda" },
  { v: "-5", t: "−5 Não desperta" },
];

// IMS: 0 a 10.
export const IMS_LEVELS: { v: string; t: string }[] = [
  { v: "0", t: "0 Nada (deitado)" },
  { v: "1", t: "1 Exercício no leito" },
  { v: "2", t: "2 Transferência passiva à poltrona" },
  { v: "3", t: "3 Sentado à beira do leito" },
  { v: "4", t: "4 De pé" },
  { v: "5", t: "5 Transferência ao assento" },
  { v: "6", t: "6 Marcha no lugar" },
  { v: "7", t: "7 Marcha com 2 ou mais pessoas" },
  { v: "8", t: "8 Marcha com 1 pessoa" },
  { v: "9", t: "9 Marcha com apoio" },
  { v: "10", t: "10 Marcha independente" },
];
```

- [ ] **Step 4: Escrever as funções**

Crie `src/lib/scores.ts`:

```ts
// ============================================================
// Escores de força e mobilidade — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Fontes: MRC (De Jonghe 2002), RASS (Sessler 2002), IMS (Hodgson 2014).
// ============================================================
import { MRC_GROUPS } from "../data/scores";
import type { Classified } from "./clinical";

export interface MrcSide {
  d: number | null;
  e: number | null;
}

export type Mrc = Record<string, MrcSide>;

const grau = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v) && v >= 0 && v <= 5;

/**
 * Soma dos 12 valores (6 grupos × 2 lados), máximo 60.
 * Devolve null se QUALQUER medida faltar: soma parcial exibida como total
 * inventaria uma fraqueza que ninguém mediu (armadilha 5).
 */
export function mrcTotal(m: Mrc | null | undefined): number | null {
  if (!m) return null;
  let soma = 0;
  for (const g of MRC_GROUPS) {
    const lado = m[g.key];
    if (!lado || !grau(lado.d) || !grau(lado.e)) return null;
    soma += lado.d + lado.e;
  }
  return soma;
}

/** Corte < 48 para fraqueza adquirida na UTI (De Jonghe 2002). */
export function classifyMrc(total: number | null): Classified | null {
  if (total == null || !Number.isFinite(total)) return null;
  if (total < 48) return { s: "danger", t: "Fraqueza adquirida na UTI" };
  if (total < 60) return { s: "warn", t: "Força reduzida" };
  return { s: "ok", t: "Força preservada" };
}

/** Lado mais fraco e a diferença total entre os lados. */
export function mrcAsymmetry(
  m: Mrc | null | undefined
): { lado: "d" | "e"; delta: number } | null {
  if (!m) return null;
  let somaD = 0;
  let somaE = 0;
  for (const g of MRC_GROUPS) {
    const lado = m[g.key];
    if (!lado || !grau(lado.d) || !grau(lado.e)) return null;
    somaD += lado.d;
    somaE += lado.e;
  }
  const delta = Math.abs(somaD - somaE);
  if (delta === 0) return null;
  return { lado: somaD < somaE ? "d" : "e", delta };
}
```

- [ ] **Step 5: Rodar até passar**

Run: `pnpm vitest run src/lib/scores.test.ts`
Expected: PASS.

- [ ] **Step 6: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/data/scores.ts src/lib/scores.ts src/lib/scores.test.ts
git diff --cached
```

Mensagem proposta:

```
feat(escores): adiciona MRC, RASS e IMS como funcoes puras
```

**Pare e peça OK.**

---

### Task 4: Tempo de ventilação e catálogo de comorbidades

**Files:**
- Modify: `src/lib/clinical.ts` (acrescentar ao fim da seção de cálculos, após `map()`, linha ~120)
- Modify: `src/lib/clinical.test.ts` (acrescentar novo `describe`)
- Create: `src/data/comorbidities.ts`

**Interfaces:**
- Produces:
  - `diasEmVentilacao(intubationDate: string | null | undefined, hoje?: Date): number | null`
  - `COMORBIDITIES: { key: string; label: string; pulmonar: boolean }[]`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao fim de `src/lib/clinical.test.ts`:

```ts
describe("diasEmVentilacao", () => {
  const hoje = new Date("2026-08-31T12:00:00Z");

  it("conta o dia da intubação como 1º dia de ventilação", () => {
    expect(C.diasEmVentilacao("2026-08-31", hoje)).toBe(1);
  });

  it("conta oito dias para uma intubação de 24/08", () => {
    expect(C.diasEmVentilacao("2026-08-24", hoje)).toBe(8);
  });

  // Ausência de dado não é zero dia de ventilação (armadilha 5).
  it("devolve null sem data de intubação", () => {
    expect(C.diasEmVentilacao(null, hoje)).toBeNull();
    expect(C.diasEmVentilacao(undefined, hoje)).toBeNull();
    expect(C.diasEmVentilacao("", hoje)).toBeNull();
  });

  it("devolve null para data ilegível", () => {
    expect(C.diasEmVentilacao("ontem", hoje)).toBeNull();
  });

  // Erro de digitação não vira contagem negativa exibida na tela.
  it("devolve null para data no futuro", () => {
    expect(C.diasEmVentilacao("2026-09-10", hoje)).toBeNull();
  });
});
```

Confirme que o arquivo já importa como `C` (`import * as C from "./clinical"`).
Se importar por nome, siga o estilo existente e chame `diasEmVentilacao`
diretamente.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/clinical.test.ts`
Expected: FAIL — `C.diasEmVentilacao is not a function`.

- [ ] **Step 3: Implementar**

Acrescente em `src/lib/clinical.ts`, logo após `map()`:

```ts
// Dias em ventilação a partir da data de intubação. O dia da intubação conta
// como 1º dia, que é como a beira do leito fala ("8º dia de VM").
// Data ausente, ilegível ou futura devolve null: contagem inventada é pior
// que campo vazio.
export function diasEmVentilacao(
  intubationDate: string | null | undefined,
  hoje: Date = new Date()
): number | null {
  if (!intubationDate) return null;
  const inicio = new Date(`${intubationDate}T00:00:00Z`);
  if (Number.isNaN(inicio.getTime())) return null;
  const ref = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const dias = Math.floor((ref - inicio.getTime()) / 86_400_000);
  if (dias < 0) return null;
  return dias + 1;
}
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/lib/clinical.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o catálogo de comorbidades**

Crie `src/data/comorbidities.ts`:

```ts
// ============================================================
// Comorbidades relevantes para a ventilação :: CONTEÚDO A VALIDAR
// A marcação `pulmonar` existe para a Fase 2 (alvo ventilatório por
// patologia). NESTA FASE ela não modula alvo nenhum — é só registro.
// ============================================================

export interface Comorbidity {
  key: string;
  label: string;
  /** Doença pulmonar prévia. Reservado para a Fase 2. */
  pulmonar: boolean;
}

export const COMORBIDITIES: Comorbidity[] = [
  { key: "dpoc", label: "DPOC", pulmonar: true },
  { key: "asma", label: "Asma", pulmonar: true },
  { key: "fibrose", label: "Fibrose pulmonar", pulmonar: true },
  { key: "bronquiectasia", label: "Bronquiectasia", pulmonar: true },
  { key: "sahos", label: "SAHOS", pulmonar: true },
  { key: "tabagismo", label: "Tabagismo", pulmonar: true },
  { key: "icc", label: "Insuficiência cardíaca", pulmonar: false },
  { key: "has", label: "Hipertensão", pulmonar: false },
  { key: "dm", label: "Diabetes", pulmonar: false },
  { key: "drc", label: "Doença renal crônica", pulmonar: false },
  { key: "obesidade", label: "Obesidade", pulmonar: false },
  { key: "neuro", label: "Doença neurológica", pulmonar: false },
  { key: "neoplasia", label: "Neoplasia", pulmonar: false },
];
```

- [ ] **Step 6: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/lib/clinical.ts src/lib/clinical.test.ts src/data/comorbidities.ts
git diff --cached
```

Mensagem proposta:

```
feat(contexto): calcula dias em ventilacao e cataloga comorbidades
```

**Pare e peça OK.**

---

### Task 5: Schema e tipos

Tarefa de fundação: sem ela as Tasks 7, 8 e 9 não têm onde gravar.

**ATENÇÃO:** este SQL **não é verificado por teste nenhum** (armadilha 6). Ele
sai revisado, não verificado. **Quem aplica no Supabase é o Jeann**, nunca o
executor deste plano.

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `Patient` com `comorbidities: string[]`, `intubation_date: string | null`,
  `airway: "tot" | "tqt" | null`; `DailyEvolution` com `rass`, `ims`, `mrc`;
  `interface CareAction`.

- [ ] **Step 1: Acrescentar o DDL**

Em `supabase/schema.sql`, após o bloco de `alter table` de `patients`
(logo abaixo do comentário "Garante colunas/constraints novas em bancos que já
tinham patients", linha ~163):

```sql
-- Fase 1 (31/08/2026): via aérea artificial. As colunas comorbidities e
-- intubation_date já existiam e estavam sem uso; passam a ser escritas.
alter table public.patients add column if not exists airway text;
alter table public.patients drop constraint if exists patients_airway_check;
alter table public.patients add constraint patients_airway_check
  check (airway is null or airway in ('tot','tqt'));
```

Após os `alter table` de `daily_evolutions` (junto de `imaging`/`iv_meds`/`feeding`):

```sql
-- Fase 1 (31/08/2026): escores de força e mobilidade.
-- rass e ims são escalares (entram nos gráficos); mrc é jsonb com os 6 grupos
-- em dois lados. O TOTAL do MRC não é coluna: é derivado, e dado derivado
-- guardado duas vezes diverge. Ver src/lib/scores.ts.
alter table public.daily_evolutions add column if not exists rass int;
alter table public.daily_evolutions add column if not exists ims int;
alter table public.daily_evolutions add column if not exists mrc jsonb not null default '{}';
```

Antes da seção de colunas sem uso, a tabela nova. A RLS espelha exatamente a de
`daily_evolutions`, reusando `public.can_access_patient`:

```sql
-- ---------- CARE ACTIONS (bundle de cuidados) ----------
-- Uma linha por execução, com hora e autor: aspiração acontece várias vezes
-- por plantão, e um checklist diário não registraria isso.
-- `action` guarda a CHAVE do catálogo (src/data/care-bundle.ts), nunca texto
-- livre: rótulo solto impede contagem por ação e quebra a tradução da tela.
-- Sem `check` no banco de propósito: engessaria uma migração a cada item novo
-- do bundle. A validação é da aplicação.
create table if not exists public.care_actions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

alter table public.care_actions enable row level security;

drop policy if exists "care_actions_select_member" on public.care_actions;
create policy "care_actions_select_member"
  on public.care_actions for select using (public.can_access_patient(patient_id));
drop policy if exists "care_actions_insert_member" on public.care_actions;
create policy "care_actions_insert_member"
  on public.care_actions for insert with check (public.can_access_patient(patient_id) and auth.uid() = owner_id);
drop policy if exists "care_actions_update_member" on public.care_actions;
create policy "care_actions_update_member"
  on public.care_actions for update using (public.can_access_patient(patient_id));
drop policy if exists "care_actions_delete_member" on public.care_actions;
create policy "care_actions_delete_member"
  on public.care_actions for delete using (public.can_access_patient(patient_id));

create index if not exists idx_care_actions_patient on public.care_actions (patient_id, at desc);
```

- [ ] **Step 2: Atualizar a lista de colunas sem uso**

Na seção "COLUNAS SEM USO NO APP" ao fim de `supabase/schema.sql`, remova as
duas linhas que deixaram de valer e registre a data:

```
--   patients.active            substituída por patients.status
--   patients.admission_date    nunca preenchida
--   daily_evolutions.hco3      não existe campo no formulário
--   daily_evolutions.be        não existe campo no formulário
--   asynchronies.evolution_id  nunca preenchida
--   asynchronies.notes         nunca preenchida
--   profiles.role              nenhuma regra de autorização a usa
--
-- Saíram desta lista em 31/08/2026 (Fase 1), agora escritas pelo app:
--   patients.intubation_date, patients.comorbidities
```

- [ ] **Step 3: Atualizar os tipos**

Em `src/types/index.ts`, na interface `Patient`, após `diagnosis`:

```ts
  comorbidities: string[];
  intubation_date: string | null;
  airway: "tot" | "tqt" | null;
```

Na interface `DailyEvolution`, junto de `glasgow`:

```ts
  rass: number | null;
  ims: number | null;
  mrc: Mrc;
```

No topo do arquivo:

```ts
import type { Mrc } from "../lib/scores";
```

**Tem de ser `import type`, nunca `import`.** `src/lib/scores.ts` importa
`Classified` de `clinical.ts`, que por sua vez importa `DailyEvolution` daqui.
Como import de tipo é apagado na compilação, o ciclo não existe em runtime — um
import de valor o criaria.

E ao fim do arquivo:

```ts
export interface CareAction {
  id: string;
  patient_id: string;
  owner_id: string;
  /** Chave do catálogo em src/data/care-bundle.ts. */
  action: string;
  at: string;
  note: string | null;
}
```

- [ ] **Step 4: Rodar o compilador e NÃO inventar trabalho**

Run: `pnpm build`

**O esperado é sair limpo, sem nenhum erro.** Foi verificado em 31/08/2026:
`EvolutionForm` monta `const payload: Record<string, unknown>` e as fixtures de
`PatientDetail.test.tsx` e `AdmitPatient.test.tsx` também são
`Record<string, unknown>`. Nada no projeto constrói `Patient` ou
`DailyEvolution` inteiros de forma tipada, então acrescentar campos é aditivo
para quem só lê.

**Se o build sair limpo, a tarefa está certa. Não procure erro, não tipe o
payload "para ter erro", não mexa em arquivo que o compilador não citou.**

Se o compilador *de fato* apontar algum lugar, preencha com o vazio correto:
`[]` para `comorbidities`, `null` para `intubation_date`, `airway`, `rass` e
`ims`, `{}` para `mrc`. Nunca `any`, nunca `as` para calar o compilador.

**Consequência a registrar no relatório:** como o payload não é tipado, a
gravação de `mrc`/`rass`/`ims` na Task 8 não terá checagem de compilador. O
teste da Task 8 é a única rede.

- [ ] **Step 5: Suíte e build**

Run: `pnpm test && pnpm build`
Expected: 171 testes continuam verdes, build limpo.

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add supabase/schema.sql src/types/index.ts
git diff --cached
```

Mensagem proposta:

```
feat(schema): adiciona contexto, escores e tabela de cuidados
```

**Ao pedir OK, avise explicitamente:** este DDL precisa ser aplicado à mão no
Supabase pelo Jeann, e nenhum teste o cobre.

---

### Task 6: Extrair `PatientHeader` e `Dashboard` de `PatientDetail.tsx`

Movimentação pura, antes de acrescentar painéis a um arquivo de 997 linhas.
**Nenhuma mudança de comportamento.** `PatientDetail.test.tsx` é a rede de
segurança e roda antes e depois, sem ser editado.

**Files:**
- Create: `src/components/patient/PatientHeader.tsx` (de `PatientDetail.tsx:133-235`)
- Create: `src/components/patient/Dashboard.tsx` (de `PatientDetail.tsx:402-530`)
- Modify: `src/pages/PatientDetail.tsx`

- [ ] **Step 1: Registrar o verde de partida**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: PASS. Anote quantos testes passaram — é o número a reproduzir no fim.

- [ ] **Step 2: Mover `PatientHeader`**

Recorte `function PatientHeader` (linha 133 até o fim da função) para
`src/components/patient/PatientHeader.tsx`. Troque `function` por
`export function`. Leve os imports que ela usa (`useState`, `supabase`, `Panel`,
`Field`, `Btn`, `T`, `fmt`, tipos `Patient` e `Ventilator`) e ajuste os caminhos
relativos: `../../lib/...`, `../ui`, `../../types`.

Em `PatientDetail.tsx`, acrescente:

```tsx
import { PatientHeader } from "../components/patient/PatientHeader";
```

- [ ] **Step 3: Rodar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: PASS, mesmo número do Step 1.

- [ ] **Step 4: Mover `Dashboard`**

Mesmo procedimento para `function Dashboard` (linha 402 em diante), incluindo
os auxiliares que **só ela** usa: `SugBox` e `color`. Se `color` for usada por
outra função de `PatientDetail.tsx`, **deixe-a onde está e importe** — não
duplique.

```tsx
import { Dashboard } from "../components/patient/Dashboard";
```

- [ ] **Step 5: Rodar tudo**

Run: `pnpm test && pnpm build`
Expected: 171 verdes, build limpo. Qualquer teste que mude de resultado aqui
significa que a extração alterou comportamento — desfaça e refaça.

- [ ] **Step 6: Preparar o commit e pedir OK**

```bash
git add src/components/patient/ src/pages/PatientDetail.tsx
git diff --cached
```

Mensagem proposta:

```
refactor: extrai PatientHeader e Dashboard de PatientDetail
```

**Pare e peça OK.**

---

### Task 7: Contexto do paciente na tela

**Files:**
- Modify: `src/pages/AdmitPatient.tsx`
- Modify: `src/components/patient/PatientHeader.tsx`
- Test: `src/pages/AdmitPatient.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/pages/AdmitPatient.test.tsx`, seguindo os mocks já existentes
no arquivo:

```tsx
it("grava comorbidade, data de intubação e via aérea", async () => {
  const user = userEvent.setup();
  renderPage();

  await user.type(screen.getByLabelText(/nome/i), "Paciente de Teste");
  await user.click(screen.getByRole("button", { name: "DPOC" }));
  await user.type(screen.getByLabelText(/data de intuba/i), "2026-08-24");
  await user.selectOptions(screen.getByLabelText(/via a[ée]rea/i), "tot");
  await user.click(screen.getByRole("button", { name: /admitir/i }));

  await waitFor(() => {
    expect(db.lastInsert).toMatchObject({
      comorbidities: ["dpoc"],
      intubation_date: "2026-08-24",
      airway: "tot",
    });
  });
});
```

Use exatamente o helper de render e o objeto `db` que o arquivo já define. Se os
nomes forem outros, siga os do arquivo, não estes.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/pages/AdmitPatient.test.tsx`
Expected: FAIL — não encontra o botão "DPOC".

- [ ] **Step 3: Acrescentar os campos em `AdmitPatient.tsx`**

Imports:

```tsx
import { ChipGroup } from "../components/ui";
import { COMORBIDITIES } from "../data/comorbidities";
```

Estado, junto dos demais `useState`:

```tsx
const [comorbidities, setComorbidities] = useState<string[]>([]);
const [intubationDate, setIntubationDate] = useState("");
const [airway, setAirway] = useState("");
```

No formulário, após o campo de diagnóstico:

```tsx
<Field
  label="Data de intubação"
  type="date"
  value={intubationDate}
  onChange={setIntubationDate}
/>
<Field
  label="Via aérea"
  value={airway}
  onChange={setAirway}
  options={[
    { v: "", t: "Não informado" },
    { v: "tot", t: "TOT" },
    { v: "tqt", t: "TQT" },
  ]}
/>
<div style={{ display: "grid", gap: 6 }}>
  <span style={{ fontSize: 11, color: T.dim, letterSpacing: 0.3 }}>Comorbidades</span>
  <ChipGroup
    options={COMORBIDITIES.map((c) => ({ v: c.key, t: c.label }))}
    selected={comorbidities}
    onToggle={(v) =>
      setComorbidities((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))
    }
  />
</div>
```

No payload do `insert`, junto dos campos existentes:

```tsx
comorbidities,
intubation_date: intubationDate || null,
airway: airway || null,
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/pages/AdmitPatient.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mostrar o contexto no cabeçalho**

Em `src/components/patient/PatientHeader.tsx`, junto dos dados de identificação:

```tsx
import { COMORBIDITIES } from "../../data/comorbidities";
import { diasEmVentilacao } from "../../lib/clinical";

// ...dentro do componente:
const rotulo = new Map(COMORBIDITIES.map((c) => [c.key, c.label]));
const dias = diasEmVentilacao(patient.intubation_date);
const contexto = [
  ...(patient.comorbidities ?? []).map((k) => rotulo.get(k) ?? k),
  patient.airway === "tot" ? "TOT" : patient.airway === "tqt" ? "TQT" : null,
  dias != null ? `${dias}º dia de VM` : null,
].filter(Boolean);
```

E no JSX, abaixo do nome:

```tsx
{contexto.length > 0 && (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
    {contexto.map((c) => (
      <span
        key={c as string}
        style={{
          fontSize: 11,
          padding: "3px 9px",
          borderRadius: 999,
          background: T.panel2,
          border: `1px solid ${T.line}`,
          color: T.dim,
        }}
      >
        {c}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 6: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/pages/AdmitPatient.tsx src/pages/AdmitPatient.test.tsx src/components/patient/PatientHeader.tsx
git diff --cached
```

Mensagem proposta:

```
feat(contexto): registra comorbidade, intubacao e via aerea
```

**Pare e peça OK.**

---

### Task 8: Painel de escores

**Files:**
- Create: `src/components/patient/ScoresPanel.tsx`
- Test: `src/components/patient/ScoresPanel.test.tsx`
- Modify: `src/pages/PatientDetail.tsx` (`EvolutionForm`, seção "Desmame")

**Interfaces:**
- Consumes: `MRC_GROUPS`, `RASS_LEVELS`, `IMS_LEVELS`, `mrcTotal`,
  `classifyMrc`, `mrcAsymmetry`, `Mrc` das Tasks 3.
- Produces:
  `<ScoresPanel mrc={Mrc} onMrc={(m: Mrc) => void} rass={string} onRass={(v: string) => void} ims={string} onIms={(v: string) => void} />`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/patient/ScoresPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ScoresPanel } from "./ScoresPanel";
import { MRC_GROUPS } from "../../data/scores";
import type { Mrc } from "../../lib/scores";

const cheio = (): Mrc =>
  Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 5, e: 5 }]));

const renderPanel = (mrc: Mrc) =>
  render(
    <MemoryRouter>
      <ScoresPanel
        mrc={mrc}
        onMrc={vi.fn()}
        rass=""
        onRass={vi.fn()}
        ims=""
        onIms={vi.fn()}
      />
    </MemoryRouter>
  );

describe("ScoresPanel", () => {
  it("mostra os seis grupos musculares", () => {
    renderPanel({});
    for (const g of MRC_GROUPS) {
      expect(screen.getByText(g.label)).toBeInTheDocument();
    }
  });

  it("mostra o total quando os 12 valores estão preenchidos", () => {
    renderPanel(cheio());
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText(/força preservada/i)).toBeInTheDocument();
  });

  // Armadilha 5: soma parcial exibida como total é dado falso.
  it("não mostra total com medida faltando", () => {
    const m = cheio();
    m[MRC_GROUPS[0].key] = { d: 5, e: null };
    renderPanel(m);
    expect(screen.queryByText("55")).not.toBeInTheDocument();
    expect(screen.getByText(/incompleto/i)).toBeInTheDocument();
  });

  it("avisa quando há assimetria entre os lados", () => {
    const m = cheio();
    m[MRC_GROUPS[0].key] = { d: 5, e: 2 };
    renderPanel(m);
    expect(screen.getByText(/assimetria/i)).toBeInTheDocument();
  });

  it("cita a fonte do escore no rodapé", () => {
    renderPanel(cheio());
    expect(screen.getByText(/De Jonghe/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/ScoresPanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./ScoresPanel"`.

- [ ] **Step 3: Implementar**

Crie `src/components/patient/ScoresPanel.tsx`:

```tsx
import { Panel, Field } from "../ui";
import { SourceFooter } from "../SourceFooter";
import { MRC_GROUPS, RASS_LEVELS, IMS_LEVELS } from "../../data/scores";
import { mrcTotal, classifyMrc, mrcAsymmetry, type Mrc } from "../../lib/scores";
import { T, statusColor } from "../../lib/theme";

const GRAUS = [
  { v: "", t: "—" },
  { v: "0", t: "0" }, { v: "1", t: "1" }, { v: "2", t: "2" },
  { v: "3", t: "3" }, { v: "4", t: "4" }, { v: "5", t: "5" },
];

export function ScoresPanel({
  mrc, onMrc, rass, onRass, ims, onIms,
}: {
  mrc: Mrc;
  onMrc: (m: Mrc) => void;
  rass: string;
  onRass: (v: string) => void;
  ims: string;
  onIms: (v: string) => void;
}) {
  const total = mrcTotal(mrc);
  const cls = classifyMrc(total);
  const assim = mrcAsymmetry(mrc);

  const setLado = (key: string, lado: "d" | "e", v: string) => {
    const atual = mrc[key] ?? { d: null, e: null };
    onMrc({ ...mrc, [key]: { ...atual, [lado]: v === "" ? null : Number(v) } });
  };

  const valor = (key: string, lado: "d" | "e") => {
    const v = mrc[key]?.[lado];
    return v == null ? "" : String(v);
  };

  return (
    <Panel title="Escores" sub="Força, sedação e mobilidade" accent={T.purple}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 8, letterSpacing: 0.3 }}>
            MRC · FORÇA MUSCULAR (0–5 POR LADO)
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {MRC_GROUPS.map((g) => (
              <div
                key={g.key}
                style={{ display: "grid", gridTemplateColumns: "1fr 76px 76px", gap: 8, alignItems: "end" }}
              >
                <span style={{ fontSize: 12.5, color: T.txt }}>{g.label}</span>
                <Field label="D" value={valor(g.key, "d")} onChange={(v) => setLado(g.key, "d", v)} options={GRAUS} />
                <Field label="E" value={valor(g.key, "e")} onChange={(v) => setLado(g.key, "e", v)} options={GRAUS} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: T.dim }}>TOTAL MRC</span>
            {total == null ? (
              <span style={{ fontSize: 13, color: T.dim, fontStyle: "italic" }}>
                incompleto — preencha os 12 valores
              </span>
            ) : (
              <>
                <strong style={{ fontSize: 22, color: T.txt }}>{total}</strong>
                <span style={{ fontSize: 12, color: T.dim }}>/ 60</span>
                {cls && (
                  <span style={{ fontSize: 12, color: statusColor(cls.s), fontWeight: 700 }}>
                    {cls.t}
                  </span>
                )}
              </>
            )}
            {assim && (
              <span style={{ fontSize: 12, color: T.warn }}>
                ⚠ assimetria à {assim.lado === "d" ? "direita" : "esquerda"} ({assim.delta})
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="RASS" value={rass} onChange={onRass} options={[{ v: "", t: "—" }, ...RASS_LEVELS]} />
          <Field label="IMS" value={ims} onChange={onIms} options={[{ v: "", t: "—" }, ...IMS_LEVELS]} />
        </div>

        <SourceFooter sourceKeys={["mrc", "rass", "ims"]} />
      </div>
    </Panel>
  );
}
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/components/patient/ScoresPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ligar ao `EvolutionForm`**

Em `src/pages/PatientDetail.tsx`, no `EvolutionForm`: acrescente o estado

```tsx
const [mrc, setMrc] = useState<Mrc>({});
const [rass, setRass] = useState("");
const [ims, setIms] = useState("");
```

Renderize `<ScoresPanel ... />` logo após a `FormSection` de "Desmame". No
payload do `insert`, junto dos demais campos:

```tsx
mrc,
rass: rass === "" ? null : Number(rass),
ims: ims === "" ? null : Number(ims),
```

`rass: 0` e `ims: 0` são valores clínicos legítimos — por isso a comparação é
com string vazia, nunca `Number(rass) || null`.

- [ ] **Step 6: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/components/patient/ScoresPanel.tsx src/components/patient/ScoresPanel.test.tsx src/pages/PatientDetail.tsx
git diff --cached
```

Mensagem proposta:

```
feat(escores): adiciona painel de MRC, RASS e IMS na evolucao
```

**Pare e peça OK.**

---

### Task 9: Bundle de cuidados e aba "Cuidados"

**Files:**
- Create: `src/data/care-bundle.ts`
- Create: `src/components/patient/CareBundlePanel.tsx`
- Test: `src/components/patient/CareBundlePanel.test.tsx`
- Modify: `src/pages/PatientDetail.tsx` (carga, array `tabs`, render da aba)

**Interfaces:**
- Consumes: `CareAction` de `src/types`; `supabase` de `src/lib/supabase`.
- Produces:
  `<CareBundlePanel patientId={string} ownerId={string} actions={CareAction[]} authors={Record<string,string>} onChange={() => void} />`

- [ ] **Step 1: Escrever o catálogo**

Crie `src/data/care-bundle.ts`:

```ts
// ============================================================
// Bundle de cuidados :: CONTEÚDO A VALIDAR
// Ações registradas por plantão. As keys são estáveis (gravadas em
// care_actions.action); os labels são o que o profissional vê.
// A lista definitiva é pendência do mentor (spec, seção 10).
// ============================================================

export interface CareBundleItem {
  key: string;
  label: string;
  /** Aceita observação livre (ex.: pressão do cuff em cmH₂O). */
  comObservacao: boolean;
}

export const CARE_BUNDLE: CareBundleItem[] = [
  { key: "aspiracao_tot", label: "Aspiração de TOT/TQT", comObservacao: false },
  { key: "aspiracao_vas", label: "Aspiração de vias aéreas superiores", comObservacao: false },
  { key: "cuffometria", label: "Cuffometria", comObservacao: true },
  { key: "higiene_oral", label: "Higiene oral", comObservacao: false },
  { key: "cabeceira_30", label: "Cabeceira elevada 30–45°", comObservacao: false },
  { key: "mudanca_decubito", label: "Mudança de decúbito", comObservacao: true },
  { key: "umidificacao", label: "Umidificação conferida", comObservacao: false },
];
```

- [ ] **Step 2: Escrever o teste que falha**

Crie `src/components/patient/CareBundlePanel.test.tsx`. O mock do supabase segue
o mesmo formato de `src/pages/PatientDetail.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CareBundlePanel } from "./CareBundlePanel";
import type { CareAction } from "../../types";

const db = { lastInsert: null as Record<string, unknown> | null, insertError: null as { message: string } | null };

vi.mock("../../lib/supabase", () => ({
  supabaseConfigured: true,
  isSupabaseConfigured: () => true,
  supabase: {
    from: () => ({
      insert: (values: Record<string, unknown>) => {
        db.lastInsert = values;
        return Promise.resolve({ error: db.insertError });
      },
    }),
  },
}));

beforeEach(() => {
  db.lastInsert = null;
  db.insertError = null;
});

const acao = (over: Partial<CareAction> = {}): CareAction => ({
  id: "a1",
  patient_id: "p1",
  owner_id: "u1",
  action: "aspiracao_tot",
  at: "2026-08-31T08:12:00.000Z",
  note: null,
  ...over,
});

const renderPanel = (actions: CareAction[] = []) =>
  render(
    <MemoryRouter>
      <CareBundlePanel
        patientId="p1"
        ownerId="u1"
        actions={actions}
        authors={{ u1: "Fisio de Teste" }}
        onChange={vi.fn()}
      />
    </MemoryRouter>
  );

describe("CareBundlePanel", () => {
  it("oferece as ações do bundle", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /aspiração de tot/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cuffometria/i })).toBeInTheDocument();
  });

  it("grava a CHAVE do catálogo, não o rótulo", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /aspiração de tot/i }));
    await waitFor(() => {
      expect(db.lastInsert).toMatchObject({
        patient_id: "p1",
        owner_id: "u1",
        action: "aspiracao_tot",
      });
    });
  });

  it("lista o que já foi feito, com hora e autor", () => {
    renderPanel([acao()]);
    expect(screen.getByText(/aspiração de tot/i)).toBeInTheDocument();
    expect(screen.getByText(/Fisio de Teste/)).toBeInTheDocument();
  });

  it("conta as repetições da mesma ação", () => {
    renderPanel([acao({ id: "a1" }), acao({ id: "a2" }), acao({ id: "a3" })]);
    expect(screen.getByText("3×")).toBeInTheDocument();
  });

  it("avisa quando o registro falha, em vez de fingir sucesso", async () => {
    const user = userEvent.setup();
    db.insertError = { message: "sem permissão" };
    renderPanel();
    await user.click(screen.getByRole("button", { name: /higiene oral/i }));
    await waitFor(() => {
      expect(screen.getByText(/sem permiss/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm vitest run src/components/patient/CareBundlePanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./CareBundlePanel"`.

- [ ] **Step 4: Implementar**

Crie `src/components/patient/CareBundlePanel.tsx`:

```tsx
import { useState } from "react";
import { Panel, Alert } from "../ui";
import { CARE_BUNDLE } from "../../data/care-bundle";
import { supabase } from "../../lib/supabase";
import { T } from "../../lib/theme";
import type { CareAction } from "../../types";

const LABEL = new Map(CARE_BUNDLE.map((i) => [i.key, i.label]));

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function CareBundlePanel({
  patientId, ownerId, actions, authors, onChange,
}: {
  patientId: string;
  ownerId: string;
  actions: CareAction[];
  authors: Record<string, string>;
  onChange: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const registrar = async (key: string) => {
    setErro(null);
    setSalvando(key);
    const { error } = await supabase
      .from("care_actions")
      .insert({ patient_id: patientId, owner_id: ownerId, action: key });
    setSalvando(null);
    if (error) {
      setErro(error.message);
      return;
    }
    onChange();
  };

  const contagem = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.action] = (acc[a.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Panel title="Registrar cuidado" sub="Um toque registra a ação com hora e autor" accent={T.ok}>
        {erro && <Alert>{erro}</Alert>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CARE_BUNDLE.map((i) => (
            <button
              key={i.key}
              type="button"
              disabled={salvando === i.key}
              onClick={() => registrar(i.key)}
              style={{
                fontSize: 13,
                padding: "10px 15px",
                borderRadius: 10,
                cursor: salvando === i.key ? "wait" : "pointer",
                fontFamily: "inherit",
                background: T.panel2,
                border: `1px solid ${T.line}`,
                color: T.txt,
                fontWeight: 600,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              {i.label}
              {contagem[i.key] > 0 && (
                <span style={{ color: T.ok, fontWeight: 800 }}>{contagem[i.key]}×</span>
              )}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Cuidados registrados" sub="Do mais recente para o mais antigo">
        {actions.length === 0 ? (
          <p style={{ color: T.dim, fontSize: 13, margin: 0 }}>
            Nenhum cuidado registrado ainda.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {actions.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "baseline",
                  padding: "8px 12px",
                  background: T.panel2,
                  border: `1px solid ${T.line}`,
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ color: T.dim, fontVariantNumeric: "tabular-nums" }}>{hora(a.at)}</span>
                <span style={{ color: T.txt, flex: 1 }}>{LABEL.get(a.action) ?? a.action}</span>
                {a.note && <span style={{ color: T.dim }}>{a.note}</span>}
                <span style={{ color: T.dim, fontSize: 12 }}>{authors[a.owner_id] ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
```

- [ ] **Step 5: Rodar até passar**

Run: `pnpm vitest run src/components/patient/CareBundlePanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Ligar a aba em `PatientDetail.tsx`**

1. Estado e carga. Junto de `const [asyncs, setAsyncs]`:

```tsx
const [careActions, setCareActions] = useState<CareAction[]>([]);
```

Acrescente ao `Promise.all` da função `load`:

```tsx
supabase.from("care_actions").select("*").eq("patient_id", id).order("at", { ascending: false }),
```

e o `setCareActions((ca as CareAction[]) ?? []);` junto dos demais setters.

**Atenção à posição:** o `Promise.all` já destrutura QUATRO elementos
(`patients`, `ventilators`, `daily_evolutions`, `asynchronies`). `care_actions`
é o **quinto** — acrescente `, { data: ca }` ao final da desestruturação. Pôr no
lugar do quarto sobrescreveria `asyncs` com as ações de cuidado e quebraria o
módulo de assincronias em silêncio, porque os dois são arrays.

2. No array `tabs`, entre "Evolução" e "Gráficos":

```tsx
{ key: "cuidados", label: "Cuidados" },
```

3. Render, após o bloco de `tab === "evolucao"`:

```tsx
{tab === "cuidados" && (
  <CareBundlePanel
    patientId={patient.id}
    ownerId={session!.user.id}
    actions={careActions}
    authors={authors}
    onChange={load}
  />
)}
```

- [ ] **Step 7: Suíte e build**

Run: `pnpm test && pnpm build`

- [ ] **Step 8: Preparar o commit e pedir OK**

```bash
git add src/data/care-bundle.ts src/components/patient/CareBundlePanel.tsx src/components/patient/CareBundlePanel.test.tsx src/pages/PatientDetail.tsx
git diff --cached
```

Mensagem proposta:

```
feat(cuidados): adiciona bundle de cuidados com hora e autor
```

**Pare e peça OK.**

---

### Task 10: Rodapé de fonte nos painéis existentes

Fecha o pedido do cliente: embasamento em cada parte de suma importância.

**Files:**
- Modify: `src/components/patient/Dashboard.tsx`
- Modify: `src/pages/PatientDetail.tsx` (`AdmissionCard`, `ExtubationCard`)
- Test: `src/pages/PatientDetail.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/pages/PatientDetail.test.tsx`, reusando o helper de render e o
objeto `db` que o arquivo já define:

```tsx
it("mostra o embasamento no painel de leitura do caso", async () => {
  db.patient = { ...pacienteBase };
  db.evolutions = [{ ...evolucaoBase }];
  renderPage();
  await waitFor(() => {
    expect(screen.getAllByText(/ver embasamento/i).length).toBeGreaterThan(0);
  });
});
```

Use os nomes de fixture que o arquivo já usa; `pacienteBase` e `evolucaoBase`
são só ilustrativos aqui.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: FAIL — não encontra "ver embasamento".

- [ ] **Step 3: Acrescentar os rodapés**

Em `Dashboard.tsx`, dentro do `<Panel title="Leitura do caso">`, após o parágrafo
"Apoio à decisão, não conduta automática":

```tsx
<SourceFooter sourceKeys={["dp", "pplat", "vcKg", "pf", "mp"]} />
```

Em `AdmissionCard` (`PatientDetail.tsx`), ao fim do `Panel`:

```tsx
<SourceFooter sourceKeys={["vcTarget", "peepFio2"]} />
```

Em `ExtubationCard`, ao fim do `Panel`:

```tsx
<SourceFooter sourceKeys={["extubation", "tobin", "pimax"]} />
```

Importe em cada arquivo:

```tsx
import { SourceFooter } from "../SourceFooter";       // em components/patient/
import { SourceFooter } from "../components/SourceFooter"; // em pages/
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm vitest run src/pages/PatientDetail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Conferência final**

Run: `pnpm test && pnpm build`
Expected: todos verdes, build limpo. Confirme que a contagem final é 171 mais os
testes acrescentados nesta fase, e que **nenhum dos 171 originais mudou de
resultado**.

- [ ] **Step 6: Revisar o diff da fase inteira à procura de PII e segredo**

```bash
git diff main...HEAD --stat
git diff main...HEAD | grep -nEi "console\.log|service_role|SUPABASE_.*KEY|[0-9]{11}|@gmail|@hotmail"
```

Expected: nenhuma ocorrência. O repositório é público.

- [ ] **Step 7: Preparar o commit e pedir OK**

```bash
git add src/components/patient/Dashboard.tsx src/pages/PatientDetail.tsx src/pages/PatientDetail.test.tsx
git diff --cached
```

Mensagem proposta:

```
feat(fontes): cita embasamento nos paineis de decisao
```

**Pare e peça OK.**

---

## Depois do plano

1. **O DDL da Task 5 precisa ser aplicado no Supabase pelo Jeann.** Nenhum teste
   o cobre. Sem ele, os campos novos gravam erro em produção.
2. **Levar as seis pendências da seção 10 do spec ao mentor.** Até lá, tudo
   aparece como "pendente de revisão" na página `/fontes`, que é o
   comportamento desejado.
3. **Promoção para a `main` é do Jeann**, e na ordem do `CLAUDE.md`:
   `git push origin dev`, depois `git checkout main && git merge --ff-only dev`,
   depois `git push origin main`.
4. **Dizer ao cliente o que a Fase 1 não resolve** (seção 12 do spec): ela monta
   a fundação, não a "análise do caso em um todo". Isso é Fase 2 em diante.
