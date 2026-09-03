# Fase 8 — Alvo por patologia

**Data:** 02/09/2026
**Modo do projeto:** MANUTENÇÃO
**Estado de partida:** 527 testes em 28 arquivos, `pnpm build` limpo
**Pesquisa clínica:** `docs/dossie-clinico-fase8.md`
**Arquitetura que este spec obedece:** `docs/superpowers/specs/2026-09-01-arquitetura-blocos-clinicos-design.md`

## 1. O que o cliente pediu

> "acoplamento patologia ↔ modo ventilatório que não seja meramente
> informativo"

A Fase 3 construiu o `Alvo<T>` — todo alvo carrega o valor, a base que teria
sem modulação, e a razão e a fonte de cada modulação. A Fase 4 ligou a
obesidade ao volume corrente. **Esta fase decide quais patologias modulam quais
alvos**, que é a pergunta que o spec de arquitetura deixou deliberadamente
aberta:

> "`PatologiaKey` não é definida aqui, de propósito. A lista de patologias que
> modulam alvo é conteúdo clínico e pertence à Fase 8, junto do mentor."

## 2. A resposta curta: quatro modulam, doze não

| Patologia | Modula | Fonte |
|---|---|---|
| DPOC | PEEP, frequência, tempo expiratório | `demoule_2020`, `ranieri_1993` |
| Asma | PEEP, frequência, tempo expiratório | `demoule_2020` |
| Obesidade (pelo IMC, não pela caixinha) | volume corrente (já existe); aviso sobre recrutamento | `parecer_vc_obeso`, `probese_2019` |
| Lesão cerebral aguda | alvo de PaCO₂ | `robba_2020` |

**Fibrose pulmonar, bronquiectasia, SAHOS, tabagismo, insuficiência cardíaca,
hipertensão, diabetes, doença renal crônica e neoplasia não modulam nada**, e
os achados de imagem também não. Não há base publicada, o mentor confirmou
("não precisa mudar nada não"), e o aplicativo mantém o alvo base para esses
pacientes.

**Isso é entrega, não lacuna.** Uma lista comprida de modulações confiantes
seria pior que uma curta com fonte: modular número clínico sem fonte é o
defeito que o projeto inteiro existe para impedir.

## 3. O que este spec NÃO faz, e por quê

### 3.1 Não existe piso de PEEP para o obeso

O desenho apresentado em conversa propunha um piso de PEEP na obesidade. **O
dossiê o derruba, e com razão.**

O PROBESE é **intraoperatório, não de UTI**, e é um ensaio **negativo** no
desfecho primário. O dossiê o usa só na direção negativa: ele **não** autoriza
o aplicativo a propor PEEP alta com recrutamento de rotina no obeso. Sobre um
piso, ele não diz nada.

A faixa 7-20 vem de De Jong 2020, que **declara não propor algoritmo** e
adverte que sem pressão esofágica o ajuste fica no escuro. O dossiê registra
que um piso arredondado dali seria "inferência nossa" e "o número mais frágil
deste documento inteiro".

**Então a obesidade não ganha número de PEEP.** Ganha o que a evidência
sustenta: o aviso de que recrutamento de rotina com PEEP alta não está
autorizado, citando o ensaio que o testou e não achou benefício.

### 3.2 O DPOC não recebe um número único de teto

Ranieri 1993 diz **85%** do auto-PEEP; Demoule 2020 diz **80%**. Não são o
mesmo número.

**A tela exibe a faixa "80 a 85% do auto-PEEP" e cita as duas fontes**, em vez
de escolher um valor e esconder a divergência. Fundir os dois seria afirmar
precisão que a literatura não tem.

### 3.3 Nenhum alvo de PaCO₂ para "Doença neurológica"

O alvo vale para **lesão cerebral aguda**, e por isso ela ganha caixa própria
(§4.2). Aplicá-lo à caixinha genérica pegaria também o neuromuscular crônico,
onde empurraria na direção errada.

## 4. Captura de dados

