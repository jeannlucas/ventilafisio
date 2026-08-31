# Fase 1 — Embasamento, contexto do paciente, escores e bundle de cuidados

Data: 31/08/2026
Projeto: Ventila Fisio (POC)
Origem: lista de melhorias enviada pelo cliente, analisada em 31/08/2026.

## 1. Por que esta fase existe

O cliente enviou doze pedidos. Eles não cabem em um spec só, e foram
decompostos em oito blocos independentes. Esta é a **Fase 1**, escolhida pelo
Jeann: os blocos de menor risco clínico, que entregam mudança visível na tela
sem depender de validação de fórmula nova pelo mentor.

A queixa central do cliente foi: *"preciso que em cada rodapé tenha de fato o
embasamento do estudo... para que haja um embasamento e não somente achismos do
aplicativo"*. Hoje o app afirma `DP < 13`, `MP < 17`, `Tobin < 105`,
`PImax <= -30`, `PCF >= 60` e a tabela PEEP/FiO2 sem uma única citação no
código. Esta fase resolve isso.

## 2. Escopo

### Entra

1. Catálogo de fontes, rodapé de embasamento nos painéis e página `/fontes`.
2. Contexto do paciente: comorbidades, tempo de ventilação, via aérea TOT/TQT.
3. Escores MRC, RASS e IMS.
4. Bundle de cuidados com hora e autor por ação.
5. Extração do que a fase toca em `PatientDetail.tsx`.

### Não entra, e é proposital

- Fórmulas novas: P0.1, Pmus, DeltaPocc, julgamento de recrutabilidade.
- Interpretação de gasometria (acidose metabólica vs respiratória).
- TRE passo a passo.
- Alvos ventilatórios por patologia.
- Qualquer alteração de limiar clínico existente.

Esta fase **documenta** o que o app já afirma. Ela não afirma nada novo. É essa
restrição que permite entregá-la sem esperar o mentor.

## 3. Decisões já tomadas

| Decisão | Escolha | Quem decidiu |
|---|---|---|
| Fatiamento | Fase 1 = referências + contexto + escores + bundle | Jeann, 31/08/2026 |
| Corpo de fontes | Diretriz nacional como espinha dorsal + artigo primário onde ela não cobre | Jeann, 31/08/2026 |
| Forma da citação | Rodapé no painel + página `/fontes` | Jeann, 31/08/2026 |
| Bundle | Tabela própria `care_actions`, com hora e autor | Jeann, 31/08/2026 |
| MRC | Por grupo muscular (12), soma calculada pelo app | Jeann, 31/08/2026 |
| Glasgow | Permanece campo único; limiar de extubação intocado | Jeann, 31/08/2026 |

## 4. Bloco 1 — Embasamento

### 4.1 Onde o catálogo vive

`src/data/references.ts`, estático e versionado no git, seguindo o padrão de
`src/data/clinical-board.ts` e `src/data/asynchronies.ts`.

Descartada a alternativa de tabela no Supabase: conteúdo clínico versionado
fora do git é conteúdo sem histórico de revisão, o mentor não tem tela de
admin, e custaria RLS nova em SQL que nenhum teste cobre (armadilha 6).

### 4.2 A convenção `verificada`

O projeto já tem `ventilators.verified` para marcar conteúdo clínico não
validado. A mesma convenção se aplica aqui: cada referência nasce
`verificada: false` e só vira `true` depois da revisão do mentor. A página
`/fontes` exibe o estado, para que o que ainda não foi assinado apareça como
pendente em vez de fingir autoridade.

### 4.3 Referências conferidas em 31/08/2026

Todas foram verificadas contra a fonte primária antes de entrar aqui.

