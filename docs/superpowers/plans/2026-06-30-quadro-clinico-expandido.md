# Quadro Clínico Expandido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar à evolução diária um quadro clínico completo (impressão geral, exames de imagem, medicamentos venosos, sonda/dieta) que correlaciona esses dados com a ventilação, com carry-forward da última evolução e uma leitura única do caso.

**Architecture:** Estende `daily_evolutions` com 3 colunas `jsonb`. Catálogos estáticos de achados e medicamentos em `src/data/clinical-board.ts`. Motor de correlação puro e testável em `src/lib/clinical.ts`. UI nova em `src/pages/PatientDetail.tsx` apoiada em dois componentes novos de `src/components/ui.tsx`.

**Tech Stack:** React 18, TypeScript, Vite, Supabase (Postgres + RLS), Vitest (novo, para testar a lógica pura).

## Global Constraints

- Idioma de toda a interface e textos: português do Brasil.
- Nunca usar travessão (em dash) nem en dash em código, comentários, copy ou commits. Usar vírgula, parênteses ou dois-pontos.
- O app é apoio à decisão, não conduta automática. Todo conteúdo gerado (correlações) é lembrete editável, com o rodapé "Apoio à decisão, não conduta automática" quando exibido em painel.
- Nenhuma fórmula ou limite clínico existente em `src/lib/clinical.ts` pode ser alterado.
- Conteúdo clínico dos catálogos novos é marcado como "a validar" pela equipe (comentário no topo do arquivo), no mesmo espírito do `verified=false` dos ventiladores.
- Migrações de banco são idempotentes (`add column if not exists`).
- `pnpm build` (que roda `tsc --noEmit && vite build`) deve passar ao fim de cada task que toca TypeScript.

---

### Task 1: Migração de banco e tipos

**Files:**
- Modify: `supabase/schema.sql` (bloco de `daily_evolutions`, após a linha das colunas de hemodinâmica)
- Modify: `src/types/index.ts` (interface `DailyEvolution` e novas interfaces de apoio)
- Banco remoto: aplicar via MCP `apply_migration`

**Interfaces:**
- Produces: tipos `ImagingData`, `IvMedEntry`, `IvMeds`, `FeedingTube`, `DietType`, `Feeding`; campos `imaging`, `iv_meds`, `feeding` em `DailyEvolution`.

- [ ] **Step 1: Adicionar colunas no schema.sql**

Em `supabase/schema.sql`, logo após o bloco `create table if not exists public.daily_evolutions (...)` e antes de `alter table public.daily_evolutions enable row level security;`, adicionar:

```sql
-- Quadro clínico expandido (Tema A): imagem, medicamentos venosos, sonda/dieta.
-- jsonb por flexibilidade; são campos de exibição e correlação, não de gráfico.
alter table public.daily_evolutions add column if not exists imaging jsonb not null default '{}';
alter table public.daily_evolutions add column if not exists iv_meds jsonb not null default '{}';
alter table public.daily_evolutions add column if not exists feeding jsonb not null default '{}';
```

- [ ] **Step 2: Aplicar a migração no banco remoto**

Usar a ferramenta MCP `apply_migration` com name `clinical_board_columns` e o conteúdo SQL do Step 1 (os 3 `alter table`).
Expected: sucesso, sem erro de RLS (colunas herdam as policies da tabela).

- [ ] **Step 3: Estender os tipos**

Em `src/types/index.ts`, adicionar antes da interface `DailyEvolution`:

```ts
export interface ImagingData {
  xray?: string[];
  ct?: string[];
  mri?: string[];
  note?: string;
}

export interface IvMedEntry {
  on: boolean;
  note?: string;
}

export interface IvMeds {
  sedation?: IvMedEntry;
  analgesia?: IvMedEntry;
  nmb?: IvMedEntry;
  vasopressor?: IvMedEntry;
  bronchodilator?: IvMedEntry;
  other?: string;
}

// Categorias de medicamento (exclui `other`, que é texto livre).
export type IvMedKey = "sedation" | "analgesia" | "nmb" | "vasopressor" | "bronchodilator";

export type FeedingTube = "none" | "sng" | "sne" | "gtt";
export type DietType = "fasting" | "enteral" | "oral" | "parenteral";

export interface Feeding {
  tube?: FeedingTube;
  diet?: DietType;
}
```

