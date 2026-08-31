# Fase 2 — Escores visíveis, aba por estado, e o dossiê clínico

Data: 31/08/2026
Projeto: Ventila Fisio (POC)
Fase anterior: `2026-08-31-fase1-embasamento-contexto-escores-design.md`

## 1. Por que esta fase tem esta forma

O pedido do cliente foi decomposto em oito blocos. A Fase 1 entregou quatro
deles — embasamento, contexto do paciente, escores e bundle de cuidados — e foi
escolhida justamente porque **não dependia de validação clínica**: ela
documentou números que o app já afirmava, sem afirmar nada novo.

Os blocos restantes não têm essa propriedade:

| Bloco restante | Afirmação clínica nova? |
|---|---|
| Gasometria interpretada | sim — regras de compensação, ânion-gap, e a fronteira do bicarbonato |
| Mecânica nova (P0.1, Pmus, ΔPocc, recrutabilidade) | sim — fórmulas **e** limiares |
| TRE passo a passo | sim — critérios de aptidão e de falha durante o teste |
| Patologia → alvo ventilatório | sim, e é o mais delicado: muda número que vai à beira do leito |
| Reorganização visual | não |
| Leitura dos escores (dívida da Fase 1) | não |

Em 31/08/2026, **as dez referências da Fase 1 seguem `verificada: false`** e as
oito pendências do mentor estão abertas. Construir os quatro blocos clínicos
sobre esse catálogo é empilhar dívida: se o mentor depois discordar de um
limiar, o retrabalho não é o número, é a tela que o exibe.

Daí a forma desta fase: **uma trilha que produz o insumo para destravar os
quatro blocos, e outra que entrega o que não depende deles.**

## 2. Escopo

### Entra

- **Trilha A:** dossiê clínico para o mentor. Documento, não código.
- **Trilha B1:** aba padrão conforme o estado do paciente.
- **Trilha B2:** escores visíveis em quatro superfícies, com fronteira definida.

### Não entra, e é proposital

Gasometria interpretada, mecânica nova, TRE passo a passo e alvo ventilatório
por patologia. Os quatro dependem do dossiê voltar assinado.

Nenhum limiar clínico existente é alterado nesta fase. Nenhuma fórmula nova.

## 3. Decisões já tomadas

| Decisão | Escolha | Quem decidiu |
|---|---|---|
| Composição da fase | Dossiê + os blocos sem risco clínico | Jeann, 31/08/2026 |
| Tela ao abrir paciente | Aba padrão conforme o estado | Jeann, 31/08/2026 |
| Onde os escores aparecem | Cabeçalho, gráficos, histórico e painel motor | Jeann, 31/08/2026 |

## 4. Trilha A — Dossiê clínico

Arquivo em `docs/dossie-clinico-fase2.md`, escrito para ser lido e anotado pelo
mentor de uma vez só. Não é documento de engenharia: o público é clínico.

Conteúdo:

1. **As oito pendências abertas** da seção 10 do spec da Fase 1, cada uma com o
   que já foi apurado e a pergunta exata a responder.
2. **Fontes candidatas** para os três blocos clínicos seguintes — gasometria,
   mecânica nova e TRE. Cada uma conferida contra a fonte primária, com uma
   linha dizendo o que ela sustenta e **o que ela não sustenta**.
3. **A fronteira do bicarbonato**, posta como decisão de escopo profissional e
   não como detalhe de implementação: o app identifica o distúrbio e sugere o
   que é da alçada da fisioterapia (ajuste de ventilação), ou também recomenda
   conduta medicamentosa?

O item 2 é o que dá valor à trilha. Na Fase 1, conferir as fontes antes de
escrever produziu três correções que teriam entrado no produto: Amato 2015 não
define o corte de 13; o corte de 17 J/min é de Serpa Neto 2018 e não de
Gattinoni 2016; e as Diretrizes Brasileiras de 2013 foram superadas pela edição
2024. A mesma disciplina aplicada antes de construir evita retrabalho de tela.

**Este documento não gera código e não tem teste.** Sai daqui para o mentor.

## 5. Trilha B1 — Aba padrão conforme o estado do paciente

Hoje `PatientDetail` inicializa `tab` com `"admissao"`. Um paciente no oitavo
dia de ventilação abre mostrando *como colocá-lo no ventilador*, e o estado
atual dele fica na aba seguinte.