| Chave | Referência | Estado |
|---|---|---|
| `ardsnet_2000` | ARDS Network. Ventilation with lower tidal volumes... N Engl J Med 2000;342:1301-1308 | confere |
| `amato_2015` | Amato MBP, Meade MO, Slutsky AS, et al. Driving pressure and survival in the acute respiratory distress syndrome. N Engl J Med 2015;372:747-755 | confere, com ressalva (4.4) |
| `gattinoni_2016` | Gattinoni L, Tonetti T, Cressoni M, et al. Ventilator-related causes of lung injury: the mechanical power. Intensive Care Med 2016;42:1567-1575 | confere, só para a fórmula |
| `serpaneto_2018` | Serpa Neto A, Deliberato RO, Johnson AEW, et al. Mechanical power of ventilation is associated with mortality in critically ill patients. Intensive Care Med 2018;44:1914-1922 | confere, é a origem do corte de 17 J/min |
| `yangtobin_1991` | Yang KL, Tobin MJ. A prospective study of indexes predicting the outcome of trials of weaning from mechanical ventilation. N Engl J Med 1991;324:1445-1450 | confere |
| `boles_2007` | Boles JM, Bion J, Connors A, et al. Weaning from mechanical ventilation. Eur Respir J 2007;29:1033-1056 | confere |
| `amib_sbpt_2024` | AMIB/SBPT. Orientações Práticas em Ventilação Mecânica, 2024 | confere, substitui a de 2013 |
| `dejonghe_2002` | De Jonghe B, Sharshar T, Lefaucheur JP, et al. Paresis acquired in the intensive care unit. JAMA 2002;288:2859-2867 | confere |
| `sessler_2002` | Sessler CN, Gosnell MS, Grap MJ, et al. The Richmond Agitation-Sedation Scale. Am J Respir Crit Care Med 2002;166:1338-1344 | confere |
| `hodgson_2014` | Hodgson C, Needham D, Haines K, et al. Feasibility and inter-rater reliability of the ICU Mobility Scale. Heart Lung 2014;43:19-24 | confere |

### 4.4 Três correções que a verificação produziu

Registradas porque mudam o que seria escrito, e porque a lição vale para as
próximas fases.

**1. Amato 2015 não estabelece o corte de 13.** O artigo confere e é a
referência certa para o conceito de driving pressure, mas o que ele demonstra é
que a DeltaP foi a variável mais associada à sobrevida (RR 1,41 por incremento
de aproximadamente 7 cmH2O). Ele não define 13 como limiar. O `classify.dp` do
app afirma hoje `< 13 ideal`, `<= 15 atenção`, `> 15 alto risco`.

Consequência: **o limiar de 13 fica pendente de fonte**. Nesta fase o rodapé
cita Amato 2015 para o conceito e a faixa entra na lista de pendências do
mentor (seção 10). O número **não é alterado** — alterar limiar clínico exige
fonte e decisão do Jeann.

**2. Mechanical Power precisa de duas fontes.** Gattinoni 2016 dá a fórmula. O
corte de 17 J/min vem de Serpa Neto 2018 (8207 pacientes, MIMIC-III e eICU).
Citar Gattinoni para o 17 seria citação incorreta, e era o que estava
planejado antes da verificação.

**3. As Diretrizes Brasileiras de 2013 estão superadas.** Existe a edição
Orientações Práticas em Ventilação Mecânica 2024 (AMIB/SBPT), com 38 temas e 75
especialistas. A espinha dorsal nacional passa a ser a de 2024. Mesma lição que
o `CLAUDE.md` já registra para o React Router: o estado de uma fonte é do dia em
que foi escrito, não propriedade dela.

### 4.5 Como limiar e citação não divergem

`src/lib/references.ts` exporta `sourcesFor(chave)`. Um teste percorre todas as
chaves de `classify` e das funções de sugestão de `clinical.ts` e exige que cada
uma tenha ao menos uma fonte registrada. Mudou o limiar sem mexer na fonte, a
suíte reprova.

Essa é a única garantia que sobrevive a quem escreveu o código.

### 4.6 UI

`src/components/SourceFooter.tsx`: linha discreta no pé do painel, com a fonte
curta e link para `/fontes`. Painéis que recebem rodapé nesta fase:
`Dashboard` (leitura do caso), `AdmissionCard`, `ExtubationCard`, e os painéis
de escores criados aqui.

`src/pages/Sources.tsx` em `/fontes`, com a tabela limiar -> referência e o
estado de verificação. Entra como aba global em `App.tsx`.

## 5. Bloco 2 — Contexto do paciente

O cliente pediu saber se o paciente já é DPOC, se está em VM por comorbidade
pulmonar, há quanto tempo, e se está em TOT ou TQT.

**Duas das três colunas já existem no banco** e nunca foram preenchidas
(`schema.sql`, seção de colunas sem uso, auditoria de 26/07/2026):

- `patients.comorbidities` (`text[]`)
- `patients.intubation_date` (`date`)

Ambas voltam para `src/types/index.ts` e ganham campo em `AdmitPatient.tsx` e
no `PatientHeader`.

