# Dossiê clínico — Ventila Fisio, modalidades do TRE

Para: mentor clínico
De: equipe de desenvolvimento
Data: 03/09/2026
Assunto: a lista de modalidades do teste de respiração espontânea tem fonte?

## Como usar este documento

Este dossiê responde a uma pergunta só, e ela é menor do que as das fases
anteriores: **as três modalidades que o aplicativo oferece para conduzir o TRE
— PSV, CPAP e Tubo T — têm respaldo em diretriz publicada, e o aplicativo
deveria mudar essa lista?**

A regra que governa este documento é a mesma dos anteriores:

**Nenhuma citação foi inventada.** Onde um dado bibliográfico não pôde ser
confirmado numa fonte efetivamente acessada, o texto diz isso com todas as
letras. O repositório é público e cada número na tela leva uma citação que o
usuário pode abrir: uma citação errada é pior do que uma lacuna declarada.

E a separação de sempre, item por item:

1. **O que a fonte realmente diz** (citação verbatim sempre que possível).
2. **Se ela RECOMENDA uma modalidade ou apenas PERMITE várias.** Esta distinção
   é o eixo do documento inteiro. Modalidade que aparece na seção de métodos de
   um ensaio **não** é recomendação de diretriz.
3. **Quão forte é a fonte** — a força e a certeza que ela própria declara.

---

## Por que a pergunta foi aberta

O catálogo em `src/data/tre.ts` está marcado assim, desde a Fase 5:

```ts
// Modalidade em que o teste é conduzido :: CONTEÚDO A VALIDAR
// A lista definitiva é pergunta em aberto para o mentor. Nenhum limiar depende
// dela, então não bloqueia.
export const MODALIDADES_TESTE: { v: string; t: string }[] = [
  { v: "psv", t: "PSV" },
  { v: "cpap", t: "CPAP" },
  { v: "tubo_t", t: "Tubo T" },
];
```

Enquanto os `CRITERIOS_FALHA` do mesmo arquivo levam o carimbo
`CONTEÚDO VALIDADO` e a data da validação do mentor (01/09/2026), a lista de
modalidades nunca teve fonte nenhuma. Ela foi digitada porque o formulário
precisava de opções.

O mentor foi perguntado e respondeu, em 03/09/2026:

> *"No momento eu não tenho referências, mas se vc quiser arrecadar para
> validar, fique a vontade."*

Ou seja: **ele não tem fonte e autorizou buscar uma.** Este documento é a busca.

### O que o aplicativo faz com o valor hoje, e por que isso muda a régua

O `TrePanel.tsx` usa a lista para montar um `<select>`, o valor escolhido vai
para a coluna `modo_durante` da linha de `tre_sessions`, e depois é exibido de
volta com o rótulo correspondente. **Nenhum limiar, nenhuma classificação e
nenhuma decisão clínica do aplicativo ramifica pela modalidade.** Ela é
descritiva: é o registro de como o teste foi conduzido.

Isso importa para a recomendação do fim. A régua para mexer num campo
descritivo não é a mesma de mexer num limiar. Um limiar errado muda a cor de um
alerta; uma lista de opções incompleta faz o terapeuta escolher a opção menos
errada e seguir em frente.

Um detalhe que sai a favor do estado atual: o valor inicial do formulário é
`MODALIDADES_TESTE[0].v`, isto é, **PSV**. Como se verá, PSV é exatamente a
modalidade que as três diretrizes preferem. O padrão do aplicativo já está
alinhado, por acidente ou não.

### Onde os textos foram lidos

- **AARC 2024** — PDF público em `aarc.org`, lido na íntegra. **É a versão
  *Paper in Press*, publicada em 05/03/2024, DOI 10.4187/respcare.11735**, não
  a versão paginada final (Respir Care 2024;69(7):891-901) que está em
  `references.ts`. Isto tem consequência, e ela está registrada na seção
  "O que não pôde ser confirmado".
- **ATS/CHEST 2017** — o *executive summary* (Am J Respir Crit Care Med
  2017;195(1):115-119), PDF público em `thoracic.org`, lido na íntegra.
- **AMIB/SBPT 2024, *Orientações Práticas em Ventilação Mecânica*** — PDF
  oficial no CDN da AMIB, lido na íntegra nos capítulos de PSV, de modos
  espontâneos e de desmame. **Esta é a primeira vez que o documento foi
  efetivamente acessado neste projeto**; ele está em `references.ts` com
  `verificada: false` e foi declarado inacessível no dossiê da Fase 8.
- **Diretrizes Brasileiras de Ventilação Mecânica 2013** (AMIB/SBPT), PDF
  oficial, lida a seção de retirada da ventilação. É a antecessora do documento
  acima e é de onde vêm, quase palavra por palavra, os `CRITERIOS_FALHA` que o
  aplicativo já exibe.
- **PubMed/eutils (`efetch`)** para dado bibliográfico e resumo: Subirà 2019,
  Esteban 1997, Esteban 1999, Thille 2022, Cardinal-Fernandez 2022.

### O que NÃO foi acessado

- **O texto completo do ATS/CHEST 2017 no CHEST** (Ouellette DR, et al. Chest
  2017;151(1):166-180), que é onde mora a discussão detalhada da Questão 1. A
  editora devolveu **HTTP 403**. O que consta abaixo vem do *executive summary*
  no AJRCCM, que traz a recomendação verbatim mas não a síntese de evidência
  por ensaio.
- **O suplemento online da AARC 2024**, que contém o glossário de modos e as
  tabelas GRADE por PICO.
- **Boles 2007** (Eur Respir J 2007;29:1033-1056), já citado no aplicativo com
  `verificada: false`. Não foi acessado nesta rodada, e **nada abaixo se apoia
  nele**.

---

# 1. ATS/CHEST 2017 — a única diretriz que RECOMENDA uma modalidade

## Citação