E dentro de `interface DailyEvolution`, logo após a linha `notes: string | null;`, adicionar:

```ts
  imaging: ImagingData;
  iv_meds: IvMeds;
  feeding: Feeding;
```

- [ ] **Step 4: Verificar build**

Run: `pnpm build`
Expected: PASS (sem erros de tipo; nenhum consumidor novo ainda).

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql src/types/index.ts
git commit -m "feat: colunas e tipos do quadro clinico (imaging, iv_meds, feeding)"
```

---

### Task 2: Catálogos de referência

**Files:**
- Create: `src/data/clinical-board.ts`

**Interfaces:**
- Consumes: tipos `FeedingTube`, `DietType` de `src/types/index.ts`.
- Produces: `ImagingFinding`, `IMAGING_FINDINGS`, `IvMedCategory`, `IV_MED_CATEGORIES`, `FEEDING_TUBES`, `DIET_TYPES`.

- [ ] **Step 1: Criar o arquivo de catálogos**

Create `src/data/clinical-board.ts`:

```ts
// ============================================================
// Catálogos do quadro clínico (Tema A) :: CONTEÚDO A VALIDAR
// Achados de imagem, categorias de medicamento venoso e opções de sonda/dieta.
// Você e o mentor devem revisar a nomenclatura e os lembretes (ventHint)
// antes do uso clínico real.
// ============================================================
import type { IvMedKey, FeedingTube, DietType } from "../types";

export interface ImagingFinding {
  key: string;
  label: string;
  modality: "xray" | "ct" | "mri";
}

// Achados comuns por modalidade. As keys são estáveis (usadas pelo motor de
// correlação); os labels são o que o profissional vê nos chips.
export const IMAGING_FINDINGS: ImagingFinding[] = [
  { key: "infiltrado_bilateral", label: "Infiltrado bilateral", modality: "xray" },
  { key: "consolidacao", label: "Consolidação", modality: "xray" },
  { key: "atelectasia", label: "Atelectasia", modality: "xray" },
  { key: "derrame", label: "Derrame pleural", modality: "xray" },
  { key: "pneumotorax", label: "Pneumotórax", modality: "xray" },
  { key: "hiperinsuflacao", label: "Hiperinsuflação", modality: "xray" },
  { key: "normal", label: "Sem alterações", modality: "xray" },
  { key: "infiltrado_bilateral", label: "Infiltrado bilateral", modality: "ct" },
  { key: "consolidacao", label: "Consolidação", modality: "ct" },
  { key: "vidro_fosco", label: "Vidro fosco", modality: "ct" },
  { key: "derrame", label: "Derrame pleural", modality: "ct" },
  { key: "pneumotorax", label: "Pneumotórax", modality: "ct" },
  { key: "atelectasia", label: "Atelectasia", modality: "ct" },
  { key: "normal", label: "Sem alterações", modality: "ct" },
  { key: "normal", label: "Sem alterações", modality: "mri" },
];

export interface IvMedCategory {
  key: IvMedKey;
  label: string;
  ventHint: string;
}

// As 5 categorias que mudam o raciocínio ventilatório.
export const IV_MED_CATEGORIES: IvMedCategory[] = [
  { key: "sedation", label: "Sedação", ventHint: "Sedação profunda reduz o drive e o esforço; reavalie o trigger." },
  { key: "analgesia", label: "Analgesia (opioide)", ventHint: "Opioide reduz o drive respiratório e a frequência espontânea." },
  { key: "nmb", label: "Bloqueador neuromuscular", ventHint: "Sob BNM o drive é zerado; paciente não dispara, use modo controlado." },
  { key: "vasopressor", label: "Vasopressor", ventHint: "PEEP alta reduz o retorno venoso; titule observando a hemodinâmica." },
  { key: "bronchodilator", label: "Broncodilatador", ventHint: "Sugere broncoespasmo: atenção a auto-PEEP e tempo expiratório." },
];

export const FEEDING_TUBES: { v: FeedingTube; t: string }[] = [
  { v: "none", t: "Nenhuma" },
  { v: "sng", t: "SNG" },
  { v: "sne", t: "SNE" },
  { v: "gtt", t: "Gastrostomia" },
];