Coluna nova: `patients.airway text check (airway in ('tot','tqt'))`.

**Tempo de VM é derivado, não armazenado.** `diasEmVentilacao(intubation_date)`
em `src/lib/clinical.ts`. Dado derivado guardado duas vezes diverge.

No cabeçalho, à beira do leito: `DPOC · TOT · 8º dia de VM`.

`comorbidities` é `text[]` de **chaves do catálogo**, pela mesma razão que
`care_actions.action`. A coluna já existe no banco e já é `text[]`: não há
migração de tipo, só passa a ser escrita.

Catálogo de comorbidades em `src/data/comorbidities.ts`, com marcação de quais
são pulmonares (DPOC, asma, fibrose, bronquiectasia) — a marcação existe para
a Fase 2 usar, mas **nesta fase não modula nenhum alvo**.

## 6. Bloco 3 — Escores

### 6.1 Armazenamento

Em `daily_evolutions`:

- `rass int` — escalar, entra nos gráficos junto dos demais
- `ims int` — idem
- `mrc jsonb` — os 12 grupos, na forma abaixo

```json
{
  "ombro_abducao":      { "d": 4, "e": 4 },
  "cotovelo":           { "d": 4, "e": 3 },
  "punho_extensao":     { "d": 3, "e": 3 },
  "quadril_flexao":     { "d": 3, "e": 3 },
  "joelho_extensao":    { "d": 4, "e": 4 },
  "tornozelo_dorsi":    { "d": 3, "e": 2 }
}
```

Seis chaves, cada uma com os lados `d` e `e`, valores inteiros de 0 a 5. A
chave `cotovelo` é neutra de propósito: o rótulo (flexão ou extensão) sai do
catálogo em `src/data/scores.ts` e depende da pendência 2 da seção 10, então
resolver essa dúvida não exige migração de dado.

O total do MRC **não é coluna**. `src/lib/scores.ts` calcula. Dado derivado não
se guarda duas vezes.

### 6.2 `src/lib/scores.ts`

Funções puras, sem React e sem Supabase, como manda a arquitetura do projeto:

- `mrcTotal(mrc)` — soma os 12 grupos; devolve `null` se algum faltar, porque
  soma parcial apresentada como total é dado falso (armadilha 5)
- `classifyMrc(total)` — `< 48` sinaliza fraqueza adquirida na UTI
  (`dejonghe_2002`)
- `mrcAsymmetry(mrc)` — diferença entre lados
- `RASS_LEVELS` e `IMS_LEVELS` — rótulos das escalas, item único

### 6.3 Ausência de dado