### 4.1 Uma coluna nova: o auto-PEEP

```sql
alter table public.daily_evolutions add column if not exists auto_peep numeric;
```

Aditivo e idempotente. Nenhum `drop`, nenhum `truncate`. Quem aplica é o Jeann;
nenhum teste executa este SQL.

Sem auto-PEEP medido, **o aplicativo não calcula teto de PEEP para o DPOC** —
diz que a tabela ARDSnet não se aplica ali e de onde o número sairia. Ausência
de dado não é resultado.

Plausibilidade em `measurement-limits.ts`: `auto_peep: { min: 0 }`. **Zero é
valor válido**: significa ausência de auto-PEEP, que é achado real e favorável,
não campo vazio. Nunca `ACIMA_DE_ZERO`.

### 4.2 Uma comorbidade nova

`lesao_cerebral_aguda` entra em `src/data/comorbidities.ts`, com
`pulmonar: false`. É escolha explícita do mentor (02/09/2026) entre três
opções apresentadas.

Nenhum DDL: `patients.comorbidities` é `text[]` e já aceita a chave.

## 5. O vocabulário de patologia

`src/lib/perfil.ts` hoje declara `export type PatologiaKey = string`, com um
comentário dizendo que a lista é conteúdo da Fase 8. Ela vira união fechada com
**três** membros:

```ts
export type PatologiaKey = "dpoc" | "asma" | "lesao_cerebral_aguda";
```

`derivarPerfil` passa a filtrar `patient.comorbidities` para essas três, em vez
de copiar as treze cruas. Uma comorbidade que não modula não entra em
`patologias` — o campo passa a significar "o que muda um alvo", não "o que o
paciente tem".

**A obesidade não está na união, e isso é deliberado.** Ela já modula o volume
corrente pelo `perfil.obeso`, derivado do IMC e não da caixinha — um paciente
obeso sem a comorbidade marcada continua recebendo a faixa 6-8, o que é o
comportamento certo. Pôr `"obesidade"` também em `patologias` criaria duas
fontes de verdade para a mesma pergunta, e a única modulação que precisaria da
chave seria o piso de PEEP, que este spec não entrega (§3.1).

`PatologiaKey` só é usada em `perfil.ts` hoje, então fechar a união não quebra
nenhum consumidor.

## 6. As modulações

### 6.1 PEEP

`sugerirPeepFio2(pf, spo2)` passa a receber o perfil:
`sugerirPeepFio2(pf, spo2, perfil)`.

| Patologia | Efeito |
|---|---|
| Asma | **teto de 5.** A tabela ARDSnet é limitada a 5 cmH₂O, com a razão e a fonte na modulação. |
| DPOC | **a tabela não se aplica.** Com auto-PEEP presente, o alvo é 80 a 85% dele. Sem auto-PEEP, nenhum número: a modulação diz por quê. |

Asma e DPOC vão em **direções opostas**, e o aplicativo nunca as trata como
"obstrutivo" genérico. Foi o ponto que o mentor confirmou explicitamente.

Paciente com as duas marcadas: **prevalece o teto da asma**, que é o mais
restritivo, e a modulação declara que as duas patologias estão marcadas e que o
teto mais conservador foi aplicado. Não é regra clínica de precedência — é a
recusa de escolher entre duas quando ninguém decidiu.

### 6.2 Frequência e tempo expiratório

`sugerirVentilacao(predBW, vcTargetMl)` passa a receber o perfil.

Hoje ela devolve `fr: Math.max(12, Math.min(35, fr))`. **O piso de 12 é
obstáculo em obstrutivo**: Demoule 2020 orienta frequência baixa e relação I:E
de 1:4 a 1:6 justamente para dar tempo de expirar. O piso cai para 10 quando
há DPOC ou asma, com a modulação declarando a razão.

A relação I:E entra como **informação exibida**, não como número calculado: o
aplicativo não controla o ventilador e não sabe o tempo inspiratório
configurado.

### 6.3 Volume corrente