Regra nova: **paciente com ao menos uma evolução registrada abre em
`"evolucao"`; paciente sem evolução nenhuma abre em `"admissao"`.** A aba de
admissão passa a ser a primeira apenas quando admitir é de fato a tarefa.

Detalhe de implementação que o plano precisa tratar: as evoluções chegam de
forma assíncrona, então a aba não pode ser decidida na inicialização do
`useState` — nesse momento a lista ainda está vazia e todo paciente abriria em
Admissão. A escolha acontece quando a carga termina, e só enquanto o usuário ainda não
tiver trocado de aba por conta própria: trocar a aba debaixo do dedo de quem já
navegou é pior que o defeito original.

Mecanismo, explícito para não ficar a cargo de quem implementa: um sinalizador
booleano separado — `abaEscolhidaPeloUsuario`, inicialmente `false`, posto em
`true` pelo `onChange` do `Tabs`. A carga só define a aba quando ele é `false`.
Comparar a aba atual com `"admissao"` **não** serve, porque o usuário pode ter
clicado deliberadamente em Admissão, e aí a carga a trocaria por baixo dele.

Nada muda de lugar. Nenhuma aba é criada ou removida.

## 6. Trilha B2 — Escores visíveis

`rass`, `ims` e `mrc` são capturados e gravados corretamente desde a Fase 1, e
**nenhuma tela os lê de volta**. Esta trilha fecha essa dívida em quatro
superfícies, cada uma com um trabalho distinto — a fronteira existe para que o
mesmo dado não apareça quatro vezes.

| Superfície | Mostra | Não mostra |
|---|---|---|
| Cabeçalho do paciente | RASS atual, como chip | mais nada |
| Gráficos de tendência | trajetória de MRC total, IMS e RASS | detalhe por grupo |
| Histórico de evoluções | os três valores daquele dia | trajetória |
| Painel de fisioterapia motora | MRC por grupo muscular e assimetria D/E | nada que os outros já mostrem |

**Cabeçalho.** Só o RASS, porque é o escore que muda a conduta imediata: RASS
−4 diz que o paciente não participa de mobilização hoje. Entra na mesma linha
de chips de `DPOC · TOT · 8º dia de VM`. Ausente, o chip não aparece — a regra
de ausência da Fase 1 continua valendo.

**Gráficos.** MRC total, IMS e RASS entram no `TrendCharts`.

**Decisão técnica que importa:** as séries existentes usam `connectNulls` no
`<Line>`. Para elas isso é aceitável, porque derivam de parâmetros registrados
quase todo dia. Para o MRC **não é**: `mrcTotal` devolve `null` de propósito
sempre que qualquer um dos 12 valores falta, e conectar esses nulos desenharia
uma trajetória de recuperação muscular que ninguém mediu. As três séries novas
entram **sem `connectNulls`**, com pontos isolados onde a avaliação existe. Dia
sem avaliação fica vazio, não interpolado. As séries existentes não são
alteradas: mudar comportamento que não é escopo desta fase é o tipo de mudança
que torna um diff irrevisável.

**Histórico.** Os três valores entram no card de cada dia, junto de imagem,
medicamentos e sonda/dieta, seguindo o `boardSummary` que já existe. Escore
ausente simplesmente não aparece na linha.

**Painel de fisioterapia motora.** O único lugar com o detalhe dos 12 valores e
a assimetria entre lados. É **leitura da última avaliação completa registrada**,
distinto do `ScoresPanel` do formulário, que **captura a de hoje**. Fica na aba
Evolução, acima do formulário, para que o terapeuta veja "MRC 40/60 em 29/08,
assimetria à esquerda" enquanto preenche a avaliação de hoje. Sem avaliação
completa alguma, o painel não renderiza.

## 7. Arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `docs/dossie-clinico-fase2.md` | dossiê para o mentor (trilha A) |
| `src/components/patient/MotorPanel.tsx` | leitura da última avaliação motora |
| `src/components/patient/MotorPanel.test.tsx` | testes do painel |
| `src/components/patient/PatientHeader.test.tsx` | testes do chip de RASS; o componente não tem teste direto hoje |
| `src/components/patient/TrendCharts.tsx` | extraído de `PatientDetail.tsx` |
| `src/components/patient/TrendCharts.test.tsx` | testes das séries novas |
| `src/components/patient/EvolutionHistory.tsx` | extraído de `PatientDetail.tsx` |

