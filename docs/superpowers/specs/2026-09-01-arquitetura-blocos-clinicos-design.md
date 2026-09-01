# Arquitetura dos quatro blocos clínicos

Data: 01/09/2026
Projeto: Ventila Fisio (POC)
Fases anteriores: `2026-08-31-fase1-embasamento-contexto-escores-design.md`,
`2026-08-31-fase2-escores-visiveis-e-dossie-design.md`

## 1. Por que este documento existe

O pedido do cliente foi decomposto em oito blocos. Quatro foram entregues nas
Fases 1 e 2. Os quatro restantes — gasometria interpretada, mecânica
respiratória nova, TRE passo a passo e alvo ventilatório por patologia — são
todos afirmação clínica nova, e por isso ficaram parados até a validação do
mentor.

Em 01/09/2026 o mentor respondeu. Com a validação em mãos, o risco deixou de
ser clínico e passou a ser arquitetural: são quatro subsistemas, cada um com
captura nova, cálculo novo e tela nova. Construídos um a um sem desenho comum,
produziriam quatro soluções diferentes para o mesmo problema.

**Este documento decide como os quatro se encaixam. Ele não constrói nenhum
deles.** Cada bloco recebe depois seu próprio spec, plano e ciclo de execução.

## 2. O insumo: o que o mentor validou

Respostas de 01/09/2026, em três rodadas.

| Item | Decisão dele |
|---|---|
| Driving pressure | mantém **13**, condicionado a ter embasamento |
| Paciente obeso | o app deve **avisar que a driving pressure medida na via aérea não é confiável**, por causa do peso torácico |
| Pico de fluxo de tosse | não é corte dele; queria a evidência atual |
| Faixa 48–59 do MRC | "fez sentido sim" |
| Glasgow e RASS | mantém os dois; o paciente precisa estar desperto para iniciar o TRE |
| Falha do TRE | todos os sinais: hemodinâmica, esforço, frequência, saturação |
| pH de falha | **7,35** (AMIB/SBPT 2024), e não 7,32 |
| Gasometria | classificar e sugerir Winters |
| Conduta medicamentosa | pode sugerir, incluindo bicarbonato |
| P0.1 e pressão de oclusão | usa as duas, de rotina |
| ΔPocc | usa os limites **10 e 15** |
| Alvo por patologia | "pode sugerir, mas não quer dizer que vai ser só aquilo que o avaliador irá fazer" |
| DPOC | pode sugerir ajuste; gasometria e SpO₂ são diferentes |

### Fontes fechadas nesta rodada

Verificadas contra a fonte primária em 01/09/2026:

- **Guérin C, Papazian L, Reignier J, et al.** *Effect of driving pressure on
  mortality in ARDS patients during lung protective mechanical ventilation in
  two randomized controlled trials.* Crit Care 2016;20:384. Reanálise de
  Acurasys e Proseva, 787 pacientes com dado do dia 1. Sobrevida
  significativamente maior com DP ≤ 13; 5% de aumento no risco de morte por
  cmH₂O acima. **É a fonte do 13**, que Amato 2015 não sustentava.
- **Ferreira NA, Ferreira AS, Guimarães FS.** *Cough peak flow to predict
  extubation outcome: a systematic review and meta-analysis.* Rev Bras Ter
  Intensiva 2021;33(3):445-456. Corte entre 55 e 65 L/min útil como medida
  **complementar**; desempenho diagnóstico baixo a moderado.
- **Duan J, Zhang X, Song J.** *Predictive power of extubation failure
  diagnosed by cough strength.* Crit Care 2021;25:357. Falha de extubação de
  36,2% com tosse fraca contra 6,3% com tosse forte.
- **De Jong A, et al.** *Impact of the driving pressure on mortality in obese
  and non-obese ARDS patients.* Intensive Care Med 2018;44:1106-1114. Em
  obesos a driving pressure **não** se associou à mortalidade. É a base do
  aviso ao obeso — não de um corte diferente.
- **Telias I, Damiani F, Brochard L.** P0.1 entre 1,5 e 3,5 cmH₂O como faixa
  alvo; acima de 3,5 sugere drive elevado (sensibilidade 80%, especificidade
  77% para esforço alto).

