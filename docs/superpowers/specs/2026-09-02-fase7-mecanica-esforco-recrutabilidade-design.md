# Fase 7 — Mecânica: esforço, drive e recrutabilidade

**Data:** 02/09/2026
**Modo do projeto:** MANUTENÇÃO
**Estado de partida:** 444 testes em 25 arquivos, `pnpm build` limpo
**Pesquisa clínica:** `docs/dossie-clinico-fase7.md`
**Arquitetura que este spec obedece:** `docs/superpowers/specs/2026-09-01-arquitetura-blocos-clinicos-design.md`

## 1. O que o cliente pediu

> "complacência estática, P0.1, Pmus, Raw e ΔPocc, e avaliação de
> recrutabilidade"

Complacência estática e Raw **já existem** em `src/lib/clinical.ts` (`cStat`,
`cDyn`, `raw`) desde antes desta série de fases. O que falta é o bloco de
**esforço e drive** — P0.1, ΔPocc, Pmus — e a **recrutabilidade**.

## 2. Procedência de cada número

| O quê | Valor | Procedência |
|---|---|---|
| P0.1: limite superior | 3,5 cmH₂O | `telias_2020` |
| P0.1: limite inferior | **1,5** cmH₂O | `parecer_p01_faixa` |
| Pmus a partir do ΔPocc | `0,75 × \|ΔPocc\|` | `bertoni_2019` |
| ΔP_L,dyn a partir do ΔPocc | `(P_pico − PEEP) + (2/3 × \|ΔPocc\|)` | `bertoni_2019` |
| Faixas de interpretação do Pmus | 4, 8 e 12 cmH₂O | `parecer_pmus_faixas` |
| R/I: fórmulas | ver §5.3 | `chen_2020` |
| R/I: limiar | **não existe** | ver §5.4 |

### 2.1 Fontes novas no catálogo

Todas com DOI e PMID conferidos. O dossiê registra, para cada uma, o que foi
lido no artigo e o que veio de resumo ou de registro bibliográfico.

- `telias_2020` — Telias I, Junhasavasdikul D, Rittayamai N, Piquilloud L,
  Chen L, Ferguson ND, Goligher EC, Brochard L. *Airway Occlusion Pressure As
  an Estimate of Respiratory Drive and Inspiratory Effort during Assisted
  Ventilation.* Am J Respir Crit Care Med 2020;201(9):1086-1098.
  `verificada: true`
- `bertoni_2019` — Bertoni M, Telias I, Urner M, Long M, Del Sorbo L, Fan E,
  Sinderby C, Beck J, Liu L, Qiu H, Wong J, Slutsky AS, Ferguson ND,
  Brochard L, Goligher EC. *A novel non-invasive method to detect excessively
  high respiratory effort and dynamic transpulmonary driving pressure during
  mechanical ventilation.* Critical Care 2019;23:346. `verificada: true`
- `chen_2020` — Chen L, Del Sorbo L, Grieco DL, Junhasavasdikul D,
  Rittayamai N, Soliman I, Sklar MC, Rauseo M, Ferguson ND, Fan E,
  Richard JCM, Brochard L. *Potential for Lung Recruitment Estimated by the
  Recruitment-to-Inflation Ratio in Acute Respiratory Distress Syndrome. A
  Clinical Trial.* Am J Respir Crit Care Med 2020;201(2):178-187.
  `verificada: true`

Dois pareceres, `profissional: "Mentor clínico do projeto"`,
`data: "02/09/2026"`:

- `parecer_pmus_faixas` — as quatro faixas de interpretação do Pmus. Bertoni
  2019 valida a **conversão**; a leitura por faixas é prática dele. A resposta
  dele SUBSTITUI o registro anterior de "ΔPocc: limites 10 e 15": os números
  eram de Pmus, e agora são quatro faixas em vez de dois cortes.
- `parecer_p01_faixa` — o limite inferior de **1,5**. Telias 2020 publica
  **1,0** (sensibilidade 100%, especificidade 92% para esforço baixo), e o
  mentor reafirmou 1,5 depois de ver isso. A nota declara a divergência.

### 2.2 Chaves novas de `SourceKey`

`SourceKey` é união fechada; `THRESHOLD_SOURCES` e o `LABELS` de
`src/pages/Sources.tsx` são `Record<SourceKey, …>` e exaustivos. **Chave nova
sem rótulo quebra o `tsc`.** O teste de referência órfã obriga cada entrada do
catálogo a ser citada por pelo menos uma chave.