export const DIET_TYPES: { v: DietType; t: string }[] = [
  { v: "fasting", t: "Jejum" },
  { v: "enteral", t: "Enteral" },
  { v: "oral", t: "Oral" },
  { v: "parenteral", t: "Parenteral" },
];
```

- [ ] **Step 2: Verificar build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/clinical-board.ts
git commit -m "feat: catalogos de imagem, medicamentos venosos e sonda/dieta"
```

---

### Task 3: Motor de correlação (TDD)

**Files:**
- Modify: `package.json` (devDependency vitest + script `test`)
- Create: `src/lib/clinical.test.ts`
- Modify: `src/lib/clinical.ts` (adicionar `Correlation` e `ventilationCorrelations` ao final)

**Interfaces:**
- Consumes: `DailyEvolution`, `ImagingData`, `IvMeds` de `src/types`.
- Produces: `interface Correlation { level: "info" | "warn"; text: string; source: string }` e `function ventilationCorrelations(ev: DailyEvolution): Correlation[]`.

- [ ] **Step 1: Instalar o vitest e adicionar o script**

Run: `pnpm add -D vitest`
Depois, em `package.json`, adicionar ao bloco `scripts` a linha:

```json
    "test": "vitest run",
```

- [ ] **Step 2: Escrever o teste que falha**

Create `src/lib/clinical.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ventilationCorrelations } from "./clinical";
import type { DailyEvolution } from "../types";

// Evolução mínima: só os campos que o motor lê importam.
function ev(partial: Partial<DailyEvolution>): DailyEvolution {
  return { imaging: {}, iv_meds: {}, feeding: {}, ...partial } as DailyEvolution;
}

describe("ventilationCorrelations", () => {
  it("não gera correlação quando não há dados", () => {
    expect(ventilationCorrelations(ev({}))).toEqual([]);
  });

  it("BNM ativo gera aviso de drive zerado", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { nmb: { on: true } } }));
    expect(r.some((c) => c.source === "nmb" && c.level === "warn")).toBe(true);
  });

  it("sedação ativa gera info sobre trigger", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { sedation: { on: true } } }));
    expect(r.some((c) => c.source === "sedation" && c.level === "info")).toBe(true);
  });

  it("broncodilatador gera aviso de auto-PEEP", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { bronchodilator: { on: true } } }));
    expect(r.some((c) => c.source === "bronchodilator" && c.level === "warn")).toBe(true);
  });

  it("hiperinsuflação na imagem gera aviso de auto-PEEP", () => {
    const r = ventilationCorrelations(ev({ imaging: { xray: ["hiperinsuflacao"] } }));
    expect(r.some((c) => c.source === "imaging_hiperinsuflacao" && c.level === "warn")).toBe(true);
  });

  it("vasopressor gera info sobre PEEP e retorno venoso", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { vasopressor: { on: true } } }));
    expect(r.some((c) => c.source === "vasopressor")).toBe(true);
  });

  it("infiltrado bilateral sugere padrão SDRA", () => {
    const r = ventilationCorrelations(ev({ imaging: { ct: ["infiltrado_bilateral"] } }));
    expect(r.some((c) => c.source === "imaging_sdra" && c.level === "info")).toBe(true);
  });

  it("pneumotórax gera aviso de pressões", () => {
    const r = ventilationCorrelations(ev({ imaging: { xray: ["pneumotorax"] } }));
    expect(r.some((c) => c.source === "imaging_pneumotorax" && c.level === "warn")).toBe(true);
  });

  it("med desligado (on:false) não gera correlação", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { nmb: { on: false } } }));
    expect(r).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `pnpm test`
Expected: FAIL com erro de import (`ventilationCorrelations` não existe).

- [ ] **Step 4: Implementar o motor**

Ao final de `src/lib/clinical.ts`, adicionar:

```ts
// ============================================================
// Correlação do quadro clínico com a ventilação (Tema A).
// Lembretes editáveis derivados de campos estruturados (sem caçar texto livre).
// Apoio à decisão; não é conduta automática.
// ============================================================
import type { DailyEvolution } from "../types";

export interface Correlation {
  level: "info" | "warn";
  text: string;
  source: string;
}