**Schmidt GA, Girard TD, Kress JP, Morris PE, Ouellette DR, Alhazzani W, Burns
SM, Epstein SK, Esteban A, Fan E, Ferrer M, Fraser GL, Gong MN, Hough CL, Mehta
S, Nanchal R, Patel S, Pawlik AJ, Schweickert WD, Sessler CN, Strøm T, Wilson
KC, Truwit JD; on behalf of the ATS/CHEST Ad Hoc Committee on Liberation from
Mechanical Ventilation in Adults.** *Official Executive Summary of an American
Thoracic Society/American College of Chest Physicians Clinical Practice
Guideline: Liberation from Mechanical Ventilation in Critically Ill Adults.*
**Am J Respir Crit Care Med 2017;195(1):115-119.** PMID 27762608.

A discussão detalhada das questões 1 a 3 está em **Ouellette DR, et al. Chest
2017;151(1):166-180** (PMID 27818331), **não acessada** (403).

## O que a fonte realmente diz

Verbatim, da Tabela 2 do *executive summary*:

> *"1. For acutely hospitalized patients ventilated >24 h, we suggest that the
> initial SBT be conducted with inspiratory pressure augmentation (5–8 cm H2O)
> rather than without (T-piece or CPAP)."*

E no corpo, com a graduação escrita por extenso:

> *"For acutely hospitalized patients ventilated for more than 24 hours, we
> suggest that the initial SBT be conducted with inspiratory pressure
> augmentation (5–8 cm H2O) rather than without (T-piece or continuous positive
> airway pressure) (conditional recommendation, moderate certainty in the
> evidence)."*

A justificativa do painel, verbatim:

> *"The evidence suggested that conducting the spontaneous breathing trial (SBT)
> with pressure augmentation was more likely to be successful, produced a higher
> rate of extubation success, and was associated with a trend toward lower
> intensive care unit (ICU) mortality than SBTs performed without pressure
> augmentation."*

E uma ressalva do próprio painel, que vale reproduzir porque delimita o alcance:

> *"Remarks. This recommendation relates to how to conduct the initial SBT but
> does not inform how to ventilate patients between unsuccessful SBTs."*

## Recomenda ou apenas permite?

**RECOMENDA.** É a única das três que escolhe um lado. E o lado que ela escolhe
tem duas consequências diretas para a lista do aplicativo:

1. **Ela dá um número**: 5 a 8 cmH₂O de aumento de pressão inspiratória. O
   número é publicado, é verbatim, e o aplicativo não o exibe em lugar nenhum.
2. **Ela agrupa CPAP e Tubo T no MESMO lado — o lado contra o qual sugere.**
   Na régua do ATS/CHEST, "CPAP" e "Tubo T" não são duas escolhas distintas: são
   dois modos de fazer a mesma coisa, que é conduzir o teste sem aumento de
   pressão inspiratória.

## Força

**Recomendação CONDICIONAL, certeza MODERADA da evidência**, declarada pela
própria diretriz, por GRADE, com aprovação exigindo concordância de pelo menos
80% do painel. É a graduação mais forte que este dossiê encontrou sobre a
pergunta — e ainda assim é condicional, o que na linguagem GRADE significa que
a maioria dos pacientes bem informados escolheria a conduta, mas muitos não.

---

# 2. AARC 2024 — a diretriz que PERMITE as duas, e diz por quê

## Citação

**Roberts KJ, Goodfellow LT, Battey-Muse CM, Hoerr CA, Carreon ML, Sorg ME,
Glogowski J, Girard TD, MacIntyre NR, Hess DR.** *AARC Clinical Practice
Guideline: Spontaneous Breathing Trials for Liberation From Adult Mechanical
Ventilation.* **Respir Care**, publicado como *Paper in Press* em 05/03/2024,
**DOI 10.4187/respcare.11735**. A versão paginada é **Respir Care
2024;69(7):891-901** — **não lida** (ver ressalva adiante).

## O que a fonte realmente diz

O resumo traz quatro recomendações. A que interessa é a segunda, verbatim:

> *"(2) We suggest that SBTs can be conducted with or without pressure support
> ventilation (conditional recommendation, moderate certainty)"*

**E aqui há uma diferença que importa.** No corpo do documento, a mesma
recomendação aparece com um número que o resumo não tem:

> *"Recommendation. We suggest that SBTs can be conducted with or without
> low-level PSV (≤ 8 cm H2O) (conditional recommendation, moderate certainty)."*

O texto do resumo e o texto da recomendação **não são idênticos**: o corpo
qualifica o PSV como "de nível baixo, ≤ 8 cmH₂O" e o resumo não. Registro isso
porque quem cita só o resumo perde o único número da recomendação.

A justificativa, verbatim:

> *"From our review of the literature, there is not compelling evidence
> supporting a large benefit of conducting SBTs with either PSV or T-piece when
> comparing one to the other."*

E, sobre o que é PSV neste contexto:

> *"It is important to appreciate that PSV in this context is the setting of PSV
> at a low level during SBT, presumably to decrease the work imposed by the
> endotracheal tube. This differs from PSV weaning, where the level of PSV is
> gradually reduced over time."*

### O que a AARC diz sobre CPAP — e é o achado mais importante desta seção

Verbatim, e a frase inteira cabe:

> *"A related question concerns the use of CPAP during an SBT. To our knowledge,
> this has not been studied."*

