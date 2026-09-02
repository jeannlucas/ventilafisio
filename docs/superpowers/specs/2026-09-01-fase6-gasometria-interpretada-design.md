# Fase 6 — Gasometria interpretada

**Data:** 01/09/2026
**Modo do projeto:** MANUTENÇÃO
**Estado de partida:** 364 testes em 23 arquivos, `pnpm build` limpo
**Pesquisa clínica:** `docs/dossie-clinico-fase6.md`
**Arquitetura que este spec obedece:** `docs/superpowers/specs/2026-09-01-arquitetura-blocos-clinicos-design.md`

## 1. O que o cliente pediu

> "gasometria interpretada, distinguindo acidose metabólica de respiratória,
> com sugestões de ajuste, incluindo bicarbonato"

Hoje o aplicativo guarda `ph`, `pao2`, `paco2` e `spo2`, e não interpreta nada:
os números aparecem no histórico e nos gráficos, e a leitura é inteiramente do
profissional. Esta fase acrescenta a interpretação.

## 2. Procedência de cada número

Todo número desta fase tem origem declarada. Três categorias, e a distinção é
de tipo, não de comentário: `Publicacao` tem `verificada`; `Parecer` tem
`profissional` e `data`.

| O quê | Valor | Procedência |
|---|---|---|
| Distúrbio primário, faixas de normalidade | pH 7,35-7,45; PaCO₂ 35-45; HCO₃⁻ 22-26 | `berend_2014` |
| Acidose metabólica: compensação esperada | PaCO₂ = 1,5 × HCO₃⁻ + 8 ± 2 | `albert_1967` |
| Alcalose metabólica: compensação esperada | **não há número** | decisão do mentor |
| Acidose respiratória crônica | HCO₃⁻ **+5,0** por 10 mmHg de PaCO₂ | `parecer_compensacao_cronica` |
| Acidose respiratória aguda | HCO₃⁻ +1 por 10 mmHg | `berend_2014` |
| Alcalose respiratória aguda / crônica | HCO₃⁻ −2 / −4 a −5 por 10 mmHg | `berend_2014` |
| pH por 10 mmHg | 0,08 agudo / 0,03 crônico, **auxiliar** | `parecer_ph_por_10` |
| Hipercapnia crônica | PaCO₂ alta E (pH ≥ 7,35 **OU** HCO₃⁻ > 28) | `odriscoll_2017` + `parecer_cronicidade_ou` |
| Ânion gap | Na⁺ − (Cl⁻ + HCO₃⁻) | `berend_2014` |
| Correção pela albumina | +2,5 mmol/L por g/dL abaixo de 4,0 | `figge_1998` |
| Bicarbonato: gatilho | pH < 7,20 | `parecer_bicarbonato_gatilho` |
| SpO₂ no DPOC | 88 a 92% | `odriscoll_2017` (grau A) + `austin_2010` |

### 2.1 Fontes novas no catálogo

Todas com DOI e PMID conferidos; ver o dossiê para o que foi lido no PDF e o
que veio de abstract.

- `berend_2014` — Berend K, de Vries APJ, Gans ROB. *Physiological approach to
  assessment of acid-base disturbances.* N Engl J Med 2014;371(15):1434-1445.
  `verificada: true`
- `albert_1967` — Albert MS, Dell RB, Winters RW. *Quantitative displacement of
  acid-base equilibrium in metabolic acidosis.* Ann Intern Med
  1967;66(2):312-322. `verificada: true`
- `martinu_2003` — Martinu T, Menzies D, Dial S. *Re-evaluation of acid-base
  prediction rules in patients with chronic respiratory acidosis.* Can Respir J
  2003;10(6):311-315. `verificada: true`
- `figge_1998` — Figge J, Jabor A, Kazda A, Fencl V. *Anion gap and
  hypoalbuminemia.* Crit Care Med 1998;26(11):1807-1810. `verificada: true`
- `odriscoll_2017` — O'Driscoll BR, Howard LS, Earis J, Mak V. *British Thoracic
  Society guideline for oxygen use in adults in healthcare and emergency
  settings.* BMJ Open Respir Res 2017;4(1):e000170. `verificada: true`