export function ventilationCorrelations(ev: DailyEvolution): Correlation[] {
  const out: Correlation[] = [];
  const meds = ev.iv_meds ?? {};
  const img = ev.imaging ?? {};
  const allFindings = [
    ...(img.xray ?? []),
    ...(img.ct ?? []),
    ...(img.mri ?? []),
  ];
  const hasFinding = (k: string) => allFindings.includes(k);

  if (meds.nmb?.on)
    out.push({ level: "warn", source: "nmb", text: "Sob bloqueio neuromuscular: drive zerado, paciente não dispara. Use modo controlado e reavalie o trigger ao suspender." });
  if (meds.sedation?.on)
    out.push({ level: "info", source: "sedation", text: "Sedação ativa reduz o drive e o esforço; reavalie a sensibilidade do trigger e o nível de sedação." });
  if (meds.bronchodilator?.on || hasFinding("hiperinsuflacao"))
    out.push({ level: "warn", source: meds.bronchodilator?.on ? "bronchodilator" : "imaging_hiperinsuflacao", text: "Padrão obstrutivo: atenção a auto-PEEP. Vigie o tempo expiratório e prolongue a expiração se necessário." });
  if (meds.vasopressor?.on)
    out.push({ level: "info", source: "vasopressor", text: "Vasopressor em uso: PEEP alta reduz o retorno venoso. Titule a PEEP observando a hemodinâmica." });
  if (hasFinding("infiltrado_bilateral"))
    out.push({ level: "info", source: "imaging_sdra", text: "Infiltrado bilateral compatível com padrão SDRA: mantenha VC protetor e vigie a Driving Pressure." });
  if (hasFinding("pneumotorax"))
    out.push({ level: "warn", source: "imaging_pneumotorax", text: "Pneumotórax registrado: cuidado com pressões e PEEP; confirme a drenagem." });

  return out;
}
```

Nota: o `import type { DailyEvolution }` vai no topo do arquivo junto aos demais imports, não no meio.

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `pnpm test`
Expected: PASS (9 testes).

- [ ] **Step 6: Verificar build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/clinical.ts src/lib/clinical.test.ts
git commit -m "feat: motor de correlacao do quadro clinico com a ventilacao (TDD)"
```

---

### Task 4: Componentes de UI (textarea e chips)

**Files:**
- Modify: `src/components/ui.tsx` (prop `multiline` em `Field`; novos `ChipGroup` e `ChipToggle`)

**Interfaces:**
- Produces: `Field` com prop opcional `multiline?: boolean`; `ChipGroup({ options, selected, onToggle })`; `ChipToggle({ label, on, onClick })`.

- [ ] **Step 1: Adicionar multiline ao Field**

Em `src/components/ui.tsx`, na assinatura de `Field`, adicionar `multiline,` na lista de props desestruturadas e `multiline?: boolean;` no tipo. Depois, no corpo, trocar o ramo do `input` para tratar textarea. O bloco final do `Field` (a partir de `{options ? (`) fica:

```tsx
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {options.map((o) => (
            <option key={o.v} value={o.v}>
              {o.t}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
        />
      ) : (
        <div style={{ position: "relative" }}>
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          />
          {unit && (
            <span
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 11,
                color: T.dim,
                pointerEvents: "none",
              }}
            >
              {unit}
            </span>
          )}
        </div>
      )}
```

- [ ] **Step 2: Adicionar ChipGroup e ChipToggle**

Ao final de `src/components/ui.tsx`, antes da linha `export { fmt };`, adicionar:

```tsx
// Chips de seleção múltipla (achados de imagem). Um toque liga/desliga.
export function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: { v: string; t: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const on = selected.includes(o.v);
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onToggle(o.v)}
            style={{
              fontSize: 12,
              padding: "5px 11px",
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: "inherit",
              background: on ? `${T.accent}1A` : T.panel2,
              border: `1px solid ${on ? T.accent : T.line}`,
              color: on ? T.accent : T.dim,
              fontWeight: on ? 700 : 500,
            }}
          >
            {o.t}
          </button>
        );
      })}
    </div>
  );
}

// Chip único liga/desliga (categoria de medicamento).
export function ChipToggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 13,
        padding: "7px 13px",
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: "inherit",
        background: on ? `${T.warn}1A` : T.panel2,
        border: `1px solid ${on ? T.warn : T.line}`,
        color: on ? T.warn : T.dim,
        fontWeight: on ? 700 : 500,
      }}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui.tsx
git commit -m "feat: Field multiline e componentes ChipGroup/ChipToggle"
```

