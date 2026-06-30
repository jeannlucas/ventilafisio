# Tema A: Quadro clínico expandido na evolução

Data: 2026-06-30
Projeto: Ventila Fisio
Status: aprovado para implementação

## Contexto

As anotações do sócio pedem um "quadro" mais completo na evolução do paciente:
evolução escrita do profissional, análise de exames de imagem (Raio-X, TC, RM),
análise geral do quadro, medicamentos venosos, e sonda/dieta. O ponto central é
que a parte medicamentosa e o quadro clínico afetam a ventilação e o modo
respiratório, então o app precisa correlacionar esses dados com o ajuste do
ventilador.

Este é o primeiro de seis temas extraídos das anotações. Os temas B (motor de
sugestão por patologia), C (índices avançados e sugestão integrada), D (estado
ventilatório na admissão), E (causa do desmame resolvida) e F (embasamento
científico) ficam para ciclos seguintes. O Tema A foi escolhido por ser de baixo
risco clínico (captura de dados, não conduta automática) e por criar a base de
dados que os temas B e C vão consumir.

## Princípio de segurança clínica

O app é apoio à decisão, não prescrição. Todo conteúdo gerado pelo app neste
tema (correlações com a ventilação) é lembrete editável e contextual, nunca
laudo nem conduta automática. Nenhuma fórmula ou limite clínico existente é
alterado por este tema.

## Princípios de usabilidade (decididos no brainstorming)

Três decisões guiam o desenho, na perspectiva do fisioterapeuta à beira do leito:

1. **Carry-forward**: ao abrir uma nova evolução, os campos do quadro clínico
   (drogas, sonda, dieta, achados de imagem) vêm pré-preenchidos com a última
   evolução do paciente. O profissional só ajusta o que mudou. Documentar um
   paciente deve levar menos de um minuto.
2. **Chips no lugar de texto**: achados de imagem e medicamentos são botões de
   um toque (ligar/desligar). Texto livre só para nuance. Além de mais rápido,
   o dado estruturado alimenta as correlações de forma confiável (caçar
   palavra-chave em texto livre é frágil).
3. **Painel único "Leitura do caso"**: uma caixa só que consolida os alertas dos
   4 indicadores numéricos com as correlações de drogas, imagem e perfil. Uma
   leitura integrada, não pedaços espalhados.

## Modelo de dados

Cada evolução diária (`daily_evolutions`) vira um retrato completo do dia. Novas
colunas (todas `jsonb`, `default '{}'`, nullable):

| Coluna | Conteúdo |
|---|---|
| `imaging` | achados de imagem: `{ xray: string[], ct: string[], mri: string[], note: string }` (arrays de chaves de achado + texto livre opcional) |
| `iv_meds` | medicamentos venosos por categoria: `{ sedation: {on, note}, analgesia: {on, note}, nmb: {on, note}, vasopressor: {on, note}, bronchodilator: {on, note}, other: string }` |
| `feeding` | `{ tube: 'none'\|'sng'\|'sne'\|'gtt', diet: 'fasting'\|'enteral'\|'oral'\|'parenteral' }` |

A coluna existente `notes` (hoje presente no schema mas sem uso no formulário) é
reaproveitada como campo "Evolução clínica / impressão geral" (texto livre).

A coluna existente `vasopressor boolean` é mantida (a lógica de extubação em
`extubationReadiness` depende dela). No salvamento, ela é sincronizada a partir
de `iv_meds.vasopressor.on`. O campo "Vasopressor sim/não" sai da seção
Hemodinâmica do formulário e passa a ser o toggle de vasopressor na nova seção
de medicamentos.

### Migração

Arquivo `supabase/schema.sql` recebe, de forma idempotente:

```sql
alter table public.daily_evolutions add column if not exists imaging jsonb not null default '{}';
alter table public.daily_evolutions add column if not exists iv_meds jsonb not null default '{}';
alter table public.daily_evolutions add column if not exists feeding jsonb not null default '{}';
```

Nenhuma mudança de RLS (as colunas herdam as policies da tabela). Aplicar via
`apply_migration` no Supabase e refletir no `schema.sql`.

## Dados de referência (novo arquivo `src/data/clinical-board.ts`)

Catálogos estáticos, no mesmo padrão de `src/data/asynchronies.ts`:

- `IMAGING_FINDINGS`: lista de achados comuns por modalidade, cada um com
  `{ key, label, modality, ventHint? }`. Exemplos de chips:
  Raio-X/TC: infiltrado bilateral, consolidação, atelectasia, derrame pleural,
  pneumotórax, hiperinsuflação, normal. O `ventHint` opcional alimenta a
  correlação (ex.: "infiltrado bilateral" carrega o hint de padrão SDRA).
- `IV_MED_CATEGORIES`: as 5 categorias `{ key, label, ventHint }` com o efeito
  sobre a ventilação descrito em uma frase.
- `FEEDING_TUBES` e `DIET_TYPES`: pares `{ v, t }` para os selects.