Não muda o cálculo. Muda a **procedência**: a faixa 6-8 no obeso passa a citar
`parecer_vc_obeso`, com a nota registrando que De Jong 2020 recomenda 6 ml/kg
nos dois grupos e que o mentor reafirmou o 8 depois de ver isso.

### 6.4 O alvo de PaCO₂ é de natureza diferente

Os outros modulam um alvo que o aplicativo já sugere. O PaCO₂ não: o aplicativo
sugere frequência e volume-minuto, que o produzem indiretamente.

Entra como **alvo próprio**, exibido só quando há lesão cerebral aguda:

```ts
export interface AlvoPaco2 { min: number; max: number }
export function alvoPaco2(perfil: PerfilClinico): Alvo<AlvoPaco2> | null;
```

`35 a 45 mmHg`, de `robba_2020` — **recomendação forte com evidência de
qualidade baixa**, e a tela diz isso.

**A ressalva que a tela não pode perder:** a recomendação vale para o paciente
**sem hipertensão intracraniana clinicamente significativa**, e o aplicativo
não sabe a pressão intracraniana. O texto declara essa condição.

## 7. Fontes novas no catálogo

Todas com PMID conferido; o dossiê registra o que foi lido no texto completo e
o que veio de resumo.

- `demoule_2020` — Demoule A, Brochard L, Dres M, Heunks L, Jubran A, Laghi F,
  Mekontso-Dessap A, Nava S, Ouanes-Besbes L, Peñuelas O, Piquilloud L,
  Vassilakopoulos T, Mancebo J. *How to ventilate obstructive and asthmatic
  patients.* Intensive Care Med 2020;46(12):2436-2449. `verificada: true`.
  Nota: **revisão narrativa, sem graduação GRADE**.
- `ranieri_1993` — Ranieri VM, Giuliani R, Cinnella G, et al. *Physiologic
  effects of positive end-expiratory pressure in patients with chronic
  obstructive pulmonary disease during acute ventilatory failure and
  controlled mechanical ventilation.* Am Rev Respir Dis 1993;147(1):5-13.
  `verificada: true`
- `probese_2019` — Bluth T, Serpa Neto A, Schultz MJ, Pelosi P, Gama de Abreu
  M, et al. (PROBESE Collaborative Group). *Effect of Intraoperative High PEEP
  With Recruitment Maneuvers vs Low PEEP on Postoperative Pulmonary
  Complications in Obese Patients: A Randomized Clinical Trial.* JAMA
  2019;321(23):2292-2305. `verificada: true`. Nota: **intraoperatório, não
  UTI; ensaio negativo no desfecho primário**.
- `dejong_2020` — De Jong A, Wrigge H, Hedenstierna G, et al. *How to
  ventilate obese patients in the ICU.* Intensive Care Med
  2020;46(12):2423-2435. `verificada: true`
- `robba_2020` — Robba C, Poole D, McNett M, et al. *Mechanical ventilation in
  patients with acute brain injury: recommendations of the European Society of
  Intensive Care Medicine consensus.* Intensive Care Med
  2020;46(12):2397-2410. `verificada: true`

Um parecer, `profissional: "Mentor clínico do projeto"`, `data: "02/09/2026"`:

- `parecer_vc_obeso` — a faixa 6-8 ml/kg no obeso. De Jong 2020 recomenda 6
  nos dois grupos e alerta que o peso predito estimado tende a ser
  superestimado no obeso; o mentor reafirmou o 8 depois de ver isso.

### 7.1 Chaves novas de `SourceKey`

`SourceKey` é união fechada e o `LABELS` de `src/pages/Sources.tsx` é
exaustivo: chave nova sem rótulo quebra o `tsc`. O teste de referência órfã
obriga cada entrada a ser citada.

| Chave | Cobre | Fontes |
|---|---|---|
| `obstrutivo` | PEEP, frequência e tempo expiratório em DPOC e asma | `demoule_2020`, `ranieri_1993` |
| `obesidadeVentilacao` | o aviso sobre recrutamento de rotina | `probese_2019`, `dejong_2020` |
| `lesaoCerebral` | alvo de PaCO₂ | `robba_2020` |