---

### Task 5: Formulário de evolução com quadro clínico e carry-forward

**Files:**
- Modify: `src/pages/PatientDetail.tsx` (`EvolutionForm` e sua chamada; remover `extra: "vaso"` de `EV_SECTIONS`; imports)

**Interfaces:**
- Consumes: `IMAGING_FINDINGS`, `IV_MED_CATEGORIES`, `FEEDING_TUBES`, `DIET_TYPES` de `../data/clinical-board`; `ChipGroup`, `ChipToggle` de `../components/ui`; tipos `ImagingData`, `IvMeds`, `Feeding`.
- Produces: `EvolutionForm` agora recebe `previous?: DailyEvolution` e grava `notes`, `imaging`, `iv_meds`, `feeding`, `vasopressor`.

- [ ] **Step 1: Atualizar imports e a chamada do EvolutionForm**

No topo de `src/pages/PatientDetail.tsx`, no import de `../components/ui`, acrescentar `ChipGroup, ChipToggle`. No import de `../types`, acrescentar `ImagingData, IvMeds, IvMedKey, Feeding`. Adicionar novo import:

```tsx
import { IMAGING_FINDINGS, IV_MED_CATEGORIES, FEEDING_TUBES, DIET_TYPES } from "../data/clinical-board";
```

Na aba "evolucao", trocar a chamada do formulário para passar a última evolução:

```tsx
            <EvolutionForm patient={patient} ownerId={session!.user.id} previous={last} onSaved={load} />
```

- [ ] **Step 2: Remover o vasopressor da seção Hemodinâmica**

Em `EV_SECTIONS`, na linha da Hemodinâmica, remover `extra: "vaso"` (o vasopressor passa para a seção de medicamentos). A linha fica:

```tsx
  { title: "Hemodinâmica", color: T.warn, keys: ["hr", "sbp", "dbp", "lactate"] },
```

E na renderização das seções, remover o bloco `{sec.extra === "vaso" && (...)}` inteiro (o `vaso`/`setVaso` deixam de existir; ver Step 3).

- [ ] **Step 3: Reescrever o EvolutionForm**

Substituir toda a função `EvolutionForm` por:

```tsx
function EvolutionForm({ patient, ownerId, previous, onSaved }: { patient: Patient; ownerId: string; previous?: DailyEvolution; onSaved: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [tre, setTre] = useState("");
  const [notes, setNotes] = useState("");
  // Carry-forward: herda o quadro clínico da última evolução (não os números do dia).
  const [imaging, setImaging] = useState<ImagingData>(previous?.imaging ?? {});
  const [meds, setMeds] = useState<IvMeds>(previous?.iv_meds ?? {});
  const [feeding, setFeeding] = useState<Feeding>(previous?.feeding ?? {});
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: string) => setVals((s) => ({ ...s, [k]: v }));

  const toggleFinding = (modality: "xray" | "ct" | "mri", key: string) =>
    setImaging((s) => {
      const cur = s[modality] ?? [];
      const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key];
      return { ...s, [modality]: next };
    });
  const toggleMed = (key: IvMedKey) =>
    setMeds((s) => ({ ...s, [key]: { on: !s[key]?.on, note: s[key]?.note } }));
  const setMedNote = (key: IvMedKey) => (v: string) =>
    setMeds((s) => ({ ...s, [key]: { on: s[key]?.on ?? false, note: v } }));

  const clearBoard = () => {
    setImaging({});
    setMeds({});
    setFeeding({});
    setNotes("");
  };

  const save = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      patient_id: patient.id,
      owner_id: ownerId,
      mode: patient.current_mode,
      tre_result: tre || null,
      vasopressor: meds.vasopressor?.on ?? false,
      notes: notes || null,
      imaging,
      iv_meds: meds,
      feeding,
    };
    for (const f of EV_FIELDS) {
      const raw = vals[f.k as string];
      payload[f.k as string] = raw ? Number(raw) : null;
    }
    const { error } = await supabase.from("daily_evolutions").insert(payload);
    setSaving(false);
    if (error) alert("Erro: " + error.message);
    else {
      setVals({});
      setTre("");
      onSaved();
    }
  };

  const modalities: { key: "xray" | "ct" | "mri"; label: string }[] = [
    { key: "xray", label: "Raio-X" },
    { key: "ct", label: "Tomografia" },
    { key: "mri", label: "Ressonância" },
  ];

  return (
    <Panel title="Nova evolução" sub="Registra o estado atual e alimenta as tendências">
      <div style={{ display: "grid", gap: 12 }}>
        {EV_SECTIONS.map((sec) => (
          <FormSection key={sec.title} title={sec.title} color={sec.color}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              {sec.keys.map((k) => {
                const f = FIELD_BY_KEY[k];
                return (
                  <Field key={k} label={f.label} unit={f.unit} value={vals[k] ?? ""} onChange={set(k)} />
                );
              })}
              {sec.extra === "tre" && (
                <Field label="TRE" value={tre} onChange={setTre}
                  options={[{ v: "", t: "—" }, { v: "pass", t: "Aprovado" }, { v: "fail", t: "Falhou" }]} />
              )}
            </div>
          </FormSection>
        ))}

        <FormSection title="Evolução clínica" color={T.accent}>
          <Field label="Impressão geral do quadro" value={notes} onChange={setNotes} multiline placeholder="Evolução escrita, análise geral do quadro…" />
        </FormSection>

        <FormSection title="Exames de imagem" color={T.purple}>
          <div style={{ display: "grid", gap: 10 }}>
            {modalities.map((m) => (
              <div key={m.key}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 6 }}>{m.label}</div>
                <ChipGroup
                  options={IMAGING_FINDINGS.filter((f) => f.modality === m.key).map((f) => ({ v: f.key, t: f.label }))}
                  selected={imaging[m.key] ?? []}
                  onToggle={(v) => toggleFinding(m.key, v)}
                />
              </div>
            ))}
            <Field label="Observação (opcional)" value={imaging.note ?? ""} onChange={(v) => setImaging((s) => ({ ...s, note: v }))} multiline placeholder="Detalhe do laudo, se necessário" />
          </div>
        </FormSection>

        <FormSection title="Medicamentos venosos" color={T.warn}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {IV_MED_CATEGORIES.map((m) => (
                <ChipToggle key={m.key} label={m.label} on={!!meds[m.key]?.on} onClick={() => toggleMed(m.key)} />
              ))}
            </div>
            {IV_MED_CATEGORIES.filter((m) => meds[m.key]?.on).map((m) => (
              <Field key={m.key} label={`${m.label} (obs)`} value={meds[m.key]?.note ?? ""} onChange={setMedNote(m.key)} type="text" placeholder="droga / dose (opcional)" />
            ))}
            <Field label="Outros" value={meds.other ?? ""} onChange={(v) => setMeds((s) => ({ ...s, other: v }))} type="text" placeholder="outras drogas venosas" />
          </div>
        </FormSection>

        <FormSection title="Sonda e dieta" color={T.ok}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <Field label="Sonda" value={feeding.tube ?? "none"} onChange={(v) => setFeeding((s) => ({ ...s, tube: v as Feeding["tube"] }))} options={FEEDING_TUBES} />
            <Field label="Dieta" value={feeding.diet ?? "fasting"} onChange={(v) => setFeeding((s) => ({ ...s, diet: v as Feeding["diet"] }))} options={DIET_TYPES} />
          </div>
        </FormSection>
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <Btn onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar evolução"}</Btn>
        <button type="button" onClick={clearBoard} style={{ background: "transparent", border: "none", color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Limpar quadro / começar do zero
        </button>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 4: Verificar build**

Run: `pnpm build`
Expected: PASS. Se o `tsc` reclamar de `vaso`/`setVaso` órfãos, confirme que o bloco `{sec.extra === "vaso" && ...}` e os `useState` de `vaso` foram removidos no Step 2/Step 3 (a reescrita do Step 3 já não os contém).

- [ ] **Step 5: Verificação manual**

Run: `pnpm dev` e abrir um paciente. Registrar uma evolução marcando chips de imagem, medicamentos e sonda/dieta. Salvar. Criar uma segunda evolução e confirmar que imagem, medicamentos e sonda/dieta vieram herdados (carry-forward), e que os campos numéricos vieram vazios.
Expected: dados salvos e herdados; sem erro no console.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PatientDetail.tsx
git commit -m "feat: quadro clinico no formulario de evolucao com carry-forward"
```