### Correção que a pesquisa produziu

O mentor lembrava que "o corte sobe para 17 no obeso". Três buscas não
encontraram nada que estabeleça isso; o único 17 na literatura de obesos é
nível de PEEP em outro protocolo. O que existe é De Jong 2018, cuja conclusão
é diferente, e a fisiologia por trás: elastância de caixa torácica elevada faz
a driving pressure de via aérea superestimar o estresse pulmonar. O raciocínio
dele estava certo; o número, não. Ele foi informado e ajustou o pedido para o
aviso, que é o que este spec adota.

## 3. O núcleo

Duas peças. A segunda é o que torna estrutural uma decisão que, de outro modo,
dependeria de disciplina.

### 3.1 O problema que ele resolve

`suggestVc(predBW, obese)` e `classify.vcKg(v, obese)` já modulam alvo por
característica do paciente: o booleano `obese` desloca a faixa de 4–6 para 6–8
ml/kg. O app já sabe fazer isso.

Mas é um booleano enfiado em cada assinatura. Acrescentar patologia do mesmo
jeito produz `suggestVc(predBW, obese, patologia)`, e a assinatura cresce a
cada característica nova. É proliferação de condicional com outro nome.

### 3.2 `PerfilClinico`

Derivado uma vez, de paciente mais evolução, e passado inteiro:

```ts
interface PerfilClinico {
  pbw: number;
  pbwEstimado: boolean;
  obeso: boolean;
  obesoIndeterminado: boolean;   // sem IMC para confirmar
  patologias: PatologiaKey[];    // derivadas de comorbidades e achados de imagem
}
```

Característica nova depois não muda assinatura nenhuma.

**`PatologiaKey` não é definida aqui, de propósito.** A lista de patologias que
modulam alvo é conteúdo clínico e pertence à Fase 8, junto do mentor. O que
este documento fixa é que ela existe, que é derivada do que já se captura
(`patients.comorbidities` e `imaging` da evolução) e que entra no perfil em vez
de virar parâmetro novo. A Fase 4 constrói o perfil com a lista vazia; nada
depende do conteúdo dela até a Fase 8.

### 3.3 `Alvo<T>`

Nenhuma sugestão devolve número solto:

```ts
interface Modulacao {
  motivo: string;        // "DPOC: alvo de SpO₂ mais baixo"
  sourceKey: SourceKey;  // quem sustenta
}

interface Alvo<T> {
  valor: T;              // o que o app sugere
  base: T;               // o que sugeriria sem modulação
  modulacoes: Modulacao[];
}
```

Sem modulação alguma, `modulacoes` é vazio e `base` é igual a `valor` — a
mesma estrutura serve aos dois casos, e a tela decide mostrar o "padrão seria"
apenas quando há diferença. Não existe alvo sem `base`: a comparação está
sempre disponível.

**O tipo obriga cada modulação a carregar razão e fonte.** Não há como
construir um `Alvo` modulado sem dizer quem mandou — o compilador não deixa.
A decisão de "o número muda, mas com a razão visível" deixa de depender de
alguém lembrar de escrever o comentário.

Efeito na tela: o avaliador vê o alvo ajustado **e** o padrão. Ele enxerga que
houve ajuste e pode discordar — que é exatamente o que o mentor pediu ao dizer
que a sugestão "não quer dizer que vai ser só aquilo que o avaliador irá
fazer".

## 4. Onde cada coisa mora

`clinical.ts` tem 357 linhas em cinco blocos. Somar os quatro domínios ali
produziria um arquivo de setecentas.

| Módulo | Responsabilidade |
|---|---|
| `src/lib/clinical.ts` | permanece: cálculos primitivos e `classify` |
| `src/lib/perfil.ts` | deriva `PerfilClinico` |
| `src/lib/alvos.ts` | motor de sugestão com modulação; recebe `suggestVc`, `suggestPeepFio2`, `suggestVentilation` e `admissionSuggestion`, hoje em `clinical.ts` |
| `src/lib/gasometria.ts` | distúrbio ácido-base, Winters, condutas |
| `src/lib/mecanica.ts` | P0.1, ΔPocc, Pmus, recrutabilidade |
| `src/lib/tre.ts` | protocolo e critérios de falha |