O parágrafo segue observando que **os dois grandes ensaios recentes zeraram a
PEEP no braço de PSV** (*"the RCTs by both Subirà and Thille set PEEP to zero in
the PSV arm"*), e cita uma meta-análise fisiológica:

> *"In a physiologic meta-analysis, Sklar reports that a CPAP of 0 cm H2O and
> T-piece more accurately reflect the physiologic conditions after extubation
> compared to PSV. Conceptually, the addition of PEEP might improve triggering in
> obstructive diseases with auto-PEEP, but no trial focused only on PEEP exists."*

Ou seja: sobre o CPAP como modalidade de TRE, a diretriz de 2024 dedicada
exclusivamente ao TRE afirma, com todas as letras, **que não há estudo.**

### A definição de TRE e a duração

Verbatim, da introdução:

> *"For this CPG, we define an SBT as a period of spontaneous breathing with
> minimal or no positive-pressure ventilatory assistance, usually 30–120 min in
> duration."*

Isso é **definição operacional do documento**, não recomendação graduada. A AARC
não emitiu recomendação sobre duração. A recomendação de tempo que ela emitiu é
sobre **horário**, não sobre duração:

> *"We suggest a standardized approach to assessment and, if appropriate,
> completion of an SBT before noon each day (conditional recommendation, very
> low certainty)."*

É esta que já está registrada no `references.ts` do projeto, e a nota lá está
correta.

### Um dado de prática, que não é recomendação

A AARC cita um estudo observacional multinacional (Burns et al) sobre o que se
usa de fato:

> *"initial SBTs most often used PSV with PEEP (49.1%) or T-piece (25.4%) and
> less frequently CPAP (10.8%) or PSV without PEEP (9.5%). SBTs with PSV and PEEP
> were commonly used in North America, whereas T-piece was more commonly used in
> Europe."*

**Isto é o que os quatro números são: frequência de uso observada, não
recomendação.** Mas é relevante para a lista do aplicativo por dois motivos:
CPAP existe na prática real (10,8%), e há uma **quinta** configuração usada em
quase 10% dos casos — PSV sem PEEP — que o aplicativo não distingue de PSV.

## Recomenda ou apenas permite?

**PERMITE, explicitamente, e recusa escolher.** "Com ou sem PSV de nível baixo"
é a formulação que abarca PSV ≤ 8 de um lado e Tubo T do outro. CPAP não é
permitido nem proibido: é declarado não estudado.

## Força

**Recomendação CONDICIONAL, certeza MODERADA**, por GRADE, com a convenção
declarada no documento: *"we used the phrasing 'we recommend' for strong
recommendations and 'we suggest' for conditional recommendations"*. A frase da
recomendação começa com "we suggest".

## A divergência entre ATS/CHEST 2017 e AARC 2024 é real

Não é a mesma recomendação escrita de dois jeitos:

- **ATS/CHEST 2017**: conduza o TRE inicial COM aumento de pressão (5-8), e não
  sem. Escolhe.
- **AARC 2024**: pode ser com ou sem PSV de nível baixo (≤ 8). Não escolhe.

As duas são condicionais e as duas declaram certeza moderada. A AARC é sete
anos mais nova e teve acesso a dois ensaios que o ATS/CHEST não tinha (Subirà
2019 e Thille 2022), e o segundo deles é negativo no desfecho primário. **A
divergência é evolução da evidência, não erro de leitura de nenhum dos dois
painéis.** O aplicativo não deve fundi-las numa frase só.

---

# 3. AMIB/SBPT 2024 — a fonte brasileira, e ela foi finalmente lida

## Citação

**AMIB e SBPT.** *Orientações Práticas em Ventilação Mecânica.* Edição de 2024.
Documento conjunto da Associação de Medicina Intensiva Brasileira e da Sociedade
Brasileira de Pneumologia e Tisiologia, 38 temas, 75 relatores, reunião plenária
em Florianópolis em 20 e 21/11/2023. PDF oficial, acessado em 03/09/2026.

**Este é o documento que o dossiê da Fase 8 declarou não ter conseguido acessar
e que está em `references.ts` com `verificada: false`.** Ele foi acessado agora.
Isto é achado colateral e está tratado na seção 7.

## A régua de força que o documento usa

O documento **não usa GRADE**, e declara a própria convenção, verbatim:

> *"**Sugere-se**: quando está ou não indicado o emprego de uma intervenção ou
> monitorização, baseado em pelo menos um estudo randomizado com baixo risco de
> viés ou em pelo menos uma metanálise com baixo risco de viés."*

> *"**Considerar**: quando pode-se considerar ou não o emprego de uma
> intervenção ou monitorização, baseado em estudos randomizados ou metanálises
> com alto risco ou risco indeterminado de viés, em estudos observacionais
> (coortes ou caso-controles) ou ainda na opinião dos relatores e editores."*

Isto é uma graduação de dois níveis, declarada. **"Sugere-se" é mais forte que
"Considerar" neste documento**, e a distinção decide a leitura da próxima
seção.

## O que a fonte realmente diz sobre a modalidade do TRE

Do capítulo de desmame, seção "C.1 - Identificação do momento de extubação",
verbatim e na ordem em que aparecem:

> *"Considerar:
> • A opção de realizar o TRE em tubo T, por 30 a 60 minutos, como alternativa
> ao teste em PSV."*

> *"Sugere-se:
> • Fazer o TRE no modo PSV, com nível de PSV entre 5 e 7cmH2O, com PEEP entre
> 0 e 5cmH2O e por 30 a 60 minutos."*

Lendo pela régua do próprio documento: **PSV 5-7 com PEEP 0-5 por 30-60 min é
"Sugere-se"; Tubo T por 30-60 min é "Considerar".** O Tubo T está literalmente
rotulado como *alternativa* ao teste em PSV.

E do capítulo de desmame prolongado, a mesma hierarquia se repete:

> *"Sugere-se: • Que, no desmame prolongado, o TRE seja feito no modo PSV, com
> nível de PSV entre 5 e 7cmH2O, com PEEP entre 0 e 5cmH2O e por 30 a 60
> minutos."*

> *"Sugere-se: • Que, em pacientes traqueostomizados, o TRE seja feito em tubo
> T, em períodos diários fixos ou progressivamente maiores."*

**O traqueostomizado é a única população em que o documento brasileiro coloca o
Tubo T como "Sugere-se".**

## E sobre CPAP

**A palavra CPAP não aparece nenhuma vez nos capítulos de desmame e de desmame
prolongado do documento de 2024.** Isso foi conferido por busca no texto
extraído do PDF, no intervalo inteiro dos dois capítulos. O CPAP aparece no
documento, mas na seção de ventilação não invasiva, com outra finalidade.

## O documento de 2013, para contraste

**AMIB/SBPT.** *Diretrizes Brasileiras de Ventilação Mecânica 2013.* Verbatim,
Tema 23:

> *"Recomendação: No TRE o paciente deve ser colocado em Tubo em T ou PSV de 5-7
> cm H2O durante 30-120 minutos."*

Duas mudanças de 2013 para 2024, e as duas na mesma direção:

1. A duração encolheu de **30-120** para **30-60** minutos.
2. Tubo T e PSV, que em 2013 estavam na mesma frase e no mesmo nível, em 2024
   ficaram em níveis diferentes: PSV subiu para "Sugere-se" e Tubo T desceu para
   "Considerar".

**Em nenhuma das duas edições o CPAP é nomeado como modalidade de TRE.**

## Recomenda ou apenas permite?

**RECOMENDA, com hierarquia.** É a fonte mais específica das três: dá modo,
nível de pressão, nível de PEEP e duração, tudo em número, e ordena as duas
opções. É também a que fala do contexto em que o aplicativo é usado.

---

# 4. ATC — e sim, é uma omissão real

A instrução desta pesquisa pedia atenção a uma quarta modalidade. Ela existe, e
o achado é mais forte do que eu esperava.

## O que o documento brasileiro de 2024 diz

Há uma seção inteira dedicada a ela — "A.5 - ATC (Automatic Tube Compensation ou
compensação automática do tubo)". Verbatim:

> *"O ATC é um modo espontâneo que tem como objetivo diminuir o trabalho
> resistivo imposto ao paciente pela presença da via aérea artificial – tubo
> orotraqueal ou tubo de traqueostomia. Alguns estudos mostraram menor trabalho
> respiratório e maior conforto com o ATC quando comparado com o modo PSV.
> Metanálise recente sugere que o ATC pode levar à maior taxa de sucesso no
> desmame em relação ao modo PSV sem ATC ou ao tubo-T."*

> *"Considerar: • Utilizar, associado ou não à PSV, visando à compensação do
> aumento do trabalho resistivo realcionado à presença da prótese traqueal de
> forma automática. Em PSV, essa compensação deve ser calculada pelo cuidador em
> virtude do diâmetro da prótese (TOT ou TQT), oferecendo-se valores maiores de
> PS para tubos com diâmetros menores. Exemplo: PS = 5cmH2O para tubo de
> diâmetro 9 e PS = 9cmH2O para tubos de diâmetro 6. Contraindicado para
> pacientes sem drive respiratório e atenção ao excesso de secreções que
> interfiram com o fluxo inspiratório."*

Três leituras que quero deixar separadas:

1. **É "Considerar", não "Sugere-se".** Pela régua do próprio documento, isso é
   o nível mais fraco dos dois. O ATC **não** tem, no Brasil, o mesmo respaldo
   que o PSV 5-7.
2. **A seção está no capítulo de MODOS VENTILATÓRIOS, não no de desmame.** O
   capítulo de desmame não o lista como modalidade de TRE. Isto é sutil e
   importa: o documento diz que o ATC é útil no desmame, mas quando vai dizer
   *como fazer o TRE*, nomeia PSV e Tubo T.
3. **Os números PS = 5 para tubo 9 e PS = 9 para tubo 6 são do documento**, e
   são a receita de como emular ATC dentro do PSV. Não são números que o
   aplicativo tenha hoje.

## O que a meta-análise citada diz

**Cardinal-Fernandez P, Bougnaud J, Cour M, Argaud L, Poole D, Guérin C.**
*Automatic Tube Compensation During Spontaneous Breathing Trials.* **Respir Care
2022;67(10):1335-1342. PMID 36137582. DOI 10.4187/respcare.09920.**
Bibliografia e resumo confirmados por `efetch`; **texto completo não lido.**

Do resumo, verbatim:

> *"Of the 234 retrieved papers, 7 met the inclusion criteria. In terms of SBT
> success, ATC100+PEEP < 7.5 and PS10+PEEP < 7.5 were superior to T-piece.
> Likewise, PS10+PEEP < 7.5 was the intervention with the highest probability of
> being the best (P-score: 0.90). In terms of extubation success, ATC100+PEEP <
> 7.5 cm H2O was significantly better than PEEP < 7.5 and T-piece. Likewise, it
> had the highest probability of being the best (P-score= 0.90)."*

E a conclusão, verbatim:

> *"ATC is the modality with the highest probability of extubation success but
> not in terms of SBT success."*

**Ressalvas que a própria leitura impõe:** é uma **meta-análise em rede de 7
estudos**, e P-score não é valor de p — é a probabilidade de ser o melhor entre
as alternativas comparadas, medida que ordena bem e estima mal. Sete estudos é
pouco para uma rede.

## O que o ATS/CHEST 2017 fez com o ATC

O *executive summary* que li **não menciona ATC**. Uma busca secundária indica
que o ATC entrou na definição de "inspiratory pressure augmentation" da Questão
1 do documento do CHEST, mas **eu não li o documento do CHEST** (403), e por
isso **não afirmo isso como achado**. Está na seção 6.

## O que a AARC 2024 fez com o ATC