---

### Task 6: Painel "Leitura do caso"

**Files:**
- Modify: `src/pages/PatientDetail.tsx` (função `Dashboard`)

**Interfaces:**
- Consumes: `ventilationCorrelations` de `../lib/clinical` (via `C.ventilationCorrelations`).
- Produces: bloco de alertas atual substituído por painel unificado.

- [ ] **Step 1: Construir a lista unificada e renderizar**

Em `Dashboard`, logo após a montagem do array `alerts` (a sequência de `if (...) alerts.push(...)`), adicionar a fusão com as correlações:

```tsx
  // Painel único "Leitura do caso": alertas numéricos + correlações de
  // drogas/imagem, ordenados por severidade (danger > warn > info).
  const correlations = C.ventilationCorrelations(ev);
  const sevRank = { danger: 0, warn: 1, info: 2 } as const;
  const reading: { s: "danger" | "warn" | "info"; t: string }[] = [
    ...alerts.map((a) => ({ s: a.s as "danger" | "warn" | "info", t: a.t })),
    ...correlations.map((c) => ({ s: c.level as "warn" | "info", t: c.text })),
  ].sort((a, b) => sevRank[a.s] - sevRank[b.s]);
```

Depois, substituir o bloco de renderização atual `{alerts.length > 0 && (...)}` por:

```tsx
      {reading.length > 0 && (
        <Panel title="Leitura do caso" sub="Alertas dos indicadores e correlações do quadro clínico com a ventilação">
          <div style={{ display: "grid", gap: 8 }}>
            {reading.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: `${color(a.s === "info" ? "ok" : a.s)}14`, border: `1px solid ${color(a.s === "info" ? "ok" : a.s)}40`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: color(a.s === "info" ? "ok" : a.s), fontWeight: 600 }}>
                <span>{a.s === "danger" ? "⚠" : a.s === "warn" ? "⚠" : "ℹ"}</span>
                <span style={{ color: T.txt, fontWeight: 500 }}>{a.t}</span>
              </div>
            ))}
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: T.dim, fontStyle: "italic" }}>
              Apoio à decisão, não conduta automática.
            </p>
          </div>
        </Panel>
      )}
```

Nota: a função `color` já existe no arquivo e só aceita `"ok" | "warn" | "danger"`, por isso `info` é mapeado para `"ok"` (verde) na cor da borda, mantendo o texto em `T.txt`.

- [ ] **Step 2: Verificar build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Verificação manual**

Run: `pnpm dev`, abrir paciente com evolução que tenha BNM ligado e infiltrado bilateral. Confirmar que o painel "Leitura do caso" mostra o aviso de BNM e a info de SDRA junto dos alertas numéricos.
Expected: itens aparecem ordenados por severidade.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PatientDetail.tsx
git commit -m "feat: painel Leitura do caso unindo alertas e correlacoes"
```

---

### Task 7: Histórico de evolução expansível

**Files:**
- Modify: `src/pages/PatientDetail.tsx` (função `EvolutionHistory`)

**Interfaces:**
- Consumes: `IMAGING_FINDINGS`, `IV_MED_CATEGORIES`, `FEEDING_TUBES`, `DIET_TYPES` (já importados na Task 5).
- Produces: cada item do histórico abre o quadro clínico do dia.

- [ ] **Step 1: Adicionar helpers de rótulo e o estado de expansão**

Antes da função `EvolutionHistory`, adicionar helpers de rótulo (próximo às constantes de evolução):

```tsx
const IMAGING_LABEL: Record<string, string> = Object.fromEntries(
  IMAGING_FINDINGS.map((f) => [f.key, f.label])
);
const TUBE_LABEL: Record<string, string> = Object.fromEntries(FEEDING_TUBES.map((o) => [o.v, o.t]));
const DIET_LABEL: Record<string, string> = Object.fromEntries(DIET_TYPES.map((o) => [o.v, o.t]));