- `austin_2010` — Austin MA, Wills KE, Blizzard L, Walters EH, Wood-Baker R.
  *Effect of high flow oxygen on mortality in chronic obstructive pulmonary
  disease patients in prehospital setting: randomised controlled trial.* BMJ
  2010;341:c5462. `verificada: true`

### 2.2 Chaves novas de `SourceKey`

`SourceKey` é união fechada, `THRESHOLD_SOURCES` é `Record<SourceKey, string[]>`
e `LABELS` em `src/pages/Sources.tsx` também. **Chave nova sem rótulo quebra o
`tsc`**, e o teste de referência órfã obriga cada entrada do catálogo a ser
citada por pelo menos uma chave. As três entram no mesmo commit que as fontes:

| Chave | Cobre | Fontes |
|---|---|---|
| `acidoBase` | faixas de normalidade, distúrbio primário, compensação, aguda × crônica | `berend_2014`, `albert_1967`, `martinu_2003`, `parecer_compensacao_cronica`, `parecer_ph_por_10` |
| `anionGap` | fórmula sem potássio e correção pela albumina | `berend_2014`, `figge_1998` |
| `dpocOxigenio` | SpO₂ 88-92%, critério de hipercapnia crônica | `odriscoll_2017`, `austin_2010`, `parecer_cronicidade_ou` |

`parecer_bicarbonato_gatilho` entra em `acidoBase`, junto do distúrbio que
dispara a conduta.

Quatro pareceres, todos `profissional: "Mentor clínico do projeto"`,
`data: "01/09/2026"`:

- `parecer_compensacao_cronica` — o 5,0. **Nenhuma fonte diz 5,0**: o NEJM dá a
  faixa 4 a 5, Martinu mediu 5,1 em DPOC estável. Não atribuir a nenhum dos
  dois.
- `parecer_ph_por_10` — os coeficientes 0,08 e 0,03 circulam como convenção de
  livro-texto. A Tabela 1 do NEJM 2014 não traz pH nenhum e a pesquisa não achou
  estudo primário. Por isso são leitura auxiliar, não critério de decisão.
- `parecer_cronicidade_ou` — a BTS escreve "e/ou"; o mentor resolveu para OU,
  apresentados dois casos concretos.
- `parecer_bicarbonato_gatilho` — o pH de 7,20.

O ACCP, citado pelo mentor ao confirmar a fórmula do ânion gap, **não entra no
catálogo**: não foi verificado, e a fórmula já é sustentada pelo NEJM 2014, que
foi lido. A menção fica registrada no dossiê como o caminho da confirmação
dele.

## 3. Captura de dados

### 3.1 Sem DDL

`daily_evolutions.hco3` e `daily_evolutions.be` **já existem** no banco desde a
auditoria de 26/07/2026, listadas como colunas sem uso. Voltam aos tipos
TypeScript e ao formulário de evolução. Saem da lista de colunas sem uso no
`schema.sql`, como `intubation_date` e `comorbidities` saíram na Fase 1.

### 3.2 Com DDL: três colunas novas

O ânion gap corrigido exige sódio, cloro e albumina, que não existem:

```sql
alter table public.daily_evolutions add column if not exists na numeric;
alter table public.daily_evolutions add column if not exists cl numeric;
alter table public.daily_evolutions add column if not exists albumina numeric;
```

Aditivo e idempotente. Nenhum `drop`, nenhum `truncate`. Quem aplica é o Jeann;
nenhum teste executa este SQL, e o diff é a única revisão que ele recebe.

**As três são opcionais.** Sem elas o aplicativo não mostra ânion gap nenhum —
não mostra zero, não mostra "normal", não mostra nada. Ausência de dado não é
resultado.

**Observação de produto, não resolvida:** não se sabe se o fisioterapeuta na
beira do leito tem sódio, cloro e albumina à mão. Se na prática os três campos
ficarem sempre vazios, o ânion gap é código morto e são três campos a mais num
formulário já grande. Fica registrado; a decisão de remover, se for o caso, é
do Jeann, e o custo de manter é baixo porque são campos opcionais.

## 4. O módulo `src/lib/gasometria.ts`

Puro: sem React, sem Supabase, testável isolado, como todo `lib/` deste
projeto.