| Chave | Cobre | Fontes |
|---|---|---|
| `drive` | faixa do P0.1 | `telias_2020`, `parecer_p01_faixa` |
| `esforco` | ΔPocc, Pmus, ΔP_L,dyn e as faixas | `bertoni_2019`, `parecer_pmus_faixas` |
| `recrutabilidade` | R/I e o que ele não sustenta | `chen_2020` |

## 3. Captura de dados

### 3.1 Duas colunas novas na evolução diária

```sql
alter table public.daily_evolutions add column if not exists p01 numeric;
alter table public.daily_evolutions add column if not exists pocc numeric;
```

Aditivo e idempotente. Nenhum `drop`, nenhum `truncate`. Quem aplica é o Jeann;
nenhum teste executa este SQL, e o diff é a única revisão que ele recebe.

`P_pico` e `PEEP`, necessárias para a ΔP_L,dyn, **já existem**.

**Convenção do ΔPocc no rótulo, não em coluna.** Bertoni usa três oclusões, e
Rudolph 2025 mostra que o valor sobe entre ciclos ocluídos sucessivos — sem
convenção registrada, dois serviços gravam coisas diferentes no mesmo campo. O
rótulo do campo instrui a convenção em vez de acrescentar uma coluna de
metadado a um formulário que já é grande.

**A origem do P0.1 fica fora desta fase.** Telias 2020 mostra que o valor
exibido pelo ventilador e o medido em oclusão dedicada não são intercambiáveis,
e que o do ventilador pode subestimar. Resolvido no rótulo, pelo mesmo motivo.

### 3.2 Plausibilidade: a armadilha do BE, de novo

`src/lib/measurement-limits.ts` barra o fisicamente impossível, nunca a faixa
clínica. Os dois campos novos caem em armadilhas opostas:

```ts
// P0.1 é positivo por convenção de tela, e ZERO É VALOR VÁLIDO E GRAVE:
// ausência de drive. `min: 0`, nunca ACIMA_DE_ZERO.
p01: { min: 0, max: 30 },
// ΔPocc é NEGATIVO por definição: deflexão abaixo da PEEP. Um piso positivo
// aqui rejeitaria toda medida real, como `min: 0` rejeitaria todo BE de
// paciente acidótico. Cerca de plausibilidade, não faixa clínica.
pocc: { min: -60, max: 0 },
```

**São os dois erros de reflexo mais prováveis desta fase**: pôr
`ACIMA_DE_ZERO` no P0.1, que barraria justamente o paciente sem drive, e pôr
`min: 0` no ΔPocc, que barraria toda medida que existe. O teste cobre os dois
com valor zero e com valor negativo, e o teste de aceitação sozinho não prova
nada — campo sem entrada no mapa é ignorado em silêncio por
`invalidMeasurements`, então cada um precisa também de um teste de reprovação.

Os oito campos da manobra de recrutabilidade não passam por
`measurement-limits.ts`: eles não vêm do formulário de evolução, e a validação
deles é do painel da manobra.

### 3.3 Uma tabela nova: a manobra de recrutabilidade

A manobra tem oito valores medidos em ordem obrigatória, pré-requisitos que
abortam, e altera o paciente deliberadamente. É evento com passos, da mesma
natureza do TRE — não campo de evolução diária.

```sql
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
```

Quatro políticas, uma por verbo, cada uma precedida de `drop policy if exists`,
todas por `public.can_access_patient(patient_id)`, e o `insert` exigindo também
`auth.uid() = owner_id`. Índice por `(patient_id, realizada_em desc)`.

Idêntico ao `tre_sessions` da Fase 5, e pelo mesmo motivo: é o padrão que as
demais tabelas do arquivo já seguem, e desviar dele sem razão é como brechas
aparecem.

**`desfecho` nulo significa manobra EM ANDAMENTO**, não dado faltando — mesma
convenção do TRE, e não há coluna de status separada.

## 4. O módulo `src/lib/mecanica.ts`

Puro: sem React, sem Supabase, como todo `lib/` deste projeto.