function boardSummary(e: DailyEvolution) {
  const findings = [
    ...(e.imaging?.xray ?? []),
    ...(e.imaging?.ct ?? []),
    ...(e.imaging?.mri ?? []),
  ].map((k) => IMAGING_LABEL[k] ?? k);
  const medsOn = IV_MED_CATEGORIES.filter(
    (m) => e.iv_meds?.[m.key]?.on
  ).map((m) => m.label);
  const tube = e.feeding?.tube && e.feeding.tube !== "none" ? TUBE_LABEL[e.feeding.tube] : null;
  const diet = e.feeding?.diet ? DIET_LABEL[e.feeding.diet] : null;
  const hasContent = !!e.notes || findings.length > 0 || medsOn.length > 0 || !!tube || !!diet;
  return { findings, medsOn, tube, diet, hasContent };
}
```

- [ ] **Step 2: Reescrever EvolutionHistory com expansão**

Substituir a função `EvolutionHistory` por:

```tsx
function EvolutionHistory({ evolutions, authors }: { evolutions: DailyEvolution[]; authors: Record<string, string> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (evolutions.length === 0) return null;
  const ordered = [...evolutions].reverse();
  return (
    <Panel title="Histórico de evoluções" sub="Quem registrou e quando (toque para ver o quadro clínico do dia)">
      <div style={{ display: "grid", gap: 8 }}>
        {ordered.map((e) => {
          const b = boardSummary(e);
          const open = openId === e.id;
          return (
            <div key={e.id} style={{ borderTop: `1px solid ${T.line}`, paddingTop: 8 }}>
              <div
                onClick={() => b.hasContent && setOpenId(open ? null : e.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: b.hasContent ? "pointer" : "default" }}
              >
                <div style={{ fontSize: 13, color: T.txt }}>
                  {b.hasContent ? <span style={{ color: T.dim }}>{open ? "▾ " : "▸ "}</span> : null}
                  {new Date(e.recorded_at).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                  {e.mode ? <span style={{ color: T.dim }}> · {e.mode}</span> : null}
                </div>
                <div style={{ fontSize: 12, color: T.dim }}>{authors[e.owner_id] ?? "Profissional"}</div>
              </div>
              {open && b.hasContent && (
                <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 13, color: T.txt, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 12 }}>
                  {e.notes && <div><span style={{ color: T.dim }}>Impressão: </span>{e.notes}</div>}
                  {b.findings.length > 0 && <div><span style={{ color: T.dim }}>Imagem: </span>{b.findings.join(", ")}</div>}
                  {b.medsOn.length > 0 && <div><span style={{ color: T.dim }}>Medicamentos: </span>{b.medsOn.join(", ")}</div>}
                  {(b.tube || b.diet) && <div><span style={{ color: T.dim }}>Sonda/dieta: </span>{[b.tube, b.diet].filter(Boolean).join(" · ")}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Verificação manual**

Run: `pnpm dev`, abrir paciente com evolução que tenha quadro clínico preenchido. Clicar no item do histórico e confirmar que abre o resumo (impressão, imagem, medicamentos, sonda/dieta). Itens sem quadro continuam compactos e não expandem.
Expected: expansão funciona; passagem de plantão fica legível.

- [ ] **Step 5: Rodar testes e build finais**

Run: `pnpm test && pnpm build`
Expected: testes PASS e build PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PatientDetail.tsx
git commit -m "feat: historico de evolucao expansivel com quadro clinico do dia"
```

---

## Verificação final (após todas as tasks)

- [ ] Critério 1: registrar impressão, imagem (chips), medicamentos (categorias) e sonda/dieta numa evolução.
- [ ] Critério 2: a evolução seguinte herda imagem, medicamentos e sonda/dieta.
- [ ] Critério 3: painel "Leitura do caso" mostra alertas numéricos e correlações juntos.
- [ ] Critério 4: histórico abre o quadro clínico de cada dia.
- [ ] Critério 5: prontidão para extubação continua funcionando (vasopressor sincronizado de `iv_meds`).
- [ ] Critério 6: `pnpm build` passa; `ventilationCorrelations` coberto por testes.
- [ ] Critério 7: `schema.sql` reflete as 3 colunas novas e é idempotente.