```ts
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

export type Temporalidade = "aguda" | "cronica" | "indeterminada";

/** Compensação PREVISTA. Só existe onde há fórmula validada. */
export interface Compensacao {
  esperada: number;   // PaCO₂ esperada, mmHg
  medida: number;     // PaCO₂ medida
  margem: number;     // ± aceito
  adequada: boolean;
}

export interface AnionGap {
  bruto: number;
  /** null quando não há albumina: a correção não é adivinhada. */
  corrigido: number | null;
  albuminaUsada: number | null;
}

export interface Interpretacao {
  /** null = dado insuficiente para interpretar. Não é "sem distúrbio". */
  disturbio: DisturbioPrimario | null;
  /** Só para distúrbio respiratório; null nos demais. */
  temporalidade: Temporalidade | null;
  /** Só na acidose metabólica. Ver §5.3. */
  compensacao: Compensacao | null;
  /**
   * Não é opcional: `interpretar` só devolve resultado com pH, PaCO₂ e HCO₃⁻
   * presentes, e com os três o critério da BTS é sempre decidível.
   */
  hipercapniaCronica: boolean;
  anionGap: AnionGap | null;
  condutas: Conduta[];
  sourceKeys: SourceKey[];
}

export function interpretar(e: EntradaGasometria): Interpretacao | null;
```

`interpretar` devolve `null` quando faltam pH, PaCO₂ ou HCO₃⁻ — sem os três não
há interpretação, e uma interpretação parcial inventada é pior que tela vazia.

### 4.1 `Conduta`, criada nesta fase

O tipo foi desenhado no spec de arquitetura e ainda não existe no código. Entra
em `src/lib/condutas.ts`:

```ts
export interface Conduta {
  texto: string;
  alcada: "fisio" | "medica";
  sourceKey: SourceKey;
}
```

**O tipo não tem campo de dose.** Não existe onde escrever um número de mEq.
Quem quiser prescrever no futuro terá de alterar o tipo, e aí é decisão
consciente e não deslize de implementação.

Conduta de alçada médica aparece na tela visualmente distinta e sempre
acompanhada da frase de que quem decide é a equipe médica.

## 5. As regras

### 5.1 Faixas de normalidade

pH 7,35 a 7,45; PaCO₂ 35 a 45 mmHg; HCO₃⁻ 22 a 26 mmol/L (`berend_2014`).

### 5.2 Distúrbio primário

```
pH < 7,35  e  PaCO₂ > 45   ->  acidose_respiratoria
pH < 7,35  e  HCO₃⁻ < 22   ->  acidose_metabolica
pH > 7,45  e  PaCO₂ < 35   ->  alcalose_respiratoria
pH > 7,45  e  HCO₃⁻ > 26   ->  alcalose_metabolica
```

Quando o pH está fora da faixa e **os dois** parâmetros empurram na mesma
direção — pH < 7,35 com PaCO₂ > 45 **e** HCO₃⁻ < 22, ou pH > 7,45 com
PaCO₂ < 35 **e** HCO₃⁻ > 26 — nenhum dos dois está compensando o outro: os dois
são causa. O resultado é `acidose_mista` ou `alcalose_mista`.

**Não se elege um "primário" nesse caso.** Escolher o de maior desvio exigiria
comparar mmHg com mmol/L, que são grandezas diferentes, e qualquer regra de
desempate seria invenção deste documento. Dizer que há os dois componentes é o
que a gasometria de fato sustenta.

Em distúrbio misto não há `temporalidade` (`null`) e não há `compensacao`
(`null`): não existe compensação a avaliar quando os dois sistemas estão
alterados na mesma direção.

**`sem_disturbio` só quando os três estão dentro da faixa.** Esta regra é o
coração da fase, e o motivo está em §7.2.

Com pH normal e PaCO₂ ou HCO₃⁻ fora da faixa, o distúrbio é o do parâmetro
alterado, com `temporalidade` avaliada — é o retentor crônico compensado.

### 5.3 Compensação

**Acidose metabólica:** fórmula de Winters, `PaCO₂ esperada = 1,5 × HCO₃⁻ + 8`,
margem ± 2 (`albert_1967`). Devolve `Compensacao`.