```ts
export type FaixaEsforco = "muito_baixo" | "adequado" | "aumentado" | "elevado";

export interface Esforco {
  /** Sempre positivo na saída, qualquer que seja o sinal do ΔPocc gravado. */
  pmus: number;
  faixa: FaixaEsforco;
  /** Estimativa de estresse pulmonar. Sem faixa: o mentor não foi consultado. */
  dpLDinamica: number | null;
}

export type FaixaDrive = "baixo" | "adequado" | "elevado";

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
  /** A PEEP baixa efetiva usada: a medida, ou a de abertura se houve fechamento. */
  peepBaixaEfetiva: number;
}

export function classificarDrive(p01: number | null): FaixaDrive | null;
export function estimarEsforco(
  pocc: number | null, ppico: number | null, peep: number | null
): Esforco | null;
export function calcularRi(e: RecrutabilidadeEntrada): Recrutabilidade | null;
```

`estimarEsforco` devolve `null` sem ΔPocc — sem ele não há nem Pmus nem
ΔP_L,dyn. `dpLDinamica` é `null` quando falta pico ou PEEP, mas o Pmus continua.

## 5. As regras

### 5.1 Drive, pelo P0.1

| P0.1 | Leitura |
|---|---|
| < 1,5 | drive baixo |
| 1,5 a 3,5 | adequado |
| > 3,5 | drive elevado |

O **3,5 é publicado** (Telias 2020: sensibilidade 80%, especificidade 77%). O
**1,5 é parecer**, e Telias publica 1,0. A tela cita as duas procedências e diz
qual é qual.

**As operating characteristics foram medidas contra esforço esofágico
(PTPmus/min ≥ 200 cmH₂O·s·min⁻¹), não contra desfecho clínico.** A tela diz
isso: é a diferença entre "prevê esforço alto" e "prevê que o paciente vai mal".

### 5.2 Esforço, pelo ΔPocc

```
Pmus estimada     = 0,75 × |ΔPocc|
ΔP_L,dyn estimada = (P_pico − PEEP) + (2/3 × |ΔPocc|)
```

Faixas do Pmus, todas `parecer_pmus_faixas`:

| Pmus | Faixa | Leitura |
|---|---|---|
| < 4 | `muito_baixo` | esforço muito baixo: pensar em fraqueza ou sedação |
| 4 a 8 | `adequado` | esforço geralmente adequado |
| 8 a 12 | `aumentado` | esforço aumentado, acompanhar |
| > 12 | `elevado` | esforço elevado: sobrecarga e P-SILI |

**As bordas que o mentor escreveu são difusas** ("< 3-4", "> 12-15") e código
precisa de número. As fronteiras são **4, 8 e 12**, quatro faixas contíguas sem
buraco. O **15 não vira quarta fronteira**: ele aparece no texto da tela como o
ponto onde a preocupação fica mais forte, dentro da faixa `elevado`.

**A ΔP_L,dyn é exibida sem faixa.** O mentor não foi perguntado sobre limiares
dela; inventá-los seria exatamente o que este projeto não faz.

**Nada disso é gravado.** Guardamos `pocc`, `ppico` e `peep`; a estimativa é
recalculada na exibição. Se um coeficiente mudar por decisão dele, o histórico
inteiro se corrige sozinho, e nenhum número velho fica cristalizado no banco
afirmando o que a versão anterior achava.

### 5.3 Recrutabilidade, pelo R/I

```
PEEP baixa efetiva = fechamento ? pressão de abertura : PEEP baixa
ΔPEEP              = PEEP alta − PEEP baixa efetiva
C_baixa            = VC baixa / (Pplat baixa − PEEP baixa efetiva)
V_inflado          = C_baixa × ΔPEEP
V_recrutado        = volume expirado extra − V_inflado
R/I                = V_recrutado / V_inflado
```

A troca da PEEP baixa pela **pressão de abertura** quando há fechamento
completo de via aérea vem de Chen 2020. Sem ela a conta erra exatamente no
paciente em que ela mais importa.

`calcularRi` devolve `null` quando falta qualquer valor necessário, quando o
paciente não é passivo, ou quando `ΔPEEP` ou `C_baixa` não são positivos —
divisão por zero produz `Infinity`, que passa por `isNaN`.

### 5.4 O aplicativo não diz se o paciente é recrutável

Mostra o R/I, a data e a proveniência. Nada de veredito, nada de sugestão de
PEEP.

O 0,5 que circula como corte é a **mediana da coorte de derivação de Chen 2020
(n = 45)**, usada ali para dicotomizar a análise. Não é ponto de corte validado
contra desfecho. O erro de medida em torno de 0,5 é da ordem da distância entre
os limiares que a literatura propõe, e a validação por tomografia mais recente
deu AUC 0,70 com intervalo de confiança de 0,52 a 0,89 — o piso encosta no
acaso. Detalhe no dossiê.