**Modificados:**

| Arquivo | O quê |
|---|---|
| `src/pages/PatientDetail.tsx` | aba padrão por estado; extrações; monta o painel motor |
| `src/pages/PatientDetail.test.tsx` | testes da aba padrão |
| `src/components/patient/PatientHeader.tsx` | chip de RASS |
| `src/lib/scores.ts` | `ultimaAvaliacaoMrc(evolucoes)`, função pura nova |

**Sobre `ultimaAvaliacaoMrc`.** O painel motor precisa da avaliação completa
mais recente, que não é necessariamente a evolução mais recente — o terapeuta
pode ter registrado ventilação hoje sem refazer a força muscular. Percorrer a
lista de trás para frente e devolver a primeira cujo `mrcTotal` não seja `null`
é regra de domínio, então mora em `src/lib/scores.ts` e não dentro do
componente, como manda a arquitetura do projeto. Assinatura:
`ultimaAvaliacaoMrc(evolucoes: DailyEvolution[]): DailyEvolution | null`.

**Sobre as extrações.** `TrendCharts` e `EvolutionHistory` estão em
`PatientDetail.tsx`, que tem 800 linhas. Esta fase mexe nos dois, então saem
para `src/components/patient/` antes de serem alterados — mesma disciplina da
Fase 1, e pela mesma razão: um diff que move e altera ao mesmo tempo não mostra
qual mudança fez o quê. Extração primeiro, com a suíte verde entre os dois
passos; alteração depois.

## 8. Testes

TDD: teste que falha antes, passa depois. Baseline atual, **235 testes em 15
arquivos**, tem de continuar verde.

| Arquivo | O que cobre |
|---|---|
| `PatientDetail.test.tsx` | paciente com evolução abre em Evolução; sem evolução abre em Admissão; a aba escolhida pelo usuário não é sobrescrita pela carga |
| `PatientHeader.test.tsx` (**novo** — hoje o componente não tem teste algum) | chip de RASS presente; ausente quando não há RASS; RASS 0 aparece e não é tratado como ausência |
| `TrendCharts.test.tsx` | as três séries novas existem; MRC não interpola dia sem avaliação |
| `MotorPanel.test.tsx` | mostra a última avaliação completa; não renderiza sem nenhuma; assimetria aparece |
| `EvolutionHistory` | escore do dia aparece; ausente não vira zero |

**Zero é valor clínico legítimo** em RASS e IMS, e a Fase 1 já teve um achado
de revisão exatamente sobre isso. Cada superfície nova precisa de um teste que
falharia se um zero medido fosse exibido como ausência, ou omitido.

Lembrete do `CLAUDE.md`: nada de `node:fs`, `path` ou `__dirname` em teste —
passa no vitest e quebra o `pnpm build`.

## 9. Riscos

| Risco | Mitigação |
|---|---|
| `connectNulls` desenhar trajetória inventada no MRC | decisão explícita na seção 6, com teste |
| Trocar a aba debaixo de quem já navegou | a escolha só vale enquanto o usuário não tiver interagido com as abas |
| Painel motor duplicar o que outras três superfícies já mostram | fronteira da seção 6; é o único lugar com detalhe por grupo |
| Extrair e alterar no mesmo diff | extração é commit próprio, com a suíte verde antes e depois |
| O dossiê virar documento de engenharia | o público é o mentor clínico; linguagem e estrutura seguem isso |

## 10. O que esta fase deliberadamente não resolve

O pedido central do cliente — "uma análise do caso do paciente em um todo" —
continua sendo das fases seguintes. A Fase 2 fecha a dívida de exibição que a
Fase 1 deixou, corrige a tela de entrada, e produz o insumo que destrava o
resto.

Vale dizer ao cliente com essas palavras. A gasometria interpretada, a mecânica
nova, o TRE passo a passo e o alvo por patologia dependem de um profissional
clínico assinar os limiares — e essa é a diferença entre um app que cita fonte
e um que continua sendo achismo com aparência de autoridade.