O conteúdo clínico desses catálogos é marcado como "a validar" pela equipe, no
mesmo espírito do `verified=false` dos ventiladores.

## Motor de correlação (em `src/lib/clinical.ts`)

Função pura nova:

```ts
export interface Correlation { level: 'info' | 'warn'; text: string; source: string; }
export function ventilationCorrelations(ev: DailyEvolution): Correlation[];
```

Deriva lembretes a partir dos campos estruturados (sem caçar texto livre):

- `iv_meds.nmb.on` -> "Sob bloqueio neuromuscular: drive zerado, paciente não
  dispara. Modo controlado; reavaliar trigger ao suspender." (warn)
- `iv_meds.sedation.on` -> lembrete sobre nível de sedação x esforço/trigger. (info)
- `iv_meds.bronchodilator.on` ou achado de hiperinsuflação -> "Atenção a
  auto-PEEP; vigie o tempo expiratório." (warn)
- `iv_meds.vasopressor.on` -> "PEEP alta reduz o retorno venoso; titule
  observando a hemodinâmica." (info)
- `imaging` contém "infiltrado bilateral" -> "Compatível com padrão SDRA: manter
  VC protetor e vigiar a Driving Pressure." (info)
- `imaging` contém "pneumotórax" -> "Pneumotórax registrado: cuidado com pressões
  e PEEP; confirme drenagem." (warn)

A função é testável isoladamente (entrada: uma evolução; saída: lista de
correlações). A lista exata de regras é definida no plano de implementação e
validada pela equipe.

## UI

Arquivo principal afetado: `src/pages/PatientDetail.tsx`. Componente de UI:
`src/components/ui.tsx`.

### 1. Componente de UI novo

`Field` ganha suporte a `multiline` (renderiza `<textarea>` reaproveitando
`inputStyle`). Novo componente `ChipToggle` (ou `ChipGroup`): botões de um toque
para ligar/desligar achados e medicamentos, no estilo dos chips de
`param_labels` já presentes no `VentilatorGuide`.

### 2. Formulário de evolução (`EvolutionForm`)

Quatro novas `FormSection` abaixo das existentes:

- **Evolução clínica** (cor `T.accent`): textarea de impressão geral (campo `notes`).
- **Exames de imagem** (cor `T.purple`): chips de achados por modalidade
  (Raio-X, TC, RM) + textarea de nuance opcional.
- **Medicamentos venosos** (cor `T.warn`): 5 chips de categoria, cada um com
  campo de obs opcional; campo "outros" livre.
- **Sonda e dieta** (cor `T.ok`): selects de sonda e dieta.

O `vasopressor` sai da seção Hemodinâmica (passa a ser o chip na seção de
medicamentos). Carry-forward: ao montar o formulário, inicializa o estado a
partir da última evolução do paciente (`imaging`, `iv_meds`, `feeding`, e os
parâmetros que o profissional queira herdar). Botão sutil "Limpar / nova do
zero" para quando o quadro mudou muito.

### 3. Painel "Leitura do caso" (substitui o bloco de alertas atual)

No `Dashboard`, o bloco atual de `alerts` (linhas de aviso dos indicadores) é
fundido com `ventilationCorrelations(ev)` em um único painel "Leitura do caso",
mostrando, em ordem de severidade: alertas numéricos (danger/warn) seguidos das
correlações de drogas/imagem (warn/info). Cada item mantém o estilo de cor por
severidade já usado. Mantém o rodapé "Apoio à decisão, não conduta automática".

### 4. Histórico de evoluções (`EvolutionHistory`)

Cada item do histórico fica expansível: ao tocar, abre o quadro clínico daquele
dia (impressão geral, achados de imagem, drogas ativas, sonda/dieta). Apoio
direto à passagem de plantão. Itens sem quadro preenchido continuam compactos.

## Fora de escopo (próximos temas)

- Motor de sugestão por patologia (SDRA/DPOC/asma/pulmão normal): Tema B.
- Índices avançados (stress index, flow index, P0.1, Pmus) e sugestão integrada
  por associação de valores: Tema C.
- Estado ventilatório prévio na admissão: Tema D.
- Flag de causa do desmame resolvida: Tema E.
- Seção de embasamento científico (autores e trabalhos): Tema F.
- Interpretação de imagem por IA: fora do escopo da POC.
- Catálogo completo de fármacos com doses e interações: fora do escopo.

## Critérios de aceite

1. É possível registrar, em uma evolução, impressão geral, achados de imagem
   (por chips), medicamentos venosos (por categoria) e sonda/dieta.
2. Ao criar a evolução seguinte, esses campos vêm herdados da última evolução.
3. O painel "Leitura do caso" mostra, junto, os alertas numéricos e as
   correlações de drogas/imagem.
4. O histórico permite abrir o quadro clínico de cada dia.
5. A lógica de extubação continua funcionando (vasopressor sincronizado).
6. `pnpm build` passa sem erros de tipo. `ventilationCorrelations` tem testes
   unitários cobrindo cada regra.
7. `schema.sql` reflete as novas colunas e é idempotente.