A tela pode dizer que a faixa observada na coorte vai de 0 a 2,0, como
referência descritiva. Nunca "recrutável" ou "não recrutável".

## 6. Ausência de dado: três casos novos

Regra do projeto, e a origem dos seus piores defeitos.

1. **P0.1 zero é ausência de drive** — medida real e grave, não campo vazio.
   Guarda é `num()`, nunca teste de veracidade.
2. **ΔPocc só existe em paciente disparando o ventilador.** Em paciente passivo
   não se aplica, e "não se aplica" não é zero. O aplicativo não modela esse
   estado como valor: sem ΔPocc não há Pmus nem ΔP_L,dyn, e a tela diz que
   falta a medida.
3. **R/I zero significa que não recrutou nada** — resultado clínico legítimo, e
   diferente de manobra não realizada.
4. **ΔPocc zero é medida, não ausência.** Deflexão nula em paciente que dispara
   significa esforço não detectado: produz Pmus 0 e cai na faixa
   `muito_baixo`, que é a leitura clínica correta. Não pode virar "sem dado" —
   é o mesmo formato do BE zero da Fase 6, num campo onde o valor esperado é
   negativo.

Cada um tem teste, e o teste cobre zero explicitamente.

## 7. Tela

**`MecanicaPanel`**, em `src/components/patient/`, na aba **Evolução**, ao lado
do painel de gasometria. Lê a última evolução; sem P0.1 nem ΔPocc, mostra a
dica de que faltam as medidas e nada mais.

**`RecrutabilidadePanel`**, na aba **Desmame**, junto do TRE — as duas são
procedimentos com passos, e é onde o fisioterapeuta vai procurar. Três estados
de tela, como o TRE ensinou: sem manobra, em andamento e histórico.

Os dois com `SourceFooter` cujas chaves saem do resultado, nunca de lista
escrita à mão. Este projeto embarcou três vezes um painel cujo rodapé não
cobria o que ele exibia, e derivar as chaves do que foi calculado é o que
impede a quarta.

## 8. Testes obrigatórios

Além da cobertura normal:

1. **P0.1 zero** classifica como drive baixo e **não** como dado faltando.
2. **ΔPocc ausente** não produz Pmus nem ΔP_L,dyn, e a ausência não vira zero.
3. **ΔPocc negativo e positivo** produzem o mesmo Pmus — o sinal do que foi
   gravado não pode mudar a leitura.
4. **Cada uma das quatro faixas do Pmus**, e as três fronteiras exatas (4, 8 e
   12), para prender a inclusividade das comparações.
5. **R/I zero** é resultado, não ausência. **ΔPocc zero** também: produz Pmus 0
   e faixa `muito_baixo`, nunca "sem dado".
6. **Os limites de plausibilidade**, com teste de REPROVAÇÃO por campo e não só
   de aceitação: `p01` aceita zero e reprova negativo; `pocc` aceita negativo e
   zero e reprova positivo grande.
7. **A pressão de abertura substitui a PEEP baixa** quando há fechamento: teste
   que falha se a substituição for removida.
8. **`ΔP_L,dyn` não recebe faixa.** Teste que falha se uma classificação
   aparecer para ela — é decisão de não exibir, e a mais fácil de alguém
   "consertar" numa fase futura.
9. **O rodapé cobre o que a tela afirma**, com asserção que distingue a chave
   certa da errada.

## 9. Fora de escopo

- **Limiares para a ΔP_L,dyn.** O mentor não foi perguntado.
- **Origem do P0.1** como campo (ventilador contra oclusão dedicada).
- **Convenção de contagem do ΔPocc** como campo.
- **Qualquer sugestão automática de PEEP** a partir do R/I.
- **Complacência estática e Raw**, que já existem em `clinical.ts`.

## 10. O que fica em aberto

1. **A ΔP_L,dyn merece faixas?** A literatura tem 15 e 20; o mentor não foi
   consultado. Vai na próxima rodada.
2. **A origem do P0.1 muda a leitura**, e hoje o aplicativo não a distingue.
3. **A linha 40 do spec de arquitetura está desatualizada** desde 02/09/2026:
   ela diz "ΔPocc: usa os limites 10 e 15", e a resposta do mentor moveu os
   números para Pmus e os transformou em quatro faixas.