**Alcalose metabólica: não existe cálculo.** `compensacao` é `null`, e a tela
diz que se espera hipoventilação mas que a previsão quantitativa neste
distúrbio é pouco confiável. Decisão do mentor, tomada depois de saber que o
estudo primário da fórmula de 0,7 é em cães e que o NEJM registra a dificuldade
em nota de rodapé.

**Isto é uma decisão de NÃO exibir número**, e é a mais fácil de alguém desfazer
numa fase futura, achando que ficou faltando implementar. Ver §8.2.

**Distúrbios respiratórios:** a compensação decide aguda × crônica, não é
exibida como `Compensacao`.

### 5.4 Aguda × crônica no distúrbio respiratório

Quem decide é o **bicarbonato**. Por 10 mmHg de desvio da PaCO₂ em relação a 40:

| Distúrbio | ΔHCO₃⁻ esperado por 10 mmHg |
|---|---|
| Acidose respiratória aguda | +1 |
| Acidose respiratória crônica | **+5,0** |
| Alcalose respiratória aguda | −2 |
| Alcalose respiratória crônica | −4 a −5 |

O HCO₃⁻ medido é comparado aos dois valores esperados; vence o mais próximo.
Empate ou distância grande dos dois devolve `"indeterminada"`.

O pH por 10 mmHg (0,08 agudo, 0,03 crônico) é **leitura auxiliar**: aparece na
tela como informação, marcado como convenção, e não participa da decisão.

**A tela diz "compatível com", nunca "é".** A distinção aguda × crônica é
temporal e depende da história do paciente, que o aplicativo não tem.

### 5.5 Hipercapnia crônica (critério da BTS)

```
hipercapniaCronica = PaCO₂ > 45  E  (pH >= 7,35  OU  HCO₃⁻ > 28)
```

O E externo continua sendo E: sem PaCO₂ elevada não há hipercapnia de que
falar. O OU é só entre os dois marcadores de adaptação, e é resposta explícita
do mentor a dois casos concretos.

OU é o critério mais **sensível**: marca como crônico mais gente do que o E
marcaria. É mais uma razão para a tela dizer "compatível com".

Sempre decidível: `interpretar` já exigiu os três parâmetros para devolver
qualquer coisa. Por isso o campo é `boolean` e não `boolean | null` — um `null`
que não pode acontecer vira ramo morto que ninguém consegue testar.

### 5.6 Ânion gap

`AG = Na⁺ − (Cl⁻ + HCO₃⁻)`, sem potássio (`berend_2014`, confirmado pelo
mentor).

Correção pela albumina (`figge_1998`, medida em 152 pacientes de UTI):

```
AG corrigido = AG + 2,5 × (4,0 − albumina em g/dL)
```

`4,0 g/dL` é a albumina de referência, fixa no código e visível na tela.

**Os dois valores aparecem**, o bruto e o corrigido, com a albumina usada:
`"ânion gap 14; corrigido para albumina 2,0 g/dL: 19"`. Em UTI a albumina baixa
derruba o gap calculado, e sem correção o aplicativo deixaria de enxergar
acidose exatamente na população que ele atende.

**O aplicativo não afirma faixa de normalidade.** A faixa depende do analisador
do laboratório e as fontes divergem de 3-12 a 8,5-15. A tela mostra os valores e
avisa para conferir a faixa do próprio laboratório.

### 5.7 Condutas

| Gatilho | Texto | Alçada | Fonte |
|---|---|---|---|
| pH < 7,20 | Considerar bicarbonato de sódio; dose e indicação são da equipe médica | `medica` | `acidoBase` |
| Acidose respiratória aguda | Reavaliar volume-minuto: frequência e volume corrente | `fisio` | `acidoBase` |
| Alcalose respiratória | Verificar hiperventilação induzida pelo ventilador antes de atribuir ao paciente | `fisio` | `acidoBase` |
| Hipercapnia crônica | Alvo de SpO₂ 88 a 92%; saturação acima da faixa não é melhor | `fisio` | `dpocOxigenio` |

A conduta de bicarbonato **nunca** carrega número de dose, e o tipo não tem onde
guardar um.

## 6. Tela