Regra do projeto (armadilha 5): ausência de dado não é resultado normal. MRC
incompleto não vira total; RASS ausente não vira zero (zero é "alerta e
calmo", um valor clínico legítimo); IMS ausente não vira zero (zero é "nada,
deitado na cama").

### 6.4 Glasgow

Permanece como está. O limiar `Glasgow >= 8` de `extubationReadiness` não é
tocado.

Observação registrada para o mentor: paciente intubado não tem resposta verbal
avaliável, e é por isso que RASS é a escala usada em VM. Se o RASS deve
substituir ou acompanhar o Glasgow naquele critério é decisão clínica, não de
implementação.

## 7. Bloco 4 — Bundle de cuidados

Tabela nova `public.care_actions`:

```
id          uuid primary key default gen_random_uuid()
patient_id  uuid not null references public.patients (id) on delete cascade
owner_id    uuid not null references auth.users (id) on delete cascade
action      text not null  -- chave do catalogo, nao texto livre
at          timestamptz not null default now()
note        text
created_at  timestamptz not null default now()
```

RLS espelhando exatamente a de `daily_evolutions`: acesso por membership de
hospital ou por `patient_access`.

`action` guarda a **chave** do catálogo, nunca texto livre: rótulo em texto
livre no banco impede contagem por ação e quebra a tradução da tela. Observação
do plantão vai em `note`. A validação é da aplicação, não um `check` no banco —
`check` engessado obriga migração a cada item novo do bundle.

Catálogo em `src/data/care-bundle.ts`: aspiração de TOT, aspiração de vias
aéreas superiores, cuffometria, higiene oral, cabeceira elevada, mudança de
decúbito. Conteúdo marcado como a validar, no mesmo espírito de
`clinical-board.ts`.

Aba própria **"Cuidados"** em `PatientDetail`. Registrar uma aspiração tem que
ser um toque, não abrir o formulário de evolução. A aba mostra o que foi feito
no turno, com hora e autor.

Abas passam a ser: Admissão, Evolução, Cuidados, Gráficos, Desmame.

## 8. Bloco 5 — Onde o código mora

`PatientDetail.tsx` tem 997 linhas e o `CLAUDE.md` já registra que vale extrair
antes de mexer muito. Esta fase soma três painéis e uma aba.

Extração **só do que a fase toca**, para `src/components/patient/`:

- `PatientHeader.tsx` (recebe o contexto novo)
- `Dashboard.tsx` (recebe o rodapé de fontes)
- `ContextPanel.tsx`, `ScoresPanel.tsx`, `CareBundlePanel.tsx` (novos)

O resto de `PatientDetail.tsx` fica como está. Boy Scout, não reconstrução:
regra 2 do CLAUDE.md global.

## 9. Testes

TDD: teste que falha antes, passa depois. Baseline atual, 171 testes em 9
arquivos, tem de continuar verde.

| Arquivo | O que cobre |
|---|---|
| `src/lib/references.test.ts` | toda chave de `classify` e das sugestões tem fonte; nenhuma fonte órfã; `verificada` é booleano |
| `src/lib/scores.test.ts` | soma do MRC; `null` com grupo faltando; corte 48; assimetria; RASS/IMS ausentes não viram zero |
| `src/lib/clinical.test.ts` | `diasEmVentilacao`, incluindo `intubation_date` nula e data futura |
| `src/components/patient/ScoresPanel.test.tsx` | renderiza os 12 grupos; total só com tudo preenchido |
| `src/components/patient/CareBundlePanel.test.tsx` | registra ação; lista com hora e autor |
| `src/pages/Sources.test.tsx` | lista as fontes; marca as não verificadas |

Lembrete do `CLAUDE.md`: `tsconfig.json` não inclui os tipos de Node. Nada de
`node:fs` nem `__dirname` em teste — passa no vitest e quebra o `pnpm build`.
Para ler arquivo, `?raw` do Vite, como em `src/favicon.test.ts`.

**O SQL não é verificado por teste nenhum** (armadilha 6). O DDL desta fase sai
daqui revisado, não verificado. Quem aplica no Supabase é o Jeann.

## 10. Pendências para o mentor

Nenhuma bloqueia a implementação. Todas entram na página `/fontes` como
`verificada: false` até serem resolvidas.

1. **Faixa da driving pressure.** Amato 2015 não define o corte de 13. Qual a
   fonte de `< 13 / <= 15 / > 15`, ou a faixa deve mudar?
2. **Grupos musculares do MRC.** A literatura diverge entre flexão e extensão
   de cotovelo no somatório. Qual lista adotar?
3. **RASS e o critério de extubação.** RASS substitui, acompanha ou não toca o
   `Glasgow >= 8`?
4. **PImax <= -30 e PCF >= 60.** Ainda sem fonte atribuída; provavelmente
   cobertos por `amib_sbpt_2024` ou `boles_2007`, a confirmar no texto.
5. **Catálogo do bundle.** Quais ações entram, e a nomenclatura.
6. **Comorbidades.** Lista fechada a adotar.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Citação errada num app clínico é pior que citação nenhuma | Toda fonte verificada contra a primária; o não verificado aparece como pendente na tela |
| DDL aplicado à mão pode divergir do `schema.sql` | `schema.sql` é a fonte fiel e idempotente; o Jeann aplica e confere |
| Extração de `PatientDetail.tsx` pode regredir comportamento | `PatientDetail.test.tsx` roda antes e depois; extração é movimentação, não reescrita |
| O cliente tratar a POC como produto validado | Fora do alcance do código. Registrado para o Jeann tratar comercialmente |

## 12. O que esta fase deliberadamente não resolve

O cliente pediu que o app deixasse de ser "valores soltos" e passasse a fazer
"uma análise do caso do paciente em um todo". Isso é a Fase 2 em diante
(patologia -> alvo ventilatório, gasometria interpretada, mecânica nova, TRE
passo a passo). A Fase 1 monta a fundação: os dados de contexto que a análise
vai consumir, e o embasamento que ela vai precisar citar.

Vale dizer ao cliente com essas palavras, para que a entrega não seja lida como
resposta completa ao pedido dele.