Não emitiu recomendação. Ela aparece duas vezes, as duas como descrição de
evidência alheia: na tabela de revisões sistemáticas (*"tube compensation was
associated with the highest probability of extubation success (P-score 0.90)"*)
e no texto, entre parênteses, como exemplo de PSV de nível variável (*"a fixed-
level PSV or a variable level of PSV (tube compensation)"*).

## Conclusão sobre o ATC

**É omissão real da lista do aplicativo, mas não é omissão grave.** O ATC é
nomeado por documento brasileiro vigente, tem meta-análise favorável ao desfecho
de extubação, e um terapeuta que conduza o teste em ATC hoje não tem onde
registrar isso — vai marcar "PSV", que é o mais próximo, e o registro fica menos
preciso do que a realidade.

O que **nenhuma** fonte lida sustenta é chamar o ATC de modalidade recomendada
de TRE. Ele é "Considerar" no Brasil e não é recomendação em lugar nenhum.

---

# 5. Os ensaios que estão por trás das diretrizes

Esta seção existe para separar **ensaio** de **recomendação**. Nada aqui é
diretriz.

## Esteban 1997 — o ensaio que colocou PSV no mapa

**Esteban A, Alía I, Gordo F, Fernández R, Solsona JF, Vallverdú I, Macías S,
Allegue JM, Blanco J, Carriedo D, León M, de la Cal MA, Taboada F, Gonzalez de
Velasco J, Palazón E, Carrizosa F, Tomás R, Suarez J, Goldwasser RS.*
*Extubation outcome after spontaneous breathing trials with T-tube or pressure
support ventilation. The Spanish Lung Failure Collaborative Group.* **Am J
Respir Crit Care Med 1997;156(2 Pt 1):459-65. PMID 9279224.** Confirmado por
`efetch`. Resumo lido; texto completo não.

Randomizados 484 pacientes para 2 h de Tubo T ou 2 h de **PSV de 7 cmH₂O**.
Falha no teste: **22% com Tubo T contra 14% com PSV (p = 0,03)**. Permanência
extubado em 48 h: **63% contra 70% (p = 0,14)** — sem diferença. A conclusão dos
autores, verbatim: *"Spontaneous breathing trials with pressure support or
T-tube are suitable methods for successful discontinuation of ventilator
support in patients without problems to resume spontaneous breathing."*

## Esteban 1999 — a duração

**Esteban A, Alía I, Tobin MJ, Gil A, Gordo F, Vallverdú I, Blanch L, Bonet A,
Vázquez A, de Pablo R, Torres A, de La Cal MA, Macías S.** *Effect of
spontaneous breathing trial duration on outcome of attempts to discontinue
mechanical ventilation.* **Am J Respir Crit Care Med 1999;159(2):512-8. PMID
9927366.** Confirmado por `efetch`.

526 pacientes, 30 min contra 120 min. Extubados sem sofrimento: **87,8% contra
84,8% (p = 0,32)**. Permanência extubado em 48 h: **75,9% contra 73,0% (p =
0,43)**. Conclusão verbatim: *"after a first trial of spontaneous breathing,
successful extubation was achieved equally effectively with trials targeted to
last 30 and 120 min."*

## Subirà 2019 — o ensaio que a instrução desta pesquisa pediu

**Subirà C, Hernández G, Vázquez A, Rodríguez-García R, González-Castro A,
García C, Rubio O, Ventura L, López A, de la Torre MC, Keough E, Arauzo V,
Hermosa C, Sánchez C, Tizón A, Tenza E, Laborda C, Cabañes S, Lacueva V, Del Mar
Fernández M, Arnau A, Fernández R.** *Effect of Pressure Support vs T-Piece
Ventilation Strategies During Spontaneous Breathing Trials on Successful
Extubation Among Patients Receiving Mechanical Ventilation: A Randomized
Clinical Trial.* **JAMA 2019;321(22):2175-2182. PMID 31184740. DOI
10.1001/jama.2019.7234.** Confirmado por `efetch`. Resumo lido; texto completo
não.

1.153 pacientes, 18 UTIs na Espanha. **2 h de Tubo T (n = 578) contra 30 min de
PSV 8 cmH₂O (n = 557).** Extubação bem-sucedida (livre de VM por 72 h): **82,3%
com PSV contra 74,0% com Tubo T** (diferença 8,2%; IC 95% 3,4-13,0; p = 0,001).
Reintubação: **11,1% contra 11,9%** — sem diferença. Mortalidade hospitalar:
**10,4% contra 14,9% (p = 0,02)**; em 90 dias, **13,2% contra 17,3%** (HR 0,74;
IC 95% 0,55-0,99).

**A ressalva que a própria AARC faz sobre este ensaio, verbatim:**

> *"Complicating the interpretation of this RCT was different durations of the
> SBTs. Thus, it is unclear whether the improved outcomes were attributable to
> mode (PSV or T-piece), duration (30 min or 120 min), or both."*

Isto é decisivo para este dossiê: **Subirà 2019 não é evidência limpa de que PSV
seja melhor que Tubo T**, porque a duração mudou junto. Ele é evidência de que
um teste de 30 min em PSV 8 é melhor que um teste de 2 h em Tubo T — as duas
variáveis num braço só.

## Thille 2022 — o ensaio negativo que veio depois

**Thille AW, Gacouin A, Coudroy R, Ehrmann S, Quenot JP, Nay MA, Guitton C,
Contou D, Labro G, Reignier J, et al.; REVA Research Network.**
*Spontaneous-Breathing Trials with Pressure-Support Ventilation or a T-Piece.*
**N Engl J Med 2022;387(20):1843-1854. PMID 36286317. DOI
10.1056/NEJMoa2209041.** Confirmado por `efetch`.

969 pacientes de **alto risco de falha de extubação** (> 65 anos ou doença
cardíaca ou respiratória crônica). PSV **8 cmH₂O sem PEEP** contra Tubo T, com a
mesma duração nos dois braços. Desfecho primário — dias livres de ventilador no
dia 28: **mediana 27 nos dois grupos** (diferença 0; IC 95% −0,5 a 1; p = 0,31).
Reintubação: **14,9% contra 13,6%**.

Conclusão verbatim: *"Among patients who had a high risk of extubation failure,
spontaneous-breathing trials performed with PSV did not result in significantly
more ventilator-free days at day 28 than spontaneous-breathing trials performed
with a T-piece."*

**Este é o ensaio que explica por que a AARC 2024 não escolhe lado e o ATS/CHEST
2017 escolhia.** Ele não existia em 2017.

---

# 6. O que NÃO pôde ser confirmado

Esta é a seção mais importante do documento.

1. **O texto completo do ATS/CHEST 2017 no CHEST** (Ouellette 2017;151(1):
   166-180) **não foi lido** — a editora devolveu 403. Portanto:
   - **Não afirmo** que o ATC tenha entrado na definição de "inspiratory
     pressure augmentation" da Questão 1. Uma busca secundária diz isso, eu não
     li o documento, e **este dossiê não deve ser citado como fonte para essa
     afirmação.**
   - Não sei quais ensaios entraram na síntese da Questão 1 nem com que pesos.
   - O que está na seção 1 vem inteiramente do *executive summary* no AJRCCM,
     que li na íntegra e que traz a recomendação verbatim.

2. **A AARC 2024 foi lida na versão *Paper in Press*** (05/03/2024), não na
   versão paginada final. O próprio PDF avisa, verbatim: *"this version may
   differ from the final published version in the online and print editions of
   RESPIRATORY CARE"*. O `references.ts` do projeto cita **69(7):891-901**, que
   é a versão final. **As duas citações apontam para o mesmo documento e o
   mesmo DOI**, mas as citações verbatim deste dossiê vêm da versão em prensa.
   Há inclusive uma discrepância interna nessa versão — o resumo diz *"with or
   without pressure support ventilation"* e o corpo diz *"with or without
   low-level PSV (≤ 8 cm H2O)"*. **Se a versão final harmonizou as duas
   formulações, eu não teria como saber.** Vale conferir se o mentor tiver
   acesso.

3. **O suplemento online da AARC 2024 não foi acessado.** É onde estão o
   glossário de modos e as tabelas GRADE por PICO. Se houver ali alguma
   definição de CPAP como modalidade, ela me escapou.

4. **Boles 2007 não foi acessado nesta rodada**, e nada aqui se apoia nele. Ele
   continua com `verificada: false` no aplicativo.

5. **Texto completo não lido**, só resumo confirmado por `efetch`: Subirà 2019,
   Esteban 1997, Esteban 1999, Thille 2022, Cardinal-Fernandez 2022. Todos os
   números atribuídos a eles neste dossiê vêm dos resumos.

6. **A meta-análise fisiológica de Sklar**, citada pela AARC sobre CPAP zero e
   Tubo T refletirem melhor a condição pós-extubação, **não foi rastreada até o
   original.** A citação aqui é da AARC citando Sklar, não de Sklar.

7. **Nenhuma fonte lida publica uma "lista de modalidades de TRE".** Esta é a
   constatação de fundo do dossiê inteiro, e vale dizê-la explicitamente: as
   diretrizes recomendam ou permitem **modos**, com **níveis de pressão** e
   **durações**. Nenhuma delas enumera um cardápio fechado de opções para um
   formulário. **A lista de três do aplicativo não tem, e não vai ter, uma fonte
   que a espelhe.** O que existe é fonte para cada item da lista,
   individualmente, e é isso que a tabela abaixo mostra.

8. **Não pesquisei modalidades fora do escopo da pergunta**: SmartCare, PAV,
   NAVA e ASV aparecem no documento brasileiro como modos ventilatórios, e o
   capítulo de desmame prolongado sugere *"empregar modos automáticos de
   desmame"*. **Isso é desmame automatizado, não modalidade de TRE**, e não foi
   investigado. Se o mentor quiser abrir essa porta, é outra rodada.

---

# 7. Achados colaterais, fora do escopo da pergunta

Estes três apareceram no caminho. Não são o que foi pedido, e **nenhum deles é
proposta de mudança** — são registro para o mentor decidir.

## 7.1 O AMIB/SBPT 2024 foi acessado, e ele está no aplicativo como não verificado

O dossiê da Fase 8 registrou: *"AMIB/SBPT, Orientações Práticas em Ventilação
Mecânica, 2024 — não acessado nesta rodada. Já está em `references.ts` com
`verificada: false`."* Ele foi acessado agora, no PDF oficial da AMIB, e os
dados bibliográficos batem com o que está cadastrado. **A decisão de virar o
`verificada` para `true` é do Jeann e do mentor**, não minha, e ela tem
consequência de tela: `verificada: false` é o que faz aparecer o aviso de
pendente de revisão.

## 7.2 O pH de 7,35 do mentor tem, agora, fonte publicada

O `CLAUDE.md` registra que o pH de corte do TRE é **7,35 por decisão do mentor
em 01/09/2026**, contra os **7,32** de Boles 2007, e que a divergência está
gravada como `parecer_tre_ph`.

O AMIB/SBPT 2024, lido agora, lista entre os critérios de falha do TRE,
verbatim: **"pH < 7,35"**.

**Não estou propondo trocar o `Parecer` por `Publicacao`.** Estou registrando
que o número do mentor coincide exatamente com o do documento brasileiro
vigente, o que é diferente de "ele inventou um número". Se isso deve mudar a
procedência no código é decisão dele.

## 7.3 Três critérios de falha do aplicativo divergem do AMIB/SBPT 2024

Comparação direta, e só isso:

| Critério no app | AMIB/SBPT 2024 | Situação |
|---|---|---|
| pH < 7,35 | pH < 7,35 | idêntico |
| FR > 35/min | f > 35 irpm | idêntico |
| FC > 140/min | FC persistentemente acima de 140 bpm | idêntico |
| PAS > 180 ou < 90 | PA sistólica < 90 ou > 180 mmHg | idêntico |
| PaCO₂ > 50 mmHg | PaCO₂ > 50 mmHg **(exceto pacientes previamente hipercápnicos)** ou **elevação > 8 mmHg em relação ao basal** | **o app não tem nenhuma das duas ressalvas** |
| SpO₂ ≤ 90%, ou PaO₂ ≤ 50 mmHg com FiO₂ ≥ 50% | SpO₂ persistentemente < 90% com FiO₂ **≥ 40%**; PaO₂ **< 60** mmHg com FiO₂ **≥ 40%** | **três números diferentes** |
| sinais de esforço (musculatura acessória, respiração paradoxal, agitação, sudorese) | musculatura acessória, diaforese, **e uma categoria separada de alteração do estado mental** | o app funde duas categorias numa |

A ressalva do "exceto pacientes previamente hipercápnicos" é a que mais me
incomoda, porque é exatamente a armadilha nº 5 do projeto noutra roupa: o
retentor crônico de CO₂ tem PaCO₂ > 50 no basal e falharia o critério sem ter
falhado em nada. **Isto é pergunta clínica para o mentor, não conserto que a
equipe faça sozinha**, e está fora do escopo desta rodada.

---

# 8. A tabela: modalidade × o que cada diretriz diz

| Modalidade | ATS/CHEST 2017 | AARC 2024 | AMIB/SBPT 2024 | AMIB/SBPT 2013 |
|---|---|---|---|---|
| **PSV** | **RECOMENDA** como conduta do TRE inicial, com **5-8 cmH₂O**. Condicional, certeza moderada | **PERMITE**, como uma das duas opções: *"with or without low-level PSV (≤ 8 cm H2O)"*. Condicional, certeza moderada | **"Sugere-se"** — o nível mais forte do documento. **PSV 5-7 cmH₂O, PEEP 0-5, por 30-60 min** | Nomeada junto com Tubo T, no mesmo nível: **PSV 5-7 cmH₂O, 30-120 min** |
| **Tubo T** | **SUGERE CONTRA** para o teste inicial (é o braço "sem aumento de pressão") | **PERMITE**, como a outra das duas opções | **"Considerar"** — literalmente *"como alternativa ao teste em PSV"*, 30-60 min. **Exceção: "Sugere-se" no traqueostomizado**, em períodos diários fixos ou progressivos | Nomeada junto com PSV, no mesmo nível |
| **CPAP** | **SUGERE CONTRA** para o teste inicial: aparece explicitamente no braço rejeitado, ao lado do Tubo T | **Nem permite nem proíbe**: *"To our knowledge, this has not been studied"*. Usado em **10,8%** dos TREs num estudo observacional — o que é prática, não recomendação | **Não é nomeado** em nenhum dos dois capítulos de desmame | **Não é nomeado** |
| **ATC** | **Não aparece** no *executive summary* lido. O documento do CHEST não foi acessado | **Não recomenda.** Aparece só como evidência alheia: melhor P-score para sucesso de extubação numa meta-análise em rede de 7 estudos | **"Considerar"**, com seção própria — mas no capítulo de MODOS, não no de desmame. Dá a receita de emulação em PSV: **PS 5 para tubo 9, PS 9 para tubo 6** | Não pesquisado nesta rodada |
| **PSV 0 / PEEP 0** | Não aparece | Discutido no texto, **sem recomendação**: *"Many clinicians consider this approach to be a reasonable surrogate for a T-piece trial"*, com a ressalva de que ventiladores modernos podem aplicar alguma pressão positiva mesmo em PSV 0. Usado em **9,5%** (observacional) | Não nomeado separadamente; cabe dentro de "PSV com PEEP entre 0 e 5" | Não nomeado |

**Leitura em uma frase:** as três modalidades da lista existem nas fontes, mas
**não como três iguais** — PSV é preferida ou sugerida pelas três diretrizes,
Tubo T é permitido pelas três (e preferido em traqueostomizado no Brasil), e
CPAP é a única das três que **nenhuma** diretriz nomeia favoravelmente.

---

# 9. Recomendação, e o que cada opção custa se estiver errada

## As três opções, com o custo de cada erro

### Opção A — manter as três como estão, só tirando o `CONTEÚDO A VALIDAR`

**Custo se estiver errada:** o aplicativo passa a afirmar, pelo carimbo, que uma
lista foi validada quando o item CPAP continua sem nenhuma diretriz que o
sustente. Trocar o carimbo é a mudança de menor esforço e de pior relação
custo-benefício: não acrescenta informação nenhuma e retira o único aviso
honesto que o arquivo hoje tem.

**Não recomendo.**

### Opção B — trocar a lista

Duas sublistas possíveis: remover o CPAP, ou acrescentar o ATC.

**Remover o CPAP custa caro e o erro é irreversível na prática.** Ele é usado em
10,8% dos TREs segundo o observacional que a AARC cita, e "nenhuma diretriz o
nomeia" **não é o mesmo que "é errado"** — a AARC diz literalmente que não foi
estudado, o que é ausência de evidência. Se o CPAP sair da lista, o terapeuta
que conduziu o teste em CPAP registra "PSV" ou "Tubo T", e o **banco passa a
guardar um dado falso**. Num campo puramente descritivo, cujo único propósito é
dizer a verdade sobre como o teste foi feito, empobrecer o vocabulário é o único
jeito de fazer estrago.

**Acrescentar o ATC tem base e custa pouco**, mas é decisão do mentor: ele tem
seção própria no documento brasileiro vigente, tem meta-análise favorável, e sua
ausência hoje força quem usa ATC a registrar "PSV". O erro possível é sugerir na
tela uma modalidade que a UTI dele não usa ou cujo ventilador não oferece — o
que é ruído, não dano.

### Opção C — anotar a lista, sem mexer nos três valores

Manter `psv`, `cpap` e `tubo_t` exatamente como estão, e substituir o comentário
`CONTEÚDO A VALIDAR` por procedência item a item: o que cada diretriz diz sobre
cada modalidade, com a fonte, incluindo a frase de que o CPAP não é nomeado por
nenhuma delas.

**Custo se estiver errada:** praticamente nenhum na tela, porque nada muda na
tela. O custo é de manutenção — um comentário longo que precisa acompanhar
mudança de diretriz. É o mesmo custo que os `CRITERIOS_FALHA` já pagam logo
acima, no mesmo arquivo.

## O que eu recomendo

**Opção C, com duas perguntas ao mentor**, e nesta ordem de prioridade:

1. **Anotar a lista dos três, sem mudar valor nenhum.** Os três sobrevivem: os
   três são registráveis, os três acontecem em UTI brasileira, e nenhum limiar
   do aplicativo depende deles. O que muda é o arquivo deixar de dizer "não sei
   de onde isto veio" e passar a dizer o que cada fonte diz — inclusive a
   verdade desconfortável sobre o CPAP.

2. **Perguntar ao mentor se o ATC entra como quarta opção.** Tem base
   ("Considerar" no AMIB/SBPT 2024, mais Cardinal-Fernandez 2022), e é a única
   mudança de lista que este dossiê sustenta.

3. **Perguntar ao mentor se o aplicativo deve registrar o NÍVEL e a DURAÇÃO.**
   Este é, na minha leitura, o achado maior da rodada e ele não estava na
   pergunta original: **as diretrizes não recomendam "PSV", recomendam "PSV a
   5-7 cmH₂O com PEEP 0-5 por 30-60 minutos"**. O aplicativo grava a palavra e
   descarta os números — e os números são publicados, verbatim, por três fontes
   diferentes. É raro neste projeto: quase toda pendência clínica aqui é "não há
   número publicado". Aqui há três, e o aplicativo não guarda nenhum. O TRE já
   é cronometrado pelo aplicativo, então a duração é medida e simplesmente não é
   confrontada com a faixa recomendada.

   **Não estou propondo implementar isso**, e nem deveria: é campo novo, é
   esquema novo, é decisão de produto e de escopo. Estou registrando que a
   lacuna existe e que ela é maior do que a lista de três.

## O que NÃO recomendo, e por quê

- **Não recomendo remover o CPAP**, pelo motivo da Opção B.
- **Não recomendo reordenar a lista para "corrigir" o padrão.** O padrão já é
  PSV, que é o que as três diretrizes preferem. Está certo por acidente, e vale
  registrar no comentário que é de propósito a partir de agora.
- **Não recomendo exibir "recomendado" ao lado do PSV na tela.** As três fontes
  divergem em força: ATS/CHEST recomenda, AARC não escolhe, AMIB sugere. Um selo
  de "recomendado" apagaria a divergência, e a divergência é informação clínica
  real — foi ela que mudou entre 2017 e 2024, por causa do Thille 2022.

---

# 10. Perguntas para o mentor

## Sobre a lista

1. **O ATC entra como quarta opção?** O AMIB/SBPT 2024 tem seção própria para
   ele e o classifica como "Considerar"; a meta-análise de Cardinal-Fernandez
   2022 dá a ele a maior probabilidade de sucesso de extubação numa rede de 7
   estudos. Hoje, quem conduz o teste em ATC registra "PSV". **A UTI do senhor
   usa ATC?**

2. **O CPAP fica?** Minha recomendação é que sim, mas com a anotação honesta:
   nenhuma das três diretrizes o nomeia favoravelmente, o ATS/CHEST 2017 o
   coloca no braço contra o qual sugere, e a AARC 2024 diz que ele não foi
   estudado. **Ele é usado no serviço do senhor?**

## Sobre o que a lista não guarda

3. **O aplicativo deve registrar o NÍVEL de pressão e a DURAÇÃO do TRE?**
   AMIB/SBPT 2024 diz PSV 5-7 com PEEP 0-5 por 30-60 min; ATS/CHEST diz 5-8;
   AARC diz ≤ 8 e define o teste como 30-120 min. **Os números existem e são
   publicados.** Hoje a modalidade é uma palavra sem número ao lado.

## Sobre os achados colaterais

4. **O `verificada: false` do AMIB/SBPT 2024 pode virar `true`?** O documento
   foi acessado e conferido nesta rodada. É o que hoje faz o aplicativo exibir o
   aviso de pendente de revisão.

5. **O pH de 7,35 continua como `Parecer` dele, ou passa a citar o AMIB/SBPT
   2024?** O documento brasileiro lista exatamente "pH < 7,35" como critério de
   falha do TRE. A decisão de 01/09/2026 do senhor coincide com ele.

6. **O critério de PaCO₂ > 50 do aplicativo deve ganhar as duas ressalvas do
   AMIB/SBPT 2024** — "exceto pacientes previamente hipercápnicos" e "ou
   elevação > 8 mmHg em relação ao basal"? Sem a primeira, o retentor crônico
   falha um critério que ele já tinha no basal.

7. **Os três números de oxigenação divergem** (o app usa SpO₂ ≤ 90%, PaO₂ ≤ 50
   com FiO₂ ≥ 50%; o AMIB/SBPT 2024 usa SpO₂ < 90% com FiO₂ ≥ 40% e PaO₂ < 60
   com FiO₂ ≥ 40%). **Qual dos dois conjuntos o senhor quer na tela?**

---

## Fontes acessadas nesta rodada

**Lidas na íntegra:**

- ATS/CHEST 2017, *executive summary*: Am J Respir Crit Care Med
  2017;195(1):115-119. PMID 27762608.
- AARC 2024: Respir Care, *Paper in Press*, 05/03/2024, DOI
  10.4187/respcare.11735 (versão final: 2024;69(7):891-901).
- AMIB/SBPT, *Orientações Práticas em Ventilação Mecânica*, 2024 — capítulos de
  PSV, modos espontâneos, desmame e desmame prolongado.
- AMIB/SBPT, *Diretrizes Brasileiras de Ventilação Mecânica 2013* — Tema 23.

**Bibliografia e resumo confirmados por `efetch` do PubMed:**

- Subirà C, et al. JAMA 2019;321(22):2175-2182. PMID 31184740.
- Esteban A, et al. Am J Respir Crit Care Med 1997;156(2 Pt 1):459-65. PMID
  9279224.
- Esteban A, et al. Am J Respir Crit Care Med 1999;159(2):512-8. PMID 9927366.
- Thille AW, et al. N Engl J Med 2022;387(20):1843-1854. PMID 36286317.
- Cardinal-Fernandez P, et al. Respir Care 2022;67(10):1335-1342. PMID 36137582.

**Tentado e recusado pela editora (HTTP 403):**

- Ouellette DR, et al. Chest 2017;151(1):166-180. PMID 27818331.