Painel novo, `src/components/patient/GasometriaPanel.tsx`, na aba **Evolução**,
logo abaixo do `Dashboard` dos quatro indicadores e antes do `MotorPanel`.
Conteúdo de ventilação antes de hemodinâmica, que foi pedido do cliente.

Lê a última evolução. Sem evolução, ou sem os três parâmetros mínimos, mostra a
mesma dica que os outros painéis usam, não um painel vazio.

`SourceFooter` com as `sourceKeys` que a própria interpretação devolveu — não
uma lista fixa escrita à mão. Este projeto embarcou três vezes um painel cujo
rodapé não cobria o que ele exibia; derivar as chaves do resultado é o que
impede a quarta.

Campos novos no `EvolutionForm`, na seção de gasometria que já existe: HCO₃⁻,
BE, Na⁺, Cl⁻ e albumina.

## 7. As armadilhas desta fase

### 7.1 O BE é rotineiramente negativo e zero é normal

`if (!be)` mata o −2 e o 0 na mesma linha. É a armadilha nº 5 do projeto num
campo onde zero fica no **meio** da escala, não na ponta — pior que nos escores.

Guarda: o `num()` que já existe em `clinical.ts`, nunca teste de veracidade.
Todo teste de gasometria cobre BE negativo e BE zero.

### 7.2 O retentor crônico compensado tem pH normal

O NEJM registra que na acidose respiratória crônica o pH pode estar normal ou
acima de 7,40. Um painel que olhasse só o pH classificaria esse paciente como
"sem distúrbio" — que é o mesmo formato do defeito da FiO₂ zero produzindo P/F
infinita classificada como "Normal" em verde.

É por isso que `sem_disturbio` exige os **três** parâmetros dentro da faixa, e
por isso quem decide aguda × crônica é o bicarbonato.

## 8. Testes obrigatórios

Além da cobertura normal:

### 8.1 O retentor crônico não some

Gasometria de retentor crônico compensado (pH 7,38, PaCO₂ 60, HCO₃⁻ 34) **não**
pode devolver `sem_disturbio`. Deve devolver `acidose_respiratoria` com
`temporalidade: "cronica"` e `hipercapniaCronica: true`.

### 8.2 A alcalose metabólica não ganha número

Teste que falha se `compensacao` deixar de ser `null` na alcalose metabólica, e
teste de tela que falha se um número de PaCO₂ esperada aparecer nesse caso. A
decisão do mentor foi não exibir; sem teste, a próxima fase "conserta" a
ausência.

### 8.3 O zero e o negativo

BE −2, BE 0, BE +3 produzem resultados distintos e nenhum deles é tratado como
dado faltando.

### 8.4 O ânion gap sem albumina

Sem albumina, `corrigido` é `null` e a tela não mostra valor corrigido — não
mostra o bruto rotulado como corrigido, e não usa 4,0 como se fosse medido.

### 8.5 O rodapé cobre o que a tela diz

As `sourceKeys` devolvidas pela interpretação cobrem cada afirmação exibida.
Teste que distingue a chave certa da errada: asserção que passaria com qualquer
lista de fontes não é teste.

## 9. Fora de escopo

- **Distúrbios mistos completos** (delta-gap, delta-ratio). O aplicativo
  sinaliza componente misto quando o encontra; não quantifica.
- **VNI.** A recomendação forte da ERS/ATS sobre iniciar VNI com pH ≤ 7,35 é
  real, mas este aplicativo trata paciente já em ventilação invasiva. Fica
  registrado no dossiê.
- **Alvos ventilatórios invasivos em DPOC** (volume corrente, PEEP, tempo
  expiratório, auto-PEEP). É Fase 8, e precisa de pesquisa própria.
- **DPOC com alcalose metabólica associada.** Escopo novo, sem fonte
  confirmada.
- **`pao2` e P/F.** Já existem e não mudam nesta fase.

## 10. O que fica em aberto

1. **Sódio, cloro e albumina são preenchidos na prática?** Se não forem, o
   ânion gap é código morto. Decisão do Jeann, com uso real na mão.
2. **A faixa normal do ânion gap** continua não afirmada, de propósito.
3. **A divergência Martinu × NEJM** na compensação crônica está registrada no
   dossiê e não foi reconciliada. O 5,0 do mentor fica entre as duas.