Todos puros: sem React, sem Supabase, testáveis isolados, como o projeto já
faz. Catálogos continuam em `src/data/`.

## 5. Captura de dados novos

`daily_evolutions.hco3` e `daily_evolutions.be` **já existem** — estão na lista
de colunas sem uso do `schema.sql` desde a auditoria de 26/07/2026. Voltam aos
tipos e ao formulário; nenhum DDL para isso.

Colunas novas: `p01 numeric` e `pocc numeric`.

### A armadilha do BE

**O excesso de base é rotineiramente negativo, e zero é o valor normal.** Um
`if (!be)` mata o −2 e o 0 ao mesmo tempo. É a armadilha nº 5 do projeto num
campo onde o valor esperado é negativo — pior que nos escores, onde zero era o
extremo da escala; aqui zero é o meio dela. Todo teste de gasometria precisa
cobrir BE negativo e BE zero.

## 6. O TRE estruturado

Hoje `tre_result` é `'pass' | 'fail' | null`.

Um TRE é procedimento cronometrado: começa, roda de 30 a 120 minutos, pode ser
interrompido por critério de falha. Isso é **evento**, não atributo do dia —
mesma natureza do `care_actions` da Fase 1.

Tabela própria `tre_sessions`: início, modo antes e durante, resultado por
critério, desfecho e motivo de interrupção. `extubationReadiness` passa a ler a
sessão mais recente.

**`tre_result` não é derrubada.** Derrubar coluna apaga dado e é decisão do
Jeann, não deste spec. Ela fica registrada como legada.

### Critérios de falha, conforme validados

Persistindo por cinco minutos ou mais: SpO₂ ≤ 90% ou PaO₂ ≤ 50 mmHg com FiO₂ ≥
50%; PaCO₂ > 50 mmHg; **pH < 7,35**; FR > 35/min; FC > 140/min; PAS > 180 ou <
90 mmHg; sinais de esforço (musculatura acessória, respiração paradoxal,
agitação, sudorese).

O pH é 7,35 por decisão do mentor, seguindo AMIB/SBPT 2024. O consenso de
Boles 2007 usa 7,32. A divergência é real e a escolha é dele.

O paciente precisa estar desperto para iniciar o teste — por isso o RASS entra
como pré-requisito, e não o Glasgow, cuja resposta verbal não é avaliável em
paciente intubado.

## 7. A fronteira do bicarbonato

O mentor aprovou sugestão medicamentosa. O Jeann definiu o formato: **sinaliza
o medicamento, não a dose.**

Isso não pode depender da redação que alguém escolher. O módulo devolve:

```ts
interface Conduta {
  texto: string;
  alcada: "fisio" | "medica";
  sourceKey: SourceKey;
}
```

**O tipo não tem campo de dose.** Não existe onde colocar um número de mEq.
Quem quiser prescrever no futuro terá de alterar o tipo — e aí é decisão
consciente, não deslize de implementação. Na tela, conduta de alçada médica
aparece visualmente distinta e sempre acompanhada de que quem decide é a
equipe médica.

## 8. Procedência: citação não é a mesma coisa que parecer

Duas coisas que o mentor validou **não são citações bibliográficas**:

- a faixa 48–59 do MRC — ele disse que faz sentido; De Jonghe 2002 não a define
- os limites 10 e 15 do ΔPocc — prática dele; Bertoni 2019 valida o método de
  detecção, não a origem dos números

Registrá-las como referência seria mentira, e é o tipo exato de mentira que as
Fases 1 e 2 existiram para eliminar. O catálogo ganha uma segunda procedência:

```ts
type Procedencia =
  | { tipo: "publicacao"; /* autores, título, veículo, ano */ }
  | { tipo: "parecer"; profissional: string; data: string };
```

Na tela, parecer clínico aparece diferente de artigo publicado, porque é
diferente. Um número sustentado por "o mentor usa assim" é legítimo numa
ferramenta de apoio — desde que diga isso, e não finja ser literatura.

**Como isso convive com `verificada`.** Hoje `Reference.verificada` significa
"o mentor revisou esta citação". Para um parecer a pergunta não faz sentido: o
parecer *é* a manifestação dele, então nasce validado por construção. A regra
fica: publicação carrega `verificada`, parecer não carrega o campo, e a página
`/fontes` renderiza os dois grupos separados. Um parecer nunca aparece como
"pendente de revisão", porque não há o que revisar — e nunca aparece como
artigo, porque não é.