`parecer_vc_obeso` entra na chave `vcKg`, que já existe e já sustenta a faixa.

## 8. Ausência de dado

- **Auto-PEEP zero é medida**: ausência de auto-PEEP, achado real e favorável.
  Nunca campo vazio.
- **Auto-PEEP ausente** não vira zero e não vira teto: sem ele o aplicativo não
  dá número de PEEP para o DPOC.
- **Comorbidade ausente** significa que ninguém marcou, não que o paciente não
  tem. O aplicativo não infere patologia a partir de outros campos.

## 9. Tela

Nada de painel novo. As modulações aparecem onde a da obesidade já aparece,
pelo `LinhaModulacao` que a Fase 4 extraiu, com motivo e fonte.

O alvo de PaCO₂ entra no mesmo bloco de sugestões, visível só quando há lesão
cerebral aguda, com a ressalva da hipertensão intracraniana ao lado.

O **aviso do obeso sobre recrutamento** aparece junto da modulação de volume
corrente que já existe ali, e não como bloco novo: é a mesma patologia falando
do mesmo paciente. Ele diz que recrutamento de rotina com PEEP alta não está
autorizado, e cita o ensaio que o testou sem achar benefício — não é um alvo, é
a recusa de um.

`SourceFooter` com as chaves derivadas do que foi de fato modulado — nunca
lista escrita à mão.

## 10. Testes obrigatórios

1. **Paciente sem patologia nenhuma** recebe o alvo base, e `modulacoes` é
   vazio. Sem isso, uma modulação que dispara sempre passa despercebida.
2. **Asma limita a PEEP a 5**, e o teste falha se a tabela ARDSnet passar por
   cima.
3. **DPOC sem auto-PEEP não produz número de PEEP**, e a modulação diz por quê.
4. **DPOC com auto-PEEP** produz a faixa 80-85% **dele**, e o teste distingue
   isso de um número fixo.
5. **Asma e DPOC juntas** aplicam o teto da asma, e a modulação declara as
   duas.
6. **Auto-PEEP zero** é medida: aceito pela cerca de plausibilidade, com teste
   de aceitação **e** de reprovação, porque campo sem entrada no mapa é
   ignorado em silêncio.
7. **O piso de frequência cai para 10** em obstrutivo, e volta a 12 sem ele.
8. **`alvoPaco2` devolve `null`** sem lesão cerebral aguda, e o alvo não
   aparece na tela.
9. **A ressalva da hipertensão intracraniana** está junto do alvo de PaCO₂;
   teste que falha se ela sumir.
10. **Nenhuma das doze patologias sem base modula coisa alguma**: teste
    parametrizado sobre a lista, provando `modulacoes` vazio para cada uma.
11. **O rodapé cobre o que a tela afirma**, com asserção que distingue a chave
    certa da errada.

## 11. Fora de escopo

- **Piso de PEEP na obesidade** (§3.1).
- **Um número único de teto no DPOC** (§3.2).
- Alvos ventilatórios em DPOC além de PEEP, frequência e tempo expiratório.
- DPOC com alcalose metabólica associada.
- Achados de imagem como gatilho de modulação: a hiperinsuflação já gera aviso
  de auto-PEEP em `ventilationCorrelations`, e duplicar isso criaria duas
  fontes de verdade.

## 12. O que fica em aberto

1. **DPOC e lesão cerebral aguda no mesmo paciente puxam a oxigenação em
   direções opostas**: 88-92% de SpO₂ pela BTS contra ≥94% do consenso de
   lesão cerebral. O aplicativo não resolve o conflito e não deve inventar uma
   precedência. Pergunta para o mentor.
2. **O piso de PEEP na obesidade** segue sem número. Se o mentor quiser um, ele
   o fornece; a literatura não o sustenta.
3. **A relação I:E é exibida, não calculada**, porque o aplicativo não conhece
   o tempo inspiratório configurado.