## 9. Ausência de dado

Regra do projeto, e aqui ela tem casos novos:

- **BE negativo e BE zero são normais** (seção 5).
- **P0.1 zero** significa ausência de drive — medida real e grave.
- **PaCO₂ e pH** nunca são zero em paciente vivo; zero ali é erro de entrada,
  não medida, e `measurement-limits.ts` deve barrá-lo.
- Um TRE **não iniciado** é diferente de um TRE **falhado**, que é diferente de
  um TRE **interrompido**. Três estados, não dois.

Cada indicador novo decide explicitamente o que faz sem dado, e o teste cobre.

## 10. Fontes e testes

Todo limiar novo entra em `THRESHOLD_SOURCES`. O teste da Fase 1 reprova a
suíte se alguma classificação de `classify` ficar sem fonte — a cobrança é
automática.

Fontes a acrescentar ao catálogo: Guérin 2016, Ferreira 2021, Duan 2021,
Telias/Brochard, Bertoni 2019, De Jong 2018, Albert/Dell/Winters 1967.

Disciplina de teste, herdada: TDD, teste que falha antes; nada de `node:fs`,
`path` ou `__dirname`; e para cada afirmação clínica nova, um teste que falha
se o limiar mudar. As duas fases anteriores encontraram cinco testes que não
podiam falhar — a contagem é o motivo de a regra estar aqui.

## 11. Decomposição em fases

| Fase | Conteúdo | Razão da ordem |
|---|---|---|
| **4** | Correções assinadas + o núcleo (`PerfilClinico`, `Alvo<T>`) refatorando o `obese` | O padrão nasce provado em comportamento existente, sem alterar número nenhum |
| **5** | TRE passo a passo | Não toca número já exibido; todos os critérios têm valor |
| **6** | Gasometria | Captura barata: as colunas já existem |
| **7** | Mecânica | Exige DDL novo; embasamento mais frágil |
| **8** | Patologia → alvo | Fica barata: o padrão existe, é acrescentar modulações |

A Fase 4 é a chave do conjunto. Ela move as funções de sugestão para
`alvos.ts` e converte o booleano `obese` numa modulação do novo formato, **sem
alterar comportamento** — os testes existentes provam que nada mudou. Quando a
patologia chegar na Fase 8, é acrescentar entradas numa lista em vez de mexer
em assinatura.

As correções assinadas que entram na Fase 4: fonte do 13 (Guérin), fonte do
PCF (Ferreira), a faixa do MRC passando a aparecer como parecer clínico, RASS
entrando na triagem de extubação, e as referências validadas virando
`verificada: true` — hoje a tela mostra tarja de "pendente" em coisa que o
mentor já assinou.

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Modulação silenciosa de número clínico | `Alvo<T>` torna impossível: sem `motivo` e `sourceKey` não compila |
| Parecer clínico virar citação | `Procedencia` com dois tipos distintos, renderizados diferente |
| App prescrever dose | `Conduta` não tem campo de dose |
| `if (!be)` matando BE negativo | testes obrigatórios de BE negativo e zero |
| Refatoração da Fase 4 alterando comportamento | é movimentação e conversão; a suíte existente é a rede, e roda antes e depois |
| Quatro blocos divergirem | este documento; cada spec de bloco argumenta a partir dele |

## 13. O que continua aberto

1. **A fonte primária da fórmula de Winters.** O coeficiente hoje vem de
   literatura secundária que cita Albert, Dell e Winters (1967). Fechar antes
   da Fase 6.
2. **Os números do DPOC.** O mentor disse que gasometria e SpO₂ são
   diferentes, mas não deu os alvos. Necessário antes da Fase 8.
3. **O ânion-gap.** Ele nunca respondeu se quer. Necessário antes da Fase 6.
4. **Recrutabilidade.** O corte de 0,5 do R/I ratio é mediana de uma coorte de
   45 pacientes, não limiar validado. Não construir tratando-o como corte.

Nenhum destes bloqueia a Fase 4 ou a 5.
